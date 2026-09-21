/**
 * Guards on the facts this server gets from the SERVICES, not from the specs.
 *
 * The vendored specifications in ./specs are a copy of the published documentation
 * source, and several of them described a shape the service does not accept. Each
 * correction is asserted here against the service behaviour it was taken from, with the
 * file and line that proves it. Two jobs:
 *
 *   1. `npm run sync-specs` overwrites ./specs from upstream. If a correction has not
 *      landed upstream yet, that re-sync silently reintroduces a request shape the API
 *      rejects — and these tests fail loudly instead.
 *   2. When a service legitimately changes, the failure names the tool and the service
 *      file to re-read, rather than leaving a wrong schema in front of the model.
 *
 * Every assertion below was read off a service checkout, quoted in its comment.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

const tool = (name: string) => TOOLS_BY_NAME.get(name)!;
const props = (name: string) => (tool(name).inputSchema as any).properties as Record<string, any>;
const required = (name: string) => ((tool(name).inputSchema as any).required ?? []) as string[];

describe("fx: an order is placed against a quote", () => {
  // fx/src/internal/application/dtos/rates.go:50 CreateOtcOrderRequest —
  //   QuoteID, TransactionID, Source/Destination *OrderEndpointInput, Amount,
  //   ClientRef, MfaSessionID, Metadata. Nothing else is read.
  // fx/src/internal/application/usecases/grpc/create_otc_order.go:71 —
  //   an empty QuoteID is ErrInvalidOrExpiredQuote before anything else happens.
  test("quote_id is required", () => {
    assert.ok(required("createFxOrder").includes("quote_id"), "an order without a quote is refused outright");
  });

  test("the fields the service never reads are gone", () => {
    for (const dead of ["order_type", "pair", "side", "target_rate", "customer_id"]) {
      assert.equal(props("createFxOrder")[dead], undefined, `${dead} is not in CreateOtcOrderRequest`);
    }
  });

  test("the legs are objects, not flat *_type / *_id pairs", () => {
    const { source, destination } = props("createFxOrder");
    assert.equal(source.type, "object");
    assert.equal(destination.type, "object");
    assert.deepEqual(Object.keys(source.properties).sort(), ["id", "type"]);
    assert.deepEqual(destination.properties.type.enum, ["account", "wallet", "ssi"]);
  });

  test("the description does not promise an approval step API keys never get", () => {
    // create_otc_order.go:286 canCreatePending — an AuthPathAPIKey caller returns true,
    // so orderStatusForCaller gives `pending` and the order proceeds. The
    // waiting_approval queue is for dashboard users without FX approval rights.
    const d = tool("createFxOrder").description;
    assert.match(d, /pending/i);
    assert.doesNotMatch(
      d,
      /created in `?waiting_approval`? and do/i,
      "an API-key order is not held for approval — saying so invents a safety net",
    );
  });
});

describe("fx: a quote names a corridor", () => {
  // fx/src/internal/application/dtos/rates.go:5 GetQuoteRequest —
  //   CurrencyPair, Direction, Amount. There are no from_currency/to_currency fields,
  //   and Direction is a corridor ("USD_XAF"), not a BUY/SELL side.
  test("the corridor fields are the service's", () => {
    const p = props("getFxQuote");
    assert.ok(p.currency_pair, "currency_pair is the tier-1 corridor");
    assert.ok(p.direction, "direction is the tier-2 corridor");
    assert.equal(p.from_currency, undefined);
    assert.equal(p.to_currency, undefined);
  });

  test("direction is not offered as a buy/sell enum", () => {
    assert.equal(props("getFxQuote").direction.enum, undefined, "BUY/SELL would be rejected as a corridor");
  });

  test("amount is the only required field", () => {
    assert.deepEqual(required("getFxQuote"), ["amount"]);
  });
});

describe("transfers: what the service actually requires and accepts", () => {
  // transfers-go/src/internal/application/dtos/transfer.go:88 InitiateTransferRequest —
  //   Description carries no validate tag and ClientReference is `omitempty`.
  test("description and client_reference are optional", () => {
    const r = required("createTransfer");
    assert.ok(!r.includes("description"));
    assert.ok(!r.includes("client_reference"));
    assert.deepEqual(r.sort(), ["amount", "customer_id", "destination", "source"]);
  });

  // transfer.go:48 — Currency *string `validate:"omitempty,oneof=USD EUR GBP"`.
  test("the sender's paying currency is offered", () => {
    assert.deepEqual(props("createTransfer").source.properties.currency.enum, ["USD", "EUR", "GBP"]);
  });

  // transfer.go:63 — Rail `validate:"omitempty,oneof=ach wire rtp sepa swift fps globalbank"`.
  // Added by transfers-go changelog 2026-09-03-add-rtp-rail-hifi.
  test("every rail the validator allows is offered", () => {
    const external = (tool("createTransfer").inputSchema as any).properties.destination.oneOf.find(
      (v: any) => v.properties?.destination_type?.enum?.includes("external_account"),
    );
    assert.deepEqual(external.properties.rail.enum, [
      "ach",
      "wire",
      "rtp",
      "sepa",
      "swift",
      "fps",
      "globalbank",
    ]);
  });

  // transfers-go/src/pkg/validator/validator.go:78 destination_type — internal_account,
  // internal_crypto_wallet, crypto_wallet, external_account, card.
  test("every destination type the validator allows has a variant", () => {
    const variants = (tool("createTransfer").inputSchema as any).properties.destination.oneOf;
    const types = variants.flatMap((v: any) => v.properties?.destination_type?.enum ?? []).sort();
    assert.deepEqual(types, [
      "card",
      "crypto_wallet",
      "external_account",
      "internal_account",
      "internal_crypto_wallet",
    ]);
  });

  test("the model is told a transfer can come back held", () => {
    // transfer.go:112 TransferResult.RequiresApproval / ApprovalID. A held transfer
    // still reports transfer_status pending, so the status alone hides it.
    assert.match(tool("createTransfer").description, /requires_approval/);
  });
});

describe("collections: the payment intent the service accepts", () => {
  // onramp/src/internal/application/dto/create_payment_intent_dto.go:11 —
  //   ClientReference is `omitempty`; RequestDepositSource.ID is
  //   `validate:"omitempty"` with the comment "callers may omit it".
  test("client_reference is not required", () => {
    assert.ok(!required("createCardPaymentIntent").includes("client_reference"));
  });

  test("the fields the service reads are all offered", () => {
    const p = props("createCardPaymentIntent");
    for (const field of ["save_card", "redirect_url", "country", "network", "asset", "card_token"]) {
      assert.ok(p[field], `${field} is in CreatePaymentIntentData but was missing from the schema`);
    }
  });

  test("save_card's default is stated, because it stores a card when omitted", () => {
    // SaveCard *bool `json:"save_card,omitempty"` // Optional, defaults to true
    assert.equal(props("createCardPaymentIntent").save_card.default, true);
    assert.match(props("createCardPaymentIntent").save_card.description, /DEFAULTS TO\s+TRUE/i);
  });

  test("getCollection is not advertised as a public endpoint", () => {
    // It is registered on apiKeyServicesRoutesV1 in api-gateway routes/base.go, so the
    // spec's "no API key is required" was wrong and would send a caller down a dead end.
    assert.doesNotMatch(tool("getCollection").description, /public|no API key/i);
  });
});
