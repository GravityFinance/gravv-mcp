import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { GravvClient, GravvApiError, hintFor } from "../src/client.ts";
import { ERROR_FIXES, RESULT_STEPS, errorFixFor, nextStepFor } from "../src/fix-hints.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";
import { createServer } from "../src/server.ts";
import { FALSE_TEXT } from "./false-text.ts";

/**
 * One error per fix, in the shape the API sends it (the contracts' error tables). Most
 * payee and transfer errors are a 400 with no code; the message is all there is.
 */
const FIXTURES: Record<string, { tool: string; status: number; body: unknown }> = {
  "payee-duplicate": {
    tool: "createExternalAccount",
    status: 400,
    body: {
      data: { payee_id: "4b1f2c3d-0000-4000-8000-000000000001" },
      error: "a recipient with the same account name, account number and bank already exists",
    },
  },
  "payee-not-correctable": {
    tool: "updateExternalAccount",
    status: 409,
    body: { data: null, error: "external account is not correctable in its current state", code: "ERROR_CODE_PAYEE_INVALID_STATE" },
  },
  "payee-missing-info": {
    tool: "createTransfer",
    status: 400,
    body: { data: null, error: "the payee is missing required information for this transfer type — please update the payee details" },
  },
  "payee-not-set-up": {
    tool: "createTransfer",
    status: 400,
    body: { data: null, error: "this payee is not yet set up for transfers — please contact support to complete its setup" },
  },
  "route-closed": {
    tool: "createTransfer",
    status: 400,
    body: { data: null, error: "transfers to NG/NGN are not available at this time" },
  },
  "transfer-limit": {
    tool: "createTransfer",
    status: 422,
    body: { data: null, error: "weekly transfer limit exceeded", code: "ERROR_CODE_LIMIT_EXCEEDED", window: "weekly" },
  },
  "not-paused": { tool: "resumeTransfer", status: 400, body: { data: null, error: "this transfer is not paused" } },
  "customer-exists": {
    tool: "createCustomer",
    status: 400,
    body: { data: null, error: "failed to add customer: email already exists" },
  },
  "kyc-incomplete": {
    tool: "createAccountV2",
    status: 400,
    body: {
      data: null,
      error: "the customer for the customer_id supplied has not completed KYC",
      details: { customer_id: "CUSTOMER_KYC_INCOMPLETE" },
    },
  },
  "kyc-already-completed": {
    tool: "startCustomerKycS2S",
    status: 409,
    body: { data: null, error: "KYC_ALREADY_COMPLETED: the customer's KYC is already completed" },
  },
  "kyc-missing-documents": {
    tool: "startCustomerKycS2S",
    status: 400,
    body: { data: null, error: "INVALID_REQUEST: missing required documents: ID_CARD back" },
  },
  "account-limit": {
    tool: "createAccountV2",
    status: 409,
    body: { data: null, error: "this customer already holds the maximum number of USD accounts for this option" },
  },
  "card-account": {
    tool: "createCardApplication",
    status: 400,
    body: { data: null, error: "account must be a card account, but this account's type is operating" },
  },
  "kyc-file-too-large": {
    tool: "uploadCustomerKycDocument",
    status: 413,
    body: { data: null, error: "the uploaded file is too large — the maximum is 10MB" },
  },
  "card-kyc-file-too-large": {
    tool: "uploadCardholderKycDocument",
    status: 400,
    body: { data: null, error: "grpc: received message larger than max (11534336 vs. 10485760)" },
  },
  "transfer-document-too-large": {
    tool: "uploadTransferDocument",
    status: 400,
    body: {
      data: null,
      error:
        "content: the file is 812 KB (831488 bytes); the largest accepted is 700 KB (716800 bytes). Compress it or " +
        "upload a smaller scan",
      code: "ERROR_CODE_SUPPORTING_DOCUMENT_INVALID",
    },
  },
  "card-activate-fault": {
    tool: "activateFeature",
    status: 400,
    body: { data: null, error: "cards service: internal server error" },
  },
  "card-account-create": {
    tool: "createAccount",
    status: 400,
    body: {
      data: null,
      error: "failed to create internal account: card accounts cannot be created for this customer — this account type is reserved for the tenant",
    },
  },
  "card-declined": { tool: "chargeSavedCard", status: 400, body: { data: null, error: "do_not_honor: payment declined" } },
  "intent-id": { tool: "chargeSavedCard", status: 400, body: { data: null, error: "invalid payment_intent_id format" } },
  "client-reference-used": {
    tool: "createCollection",
    status: 400,
    body: { data: null, error: "client_reference: 'order-1042' already exists" },
  },
  "fx-quote-expired": { tool: "createFxOrder", status: 400, body: { data: null, error: "quote is invalid or expired" } },
  "fx-source-not-charged": {
    tool: "createFxOrder",
    status: 400,
    body: { data: null, error: "order source could not be charged" },
  },
  "fx-destination": {
    tool: "createFxOrder",
    status: 400,
    body: { data: null, error: "bad destination: [400] invalid order destination" },
  },
};

const KNOWN = new Set(TOOLS_BY_NAME.keys());

/** What the client raises for this answer, through the real request path. */
async function raised(tool: string, status: number, body: unknown): Promise<GravvApiError> {
  const t = TOOLS_BY_NAME.get(tool)!;
  const fetchImpl = (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  const client = new GravvClient({ apiKey: "grvSec_sandbox_fix", fetchImpl, sleep: async () => {} });
  const args = Object.fromEntries(t.pathParams.map((p) => [p, "4b1f2c3d-0000-4000-8000-000000000009"]));
  try {
    await client.call(t, args);
  } catch (err) {
    if (err instanceof GravvApiError) return err;
    throw err;
  }
  throw new Error(`${tool} did not fail`);
}

describe("fix hints", () => {
  test("each fix names scenarios, real tools, and a way to match it", () => {
    const ids = ERROR_FIXES.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const f of ERROR_FIXES) {
      assert.ok(f.scenarios.length > 0 && f.scenarios.every((s) => /^S-[A-Z0-9]+-\d\d$/.test(s)), f.id);
      assert.ok(f.tools.length > 0, f.id);
      for (const t of f.tools) assert.ok(KNOWN.has(t), `${f.id}: ${t} is not a tool`);
      assert.ok((f.codes?.length ?? 0) + (f.messages?.length ?? 0) > 0, f.id);
      assert.ok(FIXTURES[f.id], `${f.id} needs a fixture`);
    }
  });

  test("every tool name a hint names is a real tool", () => {
    for (const f of ERROR_FIXES) {
      for (const m of f.hint.replace(/`[^`]*`/g, "").matchAll(/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g)) {
        assert.ok(KNOWN.has(m[0]), `${f.id}: "${m[0]}" is not a tool`);
      }
    }
  });

  for (const [pattern, why] of FALSE_TEXT) {
    test(`no hint says ${pattern} (${why})`, () => {
      for (const f of ERROR_FIXES) assert.doesNotMatch(f.hint, pattern, `${f.id}: ${why}`);
    });
  }

  for (const [id, fx] of Object.entries(FIXTURES)) {
    test(`${id}: the API's answer gets the fix`, async () => {
      const fix = ERROR_FIXES.find((f) => f.id === id)!;
      const err = await raised(fx.tool, fx.status, fx.body);
      assert.equal(err.hint, fix.hint);
      assert.equal(err.outcomeUnknown, fix.outcomeKnown === false, "outcome_unknown follows the fix");
    });
  }

  test("a known refusal that looks like a server fault is not an unknown outcome", async () => {
    // "failed to …" reads as a server fault; these two are refusals with a known cause.
    for (const id of ["customer-exists", "card-account-create"]) {
      const fx = FIXTURES[id]!;
      assert.equal((await raised(fx.tool, fx.status, fx.body)).outcomeUnknown, false, id);
    }
  });

  test("a fix applies only to the tools that return it", () => {
    const transfer = TOOLS_BY_NAME.get("createTransfer")!;
    assert.equal(errorFixFor("createTransfer", 400, "quote is invalid or expired", null), undefined);
    assert.doesNotMatch(hintFor(400, transfer, "quote is invalid or expired") ?? "", /getFxQuote/);
  });

  test("a code is matched whole, wherever the body puts it", () => {
    assert.equal(errorFixFor("createAccountV2", 400, "bad", { error: { code: "CUSTOMER_KYC_INCOMPLETE" } })?.id, "kyc-incomplete");
    assert.equal(errorFixFor("createAccountV2", 400, "bad", { error: "CUSTOMER_KYC_INCOMPLETE_X" }), undefined);
  });

  test("timeouts, 429s and server errors keep their own rules", () => {
    for (const status of [0, 408, 429, 500, 503]) {
      assert.equal(errorFixFor("createFxOrder", status, "quote is invalid or expired", null), undefined, `${status}`);
    }
  });

  test("a replayed fix still says it is the stored answer", () => {
    const fx = TOOLS_BY_NAME.get("createFxOrder")!;
    const hint = hintFor(400, fx, "quote is invalid or expired", null, { replayed: true }) ?? "";
    assert.match(hint, /^This is the stored answer to an earlier call/);
    assert.match(hint, /without idempotency_key\. Nothing was ordered/);
  });
});

/** One 200 answer per next step, as `data` (the gateway's wrapper removed). */
const RESULTS: Record<string, { tool: string; data: unknown; says: RegExp }> = {
  "transfer-paused": {
    tool: "createTransfer",
    data: {
      transfer_status: "paused",
      reference: "7c1d2e3f-0000-4000-8000-000000000001",
      pause_reason: "supporting_document_required",
      requirements: [{ type: "supporting_document", description: "An invoice for this payment" }],
      expires_at: "2026-10-21T10:00:00Z",
    },
    says: /Not a failure: the transfer is paused \(supporting_document_required\)[^]*uploadTransferDocument[^]*resumeTransfer with id set to the transfer `reference`/,
  },
  "transfer-waiting-approval": {
    tool: "createTransfer",
    data: { transfer_status: "waiting_approval", status: "pending" },
    says: /Waiting for approval in the Gravv Dashboard/,
  },
  "transaction-paused": {
    tool: "getTransaction",
    data: { id: "t1", status: "paused", reference: "7c1d2e3f-0000-4000-8000-000000000001" },
    says: /Paused, not failed[^]*this row's `reference`/,
  },
  "manual-review": {
    tool: "getWebhookHistory",
    data: {
      items: [
        { event_type: "transfer.status.failed", event_data: { transfer_status: "manual_processing_required" } },
      ],
    },
    says: /held for manual review[^]*not lost/,
  },
  "intent-charge-failed": {
    tool: "createCardPaymentIntent",
    data: { status: "charge_failed", message: "card declined" },
    says: /a decline, not an error[^]*at most 5 attempts within 24 hours/,
  },
  "intent-requires-action": {
    tool: "chargeSavedCard",
    data: { status: "requires_action", next_action_url: "https://checkout.test/3ds" },
    says: /next_action_url/,
  },
  "card-kyc-upload-error": {
    tool: "uploadCardholderKycDocument",
    data: { status: "error", error_code: "DOCUMENT_ERROR" },
    says: /The file was refused/,
  },
  "card-kyc-s2s-code": {
    tool: "startCardholderKycS2S",
    data: { code: "MISSING_DOCUMENTS", details: { missing_documents: ["SELFIE"] } },
    says: /details\.missing_documents/,
  },
  "feature-liveness": {
    tool: "activateFeature",
    data: { status: "pending_liveness", websdk_url: "https://liveness.test/x" },
    says: /websdk_url[^]*activateFeature again/,
  },
  "application-null": { tool: "getAccountApplication", data: null, says: /No application has this id/ },
  "account-v2-action": {
    tool: "getAccountV2",
    data: { status: "pending", requires_user_action: true, status_reason: "documents_required", application_id: "a1" },
    says: /updateAccountApplicationV2/,
  },
  "payee-pending": { tool: "createExternalAccount", data: { id: "p1", status: "pending" }, says: /until `active`/ },
  "limits-default-tier": {
    tool: "getRemitterLimits",
    data: { remitter_id: "r1", tier_assignment: "default", mode: "enforce" },
    says: /default tier/,
  },
  "limits-shadow": { tool: "getCustomerLimits", data: { mode: "shadow", windows: [] }, says: /measured, not enforced/ },
};

describe("next steps on 200 answers", () => {
  test("each step names scenarios and real tools, and has a fixture", () => {
    for (const s of RESULT_STEPS) {
      assert.ok(s.scenarios.length > 0, s.id);
      for (const t of s.tools) assert.ok(KNOWN.has(t), `${s.id}: ${t} is not a tool`);
      assert.ok(RESULTS[s.id], `${s.id} needs a fixture`);
    }
  });

  for (const [id, r] of Object.entries(RESULTS)) {
    test(`${id}: the answer gets its step, and every tool it names is real`, () => {
      const step = nextStepFor(r.tool, r.data) ?? "";
      assert.match(step, r.says);
      for (const m of step.replace(/`[^`]*`/g, "").matchAll(/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g)) {
        assert.ok(KNOWN.has(m[0]), `${id}: "${m[0]}" is not a tool`);
      }
      for (const [pattern, why] of FALSE_TEXT) assert.doesNotMatch(step, pattern, `${id}: ${why}`);
    });
  }

  test("each pause reason gets its own ask", () => {
    const step = (pause_reason: string) => nextStepFor("createTransfer", { transfer_status: "paused", pause_reason }) ?? "";
    assert.match(step("sender_details_required"), /additional_information/);
    assert.match(step("weekly"), /getCustomerLimits or getRemitterLimits/);
    assert.match(step("screening"), /nothing to send/);
    assert.match(nextStepFor("resumeTransfer", { resumed: false, requirements: [] }) ?? "", /still|paused/);
  });

  test("an answer that is done gets no step", () => {
    assert.equal(nextStepFor("createTransfer", { transfer_status: "pending" }), undefined);
    assert.equal(nextStepFor("getTransaction", { status: "completed" }), undefined);
    assert.equal(nextStepFor("resumeTransfer", { resumed: true }), undefined);
    assert.equal(nextStepFor("getExternalAccount", { status: "active" }), undefined);
    assert.equal(nextStepFor("getAccount", null), undefined, "only the v1 application read means data null");
  });

  test("the server returns next_step ahead of data", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ data: { resumed: false, transfer_status: "paused", pause_reason: "sender_details_required" }, error: null }),
        { status: 200 },
      )) as unknown as typeof fetch;
    const { server } = createServer({
      apiKey: "grvSec_sandbox_next",
      toolsets: "all",
      readOnly: false,
      allowLiveWrites: false,
      fetchImpl,
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "next-step", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    try {
      const res = (await client.callTool({
        name: "resumeTransfer",
        arguments: { id: "7c1d2e3f-0000-4000-8000-000000000001", confirm: true },
      })) as any;
      const payload = JSON.parse(res.content[0].text);
      assert.deepEqual(Object.keys(payload).slice(0, 3), ["environment", "next_step", "data"]);
      assert.match(payload.next_step, /sender details/);
    } finally {
      await client.close();
    }
  });
});
