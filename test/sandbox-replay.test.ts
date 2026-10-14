import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ReplayRefused,
  STEPS,
  VERIFIED_CUSTOMERS,
  runReplay,
  stepProblems,
  type ReplayStep,
} from "../scripts/sandbox-replay.ts";
import { buildArguments, findTool, isPlaceholder } from "../scripts/scenarios.ts";
import { checkSchema } from "../scripts/schema-check.ts";

const KEY = "grvSec_sandbox_replay_test";

interface Sent {
  method: string;
  url: string;
  body: unknown;
  key: string | null;
}

/** A stub sandbox: answers each route with the keys the steps expect, and records every request. */
function stub(override: (url: URL, method: string) => Response | undefined = () => undefined) {
  const sent: Sent[] = [];
  const fetchImpl = (async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    sent.push({ method, url: url.toString(), body: init.body ? JSON.parse(String(init.body)) : undefined, key: headers.get("Api-Key") });
    const custom = override(url, method);
    if (custom) return custom;
    const step = STEPS.find((s) => s.method === method && s.path.split("?")[0] === url.pathname);
    const data = Object.fromEntries((step?.expect.dataKeys ?? []).map((k) => [k, k === "id" || k === "transaction_id" ? `made-${k}` : "x"]));
    return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { sent, fetchImpl };
}

describe("step rules", () => {
  test("every step keeps the rules", () => {
    assert.deepEqual(STEPS.flatMap(stepProblems), []);
    assert.deepEqual(new Set(STEPS.map((s) => s.id)).size, STEPS.length);
  });

  test("every step that has a tool fits its schema", () => {
    for (const step of STEPS) {
      const [path = "", qs = ""] = step.path.split("?", 2);
      const found = findTool(step.method, path);
      if (!found) continue;
      const built = buildArguments(found.tool, found.params, new URLSearchParams(qs), step.body);
      assert.ok("args" in built, step.id);
      assert.deepEqual(checkSchema(found.tool.inputSchema, built.args, { strict: true, isPlaceholder }), [], step.id);
    }
  });

  test("a step that would edit a customer, touch KYC or create elsewhere is refused", () => {
    const base: ReplayStep = {
      id: "X",
      what: "x",
      kind: "read",
      method: "GET",
      path: `/v1/customers/${VERIFIED_CUSTOMERS[0]}`,
      expect: { status: 200, dataKeys: [] },
      seen: "x",
    };
    assert.deepEqual(stepProblems(base), []);
    assert.match(stepProblems({ ...base, method: "PUT" as "GET" }).join(), /only GET and POST/);
    assert.match(stepProblems({ ...base, path: `/v1/customers/${VERIFIED_CUSTOMERS[0]}/kyc/status` }).join(), /KYC/);
    assert.match(stepProblems({ ...base, path: "/v1/risk/features" }).join(), /risk/);
    assert.match(stepProblems({ ...base, path: "/v1/customers/11111111-2222-4333-8444-555555555555" }).join(), /not a verified customer/);
    const create: ReplayStep = { ...base, kind: "create", method: "POST", path: "/v1/accounts", createdId: "id" };
    assert.match(stepProblems({ ...create, body: { customer_id: "11111111-2222-4333-8444-555555555555", label: "{run}" } }).join(), /verified customer/);
    assert.match(stepProblems({ ...create, body: { customer_id: VERIFIED_CUSTOMERS[1], label: "fixed" } }).join(), /run label/);
  });
});

describe("runReplay", () => {
  test("refuses a missing or live key before any request", async () => {
    for (const apiKey of [undefined, "", "grvSec_abc", "grvsec_sandbox_x", "grvPub_sandbox_x"]) {
      const { sent, fetchImpl } = stub();
      await assert.rejects(runReplay({ apiKey, fetchImpl }), ReplayRefused, String(apiKey));
      assert.equal(sent.length, 0);
    }
  });

  test("refuses a broken step list before any request", async () => {
    const { sent, fetchImpl } = stub();
    const bad = { ...STEPS[0]!, method: "DELETE" as "GET" };
    await assert.rejects(runReplay({ apiKey: KEY, steps: [bad], fetchImpl }), /only GET and POST/);
    assert.equal(sent.length, 0);
  });

  test("runs the reads and the create, skips the money step, and lists what it made", async () => {
    const { sent, fetchImpl } = stub();
    const report = await runReplay({ apiKey: KEY, run: "mcp-replay-test", fetchImpl });
    const outcomes = Object.fromEntries(report.steps.map((s) => [s.id, s.outcome]));
    assert.deepEqual(outcomes, { R1: "pass", R2: "pass", R3: "pass", R4: "pass", R5: "pass", R6: "pass", C1: "pass", M1: "skipped" });
    assert.match(report.steps.find((s) => s.id === "M1")!.note!, /--money/);
    assert.deepEqual(report.cleanup, [{ step: "C1", what: STEPS.find((s) => s.id === "C1")!.what, id: "made-id" }]);

    assert.ok(sent.every((r) => r.method === "GET" || r.method === "POST"));
    assert.ok(sent.every((r) => r.url.startsWith("https://api.gravv.xyz/")));
    assert.ok(sent.every((r) => r.key === KEY));
    const create = sent.find((r) => r.method === "POST")!;
    assert.equal((create.body as { label: string }).label, "mcp-replay-test USD");
    assert.ok(!JSON.stringify(report).includes(KEY), "the key is never in the report");
  });

  test("with --money the book transfer runs, confirmed and labelled", async () => {
    const { sent, fetchImpl } = stub();
    const report = await runReplay({ apiKey: KEY, run: "mcp-replay-test", money: true, fetchImpl });
    assert.equal(report.steps.find((s) => s.id === "M1")!.outcome, "pass");
    const transfer = sent.find((r) => r.url.endsWith("/v1/transfer"))!;
    assert.equal((transfer.body as { client_reference: string }).client_reference, "mcp-replay-test-book");
    assert.equal((transfer.body as Record<string, unknown>).confirm, undefined, "confirm is an MCP argument, not sent");
    assert.deepEqual(
      report.cleanup.map((c) => c.id),
      ["made-id", "made-transaction_id"],
    );
  });

  test("a changed status or a missing data key is a difference", async () => {
    const { fetchImpl } = stub((url) => {
      if (url.pathname === `/v1/customers/${VERIFIED_CUSTOMERS[0]}`) {
        return new Response(JSON.stringify({ data: null, error: { message: "not found" } }), { status: 404 });
      }
      if (url.pathname === "/v1/accounts" && url.search.includes("customer_id")) {
        return new Response(JSON.stringify({ data: { items: [], page: 1, extra: true }, error: null }), { status: 200 });
      }
      return undefined;
    });
    const report = await runReplay({ apiKey: KEY, run: "mcp-replay-test", fetchImpl });
    const r1 = report.steps.find((s) => s.id === "R1")!;
    assert.equal(r1.outcome, "differs");
    assert.equal(r1.status, 404);
    const r3 = report.steps.find((s) => s.id === "R3")!;
    assert.equal(r3.outcome, "differs");
    assert.deepEqual(r3.missingKeys, ["items_per_page", "total_items", "total_pages"]);
    assert.deepEqual(r3.newKeys, ["extra"]);
  });
});
