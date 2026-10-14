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
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A one-page docs site in the shape of the live llms.txt and llms-full.txt. */
const docsIndex = (port: number) => `# Gravv

## Guides

- [Stub guide](http://127.0.0.1:${port}/docs/guides/stub-guide.md): A page only the stub docs site has.
`;
const DOCS_CORPUS = `# Gravv — Full Documentation

---

# Stub guide

A page only the stub docs site has.

Zebracorn payouts settle on the stub docs site.
`;

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

      // A docs site under /docs, for --docs-origin. The docs need no key.
      if (req.url === "/docs/llms.txt" || req.url === "/docs/llms-full.txt") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(req.url.endsWith("full.txt") ? DOCS_CORPUS : docsIndex(gatewayPort));
        return;
      }

      // Reject anything missing the auth header, the way the gateway would.
      if (req.headers["api-key"] !== "grvSec_sandbox_e2e") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: null, error: "unauthorized" }));
        return;
      }

      // A server fault on a write, to check what an error result carries.
      if (req.url?.startsWith("/v1/wallets") && req.method === "POST") {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: null, error: "bad gateway" }));
        return;
      }

      // A stored transfer error, replayed, to check the fields lifted beside the hint.
      if (req.url?.startsWith("/v1/transfer") && raw && JSON.parse(raw).client_reference === "dup-ref") {
        res.writeHead(409, { "Content-Type": "application/json", "Idempotency-Replayed": "true" });
        res.end(
          JSON.stringify({
            data: null,
            error: "client_reference has already been used for a different transfer",
            code: "ERROR_CODE_DUPLICATE_TRANSACTION",
            transfer_status: "completed",
          }),
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url?.startsWith("/v1/accounts")) {
        res.end(JSON.stringify({ data: { items: [{ id: "acc_1", currency: "USD", balance: "100.00" }] } }));
      } else if (req.url?.startsWith("/v1/transfer")) {
        res.end(JSON.stringify({ data: { transfer_id: "trf_1", status: "pending" } }));
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
      assert.ok(names.includes("simulateDeposit"), "the sandbox toolset loads by default on a sandbox key");
      assert.ok(
        !names.includes("createAccountApplication"),
        "the heavy account-application schemas are opt-in",
      );
      assert.ok(
        !names.includes("getCardSensitiveDetails"),
        "cardholder-data endpoints must never be advertised",
      );
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
        "approveTransfer",
        "searchWebhookIngestion",
        "createPaymentLink",
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

  test("a resend under the model's idempotency_key sends that header and keeps it out of the body", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const payload = JSON.parse(
        textOf(
          await mcp.request("tools/call", {
            name: "createTransfer",
            arguments: {
              amount: 50,
              source: { id: "acc_1" },
              destination: { id: "acc_2" },
              idempotency_key: "e2e-key-1",
              confirm: true,
            },
          }),
        ),
      );
      assert.equal(payload.idempotency_key, "e2e-key-1");
      assert.equal(received.length, 1);
      assert.equal(received[0]!.headers["idempotency-key"], "e2e-key-1");
      assert.equal(received[0]!.body.idempotency_key, undefined, "the key is a header, not a body field");
    } finally {
      mcp.kill();
    }
  });

  test("an error result carries the environment and the key that was sent", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "createWallet",
        arguments: { customer_id: "cus_1", network: "polygon" },
      });
      assert.equal(res.result.isError, true);
      const payload = JSON.parse(textOf(res));
      assert.equal(payload.status, 502);
      assert.equal(payload.environment, "sandbox");
      assert.equal(payload.outcome_unknown, true, "a 5xx on a write may have taken effect");
      assert.ok(payload.idempotency_key);
      assert.equal(payload.idempotency_key, received[0]!.headers["idempotency-key"]);
      assert.deepEqual(payload.details, { data: null, error: "bad gateway" }, "details stays the raw body");
    } finally {
      mcp.kill();
    }
  });

  test("an error result lifts the code and transfer_status, and flags a replay", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", {
        name: "createTransfer",
        arguments: {
          amount: 50,
          source: { id: "acc_1" },
          destination: { id: "acc_2" },
          client_reference: "dup-ref",
          idempotency_key: "e2e-dup",
          confirm: true,
        },
      });
      assert.equal(res.result.isError, true);
      const payload = JSON.parse(textOf(res));
      assert.equal(payload.status, 409);
      assert.equal(payload.code, "ERROR_CODE_DUPLICATE_TRANSACTION");
      assert.equal(payload.transfer_status, "completed");
      assert.equal(payload.replayed, true);
      assert.equal(payload.idempotency_key, "e2e-dup");
      assert.equal(payload.details.code, "ERROR_CODE_DUPLICATE_TRANSACTION", "details stays the raw body");
      assert.equal(received.length, 1, "a stored 409 is not resent");
    } finally {
      mcp.kill();
    }
  });

  test("a live key hides the sandbox simulator and refuses it by name", async () => {
    received = [];
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_live_e2e",
    });
    try {
      await mcp.initialize();
      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);
      assert.ok(!names.includes("simulateDeposit"));
      const res = await mcp.request("tools/call", {
        name: "simulateDeposit",
        arguments: { account_id: "acc_1", amount: "1.00", rail: "wire" },
      });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /sandbox-only/);
      assert.equal(received.length, 0, "nothing may reach the gateway");
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
    } finally {
      mcp.kill();
    }
  });

  test("a removed approval tool names the Dashboard instead of 'unknown tool'", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=all"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      await mcp.initialize();
      const res = await mcp.request("tools/call", { name: "approveTransfer", arguments: { id: "trf_1" } });
      assert.equal(res.result.isError, true);
      assert.match(textOf(res), /Dashboard/);
      assert.doesNotMatch(textOf(res), /Unknown tool/);
    } finally {
      mcp.kill();
    }
  });

  test("a saved config naming a retired toolset still starts, with a warning", async () => {
    const mcp = new McpProcess(
      [`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=approvals,customers"],
      { GRAVV_API_KEY: "grvSec_sandbox_e2e" },
    );
    try {
      await mcp.initialize();
      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);
      assert.ok(names.includes("createCustomer"));
      assert.ok(!names.includes("createTransfer"), "only the toolsets named are loaded");
      assert.match(mcp.stderr, /warning: toolset "approvals" was removed/);
    } finally {
      mcp.kill();
    }
  });

  test("only retired toolsets start the documentation tools alone", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`, "--toolsets=approvals"], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
    });
    try {
      const init = await mcp.initialize();
      assert.match(init.result.instructions, /No API tools loaded/);
      const names: string[] = (await mcp.request("tools/list")).result.tools.map((t: any) => t.name);
      assert.deepEqual(names.sort(), ["getGravvDocPage", "searchGravvDocs"]);
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

  test("a publishable key is explained instead of silently failing", async () => {
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], { GRAVV_API_KEY: "grvPub_e2e" });
    try {
      const init = await mcp.initialize();
      assert.match(init.result.instructions, /publishable key/);
      assert.match(mcp.stderr, /warning: This is a publishable key/);
    } finally {
      mcp.kill();
    }
  });

  test("--docs-origin points the documentation tools at another docs site", async () => {
    const origin = `http://127.0.0.1:${gatewayPort}/docs`;
    const mcp = new McpProcess([`--docs-origin=${origin}/`], { GRAVV_API_KEY: "" });
    try {
      await mcp.initialize();
      assert.match(mcp.stderr, new RegExp(`docs=${origin}\\n`));

      const search = JSON.parse(textOf(await mcp.request("tools/call", { name: "searchGravvDocs", arguments: { query: "zebracorn" } })));
      assert.equal(search.results[0].slug, "guides/stub-guide");
      assert.equal(search.results[0].section, "Guides");

      const page = textOf(await mcp.request("tools/call", { name: "getGravvDocPage", arguments: { slug: "guides/stub-guide" } }));
      assert.match(page, /Zebracorn payouts/);

      const unknown = await mcp.request("tools/call", { name: "searchGravvDocs", arguments: { query: "zebracorn", section: "Home" } });
      assert.equal(unknown.result.isError, true);
      assert.match(textOf(unknown), /The sections are: Guides\./);
    } finally {
      mcp.kill();
    }
  });

  test("GRAVV_DOCS_ORIGIN does the same, and docs links follow it", async () => {
    const origin = `http://127.0.0.1:${gatewayPort}/docs`;
    const mcp = new McpProcess([`--base-url=http://127.0.0.1:${gatewayPort}`], {
      GRAVV_API_KEY: "grvSec_sandbox_e2e",
      GRAVV_DOCS_ORIGIN: origin,
    });
    try {
      await mcp.initialize();
      const search = JSON.parse(textOf(await mcp.request("tools/call", { name: "searchGravvDocs", arguments: { query: "zebracorn" } })));
      assert.equal(search.results[0].slug, "guides/stub-guide");

      const blocked = textOf(await mcp.request("tools/call", { name: "getCardSensitiveDetails", arguments: {} }));
      assert.match(blocked, new RegExp(`see ${origin}/platform/cards/view-card-sensitive-details/overview`));
      assert.doesNotMatch(blocked, /syntext/);
    } finally {
      mcp.kill();
    }
  });

  test("a docs origin that is not a URL stops the server with the reason", () => {
    for (const bad of ["not-a-url", "ftp://docs.example", "https://docs.example/?q=1"]) {
      const run = spawnSync(
        process.execPath,
        ["--experimental-strip-types", join(root, "src", "bin", "gravv-mcp.ts"), `--docs-origin=${bad}`],
        { env: { ...process.env, GRAVV_API_KEY: "" }, input: "", encoding: "utf8", timeout: 15_000 },
      );
      assert.equal(run.status, 1, bad);
      assert.match(run.stderr, /error: docs origin/, bad);
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
