import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectTools } from "../src/server.ts";
import { SafetyGate } from "../src/safety.ts";
import { GravvClient } from "../src/client.ts";
import { MANUAL_TOOLS, MANUAL_TOOL_NAMES } from "../src/manual-tools.ts";

const gate = () => new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: false });
const names = () => selectTools("all", gate()).map((t) => t.name);

describe("approval tool registration", () => {
  test("all seven are registered alongside the generated tools", () => {
    const listed = names();
    for (const t of MANUAL_TOOLS) {
      assert.ok(listed.includes(t.name), `${t.name} should be registered`);
    }
    assert.equal(MANUAL_TOOL_NAMES.size, 7);
  });

  test("covers every route the API gates behind dashboard auth", () => {
    assert.deepEqual(
      MANUAL_TOOLS.map((t) => `${t.method.toUpperCase()} ${t.path}`).sort(),
      [
        "GET /v1/webhooks/ingestion/search",
        "POST /v1/external-accounts/{id}/approve",
        "POST /v1/external-accounts/{id}/reject",
        "POST /v1/fx/orders/{order_id}/approve",
        "POST /v1/fx/orders/{order_id}/reject",
        "POST /v1/transfer/{id}/approve",
        "POST /v1/transfer/{id}/reject",
      ],
    );
  });
});

describe("approval safety", () => {
  const withToken = (name: string) => selectTools("all", gate()).find((t) => t.name === name)!;

  test("approving is treated as moving money; rejecting is not", () => {
    // Approving releases a held instruction for execution — the same consequence as
    // initiating one. Rejecting only prevents execution, so it needs no gate.
    assert.equal(withToken("approveTransfer").movesMoney, true);
    assert.equal(withToken("approveFxOrder").movesMoney, true);
    assert.equal(withToken("rejectTransfer").movesMoney, false);
    assert.equal(withToken("rejectFxOrder").movesMoney, false);
  });

  test("approving a transfer requires confirm: true", () => {
    const tool = withToken("approveTransfer");
    const pending = gate().check(tool, { id: "trf_1" }, { method: "POST", path: tool.path, body: {} });
    assert.ok(pending, "expected a confirmation prompt");
    assert.equal(pending.status, "confirmation_required");
    assert.equal(gate().check(tool, { id: "trf_1", confirm: true }, { method: "POST", path: tool.path, body: {} }), null);
  });

  test("approvals are refused on a live key without GRAVV_ALLOW_LIVE_WRITES", () => {
    const live = new SafetyGate({ environment: "live", allowLiveWrites: false, readOnly: false });
    const tool = withToken("approveTransfer");
    assert.throws(
      () => live.check(tool, { id: "trf_1", confirm: true }, { method: "POST", path: tool.path, body: {} }),
      /GRAVV_ALLOW_LIVE_WRITES/,
    );
  });

  test("--read-only hides approvals", () => {
    const ro = new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: true });
    const listed = selectTools("all", ro).map((t) => t.name);
    assert.ok(!listed.includes("approveTransfer"));
    assert.ok(!listed.includes("rejectTransfer"));
    // The ingestion search is a GET, so it survives read-only mode.
    assert.ok(listed.includes("searchWebhookIngestion"));
  });
});

describe("approvals on the wire", () => {
  function capture(opts: { apiKey?: string }) {
    const seen: Array<Record<string, string>> = [];
    const fetchImpl = (async (_u: any, init: any) => {
      seen.push(init.headers);
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }) as unknown as typeof fetch;
    return { seen, client: new GravvClient({ ...opts, fetchImpl, ratePerMinute: 1e6, rateBurst: 1e6 }) };
  }

  const approve = MANUAL_TOOLS.find((t) => t.name === "approveTransfer")!;

  test("authenticates with the API key, like every other tool", async () => {
    const { seen, client } = capture({ apiKey: "grvSec_sandbox_x" });
    await client.call(approve, { id: "trf_1" });
    assert.equal(seen[0]!["Api-Key"], "grvSec_sandbox_x");
    assert.equal(seen[0]!.Authorization, undefined, "no bearer token concept exists");
  });

  test("approvals carry a generated Idempotency-Key", async () => {
    const { seen, client } = capture({ apiKey: "grvSec_sandbox_x" });
    await client.call(approve, { id: "trf_1" });
    assert.ok(seen[0]!["Idempotency-Key"], "approve is a POST and the API 400s without one");
  });

  test("the id lands in the path, not the body", async () => {
    const { client } = capture({ apiKey: "grvSec_sandbox_x" });
    const { url, body } = client.buildRequest(approve, { id: "trf_42" });
    assert.ok(url.endsWith("/v1/transfer/trf_42/approve"), url);
    assert.equal((body as any).id, undefined);
  });
});
