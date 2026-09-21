import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SafetyGate, SafetyError, redact, movesMoney } from "../src/safety.ts";
import { detectEnvironment } from "../src/client.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";
import { BLOCKED_TOOL_NAMES } from "../src/curation.ts";

const transfer = TOOLS_BY_NAME.get("createTransfer")!;
const listAccounts = TOOLS_BY_NAME.get("listAccounts")!;
const preview = { method: "POST", path: "/v1/transfer", body: { amount: 50, currency: "USD" } };

const gate = (over: Partial<ConstructorParameters<typeof SafetyGate>[0]> = {}) =>
  new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: false, ...over });

describe("environment detection", () => {
  test("recognises sandbox and live key prefixes", () => {
    assert.equal(detectEnvironment("grvSec_sandbox_abc123"), "sandbox");
    assert.equal(detectEnvironment("grvSec_live_abc123"), "live");
  });

  test("an unrecognised key is 'unknown', never assumed safe", () => {
    // Failing closed matters: sandbox and live share a base URL, so a key we cannot
    // classify must be treated as potentially live.
    assert.equal(detectEnvironment("some-opaque-token"), "unknown");
  });
});

describe("money-movement gating", () => {
  test("sandbox: first call returns a preview instead of executing", () => {
    const result = gate().check(transfer, {}, preview);
    assert.ok(result, "expected a confirmation object, not null");
    assert.equal(result.status, "confirmation_required");
    assert.match(result.willDo, /Transfer 50 USD/);
    assert.equal(result.warning, undefined, "sandbox should carry no live warning");
  });

  test("sandbox: confirm: true allows execution", () => {
    assert.equal(gate().check(transfer, { confirm: true }, preview), null);
  });

  test("live without GRAVV_ALLOW_LIVE_WRITES refuses even when confirmed", () => {
    // confirm alone is not enough on a live key — two independent signals are required.
    assert.throws(
      () => gate({ environment: "live" }).check(transfer, { confirm: true }, preview),
      (e: Error) => e instanceof SafetyError && /GRAVV_ALLOW_LIVE_WRITES/.test(e.message),
    );
  });

  test("live with both signals executes, and the preview warns first", () => {
    const g = gate({ environment: "live", allowLiveWrites: true });
    const pending = g.check(transfer, {}, preview);
    assert.match(pending!.warning!, /LIVE KEY/);
    assert.equal(g.check(transfer, { confirm: true }, preview), null);
  });

  test("an unknown environment is treated as live", () => {
    assert.throws(
      () => gate({ environment: "unknown" }).check(transfer, { confirm: true }, preview),
      SafetyError,
    );
  });

  test("read operations are never gated", () => {
    assert.equal(gate().check(listAccounts, {}, { method: "GET", path: "/v1/accounts", body: undefined }), null);
  });
});

describe("read-only mode", () => {
  test("hides non-GET tools from the advertised list", () => {
    const g = gate({ readOnly: true });
    assert.equal(g.isToolAvailable(listAccounts), true);
    assert.equal(g.isToolAvailable(transfer), false);
  });

  test("refuses a write even if one is somehow invoked", () => {
    assert.throws(() => gate({ readOnly: true }).check(transfer, { confirm: true }, preview), SafetyError);
  });
});

describe("redaction", () => {
  test("strips cardholder fields at any depth", () => {
    const out = redact({
      id: "card_1",
      card_number: "4111111111111111",
      nested: { cvv: "123", pin: "0000", label: "keep me" },
      list: [{ CVV2: "999" }],
    }) as any;

    assert.equal(out.id, "card_1");
    assert.match(out.card_number, /redacted/);
    assert.match(out.nested.cvv, /redacted/);
    assert.match(out.nested.pin, /redacted/);
    assert.equal(out.nested.label, "keep me", "non-sensitive fields must survive");
    assert.match(out.list[0].CVV2, /redacted/, "matching is case-insensitive");
  });

  test("normalises separators so card-number and card_number both match", () => {
    const out = redact({ "card-number": "4111", card_number: "4111" }) as any;
    assert.match(out["card-number"], /redacted/);
    assert.match(out.card_number, /redacted/);
  });

  test("leaves primitives and nulls alone", () => {
    assert.equal(redact("plain"), "plain");
    assert.equal(redact(null), null);
    assert.deepEqual(redact([1, 2]), [1, 2]);
  });
});

describe("card collection goes through payment intents", () => {
  // The generic POST /v1/collections tool is gone: for a card it returned the same
  // hosted payment link the intent does, minus the intent id and the card token
  // recurring charges need, and two tools for one job is how a model lands on the
  // weaker one.
  test("createCollection is no longer a tool", () => {
    assert.equal(TOOLS_BY_NAME.get("createCollection"), undefined);
  });

  test("the name a model will still reach for names its replacement", () => {
    const msg = BLOCKED_TOOL_NAMES.createCollection;
    assert.ok(msg, "createCollection must resolve to an explanation, not 'unknown tool'");
    assert.match(msg, /createCardPaymentIntent/);
  });

  test("createCardPaymentIntent is the card path", () => {
    const tool = TOOLS_BY_NAME.get("createCardPaymentIntent")!;
    assert.match(JSON.stringify(tool.inputSchema), /"card"/);
    assert.match(tool.description, /CARD COLLECTION PATH/);
  });

  test("status lookup survives the removal", () => {
    // A payment intent charge returns a transaction_id and nothing else reports on it.
    const tool = TOOLS_BY_NAME.get("getCollection")!;
    assert.match(tool.description, /transaction_id/);
  });
});

describe("a payment intent moves money only when it carries a card token", () => {
  const intent = TOOLS_BY_NAME.get("createCardPaymentIntent")!;
  const withToken = {
    method: "POST",
    path: "/v1/collections/cards/payment-intents",
    body: { amount: "3.50", currency: "USD", card_token: "tokn_abc" },
  };
  const linkOnly = { ...withToken, body: { amount: "3.50", currency: "USD" } };

  test("no token: a checkout link charges nothing now, so nothing is gated", () => {
    assert.equal(movesMoney(intent.name, intent.movesMoney, linkOnly.body), false);
    assert.equal(gate().check(intent, {}, linkOnly), null);
  });

  test("a card token charges immediately, so confirmation is required", () => {
    const result = gate().check(intent, {}, withToken);
    assert.ok(result, "expected a confirmation object, not null");
    assert.match(result.willDo, /3.50 USD/);
    assert.match(result.willDo, /tokn_abc/);
    assert.equal(gate().check(intent, { confirm: true }, withToken), null);
  });

  test("the token form is blocked on a live key without GRAVV_ALLOW_LIVE_WRITES", () => {
    assert.throws(
      () => gate({ environment: "live" }).check(intent, { confirm: true }, withToken),
      (e: Error) => e instanceof SafetyError && /GRAVV_ALLOW_LIVE_WRITES/.test(e.message),
    );
  });

  test("an empty or non-string token is not a charge", () => {
    for (const card_token of ["", "   ", 42, null, undefined]) {
      assert.equal(movesMoney(intent.name, intent.movesMoney, { card_token }), false);
    }
    assert.equal(movesMoney(intent.name, intent.movesMoney, undefined), false);
  });

  test("an always-money tool stays gated whatever its body", () => {
    assert.equal(movesMoney(transfer.name, transfer.movesMoney, {}), true);
  });

  test("the schema offers confirm and says when it is needed", () => {
    const confirm = (intent.inputSchema as any).properties.confirm;
    assert.ok(confirm, "the model cannot confirm an argument the schema omits");
    assert.match(confirm.description, /card_token/);
  });
});
