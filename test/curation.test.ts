import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKED_TOOL_NAMES,
  CONFIRM_OPS,
  DEFAULT_TOOLSETS,
  MONEY_OPS,
  OUTCOME_LOOKUPS,
  RETIRED_TOOLSETS,
  TOOLSETS,
  UnknownToolsetError,
  opKey,
  parseToolsets,
} from "../src/curation.ts";
import { TOOLS, TOOLS_BY_NAME } from "../src/generated/tools.ts";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";
import { instructions } from "../src/server.ts";
import { SafetyGate } from "../src/safety.ts";

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

/**
 * Tools that cannot be undone but move no money: confirm only, no live-writes switch.
 * Pinned both ways like GATED.
 */
const CONFIRMED: Record<string, { route: string; why: string }> = {
  deleteAccountApplication: { route: "DELETE /v1/accounts/applications/{id}", why: "cannot be restored" },
  activateFeature: { route: "POST /v1/risk/features/activate", why: "can issue a card; no deactivate route" },
};

describe("idempotency_key argument", () => {
  const hasKeyArg = (t: (typeof TOOLS)[number]) => "idempotency_key" in ((t.inputSchema as any).properties ?? {});

  test("every tool that sends a key declares it, and no other tool does", () => {
    const declared = TOOLS.filter(hasKeyArg).map((t) => t.name).sort();
    const keyed = TOOLS.filter((t) => t.needsIdempotency).map((t) => t.name).sort();
    assert.deepEqual(declared, keyed);
    assert.equal(keyed.length, 25);
  });

  test("the exempt POSTs do not offer it", () => {
    for (const name of ["verifyExternalAccount", "retryWebhookEvent"]) {
      assert.equal(hasKeyArg(TOOLS_BY_NAME.get(name)!), false, name);
    }
  });

  test("it is optional and follows the gateway's key rule", () => {
    for (const t of TOOLS.filter(hasKeyArg)) {
      const schema = (t.inputSchema as any).properties.idempotency_key;
      assert.equal(((t.inputSchema as any).required as string[]).includes("idempotency_key"), false, t.name);
      assert.equal(schema.maxLength, 255, t.name);
      const re = new RegExp(schema.pattern);
      assert.ok(re.test("6f1c-key"), t.name);
      assert.equal(re.test("bad\nkey"), false, t.name);
    }
  });
});

describe("outcome lookups", () => {
  test("every tool that sends a key has an entry, and only those", () => {
    assert.deepEqual(
      Object.keys(OUTCOME_LOOKUPS).sort(),
      TOOLS.filter((t) => t.needsIdempotency).map((t) => t.name).sort(),
    );
  });

  test("each lookup starts with a tool that exists", () => {
    for (const [name, entry] of Object.entries(OUTCOME_LOOKUPS)) {
      if (!("lookup" in entry)) continue;
      const first = entry.lookup.match(/^[A-Za-z0-9]+/)?.[0] ?? "";
      assert.ok(advertised.has(first), `${name}: "${first}" is not a tool`);
    }
  });
});

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

  for (const [name, { route, why }] of Object.entries(CONFIRMED)) {
    test(`${name} needs confirm but not the live-writes switch: ${why}`, () => {
      const tool = TOOLS_BY_NAME.get(name);
      assert.ok(tool, `${name} must exist`);
      assert.equal(opKey(tool.method, tool.path), route);
      assert.equal(tool.needsConfirm, true);
      assert.equal(tool.movesMoney, false);
      assert.ok((tool.inputSchema as any).properties.confirm, `${name} must offer confirm`);
    });
  }

  test("every confirm-gated tool is listed, and every money tool is confirm-gated", () => {
    assert.deepEqual(
      TOOLS.filter((t) => t.needsConfirm).map((t) => t.name).sort(),
      [...Object.keys(GATED), ...Object.keys(CONFIRMED)].sort(),
    );
    const routes = new Set(TOOLS.map((t) => opKey(t.method, t.path)));
    for (const key of CONFIRM_OPS) assert.ok(routes.has(key), `${key} is gated but no tool calls it`);
  });

  test("every DELETE tool asks for confirmation", () => {
    for (const t of TOOLS.filter((t) => t.method === "delete")) assert.equal(t.needsConfirm, true, t.name);
  });

  test("only gated tools offer confirm", () => {
    for (const t of TOOLS) {
      assert.equal("confirm" in ((t.inputSchema as any).properties ?? {}), t.needsConfirm, t.name);
    }
  });
});

/**
 * Texts that were false and were corrected. A spec sync or a hint edit that brings one
 * back fails here rather than reaching a model.
 */
const FALSE_TEXT: Array<[RegExp, string]> = [
  [/second user approves/i, "API-key FX orders run at once; there is no second approver"],
  [/lock in the quoted rate|lock the rate|locked a rate/i, "a quote does not lock a rate"],
  [/50,000/, "exports return at most the 10 newest rows"],
  [/no API key is required/i, "every route needs an API key"],
  [/cosmetic/i, "the path customer_id wins"],
  [/RETURNS 202/, "bank_account and mobile_money payees return 200"],
  [/(Poll|Check) getCustomerKycStatus/, "KYC completion is getCustomer's basic kyc status"],
  [/until the status changes to/i, "polling must also stop on setup_failed"],
  [/token you got from the webhook/i, "card tokens come from listSavedCards"],
  [/Optional spending limit/i, "leaving limit out zeroes the daily limit"],
  [/filtered by client_reference/i, "listTransactions has no client_reference filter"],
];

describe("corrected texts stay corrected", () => {
  for (const [pattern, why] of FALSE_TEXT) {
    test(`no tool says ${pattern} (${why})`, () => {
      for (const t of TOOLS) {
        const text = `${t.description}\n${JSON.stringify(t.inputSchema)}`;
        assert.doesNotMatch(text, pattern, `${t.name}: ${why}`);
      }
    });
  }

  test("the server instructions carry none of them", () => {
    const gate = new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: false });
    const text = instructions("sandbox", gate, TOOLS, true, false);
    for (const [pattern, why] of FALSE_TEXT) assert.doesNotMatch(text, pattern, why);
  });

  test("account-application hints use the lower-case statuses the API sends", () => {
    for (const name of ["submitAccountApplication", "processAccountApplication", "submitAndProcessAccountApplication"]) {
      const d = TOOLS_BY_NAME.get(name)!.description;
      assert.doesNotMatch(d, /\b(DRAFT|SUBMITTED|PROCESSING|CREATING_ACCOUNT|APPROVED|REJECTED)\b/, name);
      assert.match(d, /manual_review/, `${name} must name manual_review`);
    }
  });

  test("listFxPendingApprovals stays, and says who can see it", () => {
    const d = TOOLS_BY_NAME.get("listFxPendingApprovals")?.description ?? "";
    assert.match(d, /fx:order_approve/);
    assert.match(d, /API key run at once/);
  });
});
