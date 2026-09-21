/**
 * End-to-end: spawn the real binary, speak real MCP JSON-RPC over stdio, against a
 * stub that impersonates the Gravv gateway.
 *
 * The unit tests exercise pieces in isolation; this proves the assembled server
 * actually initialises, advertises tools, and round-trips a call — including the
 * two-phase confirmation for money movement.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let gateway: Server;
let gatewayPort: number;
let received: Array<{ method: string; url: string; headers: Record<string, any>; body: any }> = [];

before(async () => {
  gateway = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      received.push({
        method: req.method!,
        url: req.url!,
        headers: req.headers as any,
        body: raw ? JSON.parse(raw) : undefined,
      });

      // Reject anything missing the auth header, the way the gateway would.
      if (req.headers["api-key"] !== "grvSec_sandbox_e2e") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: null, error: "unauthorized" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url?.startsWith("/v1/accounts")) {
        res.end(JSON.stringify({ data: { items: [{ id: "acc_1", currency: "USD", balance: "100.00" }] } }));
      } else if (req.url?.startsWith("/v1/transfer")) {
        res.end(JSON.stringify({ data: { transfer_id: "trf_1", status: "pending" } }));
      } else if (req.url?.startsWith("/v1/wallets")) {
        res.end(JSON.stringify({ data: { address: "0xabc", network: "polygon", assets: [] } }));
      } else if (req.url?.startsWith("/v1/feature-access")) {
        res.end(JSON.stringify({ data: { items: [{ feature: "card_acquiring", enabled: false }] } }));
      } else if (req.url?.startsWith("/v1/collections")) {
        res.end(JSON.stringify({ data: { transaction_id: "txn_1", status: "refunded" } }));
      } else if (req.url?.startsWith("/v1/cards")) {
        // Includes a sensitive field to prove redaction runs on the way out.
        res.end(JSON.stringify({ data: { id: "card_1", card_number: "4111111111111111", last4: "1111" } }));
      } else {
        res.end(JSON.stringify({ data: {} }));
      }
    });
  });

  await new Promise<void>((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  gatewayPort = (gateway.address() as any).port;
});

after(() => gateway?.close());

/** Minimal JSON-RPC-over-stdio driver. */
class McpProcess {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = "";
  private pending = new Map<number, (v: any) => void>();
  private nextId = 1;
  stderr = "";

  constructor(args: string[], env: Record<string, string>) {
    this.proc = spawn(
      process.execPath,
      ["--experimental-strip-types", join(root, "src", "bin", "gravv-mcp.ts"), ...args],
      { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"] },
    ) as ChildProcessWithoutNullStreams;

    this.proc.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString();
      let idx: number;
      while ((idx = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id != null && this.pending.has(msg.id)) {
            this.pending.get(msg.id)!(msg);
            this.pending.delete(msg.id);
          }
        } catch {
          /* not a JSON-RPC frame */
        }
      }
    });
    this.proc.stderr.on("data", (c) => (this.stderr += c.toString()));
  }

  request(method: string, params: unknown = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout on ${method}; stderr: ${this.stderr}`)), 15_000);
      this.pending.set(id, (v) => {
        clearTimeout(timer);
        resolve(v);
      });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  notify(method: string, params: unknown = {}) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  async initialize() {
    const res = await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e", version: "1.0.0" },
    });
    this.notify("notifications/initialized");
    return res;
  }

  kill() {
    this.proc.kill();
  }
}

function textOf(callResult: any): string {
  return callResult.result?.content?.[0]?.text ?? "";
}

describe("end-to-end over MCP stdio", () => {
  test("initialises and advertises the default toolsets", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      const init = await mcp.initialize();
      assert.equal(init.result.serverInfo.name, "gravv");
      assert.match(init.result.instructions, /SANDBOX/, "instructions must state the environment");

      const list = await mcp.request("tools/list");
      const names: string[] = list.result.tools.map((t: any) => t.name);

      assert.ok(names.includes("createCustomer"));
      assert.ok(names.includes("createTransfer"));
      assert.ok(names.includes("createCard"), "cards ships by default");
      assert.ok(names.includes("createWallet"), "wallets ships by default — no restart to create one");
      assert.ok(
        !names.includes("createAccountApplication"),
        "the heavy account-application schemas are opt-in",
      );
      assert.ok(
        !names.includes("getCardSensitiveDetails"),
        "cardholder-data endpoints must never be advertised",
      );

      // The hand-authored half ships by default too — it is where balances, refunds and
      // the feature-access gate live.
      for (const name of ["getWalletBalance", "refundCollection", "listFeatureAccess"]) {
        assert.ok(names.includes(name), `${name} should be advertised by default`);
      }
      for (const name of ["approveTransfer", "approveFxOrder", "searchWebhookIngestion"]) {
        assert.ok(!names.includes(name), `${name} is dashboard-only and must not be advertised`);
      }
    } finally {
      mcp.kill();
    }
  });

  test("a hand-authored read tool round-trips against the gateway", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "getWalletBalance",
        arguments: { id: "wal_1" },
      });
      assert.equal(res.result.isError, undefined);
      assert.equal(received.length, 1);
      assert.equal(received[0]!.url, "/v1/wallets/wal_1/balance");
      assert.equal(received[0]!.method, "GET");
      assert.match(textOf(res), /0xabc/);
    } finally {
      mcp.kill();
    }
  });

  test("a hand-authored refund confirms before it reaches the gateway", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();

      const first = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "refundCollection",
            arguments: { id: "txn_1", amount_cents: 1050, currency: "USD" },
          }),
        ),
      );
      assert.equal(first.status, "confirmation_required");
      assert.equal(received.length, 0, "an unconfirmed refund must not reach the API");

      await mcp.request("tools/call", {
        name: "refundCollection",
        arguments: { id: "txn_1", amount_cents: 1050, currency: "USD", confirm: true },
      });
      assert.equal(received.length, 1);
      assert.equal(received[0]!.url, "/v1/collections/txn_1/refund");
      assert.ok(received[0]!.headers["idempotency-key"], "the POST must carry a generated key");
      assert.equal(received[0]!.body.confirm, undefined);
    } finally {
      mcp.kill();
    }
  });

  test("an approval name explains itself instead of failing as unknown", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=all"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "approveTransfer",
        arguments: { id: "trf_1", confirm: true },
      });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /dashboard/i, "should say where approval actually happens");
    } finally {
      mcp.kill();
    }
  });

  test("--toolsets=all still excludes the hard blocklist", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=all"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);

      assert.ok(names.length > 70, `expected the full surface, got ${names.length}`);
      for (const blocked of [
        "getCardSensitiveDetails",
        "getCardPin",
        "updateCardPin",
        "startRiskKyc",
        "createCollection",
      ]) {
        assert.ok(!names.includes(blocked), `${blocked} must never appear, even with --toolsets=all`);
      }
    } finally {
      mcp.kill();
    }
  });

  test("--read-only hides every write tool", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--read-only", "--toolsets=all"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);
      assert.ok(names.includes("listAccounts"));
      assert.ok(!names.includes("createTransfer"));
      assert.ok(!names.includes("createCustomer"));
    } finally {
      mcp.kill();
    }
  });

  test("a read call reaches the gateway and returns unwrapped data", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", { name: "listAccounts", arguments: {} });
      const payload = JSON.parse(textOf(res));

      assert.equal(payload.environment, "sandbox");
      assert.equal(payload.data.items[0].id, "acc_1");
      assert.equal(received[0]!.headers["api-key"], "grvSec_sandbox_e2e");
    } finally {
      mcp.kill();
    }
  });

  test("money movement requires two calls, and the first does not touch the gateway", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();

      const first = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "createTransfer",
            arguments: { amount: 50, source: { id: "acc_1" }, destination: { id: "acc_2" } },
          }),
        ),
      );
      assert.equal(first.status, "confirmation_required");
      assert.match(first.willDo, /Transfer 50/);
      assert.equal(received.length, 0, "an unconfirmed transfer must not reach the API at all");

      const second = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "createTransfer",
            arguments: { amount: 50, source: { id: "acc_1" }, destination: { id: "acc_2" }, confirm: true },
          }),
        ),
      );
      assert.equal(second.data.transfer_id, "trf_1");
      assert.equal(received.length, 1);
      assert.ok(received[0]!.headers["idempotency-key"], "the POST must carry a generated Idempotency-Key");
      assert.equal(received[0]!.body.confirm, undefined, "confirm must not be forwarded to the API");
    } finally {
      mcp.kill();
    }
  });

  test("a live key refuses money movement without GRAVV_ALLOW_LIVE_WRITES", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_live_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "createTransfer",
        arguments: { amount: 50, confirm: true },
      });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /GRAVV_ALLOW_LIVE_WRITES/);
      assert.equal(received.length, 0, "nothing may reach a live gateway while gated");
    } finally {
      mcp.kill();
    }
  });

  test("responses are redacted before reaching the model", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=cards"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const payload = JSON.parse(
        textOf(await mcp.request("tools/call", { name: "getCard", arguments: { card_id: "card_1" } })),
      );
      assert.match(payload.data.card_number, /redacted/, "a PAN leaking through a permitted endpoint must be caught");
      assert.equal(payload.data.last4, "1111", "non-sensitive fields must survive");
    } finally {
      mcp.kill();
    }
  });

  test("a blocked tool name explains itself instead of returning 'unknown tool'", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=all"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "getCardSensitiveDetails",
        arguments: { card_id: "card_1" },
      });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /client-side/, "should point at the supported alternative");

      // Same mechanism for the removed collections endpoint: a model that reaches for
      // it is sent to the payment intent rather than left guessing at variations.
      const collection = await mcp.request("tools/call", {
        name: "createCollection",
        arguments: { amount: "50", currency: "USD" },
      });
      assert.equal(collection.result.isError, true);
      assert.match(textOf(collection), /createCardPaymentIntent/);
    } finally {
      mcp.kill();
    }
  });

  test("a payment intent is gated only when it carries a card token", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();

      // No token: this only mints a checkout link, so it executes on the first call.
      const link = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "createCardPaymentIntent",
            arguments: { amount: "3.50", currency: "USD", source: { methods: ["card"] } },
          }),
        ),
      );
      assert.equal(link.status, undefined, "a checkout link must not ask for confirmation");
      assert.equal(received.length, 1);

      // With a token the API charges immediately, so the same tool now confirms first.
      received = [];
      const charge = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "createCardPaymentIntent",
            arguments: { amount: "3.50", currency: "USD", card_token: "tokn_abc" },
          }),
        ),
      );
      assert.equal(charge.status, "confirmation_required");
      assert.equal(received.length, 0, "an unconfirmed charge must not reach the API at all");

      await mcp.request("tools/call", {
        name: "createCardPaymentIntent",
        arguments: { amount: "3.50", currency: "USD", card_token: "tokn_abc", confirm: true },
      });
      assert.equal(received.length, 1);
      assert.equal(received[0]!.body.confirm, undefined, "confirm must not be forwarded to the API");
      assert.equal(received[0]!.body.card_token, "tokn_abc");
    } finally {
      mcp.kill();
    }
  });

  test("a tool from an unloaded toolset says how to enable it", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", { name: "createAccountApplication", arguments: {} });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /--toolsets=account-applications/);
    } finally {
      mcp.kill();
    }
  });

  test("runs docs-only without an API key", async () => {
    // Docs are public, so an agent can learn the API before the merchant has credentials.
    const mcp = new McpProcess([], { GRAVV_API_KEY: "" });
    try {
      const init = await mcp.initialize();
      assert.match(init.result.instructions, /no API key configured/);

      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);
      assert.deepEqual(names.sort(), ["getGravvDocPage", "searchGravvDocs"]);

      const res = await mcp.request("tools/call", { name: "listAccounts", arguments: {} });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /GRAVV_API_KEY/);
    } finally {
      mcp.kill();
    }
  });
});
