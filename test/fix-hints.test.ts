import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GravvClient, GravvApiError, hintFor } from "../src/client.ts";
import { ERROR_FIXES, errorFixFor } from "../src/fix-hints.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";
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
