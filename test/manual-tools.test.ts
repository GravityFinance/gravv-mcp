/**
 * The hand-authored half of the tool surface, and the routes deliberately absent from it.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectTools } from "../src/server.ts";
import { SafetyGate } from "../src/safety.ts";
import { GravvClient } from "../src/client.ts";
import { MANUAL_TOOLS, MANUAL_TOOL_NAMES } from "../src/manual-tools.ts";
import { BLOCKED_TOOL_NAMES, MONEY_OPS, DEFAULT_TOOLSETS, opKey } from "../src/curation.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

const gate = () => new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: false });
const all = () => selectTools("all", gate());
const byName = (name: string) => all().find((t) => t.name === name)!;

describe("dashboard-only routes are refused, not offered", () => {
  // Every approve/reject route carries middleware.DashboardOnly() on the gateway, which
  // rejects an API key with a bare 403 naming no reason. A tool for one could only ever
  // fail, so the name resolves to an explanation instead.
  const dashboardOnly = [
    "approveTransfer",
    "rejectTransfer",
    "approveExternalAccount",
    "rejectExternalAccount",
    "approveFxOrder",
    "rejectFxOrder",
    "searchWebhookIngestion",
  ];

  test("none of them is a registered tool", () => {
    const listed = all().map((t) => t.name);
    for (const name of dashboardOnly) {
      assert.ok(!listed.includes(name), `${name} cannot work with an API key and must not be advertised`);
    }
  });

  test("each explains where the work actually happens", () => {
    for (const name of dashboardOnly) {
      const message = BLOCKED_TOOL_NAMES[name];
      assert.ok(message, `${name} must resolve to an explanation, not "unknown tool"`);
      assert.match(message, /dashboard|API key/i);
    }
  });

  test("the approvals toolset is gone rather than empty", () => {
    assert.ok(!(DEFAULT_TOOLSETS as string[]).includes("approvals"));
    assert.equal(
      all().filter((t) => (t.toolset as string) === "approvals").length,
      0,
      "an empty toolset would still appear in --toolsets and in the instructions",
    );
  });
});

describe("manual tool registration", () => {
  test("every hand-authored tool is registered alongside the generated ones", () => {
    const listed = all().map((t) => t.name);
    for (const t of MANUAL_TOOLS) {
      assert.ok(listed.includes(t.name), `${t.name} should be registered`);
    }
    assert.equal(MANUAL_TOOL_NAMES.size, MANUAL_TOOLS.length, "names must be unique");
  });

  test("no hand-authored tool collides with a generated one", () => {
    for (const t of MANUAL_TOOLS) {
      assert.equal(TOOLS_BY_NAME.get(t.name), undefined, `${t.name} duplicates a generated tool`);
    }
  });

  test("every declared path parameter appears in the path template", () => {
    for (const t of MANUAL_TOOLS) {
      for (const p of t.pathParams) {
        assert.ok(t.path.includes(`{${p}}`), `${t.name}: ${p} is not in ${t.path}`);
      }
      const templated = [...t.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
      assert.deepEqual(
        [...t.pathParams].sort(),
        templated.sort(),
        `${t.name}: path template and pathParams disagree`,
      );
    }
  });

  test("every path parameter is a required argument", () => {
    for (const t of MANUAL_TOOLS) {
      const required = ((t.inputSchema as any).required ?? []) as string[];
      for (const p of t.pathParams) {
        assert.ok(required.includes(p), `${t.name}: ${p} builds the URL and must be required`);
      }
    }
  });

  test("every argument the tool sends is declared in its schema", () => {
    for (const t of MANUAL_TOOLS) {
      const props = Object.keys((t.inputSchema as any).properties ?? {});
      for (const k of [...t.pathParams, ...t.queryParams, ...t.bodyProps]) {
        assert.ok(props.includes(k), `${t.name}: ${k} is sent but not declared`);
      }
    }
  });

  test("a tool that sends no body says so", () => {
    for (const t of MANUAL_TOOLS) {
      if (t.bodyMode === "none") {
        assert.equal(t.bodyProps.length, 0, `${t.name} declares body props but sends no body`);
      }
      if (t.method === "get" || t.method === "delete") {
        assert.equal(t.bodyMode, "none", `${t.name} is a ${t.method} and must not carry a body`);
      }
    }
  });
});

describe("descriptions only point at tools that exist", () => {
  // Descriptions route the model between tools — "check getExternalAccount first",
  // "take the token from createCardPaymentIntent". A name that is wrong or retired sends
  // it looking for a tool that is not there, which reads as a broken server rather than a
  // typo in prose. Includes the generated tools, whose PREREQUISITES do the same thing.
  const VERB =
    /\b(get|list|create|update|delete|charge|refund|capture|reject|start|submit|process|approve|search|check|activate|verify|withdraw|export|retry|has|save|respond|accept|upload|complete)[A-Z][A-Za-z0-9]+/g;

  // Names that legitimately appear in prose without being tools of this server.
  const NOT_TOOLS = new Set(["getStarted"]);

  test("every tool name mentioned in a description is a real tool", () => {
    const known = new Set([
      ...all().map((t) => t.name),
      ...Object.keys(BLOCKED_TOOL_NAMES),
      "searchGravvDocs",
      "getGravvDocPage",
    ]);
    const bad: string[] = [];
    for (const tool of all()) {
      for (const match of tool.description.match(VERB) ?? []) {
        if (!known.has(match) && !NOT_TOOLS.has(match)) bad.push(`${tool.name} -> ${match}`);
      }
    }
    assert.deepEqual(bad, [], "a description points at a tool that does not exist");
  });
});

describe("manual tools agree with curation about money and idempotency", () => {
  test("movesMoney matches MONEY_OPS, which the generated tools also read", () => {
    for (const t of MANUAL_TOOLS) {
      assert.equal(
        t.movesMoney,
        MONEY_OPS.has(opKey(t.method, t.path)),
        `${t.name}: movesMoney disagrees with MONEY_OPS`,
      );
    }
  });

  test("the money-moving ones are the collection debits and credits", () => {
    assert.deepEqual(
      MANUAL_TOOLS.filter((t) => t.movesMoney).map((t) => t.name).sort(),
      ["captureCollection", "refundCollection", "retryCollectionRefund"],
    );
  });

  test("every money-moving tool offers confirm, or it could never be executed", () => {
    for (const t of MANUAL_TOOLS.filter((t) => t.movesMoney)) {
      assert.ok((t.inputSchema as any).properties.confirm, `${t.name} has no confirm argument`);
    }
  });

  test("POSTs carry an idempotency key and reads do not", () => {
    for (const t of MANUAL_TOOLS) {
      assert.equal(
        t.needsIdempotency,
        t.method === "post",
        `${t.name}: idempotency should follow the gateway's POST-only rule`,
      );
    }
  });
});

describe("collection money movement is gated", () => {
  const preview = (body: unknown) => ({ method: "POST", path: "/v1/collections/{id}/refund", body });

  test("a refund returns a preview before it executes", () => {
    const tool = byName("refundCollection");
    const pending = gate().check(tool, { id: "txn_1" }, preview({ amount_cents: 1050, currency: "USD" }));
    assert.ok(pending, "expected a confirmation object");
    assert.equal(pending.status, "confirmation_required");
  });

  test("confirm: true lets it through", () => {
    const tool = byName("refundCollection");
    assert.equal(gate().check(tool, { id: "txn_1", confirm: true }, preview({})), null);
  });

  test("releasing a hold is not money movement", () => {
    // rejectCollection drops an authorization. Nothing is charged and nothing is
    // returned, so a confirmation step would be noise.
    assert.equal(byName("rejectCollection").movesMoney, false);
  });
});

describe("manual tools on the wire", () => {
  function stub(status = 200, body: unknown = { data: {} }) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  const client = (fetchImpl: typeof fetch) =>
    new GravvClient({ apiKey: "grvSec_sandbox_x", baseUrl: "https://api.test", fetchImpl });

  test("authenticates with the API key, like every other tool", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("getTotalWalletBalance"), {});
    assert.equal((calls[0]!.init.headers as any)["Api-Key"], "grvSec_sandbox_x");
  });

  test("path parameters land in the URL, not the body", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("refundCollection"), {
      id: "txn_1",
      amount_cents: 1050,
      confirm: true,
    });
    assert.equal(calls[0]!.url, "https://api.test/v1/collections/txn_1/refund");
    const body = JSON.parse(String(calls[0]!.init.body));
    assert.deepEqual(body, { amount_cents: 1050 }, "id and confirm must not be forwarded");
  });

  test("two path parameters are both substituted", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("retryCollectionRefund"), {
      id: "txn_1",
      refund_id: "ref_2",
      confirm: true,
    });
    assert.equal(calls[0]!.url, "https://api.test/v1/collections/txn_1/refunds/ref_2/retry");
  });

  test("query parameters are appended, and repeated ones stay repeated", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("listChargebacks"), {
      transaction_uuids: ["a", "b"],
      status: "pending_evidence",
    });
    assert.equal(
      calls[0]!.url,
      "https://api.test/v1/collections/chargebacks?transaction_uuids=a&transaction_uuids=b&status=pending_evidence",
    );
    assert.equal(calls[0]!.init.body, undefined, "a GET must not carry a body");
  });

  test("a POST carries a generated Idempotency-Key", async () => {
    const { calls, fetchImpl } = stub();
    const res = await client(fetchImpl).call(byName("requestFeatureAccess"), {
      feature: "card_acquiring",
      application: { volume: "100k" },
    });
    assert.ok((calls[0]!.init.headers as any)["Idempotency-Key"], "POSTs are rejected without one");
    assert.ok(res.idempotencyKey);
  });

  test("a PATCH does not, because the gateway only dedupes POSTs", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("updateFeatureAccessRequest"), {
      id: "req_1",
      application: { volume: "100k" },
    });
    assert.equal((calls[0]!.init.headers as any)["Idempotency-Key"], undefined);
  });

  test("a nested body object survives intact", async () => {
    const { calls, fetchImpl } = stub();
    await client(fetchImpl).call(byName("getWalletBalances"), {
      wallets: [{ address: "0xabc", network: "polygon", asset: "USDC" }],
    });
    assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
      wallets: [{ address: "0xabc", network: "polygon", asset: "USDC" }],
    });
  });
});
