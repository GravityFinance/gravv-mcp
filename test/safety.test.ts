import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SafetyGate, SafetyError, redact } from "../src/safety.ts";
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
