import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKED_TOOL_NAMES,
  DEFAULT_TOOLSETS,
  MONEY_OPS,
  RETIRED_TOOLSETS,
  TOOLSETS,
  UnknownToolsetError,
  opKey,
  parseToolsets,
} from "../src/curation.ts";
import { TOOLS, TOOLS_BY_NAME } from "../src/generated/tools.ts";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";

const advertised = new Set([...TOOLS_BY_NAME.keys(), ...MANUAL_TOOLS.map((t) => t.name)]);

/**
 * Tools removed because they could never succeed. Each must stay off the list and keep
 * an explanation, so a saved workflow that names one is told why rather than getting a
 * bare "Unknown tool" and retrying variations.
 */
const REMOVED = [
  "approveTransfer",
  "rejectTransfer",
  "approveExternalAccount",
  "rejectExternalAccount",
  "approveFxOrder",
  "rejectFxOrder",
  "searchWebhookIngestion",
  "createPaymentLink",
  "listPaymentLinks",
  "getPaymentLink",
  "updatePaymentLink",
  "deletePaymentLink",
  "updatePaymentLinkStatus",
  "getPublicPaymentLink",
  "deleteSavedCard",
];

describe("removed tools", () => {
  for (const name of REMOVED) {
    test(`${name} is not advertised and explains itself`, () => {
      assert.equal(advertised.has(name), false, `${name} must not be a tool`);
      assert.ok(BLOCKED_TOOL_NAMES[name], `${name} needs a BLOCKED_TOOL_NAMES entry`);
    });
  }

  test("every blocked name is absent from the tool list", () => {
    for (const name of Object.keys(BLOCKED_TOOL_NAMES)) {
      assert.equal(advertised.has(name), false, `${name} is blocked but still advertised`);
    }
  });
});

describe("toolsets", () => {
  test("retired toolsets are not toolsets any more", () => {
    for (const name of Object.keys(RETIRED_TOOLSETS)) {
      assert.equal((TOOLSETS as readonly string[]).includes(name), false, `${name} is retired`);
    }
  });

  test("the default set is every toolset except account-applications", () => {
    assert.deepEqual(
      [...DEFAULT_TOOLSETS].sort(),
      TOOLSETS.filter((t) => t !== "account-applications").sort(),
    );
  });

  test("no value means the default set, and 'all' means all", () => {
    assert.deepEqual(parseToolsets(undefined), DEFAULT_TOOLSETS);
    assert.equal(parseToolsets("all"), "all");
  });

  test("a retired name is dropped with a warning, the rest are kept", () => {
    const warnings: string[] = [];
    assert.deepEqual(parseToolsets("approvals,customers", (m) => warnings.push(m)), ["customers"]);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /approvals/);
  });

  test("a retired payment-links name is dropped too", () => {
    const warnings: string[] = [];
    assert.deepEqual(parseToolsets("customers,payment-links", (m) => warnings.push(m)), ["customers"]);
    assert.match(warnings[0]!, /payment-links/);
  });

  test("only retired names leave no API toolsets, rather than widening to the defaults", () => {
    const warnings: string[] = [];
    assert.deepEqual(parseToolsets("approvals", (m) => warnings.push(m)), []);
    assert.ok(warnings.some((w) => /documentation tools only/.test(w)));
  });

  test("an unknown name still fails", () => {
    assert.throws(() => parseToolsets("customers,bogus"), UnknownToolsetError);
  });
});

/**
 * Every tool that moves money or cannot be undone, and why. The gate is the only thing
 * between a model and a real payment, so the set is pinned both ways: a tool that loses
 * its gate fails, and so does one that gains a gate nobody listed here.
 */
const GATED: Record<string, { route: string; why: string }> = {
  createTransfer: { route: "POST /v1/transfer", why: "sends money" },
  withdrawFromCard: { route: "POST /v1/cards/withdraw", why: "moves card funds" },
  createFxOrder: { route: "POST /v1/fx/orders", why: "debits the source at once" },
  cancelFxOrder: { route: "POST /v1/fx/orders/{order_id}/cancel", why: "debited funds are not returned" },
  createCollection: { route: "POST /v1/collections", why: "takes money from a payer" },
  createCardPaymentIntent: {
    route: "POST /v1/collections/cards/payment-intents",
    why: "charges at once with card_token",
  },
  chargeSavedCard: { route: "POST /v1/collections/cards/payment-intents/charge", why: "charges a saved card" },
};

describe("money and irreversible tools are gated", () => {
  for (const [name, { route, why }] of Object.entries(GATED)) {
    test(`${name} needs confirm: ${why}`, () => {
      const tool = TOOLS_BY_NAME.get(name);
      assert.ok(tool, `${name} must exist`);
      assert.equal(opKey(tool.method, tool.path), route);
      assert.equal(tool.movesMoney, true);
      assert.ok((tool.inputSchema as any).properties.confirm, `${name} must offer confirm`);
    });
  }

  test("no other tool is gated", () => {
    assert.deepEqual(
      TOOLS.filter((t) => t.movesMoney).map((t) => t.name).sort(),
      Object.keys(GATED).sort(),
    );
  });

  test("MONEY_OPS names no route without a tool", () => {
    const routes = new Set(TOOLS.map((t) => opKey(t.method, t.path)));
    for (const key of MONEY_OPS) assert.ok(routes.has(key), `${key} is gated but no tool calls it`);
  });
});
