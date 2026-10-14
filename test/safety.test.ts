import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SafetyGate, SafetyError, redact, checkCollectionMethods } from "../src/safety.ts";
import { detectEnvironment, isPublishableKey } from "../src/client.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

const transfer = TOOLS_BY_NAME.get("createTransfer")!;
const listAccounts = TOOLS_BY_NAME.get("listAccounts")!;
const preview = {
  method: "POST",
  path: "/v1/transfer",
  body: { amount: 50, source: { id: "acc_1", currency: "USD" } },
};

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

  test("prefixes match exactly and case-sensitively, as the gateway does", () => {
    // The gateway sends anything not starting grvSec_sandbox_ to live, so a loose match
    // could call a live key sandbox and lift the live-write gate.
    assert.equal(detectEnvironment("grvsec_sandbox_abc123"), "unknown");
    assert.equal(detectEnvironment("GRVSEC_LIVE_abc123"), "unknown");
    assert.equal(detectEnvironment("grvSec_live_sandbox123"), "live");
    assert.equal(detectEnvironment("my_sandbox_token"), "unknown");
    assert.equal(detectEnvironment("x_live_token"), "unknown");
  });

  test("a publishable key is recognised so it can be explained, and is never sandbox", () => {
    assert.equal(isPublishableKey("grvPub_abc123"), true);
    assert.equal(isPublishableKey("grvSec_sandbox_abc123"), false);
    assert.equal(detectEnvironment("grvPub_abc123"), "unknown");
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

describe("previews read the fields the schemas really have", () => {
  const willDo = (name: string, body: Record<string, unknown>) => {
    const tool = TOOLS_BY_NAME.get(name)!;
    return gate().check(tool, body, { method: "POST", path: tool.path, body })!.willDo;
  };

  test("a transfer reads source.currency, not a top-level currency", () => {
    assert.match(willDo("createTransfer", { amount: 50, source: { id: "acc_1", currency: "EUR" } }), /Transfer 50 EUR/);
    assert.match(
      willDo("createTransfer", { amount: 50, currency: "USD", source: { id: "acc_1" } }),
      /Transfer 50 in the source account's currency/,
    );
  });

  test("an FX order never prints [object Object] or an approval step", () => {
    const d = willDo("createFxOrder", { amount: "1000", pair: { base: "USD", quote: "EUR" }, side: "sell" });
    assert.doesNotMatch(d, /\[object Object\]/);
    assert.doesNotMatch(d, /waiting_approval|second user/);
    assert.match(d, /USD\/EUR/);
    assert.match(d, /debited when it is placed/);
    assert.match(willDo("createFxOrder", { quote_id: "Q1" }), /for quote Q1/);
  });

  test("a collection names its method from source.methods", () => {
    const d = willDo("createCollection", {
      amount: "20000",
      currency: "NGN",
      source: { source_type: "external", methods: ["bank_transfer"] },
    });
    assert.match(d, /bank_transfer collection of 20000 NGN/);
  });

  test("a saved-card charge names the token and the intent, not a missing amount", () => {
    const d = willDo("chargeSavedCard", { payment_intent_id: "pi_1", card_token: "tokn_1" });
    assert.match(d, /tokn_1/);
    assert.match(d, /pi_1/);
    assert.doesNotMatch(d, /unspecified amount/);
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

describe("confirm-only gating", () => {
  const del = TOOLS_BY_NAME.get("deleteAccountApplication")!;
  const activate = TOOLS_BY_NAME.get("activateFeature")!;
  const delPreview = { method: "DELETE", path: "/v1/accounts/applications/app_1", body: undefined };

  test("a delete returns a preview first, naming what goes", () => {
    const result = gate().check(del, { id: "app_1" }, delPreview);
    assert.equal(result?.status, "confirmation_required");
    assert.match(result!.willDo, /Delete account application app_1\. It cannot be restored/);
    assert.equal(gate().check(del, { id: "app_1", confirm: true }, delPreview), null);
  });

  test("a live key needs no live-writes switch for it, but the preview warns", () => {
    const live = gate({ environment: "live" });
    const pending = live.check(del, { id: "app_1" }, delPreview);
    assert.match(pending!.warning!, /LIVE KEY.*cannot be undone/);
    assert.doesNotMatch(pending!.warning!, /real money/);
    assert.equal(live.check(del, { id: "app_1", confirm: true }, delPreview), null);
    assert.equal(gate({ environment: "unknown" }).check(del, { id: "app_1", confirm: true }, delPreview), null);
  });

  test("feature activation names the feature and the customer", () => {
    const body = { customer_id: "cus_1", feature_id: "virtual_cards" };
    const result = gate().check(activate, body, { method: "POST", path: "/v1/risk/features/activate", body });
    assert.match(result!.willDo, /Activate virtual_cards for customer cus_1/);
  });

  test("read-only mode still refuses it", () => {
    assert.throws(() => gate({ readOnly: true }).check(del, { id: "app_1", confirm: true }, delPreview), SafetyError);
  });
});

describe("sandbox-only tools", () => {
  const simulate = TOOLS_BY_NAME.get("simulateDeposit")!;
  const body = { account_id: "acc_1", amount: "250.00", rail: "wire" };
  const simPreview = { method: "POST", path: "/v2/accounts/simulate/deposit", body };

  test("are advertised and run on a sandbox key", () => {
    assert.equal(simulate.sandboxOnly, true);
    assert.equal(gate().isToolAvailable(simulate), true);
    assert.equal(gate().check(simulate, body, simPreview), null);
  });

  test("are hidden and refused on a live or unrecognised key, before any request", () => {
    for (const environment of ["live", "unknown"] as const) {
      const g = gate({ environment, allowLiveWrites: true });
      assert.equal(g.isToolAvailable(simulate), false, environment);
      assert.throws(
        () => g.check(simulate, body, simPreview),
        (e: Error) => e instanceof SafetyError && /sandbox-only/.test(e.message) && /grvSec_sandbox_/.test(e.message),
      );
    }
  });

  test("only the deposit simulator is sandbox-only", () => {
    assert.deepEqual(
      [...TOOLS_BY_NAME.values()].filter((t) => t.sandboxOnly).map((t) => t.name),
      ["simulateDeposit"],
    );
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

  test("only bank_transfer is offered: pix and mobile_money always fail", () => {
    const schema = JSON.stringify(TOOLS_BY_NAME.get("createCollection")!.inputSchema);
    assert.match(schema, /"bank_transfer"/, "bank_transfer must remain available");
    for (const m of ["pix", "mobile_money"]) {
      assert.doesNotMatch(schema, new RegExp(`"${m}"`), `${m} should not be offered`);
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

  test("bank_transfer passes through untouched", () => {
    assert.equal(checkCollectionMethods("createCollection", { source: { methods: ["bank_transfer"] } }), null);
  });

  test("pix and mobile_money are refused with the reason", () => {
    for (const m of ["pix", "mobile_money"]) {
      const msg = checkCollectionMethods("createCollection", { source: { methods: [m] } });
      assert.ok(msg, `${m} should be refused`);
      assert.match(msg, /only bank_transfer/);
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
