/**
 * Hand-authored tools for routes no OpenAPI specification covers.
 *
 * The specs describe 86 operations; the gateway serves 211 to API-key callers. This
 * file holds the ones a merchant needs most from that gap — reading balances, finishing
 * a card payment (refunds, captures, disputes), and applying for the feature access that
 * gates card payments in the first place.
 *
 * Every shape here was read off the service that serves it, not guessed: onramp's gRPC
 * handlers for collections, web3's wallet models, internal-accounts' sweep rule DTOs,
 * payees' patch request, auth's feature-access models, and the gateway wrappers that say
 * which values arrive as path, query, or body. Where a service and a guess disagreed,
 * the service won.
 *
 * What is deliberately NOT here: the approve/reject routes. Every one of them carries
 * middleware.DashboardOnly() on the gateway, which refuses an API key — the only
 * credential this server holds — with a bare 403. See BLOCKED_TOOL_NAMES in curation.ts,
 * which turns those names into an explanation instead of a tool that cannot work.
 */
import type { GeneratedTool } from "./generated/tools.ts";
import { isMoneyOp, needsIdempotencyKey, type Toolset } from "./curation.ts";

export type ManualTool = GeneratedTool;

/** Money-moving tools carry the same confirmation argument the generator emits. */
const confirm = {
  confirm: {
    type: "boolean",
    description:
      "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true.",
  },
} as const;

/**
 * Assemble a tool, deriving the two safety facts rather than restating them.
 *
 * `movesMoney` and `needsIdempotency` come from curation.ts by method and path, so a
 * hand-authored tool cannot disagree with the generated ones about whether an operation
 * moves value — the single most consequential field on a tool.
 */
function tool(
  partial: Omit<ManualTool, "spec" | "queryParams" | "alsoInBody" | "movesMoney" | "needsIdempotency"> &
    Partial<Pick<ManualTool, "queryParams" | "alsoInBody">>,
): ManualTool {
  const movesMoney = isMoneyOp(partial.method, partial.path);
  const schema = partial.inputSchema as { properties?: Record<string, unknown> };
  if (movesMoney && schema.properties && !("confirm" in schema.properties)) {
    Object.assign(schema.properties, confirm);
  }
  return {
    queryParams: [],
    alsoInBody: [],
    spec: "(hand-authored)",
    movesMoney,
    needsIdempotency: needsIdempotencyKey(partial.method, partial.path),
    ...partial,
  };
}

/** Free-text object property, for the JSON blobs auth and onramp accept verbatim. */
const objectProp = (description: string) => ({
  type: "object" as const,
  additionalProperties: true,
  description,
});

/**
 * Dispute evidence, as onramp's payment.ChargebackEvidence defines it.
 *
 * Shared because the draft and the final response take the identical block: a draft is
 * saved evidence, and responding submits it. Every field is optional — the network
 * accepts whatever argument the merchant can actually support.
 */
const CHARGEBACK_EVIDENCE = {
  type: "object",
  description:
    "Evidence supporting the charge. Every field is optional; send what you can actually support.",
  properties: {
    customer_email: { type: "string" },
    customer_first_name: { type: "string" },
    customer_last_name: { type: "string" },
    product_description: { type: "string", description: "What was sold, or what the charge was for." },
    service_date: { type: "string", description: "When the goods or service were delivered (YYYY-MM-DD)." },
    shipping_carrier: { type: "string" },
    shipping_tracking_number: { type: "string" },
    shipping_date: { type: "string", description: "YYYY-MM-DD." },
    receipt_url: { type: "string", description: "Receipt or invoice shown to the customer." },
    customer_communication_url: {
      type: "string",
      description: "Correspondence evidencing the customer's intent or receipt.",
    },
    refund_policy_url: { type: "string" },
    cancellation_policy_url: { type: "string" },
    duplicate_charge_id: {
      type: "string",
      description: "The original payment id, when the argument is that this charge duplicates it.",
    },
    uncategorized_text: { type: "string", description: "Anything the structured fields cannot hold." },
  },
  additionalProperties: true,
} as const;

const COLLECTIONS: Toolset = "collections";
const WALLETS: Toolset = "wallets";
const ACCOUNTS: Toolset = "accounts";
const CUSTOMERS: Toolset = "customers";
const EXTERNAL_ACCOUNTS: Toolset = "external-accounts";
const TRANSACTIONS: Toolset = "transactions";
const FX: Toolset = "fx";
const FEATURES: Toolset = "features";

export const MANUAL_TOOLS: ManualTool[] = [
  // ---- collections: what happens after a card payment ----------------------
  tool({
    name: "listCollections",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections",
    description:
      "List the collections you have taken in, newest first, each in the same shape getCollection returns. " +
      "Use this to reconcile payments, or to find the transaction_id of a payment you only know by client_reference.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by overall status." },
        transaction_status: { type: "string", description: "Filter by the transaction's own status field." },
        onramp_status: { type: "string", description: "Filter by provider-side onramp status." },
        client_reference: { type: "string", description: "Your own reference, as sent when the payment was created." },
        customer_id: { type: "string", format: "uuid" },
        payment_id: { type: "string" },
        start_date: { type: "string", description: "ISO 8601 lower bound." },
        end_date: { type: "string", description: "ISO 8601 upper bound." },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: [],
      additionalProperties: false,
    },
    pathParams: [],
    queryParams: [
      "status",
      "transaction_status",
      "onramp_status",
      "client_reference",
      "customer_id",
      "payment_id",
      "start_date",
      "end_date",
      "limit",
      "offset",
    ],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "refundCollection",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/{id}/refund",
    description:
      "Refund a settled card payment, in full or in part.\n\n" +
      "Omit amount_cents for a full refund of what remains. Amounts are in MINOR UNITS — 1050 is $10.50, not $1050. " +
      "A refund that fails leaves the payment refundable again; retry it with retryCollectionRefund rather than issuing a second refund.\n\n" +
      "MOVES MONEY: returns funds to the payer and cannot be undone. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The transaction_id of the payment to refund." },
        amount_cents: {
          type: "number",
          description: "Minor units. Omit for a full refund of the remaining amount.",
        },
        currency: { type: "string", description: "Defaults to the payment's own currency." },
        reason: { type: "string", description: "Recorded against the refund." },
      },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["amount_cents", "currency", "reason"],
  }),

  tool({
    name: "listCollectionRefunds",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections/{id}/refunds",
    description:
      "List every refund attempted against one payment, with each attempt's status. Read this before refunding again — " +
      "a failed attempt is retried with retryCollectionRefund, not duplicated.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The payment's transaction_id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "retryCollectionRefund",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/{id}/refunds/{refund_id}/retry",
    description:
      "Resubmit a refund that previously failed at the provider. The amount and currency come from the original refund.\n\n" +
      "MOVES MONEY: returns funds to the payer. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The payment's transaction_id." },
        refund_id: { type: "string", description: "The failed refund's id, from listCollectionRefunds." },
      },
      required: ["id", "refund_id"],
      additionalProperties: true,
    },
    pathParams: ["id", "refund_id"],
    bodyMode: "inline",
    bodyProps: [],
  }),

  tool({
    name: "captureCollection",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/{id}/capture",
    description:
      "Settle a card authorization that is holding funds, turning the hold into an actual payment.\n\n" +
      "Only applies to a payment whose status is `awaiting_capture`. Omit amount_cents to capture the full hold; " +
      "a smaller amount captures part and releases the rest. Amounts are in MINOR UNITS.\n\n" +
      "NOTE: holds are placed by the hosted checkout flow. There is no API-key route that authorizes a card without " +
      "capturing, so a hold you can capture will have been created outside this server.\n\n" +
      "MOVES MONEY: this is the moment the payer is actually charged. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The transaction_id holding the authorization." },
        amount_cents: { type: "number", description: "Minor units. Omit to capture the whole hold." },
        currency: { type: "string", description: "Defaults to the hold's own currency." },
      },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["amount_cents", "currency"],
  }),

  tool({
    name: "rejectCollection",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/{id}/reject",
    description:
      "Release a card authorization without taking the money — the void half of the authorize/capture pair. " +
      "The payer's hold is dropped and nothing is charged. Not a refund: a payment that already settled is refunded with refundCollection.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The transaction_id holding the authorization." },
        reason: { type: "string", description: "Recorded against the void." },
      },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["reason"],
  }),

  // ---- collections: disputes ----------------------------------------------
  tool({
    name: "listChargebacks",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections/chargebacks",
    description:
      "List chargebacks raised against your payments. Statuses run opened, pending_evidence, evidence_submitted, " +
      "under_review, then won, lost or expired — anything in pending_evidence has a deadline and needs respondToChargeback.",
    inputSchema: {
      type: "object",
      properties: {
        transaction_uuids: {
          type: "array",
          items: { type: "string" },
          description: "Restrict to these transactions. Omit for every chargeback.",
        },
        status: {
          type: "string",
          enum: [
            "opened",
            "pending_evidence",
            "evidence_submitted",
            "under_review",
            "won",
            "lost",
            "expired",
          ],
        },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: [],
      additionalProperties: false,
    },
    pathParams: [],
    queryParams: ["transaction_uuids", "status", "limit", "offset"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "listCollectionChargebacks",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections/{id}/chargebacks",
    description: "List every chargeback raised against one payment.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The payment's transaction_id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "getChargeback",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections/chargebacks/{id}",
    description:
      "Read one chargeback: its status, the amount at stake, the network's reason code, and the deadline for evidence.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Chargeback id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "getChargebackDraft",
    toolset: COLLECTIONS,
    method: "get",
    path: "/v1/collections/chargebacks/{id}/draft",
    description:
      "Read the evidence saved against a chargeback but not yet submitted. A draft changes nothing until respondToChargeback sends it.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Chargeback id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "saveChargebackDraft",
    toolset: COLLECTIONS,
    method: "put",
    path: "/v1/collections/chargebacks/{id}/draft",
    description:
      "Save evidence against a chargeback WITHOUT submitting it. Use this to assemble a response over several turns; " +
      "submitting is respondToChargeback, and it is the submission the network sees.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Chargeback id." },
        draft: {
          type: "object",
          description: "The saved response.",
          properties: {
            evidence: CHARGEBACK_EVIDENCE,
            notes: { type: "string", description: "Internal notes. Never sent to the cardholder or the network." },
          },
          additionalProperties: true,
        },
      },
      required: ["id", "draft"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["draft"],
  }),

  tool({
    name: "respondToChargeback",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/chargebacks/{id}/respond",
    description:
      "Contest a chargeback by submitting evidence to the card network. This is final — the network reviews what you send " +
      "and the chargeback moves to under_review. Assemble it with saveChargebackDraft first if the evidence is still being gathered.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Chargeback id." },
        evidence: CHARGEBACK_EVIDENCE,
      },
      required: ["id", "evidence"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["evidence"],
  }),

  tool({
    name: "acceptChargeback",
    toolset: COLLECTIONS,
    method: "post",
    path: "/v1/collections/chargebacks/{id}/accept",
    description:
      "Concede a chargeback without contesting it. The disputed amount stays with the cardholder and the case closes as lost. " +
      "Irreversible — once accepted, evidence can no longer be submitted.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Chargeback id." } },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: [],
  }),

  // ---- wallets: balances ---------------------------------------------------
  tool({
    name: "getWalletBalance",
    toolset: WALLETS,
    method: "get",
    path: "/v1/wallets/{id}/balance",
    description:
      "On-chain balance of one wallet: every supported asset it holds on its network. " +
      "The address and network are resolved from the wallet id, so nothing else is needed.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Wallet id, as returned by createWallet or listWallets." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "getWalletBalances",
    toolset: WALLETS,
    method: "post",
    path: "/v1/wallets/balances",
    description:
      "Balances for several wallet addresses in one call, keyed by address. " +
      "Addressed by on-chain address rather than wallet id — take the addresses from listWallets.",
    inputSchema: {
      type: "object",
      properties: {
        wallets: {
          type: "array",
          description: "The lookups to perform.",
          items: {
            type: "object",
            properties: {
              address: { type: "string", description: "On-chain address." },
              network: { type: "string", description: "Network the address is on." },
              asset: { type: "string", description: "Asset symbol, e.g. USDC." },
            },
            required: ["address", "asset"],
            additionalProperties: false,
          },
        },
      },
      required: ["wallets"],
      additionalProperties: true,
    },
    pathParams: [],
    bodyMode: "inline",
    bodyProps: ["wallets"],
  }),

  tool({
    name: "getTotalWalletBalance",
    toolset: WALLETS,
    method: "get",
    path: "/v1/wallets/total-balance",
    description:
      "Aggregate balance across every wallet you hold, summed per asset and per network. " +
      "Served from a cached snapshot: `cached_at` says how old it is and `refreshing` whether a refresh is running, " +
      "so this is a treasury overview, not a settlement figure.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    pathParams: [],
    bodyMode: "none",
    bodyProps: [],
  }),

  // ---- accounts: main account and auto-sweep -------------------------------
  tool({
    name: "getMainAccount",
    toolset: ACCOUNTS,
    method: "get",
    path: "/v1/accounts/main",
    description:
      "The tenant's main account — the default source for transfers and the settlement target for sweeps. " +
      "Saves listing every account to find it.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    pathParams: [],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "hasCardAccount",
    toolset: ACCOUNTS,
    method: "get",
    path: "/v1/accounts/has-card-account",
    description:
      "Whether a card-funding account already exists, and which one. Check before createCardApplication — card issuance funds from this account.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", format: "uuid", description: "Optional. Narrows the check to one customer." },
      },
      required: [],
      additionalProperties: false,
    },
    pathParams: [],
    queryParams: ["customer_id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "hasAutoSweepAccount",
    toolset: ACCOUNTS,
    method: "get",
    path: "/v1/accounts/has-auto-sweep-account",
    description: "Whether an auto-sweep destination account exists for the tenant, and which one.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    pathParams: [],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "listSweepRules",
    toolset: ACCOUNTS,
    method: "get",
    path: "/v1/accounts/sweep-rules",
    description:
      "List auto-sweep rules. A rule moves deposits from a source account to a destination account automatically, so " +
      "read these before wondering why a balance emptied on its own.",
    inputSchema: {
      type: "object",
      properties: {
        source_account_id: { type: "string", format: "uuid" },
        scope: { type: "string", enum: ["account", "policy"] },
        status: { type: "string", enum: ["active", "paused", "disabled"] },
      },
      required: [],
      additionalProperties: false,
    },
    pathParams: [],
    queryParams: ["source_account_id", "scope", "status"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "createSweepRule",
    toolset: ACCOUNTS,
    method: "post",
    path: "/v1/accounts/sweep-rules",
    description:
      "Create an auto-sweep rule: on every deposit into the source, move funds to the destination account.\n\n" +
      "`scope` account covers one source_account_id; `policy` covers every account the tenant holds in that currency. " +
      "sweep_type percentage requires sweep_percentage; threshold requires threshold_amount; full_balance takes neither. " +
      "PREREQUISITES: the destination account must exist, be `active`, and hold the SAME currency — the service refuses a mismatch.\n\n" +
      "This does not move money now, but every future deposit will move without another call.",
    inputSchema: {
      type: "object",
      properties: {
        destination_account_id: {
          type: "string",
          format: "uuid",
          description: "Where swept funds land. Must be active and in the same currency.",
        },
        currency: { type: "string", description: "Must match the destination account's currency." },
        sweep_type: {
          type: "string",
          enum: ["full_balance", "percentage", "threshold"],
          description: "How much to move on each deposit.",
        },
        scope: {
          type: "string",
          enum: ["account", "policy"],
          description: "Defaults to account, which requires source_account_id.",
        },
        source_account_id: {
          type: "string",
          format: "uuid",
          description: "The account being swept. Required for scope `account`.",
        },
        sweep_percentage: {
          type: "string",
          description: "Decimal string. Required when sweep_type is percentage.",
        },
        threshold_amount: {
          type: "string",
          description: "Decimal string. Required when sweep_type is threshold — sweeps only above this balance.",
        },
        minimum_sweep_amount: {
          type: "string",
          description: "Decimal string. Deposits below this are left alone.",
        },
      },
      required: ["destination_account_id", "currency", "sweep_type"],
      additionalProperties: true,
    },
    pathParams: [],
    bodyMode: "inline",
    bodyProps: [
      "destination_account_id",
      "currency",
      "sweep_type",
      "scope",
      "source_account_id",
      "sweep_percentage",
      "threshold_amount",
      "minimum_sweep_amount",
    ],
  }),

  tool({
    name: "getSweepRule",
    toolset: ACCOUNTS,
    method: "get",
    path: "/v1/accounts/sweep-rules/{id}",
    description: "Read one auto-sweep rule.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Sweep rule id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "updateSweepRule",
    toolset: ACCOUNTS,
    method: "put",
    path: "/v1/accounts/sweep-rules/{id}",
    description:
      "Change an auto-sweep rule's amount policy or status. Only the fields you send change. " +
      "Set status to `paused` to stop sweeping without losing the rule.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "Sweep rule id." },
        sweep_type: { type: "string", enum: ["full_balance", "percentage", "threshold"] },
        sweep_percentage: { type: "string", description: "Decimal string." },
        threshold_amount: { type: "string", description: "Decimal string." },
        minimum_sweep_amount: { type: "string", description: "Decimal string." },
        status: { type: "string", enum: ["active", "paused", "disabled"] },
      },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["sweep_type", "sweep_percentage", "threshold_amount", "minimum_sweep_amount", "status"],
  }),

  tool({
    name: "deleteSweepRule",
    toolset: ACCOUNTS,
    method: "delete",
    path: "/v1/accounts/sweep-rules/{id}",
    description:
      "Delete an auto-sweep rule. Deposits stop being swept immediately. To stop temporarily, set status to paused with updateSweepRule instead.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Sweep rule id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  // ---- customers -----------------------------------------------------------
  tool({
    name: "startCustomerKyb",
    toolset: CUSTOMERS,
    method: "post",
    path: "/v1/customers/kyb/start",
    description:
      "Start business verification (KYB) for a business customer.\n\n" +
      "PREREQUISITE: every associated person must have completed their own KYC first — the service refuses otherwise. " +
      "startCustomerKyc already routes business customers here, so use this only when you want KYB explicitly. " +
      "Poll getCustomerKycStatus for the outcome.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", format: "uuid", description: "The business customer to verify." },
      },
      required: ["customer_id"],
      additionalProperties: true,
    },
    pathParams: [],
    bodyMode: "inline",
    bodyProps: ["customer_id"],
  }),

  tool({
    name: "getCustomerByEmail",
    toolset: CUSTOMERS,
    method: "get",
    path: "/v1/customers/email/{email}",
    description:
      "Look up a customer by email address — the usual way to find an existing customer before creating a duplicate.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "The customer's email address." } },
      required: ["email"],
      additionalProperties: false,
    },
    pathParams: ["email"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "listCustomerWallets",
    toolset: CUSTOMERS,
    method: "get",
    path: "/v1/customers/{id}/wallets",
    description: "List the blockchain wallets belonging to one customer.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Customer id." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  // ---- external accounts ---------------------------------------------------
  tool({
    name: "updateExternalAccount",
    toolset: EXTERNAL_ACCOUNTS,
    method: "patch",
    path: "/v1/external-accounts/{payee_id}",
    description:
      "Correct a recipient's banking details. Only the fields you send change, and sending an explicit null clears one — " +
      "the service reads each field as a three-state patch (absent, set, cleared).\n\n" +
      "RETURNS 202 AND RESTARTS SETUP: editing a recipient sends it back through provider verification, so it returns to " +
      "`pending` and cannot receive a transfer until getExternalAccount reports `active` again. This is the fix for a " +
      "recipient that failed setup — correct the detail rather than creating a second recipient.",
    inputSchema: {
      type: "object",
      properties: {
        payee_id: { type: "string", format: "uuid", description: "The external account to correct." },
        account_name: { type: "string" },
        account_number: { type: "string" },
        iban: { type: "string" },
        bic: { type: "string" },
        routing_number: { type: "string" },
        bank_name: { type: "string" },
        institution_id: { type: "string" },
        account_owner_type: { type: "string" },
        institution_country_iso_code: { type: "string", description: "ISO 3166-1 alpha-2." },
        payment_rail: { type: "string" },
        bank_account_type: { type: "string" },
        bank_address_line_1: { type: "string" },
        bank_city: { type: "string" },
        bank_state: { type: "string" },
        bank_postal_code: { type: "string" },
        bank_country: { type: "string" },
        address: objectProp("The recipient's own address, replacing the stored one."),
      },
      required: ["payee_id"],
      additionalProperties: true,
    },
    pathParams: ["payee_id"],
    bodyMode: "inline",
    bodyProps: [
      "account_name",
      "account_number",
      "iban",
      "bic",
      "routing_number",
      "bank_name",
      "institution_id",
      "account_owner_type",
      "institution_country_iso_code",
      "payment_rail",
      "bank_account_type",
      "bank_address_line_1",
      "bank_city",
      "bank_state",
      "bank_postal_code",
      "bank_country",
      "address",
    ],
  }),

  // ---- transactions --------------------------------------------------------
  tool({
    name: "listTransactionActivities",
    toolset: TRANSACTIONS,
    method: "get",
    path: "/v1/transactions/{id}/activities",
    description:
      "The event trail for one transaction — every state change, in order. This is what explains WHY a transaction is " +
      "stuck or failed, which the transaction record's status alone does not. Cursor-paginated.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The transaction's reference." },
        cursor: { type: "string", description: "Continuation cursor from a previous page." },
        limit: { type: "number" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    queryParams: ["cursor", "limit"],
    bodyMode: "none",
    bodyProps: [],
  }),

  // ---- fx ------------------------------------------------------------------
  tool({
    name: "getFxPayoutQuote",
    toolset: FX,
    method: "post",
    path: "/v1/fx/payout-quote",
    description:
      "Price a cross-border PAYOUT — money leaving to a recipient over a payout corridor.\n\n" +
      "Distinct from getFxQuote, which prices an OTC trade: the two read different rate tables and their quotes are not " +
      "interchangeable. Name the corridor with either currency_pair (exact market) or direction (FROM_TO).",
    inputSchema: {
      type: "object",
      properties: {
        currency_pair: {
          type: "string",
          description: "Exact market corridor, e.g. USD_US_XAF_CM. Takes precedence over direction.",
          example: "USD_US_XAF_CM",
        },
        direction: {
          type: "string",
          description: "Corridor as FROM_TO, e.g. USD_XAF. The service picks the best market.",
          example: "USD_XAF",
        },
        amount: { type: "string", description: "Amount of the FROM currency being sent, as a decimal string." },
        provider: { type: "string", description: "Optional. Price against one provider." },
      },
      required: ["amount"],
      additionalProperties: true,
    },
    pathParams: [],
    bodyMode: "inline",
    bodyProps: ["currency_pair", "direction", "amount", "provider"],
  }),

  tool({
    name: "listFxOtcRates",
    toolset: FX,
    method: "get",
    path: "/v1/fx/otc-rates",
    description:
      "Current OTC display rates per currency pair. Indicative only — a tradeable price with a quote_id comes from getFxQuote.",
    inputSchema: {
      type: "object",
      properties: {
        from_currency: { type: "string", description: "Optional filter, ISO 4217." },
        to_currency: { type: "string", description: "Optional filter, ISO 4217." },
      },
      required: [],
      additionalProperties: false,
    },
    pathParams: [],
    queryParams: ["from_currency", "to_currency"],
    bodyMode: "none",
    bodyProps: [],
  }),

  // ---- feature access: the gate in front of card payments ------------------
  tool({
    name: "listFeatureAccess",
    toolset: FEATURES,
    method: "get",
    path: "/v1/feature-access",
    description:
      "Every gated capability and whether THIS business is entitled to it.\n\n" +
      "START HERE when a card, issuing or OTC call returns a bare 403: card acquiring (createCardPaymentIntent, " +
      "chargeSavedCard), card issuance (createCard, createCardApplication) and the OTC desk (createFxOrder) each need a " +
      "compliance decision before a business may use them, and the 403 says nothing about which. This is a different " +
      "system from listFeatures / activateFeature, which cover risk features and cannot grant these.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    pathParams: [],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "listFeatureCatalogue",
    toolset: FEATURES,
    method: "get",
    path: "/v1/feature-access/catalogue",
    description:
      "What each gated capability is and what an application for it must contain — the requirements to gather before calling requestFeatureAccess.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    pathParams: [],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "requestFeatureAccess",
    toolset: FEATURES,
    method: "post",
    path: "/v1/feature-access/requests",
    description:
      "Apply for access to a gated capability. Read listFeatureCatalogue first — `application` must carry the fields that " +
      "capability requires, and auth returns a field-level error map when it does not.\n\n" +
      "A human reviews this: the request is created `pending` and nothing is unblocked until it is `approved`. Re-applying " +
      "while one is open, or after approval, is refused with the existing request's reference.",
    inputSchema: {
      type: "object",
      properties: {
        feature: {
          type: "string",
          enum: ["card_acquiring", "card_issuance", "otc_trade_desk"],
          description: "The capability being applied for.",
        },
        application: objectProp("The application form, shaped by this feature's requirements in the catalogue."),
      },
      required: ["feature", "application"],
      additionalProperties: true,
    },
    pathParams: [],
    bodyMode: "inline",
    bodyProps: ["feature", "application"],
  }),

  tool({
    name: "getFeatureAccessRequest",
    toolset: FEATURES,
    method: "get",
    path: "/v1/feature-access/requests/{id}",
    description:
      "Read one feature-access application: status (pending, action_required, approved, rejected, withdrawn), the reviewer's " +
      "timeline, any rejection reason, and — when status is action_required — what the reviewer is asking for.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Request reference." } },
      required: ["id"],
      additionalProperties: false,
    },
    pathParams: ["id"],
    bodyMode: "none",
    bodyProps: [],
  }),

  tool({
    name: "updateFeatureAccessRequest",
    toolset: FEATURES,
    method: "patch",
    path: "/v1/feature-access/requests/{id}",
    description:
      "Answer a reviewer on an application whose status is `action_required`, by resubmitting the application with the " +
      "missing detail. The reference comes from the path, so the row being edited cannot disagree with the route.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Request reference." },
        application: objectProp("The corrected application form."),
      },
      required: ["id", "application"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["application"],
  }),
];

export const MANUAL_TOOL_NAMES = new Set(MANUAL_TOOLS.map((t) => t.name));
