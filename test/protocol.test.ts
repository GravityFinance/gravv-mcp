/**
 * MCP protocol conformance.
 *
 * The other suites check that our tools behave. These check that any compliant client —
 * Claude, Copilot, Codex, Cursor, or something not written yet — can talk to the server
 * at all. Everything here is driven over real JSON-RPC against the spawned binary.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

class Session {
  private proc: ChildProcessWithoutNullStreams;
  private buf = "";
  private pending = new Map<number, (v: any) => void>();
  private nextId = 1;

  constructor() {
    this.proc = spawn(
      process.execPath,
      ["--experimental-strip-types", join(root, "src", "bin", "gravv-mcp.ts")],
      { env: { ...process.env, GRAVV_API_KEY: "grvSec_sandbox_proto" }, stdio: ["pipe", "pipe", "pipe"] },
    ) as ChildProcessWithoutNullStreams;

    this.proc.stdout.on("data", (c) => {
      this.buf += c;
      let i: number;
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        try {
          const m = JSON.parse(line);
          if (m.id != null && this.pending.has(m.id)) {
            this.pending.get(m.id)!(m);
            this.pending.delete(m.id);
          }
        } catch {
          /* not a frame */
        }
      }
    });
  }

  request(method: string, params: unknown = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout on ${method}`)), 20_000);
      this.pending.set(id, (v) => {
        clearTimeout(t);
        resolve(v);
      });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  notify(method: string) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
  }

  async handshake(protocolVersion = "2025-06-18") {
    const res = await this.request("initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "conformance", version: "1.0.0" },
    });
    this.notify("notifications/initialized");
    return res;
  }

  kill() {
    this.proc.kill();
  }
}

let s: Session;
before(async () => {
  s = new Session();
  await s.handshake();
});
after(() => s?.kill());

describe("initialize", () => {
  test("negotiates the current protocol version", async () => {
    const one = new Session();
    try {
      const res = await one.handshake("2025-06-18");
      assert.equal(res.result.protocolVersion, "2025-06-18");
    } finally {
      one.kill();
    }
  });

  test("accommodates a client on an older protocol version", async () => {
    // A client that only speaks 2024-11-05 must still get a usable session rather than
    // an error, or it simply cannot connect.
    const one = new Session();
    try {
      const res = await one.handshake("2024-11-05");
      assert.equal(res.result.protocolVersion, "2024-11-05");
    } finally {
      one.kill();
    }
  });

  test("reports the real package version, not a hardcoded one", async () => {
    const one = new Session();
    try {
      const res = await one.handshake();
      assert.equal(res.result.serverInfo.name, "gravv");
      assert.equal(res.result.serverInfo.version, pkg.version);
    } finally {
      one.kill();
    }
  });

  test("declares the tools capability and ships instructions", async () => {
    const one = new Session();
    try {
      const res = await one.handshake();
      assert.ok(res.result.capabilities.tools, "clients gate tools/list on this");
      assert.equal(typeof res.result.instructions, "string");
      assert.ok(res.result.instructions.length > 100);
    } finally {
      one.kill();
    }
  });
});

describe("baseline methods", () => {
  test("responds to ping", async () => {
    const res = await s.request("ping");
    assert.deepEqual(res.result, {}, "ping keeps long-lived sessions alive");
  });

  test("returns -32601 for a method the server does not implement", async () => {
    // Clients probe for optional capabilities. A crash or a hang here breaks the session.
    for (const method of ["resources/list", "prompts/list", "completion/complete"]) {
      const res = await s.request(method);
      assert.equal(res.error?.code, -32601, `${method} should report method-not-found`);
    }
  });
});

describe("tools/list", () => {
  test("every tool is well-formed for any client", async () => {
    const tools = (await s.request("tools/list")).result.tools as any[];
    assert.ok(tools.length > 50);

    for (const t of tools) {
      assert.ok(t.name, "missing name");
      // Some clients reject names outside this character set or over 64 chars.
      assert.match(t.name, /^[A-Za-z0-9_-]{1,64}$/, `bad tool name: ${t.name}`);
      assert.ok(t.description && t.description.length > 10, `${t.name} needs a usable description`);
      assert.equal(t.inputSchema?.type, "object", `${t.name} inputSchema must be an object schema`);
      assert.ok(t.inputSchema.properties, `${t.name} needs properties`);
      if (t.inputSchema.required) {
        assert.ok(Array.isArray(t.inputSchema.required), `${t.name} required must be an array`);
        for (const r of t.inputSchema.required) {
          assert.ok(r in t.inputSchema.properties, `${t.name} requires "${r}" but does not declare it`);
        }
      }
    }
  });

  test("tool names are unique", async () => {
    const names = ((await s.request("tools/list")).result.tools as any[]).map((t) => t.name);
    assert.equal(new Set(names).size, names.length);
  });

  test("documentation tools are always present", async () => {
    const names = ((await s.request("tools/list")).result.tools as any[]).map((t) => t.name);
    assert.ok(names.includes("searchGravvDocs"));
    assert.ok(names.includes("getGravvDocPage"));
  });
});

describe("tools/call", () => {
  test("an unknown tool is a tool-level error, not a protocol error", async () => {
    // Returning a JSON-RPC error here would abort the client's turn instead of letting
    // the model read the message and correct itself.
    const res = await s.request("tools/call", { name: "noSuchTool", arguments: {} });
    assert.equal(res.error, undefined, "must not be a protocol-level error");
    assert.equal(res.result.isError, true);
    assert.equal(res.result.content[0].type, "text");
  });

  test("results always carry a text content block", async () => {
    const res = await s.request("tools/call", {
      name: "searchGravvDocs",
      arguments: { query: "wallets", limit: 1 },
    });
    assert.ok(Array.isArray(res.result.content));
    assert.equal(res.result.content[0].type, "text");
    assert.equal(typeof res.result.content[0].text, "string");
  });

  test("missing required arguments fail gracefully", async () => {
    const res = await s.request("tools/call", { name: "getAccount", arguments: {} });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /account_id/);
  });
});
