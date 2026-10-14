import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SafetyGate, SafetyError, redact, checkCollectionMethods } from "../src/safety.ts";
import { detectEnvironment } from "../src/client.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

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

describe("previews for the newly gated tools", () => {
  test("a payment intent with a card token says it charges now", () => {
    const intent = TOOLS_BY_NAME.get("createCardPaymentIntent")!;
    const body = { amount: "50", currency: "USD", card_token: "tokn_1" };
    const result = gate().check(intent, body, { method: "POST", path: intent.path, body });
    assert.match(result!.willDo, /Charge 50 USD to saved card token tokn_1 now/);
  });

  test("a payment intent without a token says no money moves yet", () => {
    const intent = TOOLS_BY_NAME.get("createCardPaymentIntent")!;
    const body = { amount: "50", currency: "USD" };
    const result = gate().check(intent, body, { method: "POST", path: intent.path, body });
    assert.match(result!.willDo, /payment link for 50 USD/);
    assert.match(result!.willDo, /No money moves/);
  });

  test("an FX cancel names the order and the lost refund", () => {
    const cancel = TOOLS_BY_NAME.get("cancelFxOrder")!;
    const result = gate().check(cancel, { order_id: "ord_1" }, { method: "POST", path: cancel.path, body: undefined });
    assert.match(result!.willDo, /Cancel FX order ord_1/);
    assert.match(result!.willDo, /does not return funds/);
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

describe("collections routes card payments to payment intents", () => {
  // createCollection and createCardPaymentIntent both return a hosted payment link for
  // cards, but only the intent yields an intent id and the card token recurring charges
  // need. Two tools offering the same job is how a model lands on the weaker one.
  test("the schema no longer offers card methods", () => {
    const schema = JSON.stringify(TOOLS_BY_NAME.get("createCollection")!.inputSchema);
    for (const m of ["card", "apple_pay", "google_pay"]) {
      assert.doesNotMatch(schema, new RegExp(`"${m}"`), `${m} should not be offered`);
    }
  });

  test("the rails payment intents cannot express are still offered", () => {
    const schema = JSON.stringify(TOOLS_BY_NAME.get("createCollection")!.inputSchema);
    for (const m of ["pix", "mobile_money", "bank_transfer"]) {
      assert.match(schema, new RegExp(`"${m}"`), `${m} must remain available`);
    }
  });

  test("the description says where card payments go", () => {
    const d = TOOLS_BY_NAME.get("createCollection")!.description;
    assert.match(d, /NOT FOR CARD PAYMENTS/);
    assert.match(d, /createCardPaymentIntent/);
  });

  test("createCardPaymentIntent still handles cards", () => {
    assert.match(JSON.stringify(TOOLS_BY_NAME.get("createCardPaymentIntent")!.inputSchema), /"card"/);
  });

  test("a card method smuggled past the schema is redirected", () => {
    // additionalProperties is true, so the model can still send methods the enum omits
    // and the API would accept them — succeeding through the weaker path with no error.
    for (const m of ["card", "apple_pay", "google_pay"]) {
      const msg = checkCollectionMethods("createCollection", { source: { methods: [m] } });
      assert.ok(msg, `${m} should be redirected`);
      assert.match(msg, /createCardPaymentIntent/);
    }
  });

  test("the remaining rails pass through untouched", () => {
    for (const m of ["pix", "mobile_money", "bank_transfer"]) {
      assert.equal(checkCollectionMethods("createCollection", { source: { methods: [m] } }), null);
    }
  });

  test("a mixed request is caught on the card element", () => {
    const msg = checkCollectionMethods("createCollection", {
      source: { methods: ["bank_transfer", "card"] },
    });
    assert.match(msg!, /card/);
  });

  test("other tools and malformed bodies are ignored", () => {
    assert.equal(checkCollectionMethods("createTransfer", { source: { methods: ["card"] } }), null);
    assert.equal(checkCollectionMethods("createCollection", {}), null);
    assert.equal(checkCollectionMethods("createCollection", { source: { methods: "card" } }), null);
    assert.equal(checkCollectionMethods("createCollection", undefined), null);
  });
});
