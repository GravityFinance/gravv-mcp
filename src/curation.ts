/**
 * Hand-maintained curation over the generated tool surface.
 *
 * Most operations in the source specifications carry no `operationId`, and MCP tool
 * names have to be stable and human-legible. So this server owns its own naming, keyed
 * by `METHOD /path`, rather than depending on the specifications for it. The
 * specifications remain the source of truth for request and response *shapes*; this
 * file is the source of truth for how the tools *present*.
 *
 * Five things live here, none of which can be derived from a spec:
 *   1. NAMES        — stable tool names
 *   2. TOOLSETS     — which domain a tool belongs to, for opt-in loading
 *   3. BLOCKED      — operations that must never become tools
 *   4. PREREQUISITES — call ordering, which only the guides encode
 *   5. OUTCOME_LOOKUPS — where to look when a write's outcome is unknown
 */

import { DEFAULT_DOCS_ORIGIN } from "./docs.ts";

/**
 * Docs links are built from the one origin, so a move of the docs site changes one value.
 * The server swaps in GRAVV_DOCS_ORIGIN, when set, before it hands the text out.
 */
const SENSITIVE_DETAILS_GUIDE = `${DEFAULT_DOCS_ORIGIN}/platform/cards/view-card-sensitive-details/overview`;

export type Method = "get" | "post" | "put" | "patch" | "delete";

/** `GET /v1/accounts` — the key format used throughout this file. */
export const opKey = (method: string, path: string) => `${method.toUpperCase()} ${path}`;

/**
 * Every toolset name, in the order the CLI help lists them. The `Toolset` type, the CLI's
 * list of valid names and the default set are all derived from this one list, so a name
 * cannot be added or retired in one place and forgotten in another.
 */
export const TOOLSETS = [
  "customers",
  "accounts",
  "transfers",
  "transactions",
  "external-accounts",
  "cards",
  "wallets",
  "fx",
  "collections",
  "kyc",
  "webhooks",
  "sandbox",
] as const;

export type Toolset = (typeof TOOLSETS)[number];

/**
 * Toolset names that existed in earlier releases. Saved configurations still name them
 * (`--toolsets=approvals`, `GRAVV_TOOLSETS=...`), so they are accepted with a warning and
 * ignored rather than refused: refusing them would stop those servers from starting.
 */
export const RETIRED_TOOLSETS: Readonly<Record<string, { version: string; why: string }>> = {
  approvals: { version: "0.3.2", why: "approving and rejecting is Dashboard-only, and API keys always got 403" },
  "payment-links": { version: "0.3.2", why: "payment links are retired from the Gravv API" },
  "account-applications": {
    version: "0.4.0",
    why: "the v1 account application tools are gone; open accounts with createAccountV2 in `accounts`",
  },
};

/**
 * Toolset names merged into another toolset. A saved configuration that names one loads
 * the toolset it moved to, with a warning, so it keeps the tools it had.
 */
export const MOVED_TOOLSETS: Readonly<Record<string, Toolset>> = {
  // The feature tools are the card issuance flow (activateFeature with virtual_cards),
  // and card KYC lives with cards too.
  features: "cards",
};

/**
 * Loaded when the operator passes no --toolsets flag: every toolset.
 *
 * Gating most domains behind opt-in flags cost context rather than saved it, since every
 * domain is cheap. So everything loads by default and nobody restarts the server to
 * create a wallet. The one opt-in toolset, `account-applications`, held the v1 account
 * application tools and went with them.
 */
export const DEFAULT_TOOLSETS: Toolset[] = [...TOOLSETS];

/** Raised for a --toolsets / GRAVV_TOOLSETS name that is not a toolset. */
export class UnknownToolsetError extends Error {
  constructor(names: string[]) {
    super(`unknown toolset(s): ${names.join(", ")}\nAvailable: ${TOOLSETS.join(", ")}`);
    this.name = "UnknownToolsetError";
  }
}

/**
 * Parse a --toolsets / GRAVV_TOOLSETS value. No value means the default set; "all" means
 * every toolset. A retired name is dropped with a warning. An unknown name throws, so a
 * typo fails loudly instead of silently loading less than was asked for.
 *
 * When only retired names were given, the result is empty: the server starts with the
 * documentation tools alone. Falling back to the default set would load tools, money
 * movement among them, that the operator never asked for.
 */
export function parseToolsets(
  raw: string | undefined,
  warn: (message: string) => void = () => {},
): Toolset[] | "all" {
  if (!raw) return DEFAULT_TOOLSETS;
  if (raw === "all") return "all";

  const requested = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const bad = requested.filter(
    (t) =>
      !(TOOLSETS as readonly string[]).includes(t) &&
      !Object.hasOwn(RETIRED_TOOLSETS, t) &&
      !Object.hasOwn(MOVED_TOOLSETS, t),
  );
  if (bad.length) throw new UnknownToolsetError(bad);

  const kept: Toolset[] = [];
  for (const t of requested) {
    if (Object.hasOwn(RETIRED_TOOLSETS, t)) {
      const { version, why } = RETIRED_TOOLSETS[t]!;
      warn(`toolset "${t}" was removed in ${version} (${why}); ignoring it.`);
      continue;
    }
    if (Object.hasOwn(MOVED_TOOLSETS, t)) {
      const to = MOVED_TOOLSETS[t]!;
      warn(`toolset "${t}" was merged into "${to}" in 0.4.0; loading "${to}" instead.`);
      if (!kept.includes(to)) kept.push(to);
      continue;
    }
    if (!kept.includes(t as Toolset)) kept.push(t as Toolset);
  }
  if (kept.length === 0 && requested.length > 0) {
    warn("no API toolsets left to load; starting with the documentation tools only.");
  }
  return kept;
}

interface Op {
  name: string;
  toolset: Toolset;
}

/**
 * Tool names. camelCase, verb-first — matching the convention already used by the
 * hand-written operationIds in the specs (`getFxQuote`, `getWebhookHistory`) rather
 * than introducing a competing one. Names must be globally unique: they share a single
 * MCP namespace regardless of which spec file they came from.
 */
export const NAMES: Record<string, Op> = {
  // ---- customers -----------------------------------------------------------
  "POST /v1/customers": { name: "createCustomer", toolset: "customers" },
  "GET /v1/customers": { name: "listCustomers", toolset: "customers" },
  "GET /v1/customers/{customer_id}": { name: "getCustomer", toolset: "customers" },
  "PUT /v1/customers/{customer_id}": { name: "updateCustomer", toolset: "customers" },

  // ---- kyc -----------------------------------------------------------------
  "POST /v1/customers/kyc/start": { name: "startCustomerKyc", toolset: "kyc" },
  "POST /v1/customers/kyc/start-s2s": { name: "startCustomerKycS2S", toolset: "kyc" },
  "POST /v1/customers/kyc/upload-document": { name: "uploadCustomerKycDocument", toolset: "kyc" },
  "GET /v1/customers/{customer_id}/kyc/documents": { name: "getCustomerKycDocuments", toolset: "kyc" },
  "GET /v1/customers/{customer_id}/kyc/status": { name: "getCustomerKycStatus", toolset: "kyc" },
  // Beside getCustomerKycDocuments, which gives the document_id it needs. The file is
  // saved locally and never returned to the model (DOWNLOADS).
  "GET /v1/customers/{customer_id}/kyc/documents/{document_id}/download": {
    name: "downloadCustomerKycDocument",
    toolset: "kyc",
  },

  // ---- accounts ------------------------------------------------------------
  // The three v1 calls the docs keep (card-account.yaml), only for the business's one card
  // account: v2 cannot open a working card account yet. Their names and toolset are
  // unchanged from when they were the whole v1 accounts API.
  "POST /v1/accounts": { name: "createAccount", toolset: "accounts" },
  "GET /v1/accounts": { name: "listAccounts", toolset: "accounts" },
  "GET /v1/accounts/{account_id}": { name: "getAccount", toolset: "accounts" },
  // Served by the v2 service, and the first step of the v2 flow, despite its v1 path.
  "GET /v1/accounts/capabilities": { name: "getAccountCapabilities", toolset: "accounts" },
  // v2 opens an account and its application in one call. Every account but the card
  // account is opened here.
  "POST /v2/accounts": { name: "createAccountV2", toolset: "accounts" },
  "GET /v2/accounts": { name: "listAccountsV2", toolset: "accounts" },
  "GET /v2/accounts/{id}": { name: "getAccountV2", toolset: "accounts" },
  "GET /v2/accounts/requirements": { name: "getAccountRequirements", toolset: "accounts" },
  "GET /v2/accounts/applications": { name: "listAccountApplicationsV2", toolset: "accounts" },
  "GET /v2/accounts/applications/{application_id}": { name: "getAccountApplicationV2", toolset: "accounts" },
  "PATCH /v2/accounts/applications/{application_id}": { name: "updateAccountApplicationV2", toolset: "accounts" },

  // ---- external accounts (payees) -----------------------------------------
  "POST /v1/external-accounts": { name: "createExternalAccount", toolset: "external-accounts" },
  "GET /v1/external-accounts": { name: "listExternalAccounts", toolset: "external-accounts" },
  "GET /v1/external-accounts/{external_account_id}": { name: "getExternalAccount", toolset: "external-accounts" },
  "PATCH /v1/external-accounts/{external_account_id}": { name: "updateExternalAccount", toolset: "external-accounts" },
  "POST /v1/external-accounts/verify": { name: "verifyExternalAccount", toolset: "external-accounts" },
  "GET /v1/external-accounts/institutions": {
    name: "listExternalAccountInstitutions",
    toolset: "external-accounts",
  },

  // ---- transfers -----------------------------------------------------------
  "POST /v1/transfer": { name: "createTransfer", toolset: "transfers" },
  "GET /v1/transfer/rates": { name: "getTransferRates", toolset: "transfers" },
  "GET /v1/transfer/supported-currencies": { name: "listTransferSupportedCurrencies", toolset: "transfers" },
  "GET /v1/transfer/supported-countries": { name: "listTransferSupportedCountries", toolset: "transfers" },
  "GET /v1/transfer/supported-countries-for-address": {
    name: "listTransferSupportedCountriesForAddress",
    toolset: "transfers",
  },
  "POST /v1/transfer/documents": { name: "uploadTransferDocument", toolset: "transfers" },
  "POST /v1/transfer/{id}/resume": { name: "resumeTransfer", toolset: "transfers" },
  // Limits answer "why did this transfer pause" and "how much can I send", so they sit
  // with transfers rather than customers.
  "GET /v1/customers/{customer_id}/limits": { name: "getCustomerLimits", toolset: "transfers" },
  "GET /v1/limits/remitters/{remitter_id}": { name: "getRemitterLimits", toolset: "transfers" },

  // ---- transactions --------------------------------------------------------
  "GET /v1/transactions": { name: "listTransactions", toolset: "transactions" },
  "GET /v1/transactions/{transaction_id}": { name: "getTransaction", toolset: "transactions" },
  "GET /v1/transactions/volume": { name: "getTransactionsVolume", toolset: "transactions" },
  "GET /v1/transactions/export": { name: "exportTransactions", toolset: "transactions" },

  // ---- cards ---------------------------------------------------------------
  "POST /v1/cards": { name: "createCard", toolset: "cards" },
  "GET /v1/cards": { name: "listCards", toolset: "cards" },
  "GET /v1/cards/{card_id}": { name: "getCard", toolset: "cards" },
  "GET /v1/cards/{card_id}/balance": { name: "getCardBalance", toolset: "cards" },
  "PATCH /v1/cards/{card_id}/update": { name: "updateCardStatus", toolset: "cards" },
  "POST /v1/cards/withdraw": { name: "withdrawFromCard", toolset: "cards" },
  "POST /v1/cards/applications/new": { name: "createCardApplication", toolset: "cards" },
  "GET /v1/cards/applications": { name: "listCardApplications", toolset: "cards" },
  "GET /v1/cards/applications/{application_id}": { name: "getCardApplication", toolset: "cards" },
  // Card KYC: verification of a cardholder for card issuance, separate from customer KYC
  // (kyc toolset). Names follow the spec operationIds.
  "POST /v1/risk/start-kyc": { name: "startCardholderKyc", toolset: "cards" },
  "POST /v1/risk/start-kyc-s2s": { name: "startCardholderKycS2S", toolset: "cards" },
  "POST /v1/risk/upload-document": { name: "uploadCardholderKycDocument", toolset: "cards" },
  // The feature routes are how a card is issued in live (activateFeature, virtual_cards).
  "GET /v1/risk/features": { name: "listFeatures", toolset: "cards" },
  "POST /v1/risk/features/eligibility": { name: "checkFeatureEligibility", toolset: "cards" },
  "POST /v1/risk/features/activate": { name: "activateFeature", toolset: "cards" },

  // ---- wallets -------------------------------------------------------------
  "POST /v1/wallets": { name: "createWallet", toolset: "wallets" },
  "GET /v1/wallets": { name: "listWallets", toolset: "wallets" },
  "GET /v1/wallets/{wallet_id}": { name: "getWallet", toolset: "wallets" },

  // ---- fx ------------------------------------------------------------------
  "POST /v1/fx/quote": { name: "getFxQuote", toolset: "fx" },
  "GET /v1/fx/rates": { name: "listFxRates", toolset: "fx" },
  "GET /v1/fx/supported-currencies": { name: "listFxCurrencyPairs", toolset: "fx" },
  "POST /v1/fx/orders": { name: "createFxOrder", toolset: "fx" },
  "GET /v1/fx/orders": { name: "listFxOrders", toolset: "fx" },
  "GET /v1/fx/orders/pending-approvals": { name: "listFxPendingApprovals", toolset: "fx" },
  "GET /v1/fx/orders/{order_id}": { name: "getFxOrder", toolset: "fx" },
  "POST /v1/fx/orders/{order_id}/cancel": { name: "cancelFxOrder", toolset: "fx" },
  // Settlement instructions are where createFxOrder pays out (destination type
  // external_account), so they sit with fx.
  "GET /v1/settlement-instructions": { name: "listSettlementInstructions", toolset: "fx" },
  "POST /v1/settlement-instructions": { name: "createSettlementInstruction", toolset: "fx" },
  "GET /v1/settlement-instructions/{id}": { name: "getSettlementInstruction", toolset: "fx" },
  "PATCH /v1/settlement-instructions/{id}": { name: "updateSettlementInstruction", toolset: "fx" },
  "DELETE /v1/settlement-instructions/{id}": { name: "deleteSettlementInstruction", toolset: "fx" },

  // ---- collections / onramp ------------------------------------------------
  "POST /v1/collections": { name: "createCollection", toolset: "collections" },
  "GET /v1/collections/{id}": { name: "getCollection", toolset: "collections" },
  "POST /v1/collections/cards/payment-intents": { name: "createCardPaymentIntent", toolset: "collections" },
  "POST /v1/collections/cards/payment-intents/charge": { name: "chargeSavedCard", toolset: "collections" },
  "GET /v1/collections/cards": { name: "listSavedCards", toolset: "collections" },
  "GET /v1/collections/cards/{card_id}": { name: "getSavedCard", toolset: "collections" },
  "DELETE /v1/collections/cards/{card_id}": { name: "deleteSavedCard", toolset: "collections" },

  // ---- sandbox -------------------------------------------------------------
  // Test-only routes. Default on, but each is hidden unless the key is a sandbox key
  // (SANDBOX_ONLY), so a live server never advertises them.
  "POST /v2/accounts/simulate/deposit": { name: "simulateDeposit", toolset: "sandbox" },

  // ---- webhooks ------------------------------------------------------------
  "GET /v1/webhooks/history": { name: "getWebhookHistory", toolset: "webhooks" },
  "GET /v1/webhooks/event/{id}": { name: "getWebhookEventDetail", toolset: "webhooks" },
  "GET /v1/webhooks/calls/{id}": { name: "getWebhookCallHistory", toolset: "webhooks" },
  "POST /v1/webhooks/event/send/{id}": { name: "retryWebhookEvent", toolset: "webhooks" },
};

/**
 * Never exposed as tools, with the reason. The categories:
 *
 *  - Cardholder data. These return PAN, CVV, and PIN. That must not enter a model's
 *    context under any configuration, so there is no flag to enable them. Merchants
 *    use the client-side decryption flow documented under
 *    platform/cards/view-card-sensitive-details/.
 *
 *  - Retired. Payment links are no longer part of the Gravv API, and the docs Phase 3
 *    sync removed their specification. The entries stay as the written record, so a
 *    caller who asks for them is told why they are gone.
 *
 *  - Dashboard-only. These routes refuse API keys, so a tool for them fails on every
 *    call. They are in no specification, so the generator never meets them; the
 *    entries are the written record of why they are absent.
 */
export const BLOCKED: Record<string, string> = {
  "GET /v1/cards/{card_id}/sensitive-details":
    `Returns card PAN and CVV. Use the client-side decryption flow instead: ${SENSITIVE_DETAILS_GUIDE}`,
  "GET /v1/cards/{card_id}/pin":
    "Returns the encrypted card PIN. Use the client-side decryption flow instead.",
  "PUT /v1/cards/{card_id}/pin":
    "Sets a card PIN, which requires handling cardholder data. Not exposed over MCP.",
  "POST /v1/payment-links": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "PUT /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "DELETE /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "PATCH /v1/payment-links/{id}/status": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links/public/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "POST /v1/transfer/{id}/approve":
    "Dashboard only: API keys always get 403. Approve or reject transfers in the Gravv Dashboard.",
  "POST /v1/transfer/{id}/reject":
    "Dashboard only: API keys always get 403. Approve or reject transfers in the Gravv Dashboard.",
  "POST /v1/external-accounts/{id}/approve":
    "Dashboard only: API keys always get 403. Approve or reject recipients in the Gravv Dashboard.",
  "POST /v1/external-accounts/{id}/reject":
    "Dashboard only: API keys always get 403. Approve or reject recipients in the Gravv Dashboard.",
  "POST /v1/fx/orders/{order_id}/approve":
    "Dashboard only: API keys always get 403. Approve or reject FX orders in the Gravv Dashboard.",
  "POST /v1/fx/orders/{order_id}/reject":
    "Dashboard only: API keys always get 403. Approve or reject FX orders in the Gravv Dashboard.",
  "GET /v1/webhooks/ingestion/search":
    "Dashboard only: an internal route that API keys cannot call. Check your own deliveries with getWebhookHistory, getWebhookEventDetail and getWebhookCallHistory.",

  // Routes that take API keys but are outside the 99 in-scope endpoints, so they are in
  // no specification. The entries record why they have no tool. The rest of the routes
  // left out of scope (card disputes and their simulator, the trade desk, billing and the
  // other internal routes) are in no specification either and need no entry to stay out.
  "POST /v1/cards/{id}/simulate":
    "Not offered yet: the sandbox card simulator is outside the published API reference, and whether to offer it is still open.",
  "POST /v1/collections/simulate/webhook":
    "Not offered yet: the sandbox collection simulator is outside the published API reference, and whether to offer it is still open.",
  "POST /v2/accounts/{id}/settlement/enable": "Out of scope: controlled settlement is not part of the published API.",
  "POST /v2/accounts/{id}/settlement/disable": "Out of scope: controlled settlement is not part of the published API.",
};

/**
 * Enum values stripped from a generated schema, so a tool cannot offer a path that a
 * better tool already owns.
 *
 * `POST /v1/collections` accepts card, apple_pay and google_pay alongside pix,
 * mobile_money and bank_transfer, and for cards it returns the same hosted
 * `payment_link` that `POST /v1/collections/cards/payment-intents` does. The payment
 * intent is strictly more capable on that rail: it also returns an `intent_id`,
 * `expires_at` and `requires_action`, and it is the only route to the `card_token` that
 * recurring and merchant-initiated charges need.
 *
 * Two tools offering the same job is how a model ends up on the weaker one. So the card
 * family is removed from createCollection.
 *
 * pix and mobile_money are removed too: the API rejects both on every call today, so
 * offering them only teaches the model a path that cannot succeed. That leaves
 * bank_transfer, which works in 16 countries.
 */
export const ENUM_RESTRICTIONS: Record<string, { remove: string[]; because: string }> = {
  createCollection: {
    remove: ["card", "apple_pay", "google_pay", "pix", "mobile_money"],
    because:
      "Bank transfer only: pix and mobile_money are always rejected, and card payments go through " +
      "createCardPaymentIntent, which returns the same hosted payment link plus the intent id and card token.",
  },
};

/**
 * Replacement text for descriptions that come from the vendored specs.
 *
 * A tool's description is the spec's summary and description followed by curation text,
 * so a curation fix alone leaves a false spec sentence in front of the corrected one, and
 * the model reads both. The specs are byte copies of client-docs (scripts/sync-specs.ts),
 * so editing them here would be undone by the next sync. The correction lives here until
 * the docs fix the spec text at its source.
 *
 * `whileSpecSays` is the false text the spec still carries. Generation fails once it is
 * gone, so an override cannot outlive the reason it exists: when the spec is fixed and
 * synced, the override is deleted.
 */
export interface DescriptionOverride {
  /** Text the vendored spec still carries (in the operation or a parameter description). */
  whileSpecSays: string;
  /** Replaces the spec `description`, the part after the summary. */
  description?: string;
  /** Replaces the description of the named input properties (dotted for a nested one). */
  params?: Record<string, string>;
}

export const DESCRIPTION_OVERRIDES: Record<string, DescriptionOverride> = {
  // The ten overrides for the pre-Phase 3 specs (customers, external accounts,
  // transactions, collections, cards and fx), and the activateFeature card account one
  // (fixed in docs Phase 6a), were deleted when the specs were fixed at source and synced;
  // generation reported each as stale.

  // ---- retry advice --------------------------------------------------------
  // Three Phase 3 descriptions say to retry a failed call with the same key. A 4xx is
  // kept for 24 hours under its key, so that only replays the failure; the key is for a
  // call whose outcome is unknown, as the idempotency_key argument says.
  createAccountV2: {
    whileSpecSays: "When you retry, reuse the same Idempotency-Key.",
    description:
      "Opens a bank account, with a token wallet where the bank offers one, for a customer whose KYC is " +
      "completed. First call getAccountCapabilities to choose `bank_code`, `currency` and `account_type`, then " +
      "getAccountRequirements to build `data`. The response has only `account_id` and `status: pending`. Get the " +
      "account (getAccountV2) for `application_id` and `status_reason`, and poll until it is `active`, or wait " +
      "for the `applications.accounts.completed` webhook. v2 accounts do not send `account.activated`. Unknown " +
      "fields are rejected.",
  },
  createWallet: {
    whileSpecSays: "Reuse the `Idempotency-Key` to retry.",
    description:
      "Creates a blockchain wallet for a customer on one network. The call is synchronous: the response has the " +
      "address. Every call creates a new wallet with a new address, even for the same customer and network. A " +
      "Stellar wallet finishes its trustline setup in the background, so it can take a short time before it can " +
      "hold USDC.",
  },
  withdrawFromCard: {
    whileSpecSays: "Retry a failed call with the same Idempotency-Key.",
    description:
      "Moves money from an `active` card back to its card account. Some cards, including every new sandbox " +
      "card, answer `this card withdraws by transfer`; for those, use createTransfer from the card to its card " +
      "account. The result is also sent as the `cards.transaction.withdraw` webhook.",
  },

  // ---- collections ---------------------------------------------------------
  // The route takes card methods, but this tool offers bank_transfer only
  // (ENUM_RESTRICTIONS), so the card sentences describe a call the tool cannot make.
  createCollection: {
    whileSpecSays: "Card methods return a `payment_link`",
    description:
      "Starts a bank-transfer collection from a payer. The response carries the payment instructions and bank " +
      "details. The funds settle in stablecoin to the destination. Bank transfer works in BJ, BW, BF, CM, CI, " +
      "CG, GA, ML, MW, NG, RW, ZA, TZ, TG, UG and ZM, chosen by the customer's address country.",
    params: {
      amount: "Amount in major units, as a string with at most 2 decimal places.",
      is_anonymous: "Applies to the card checkout, which this tool does not offer. Leave it out.",
      save_card: "Applies to the card checkout, which this tool does not offer. Leave it out.",
      "source.methods":
        "Payment methods to offer. This tool takes `bank_transfer` alone: pix and mobile_money are rejected in " +
        "every country, and card payments go through createCardPaymentIntent. Availability depends on the " +
        "customer's address country.",
    },
  },
};

/**
 * Names a model is likely to reach for that map to blocked operations.
 *
 * Without this, asking for `getCardSensitiveDetails` returns a bare "unknown tool" and
 * the model tends to retry variations. Naming the refusal and pointing at the supported
 * path stops that loop.
 */
const V1_APPLICATIONS_REMOVED =
  "Removed in 0.4.0: the v1 account application tools are gone. Open an account with getAccountCapabilities, getAccountRequirements and createAccountV2, then answer the bank with getAccountApplicationV2 and updateAccountApplicationV2.";

export const BLOCKED_TOOL_NAMES: Record<string, string> = {
  getCardSensitiveDetails:
    `Not available over MCP: this returns the card PAN and CVV, which must not enter a model's context. Merchants retrieve these client-side with their own key pair — see ${SENSITIVE_DETAILS_GUIDE}`,
  getCardPin:
    "Not available over MCP: returns the encrypted card PIN. Use the client-side decryption flow.",
  updateCardPin: "Not available over MCP: setting a PIN requires handling cardholder data.",
  simulateCardEvent:
    "Not available over MCP yet: the sandbox card simulator (funding and spend events) is outside the published API reference, and whether to offer it is still open. In sandbox, simulateDeposit funds an account.",
  simulateCardFunding:
    "Not available over MCP yet: the sandbox card simulator is outside the published API reference, and whether to offer it is still open.",
  simulateCardSpend:
    "Not available over MCP yet: the sandbox card simulator is outside the published API reference, and whether to offer it is still open.",
  simulateCollectionOutcome:
    "Not available over MCP yet: the sandbox collection simulator is outside the published API reference, and whether to offer it is still open.",
  simulateCollectionWebhook:
    "Not available over MCP yet: the sandbox collection simulator is outside the published API reference, and whether to offer it is still open.",
  startRiskKyc:
    "Renamed: POST /v1/risk/start-kyc is card KYC for a cardholder, now the tool startCardholderKyc. For a customer's own KYC use startCustomerKyc.",
  startRiskKycS2S:
    "Renamed: POST /v1/risk/start-kyc-s2s is now startCardholderKycS2S (card KYC). For a customer's own KYC use startCustomerKycS2S.",
  uploadRiskDocument:
    "Renamed: POST /v1/risk/upload-document is now uploadCardholderKycDocument (card KYC). For a customer's own KYC use uploadCustomerKycDocument.",
  createPaymentLink:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  listPaymentLinks:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  getPaymentLink:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  updatePaymentLink:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  deletePaymentLink:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  updatePaymentLinkStatus:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  getPublicPaymentLink:
    "Retired: payment links are not part of the Gravv API any more. To take a card payment through a hosted page, use createCardPaymentIntent.",
  approveTransfer:
    "Not available over MCP: approving a transfer is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard.",
  rejectTransfer:
    "Not available over MCP: rejecting a transfer is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard.",
  approveExternalAccount:
    "Not available over MCP: approving a recipient is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard.",
  rejectExternalAccount:
    "Not available over MCP: rejecting a recipient is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard.",
  approveFxOrder:
    "Not available over MCP: approving an FX order is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard. Orders placed with an API key need no approval: they run at once.",
  rejectFxOrder:
    "Not available over MCP: rejecting an FX order is Dashboard-only, and API-key calls always get 403. Do it in the Gravv Dashboard.",
  searchWebhookIngestion:
    "Not available over MCP: this is an internal Dashboard route that API keys cannot call. Check your own webhook deliveries with getWebhookHistory, getWebhookEventDetail and getWebhookCallHistory.",
  // The v1 account API left the docs; a saved workflow that names one of its tools is told
  // where the job went rather than getting "Unknown tool".
  createAccountApplication: V1_APPLICATIONS_REMOVED,
  updateAccountApplication: V1_APPLICATIONS_REMOVED,
  getAccountApplication: V1_APPLICATIONS_REMOVED,
  listAccountApplications: V1_APPLICATIONS_REMOVED,
  listPendingAccountApplications: V1_APPLICATIONS_REMOVED,
  deleteAccountApplication: V1_APPLICATIONS_REMOVED,
  submitAccountApplication: V1_APPLICATIONS_REMOVED,
  processAccountApplication: V1_APPLICATIONS_REMOVED,
  submitAndProcessAccountApplication: V1_APPLICATIONS_REMOVED,
  getAccountApplicationHistory: V1_APPLICATIONS_REMOVED,
  validateAccountApplication: V1_APPLICATIONS_REMOVED,
  completeAccountApplicationTos: V1_APPLICATIONS_REMOVED,
  updateAccountStatus: "Removed in 0.4.0: no tool freezes, unfreezes or closes an account.",
};

/**
 * Operations that move money. These require a second call with `confirm: true`, and on
 * a live key additionally require GRAVV_ALLOW_LIVE_WRITES=true.
 *
 * Sandbox and live share one base URL and differ only by API key prefix, so nothing in
 * a request visually signals danger. Two independent signals must line up before value
 * actually moves.
 */
export const MONEY_OPS = new Set<string>([
  "POST /v1/transfer",
  "POST /v1/cards/withdraw",
  "POST /v1/fx/orders",
  "POST /v1/collections",
  "POST /v1/collections/cards/payment-intents/charge",
  // With a card_token the intent charges the saved card at once, with no payer step.
  // Without one it only makes a payment link, but the gate is per route, so both ask.
  "POST /v1/collections/cards/payment-intents",
  // Cancelling does not return funds already debited, and API-key orders are debited
  // when they are placed, so a cancel cannot be undone.
  "POST /v1/fx/orders/{order_id}/cancel",
  // A paused transfer has not been paid out; resuming it releases the payout.
  "POST /v1/transfer/{id}/resume",
]);

/**
 * Operations that cannot be undone but move no money. These require a second call with
 * `confirm: true`, like MONEY_OPS, but not GRAVV_ALLOW_LIVE_WRITES: the second signal
 * guards real value, and a delete moves none. Every DELETE tool is here, so a test fails
 * when a new one arrives without its gate.
 */
export const CONFIRM_OPS = new Set<string>([
  // Activating virtual_cards creates a card application and can issue a card at once;
  // there is no route to deactivate a feature.
  "POST /v1/risk/features/activate",
  // A removed saved card cannot be restored over the API.
  "DELETE /v1/collections/cards/{card_id}",
  // A deleted settlement instruction cannot be read, used or restored.
  "DELETE /v1/settlement-instructions/{id}",
]);

/**
 * Routes that work only with a sandbox key; a live key gets 403. Their tools are not
 * advertised, and are refused before any request, unless the key starts exactly
 * `grvSec_sandbox_`. An unrecognised key counts as live, as everywhere else.
 */
/**
 * Tools whose spec request body is a `oneOf` of object shapes (one per kind of account or
 * payee, shown as tabs in the docs) but whose arguments stay one flat set. The generator
 * merges the shapes and names them in the description. createCustomer is not listed: its
 * individual and business shapes stay under one `body` argument.
 */
export const FLATTEN_BODY_VARIANTS = new Set<string>(["createAccountV2", "createExternalAccount"]);

export const SANDBOX_ONLY = new Set<string>(["POST /v2/accounts/simulate/deposit"]);

export function isSandboxOnly(method: string, path: string): boolean {
  return SANDBOX_ONLY.has(opKey(method, path));
}

/**
 * The API requires an Idempotency-Key on every POST and returns 400 without one. These
 * paths are the documented exceptions — sending a key to them is harmless but pointless.
 */
export const IDEMPOTENCY_EXEMPT_PREFIXES = ["/v1/external-accounts/verify", "/v1/webhooks/"];

/** A file type the upload and download handling recognises by its first bytes. */
export type FileKind = "pdf" | "png" | "jpeg";

/**
 * Where a tool takes a file, so the model can pass a local `file_path` instead of
 * base64 it would have to produce, and carry, in its own context.
 *
 * `at` is the object holding the file fields: "" for the top level, or a dotted path
 * where `[]` steps into each item of an array (`data.parties[].documents[]`). The
 * generator adds `file_path` there and makes `content` optional; the server reads the
 * file, checks its type and size, and fills `content` (and the name and type fields when
 * they are absent). `maxBytes` is the decoded size the route takes in live, as the
 * services check it:
 * - uploadCustomerKycDocument: 10 MiB, the customers KYC check and the gateway's
 *   document body limit (sized for a 10 MiB file).
 * - uploadCardholderKycDocument: 5 MiB. The card KYC service accepts gRPC requests of
 *   at most 10 MiB, and the file reaches it base64 in the JSON body, base64 again in the
 *   gRPC request (16/9 of the file), so about 5.6 MiB of file fits; its own 10 MB check
 *   is never reached.
 * - uploadTransferDocument: 700 KiB, the transfers service's default cap, which keeps the
 *   file under a 1 MiB ingress further down the payout path. A deployment setting can
 *   change it; the default is what the tool states.
 * - the v2 account documents: 2 MiB each, the accounts service's inline document cap.
 */
export interface UploadSpec {
  at: string;
  content: string;
  nameField?: string;
  typeField?: string;
  kinds: FileKind[];
  maxBytes: number;
}

const MB = 1024 * 1024;
const ANY_DOC: FileKind[] = ["jpeg", "png", "pdf"];

export const UPLOADS: Record<string, UploadSpec[]> = {
  uploadCustomerKycDocument: [{ at: "", content: "content", nameField: "filename", kinds: ANY_DOC, maxBytes: 10 * MB }],
  uploadCardholderKycDocument: [{ at: "", content: "content", nameField: "filename", kinds: ANY_DOC, maxBytes: 5 * MB }],
  uploadTransferDocument: [
    {
      at: "",
      content: "content",
      nameField: "file_name",
      typeField: "content_type",
      kinds: ANY_DOC,
      maxBytes: 700 * 1024,
    },
  ],
  updateAccountApplicationV2: [
    { at: "documents[]", content: "content", nameField: "filename", kinds: ANY_DOC, maxBytes: 2 * MB },
  ],
  createAccountV2: [
    { at: "data.documents[]", content: "content", nameField: "filename", kinds: ANY_DOC, maxBytes: 2 * MB },
    { at: "data.parties[].documents[]", content: "content", nameField: "filename", kinds: ANY_DOC, maxBytes: 2 * MB },
  ],
};

/** A size as the tool texts write it: "10 MB", "700 KB". */
export function sizeText(bytes: number): string {
  return bytes >= MB ? `${bytes / MB} MB` : `${bytes / 1024} KB`;
}

/**
 * What to keep a sandbox call's files under. Sandbox calls reach the services through an
 * ingress that refuses a request over 1 MiB. The file travels base64 in the JSON body and
 * the body base64 again in the gRPC request, 16/9 of the file, so files from about 576 KiB
 * are refused there, with a 413 that says 10MB (sandbox, 2026-10-13: 571 KB taken, 600 KB
 * refused, on the customer KYC and transfer document routes). 500 KB leaves room for the
 * other fields. The limit is per request, so a call with several files shares it.
 */
export const SANDBOX_UPLOAD_BYTES = 500 * 1024;

/**
 * The size sentence for a tool's files, the one wording every note, hint and prompt
 * uses: "at most 700 KB; in sandbox, under 500 KB".
 */
export function uploadLimit(tool: string): string {
  const specs = UPLOADS[tool];
  if (!specs) throw new Error(`uploadLimit: ${tool} is not in UPLOADS`);
  const max = sizeText(Math.min(...specs.map((s) => s.maxBytes)));
  const sandbox = sizeText(SANDBOX_UPLOAD_BYTES);
  return specs.some((s) => s.at.includes("[]"))
    ? `at most ${max} each; in sandbox, under ${sandbox} for all of one call's files`
    : `at most ${max}; in sandbox, under ${sandbox}`;
}

/**
 * Call-ordering and preconditions, appended to the generated tool description.
 *
 * This is the knowledge the spec descriptions do not carry: tool names where the specs
 * name routes, the call order across tools, what this server does (file_path, saved
 * downloads, the gates), and the caveats for behaviour that is not live yet. Without it
 * an agent will, for example, create an external account and immediately transfer to
 * it, skipping the wait-until-active step from
 * https://gravv-docs.syntext.dev/recipes/bank-payouts/pay-a-us-bank-account-by-ach
 */
export const PREREQUISITES: Record<string, string> = {
  createAccount:
    "ONLY for your business's one card account. Open every other account with createAccountV2. A business has one card account: look first with listAccounts (account_type card). bank is `lead_bank` or `cross_river_bank`. It is ready at account.activated, when getAccount shows `active`. After a failed call, fix the request and leave idempotency_key out.",

  listAccounts:
    "ONLY to find your business's one card account (account_type card, status active) and your business's own customer id (the customer_id on your account whose category is `main`). For every other account, use listAccountsV2.",

  getAccount:
    "ONLY for your business's one card account: poll it after createAccount until `active`. For every other account, use getAccountV2.",

  getAccountCapabilities:
    "Call first, before getAccountRequirements and createAccountV2. Always send customer_type, also with customer_id: without it options for both types come back. Pass the chosen bank_code, currency and account_type on.",

  createAccountV2:
    `PREREQUISITES: (1) the customer exists and its basic KYC is completed (getCustomer); (2) bank_code, currency and account_type come from getAccountCapabilities, and customer_type is always sent; (3) data is built from getAccountRequirements. Do not send data.root.autofill_tax_form: it is not live yet. Documents take file_path (a local JPEG, PNG or PDF of ${uploadLimit("createAccountV2")}) in place of base64 content. Then poll getAccountV2 until \`active\`, and act on status_reason with updateAccountApplicationV2.`,

  getAccountRequirements:
    "Build createAccountV2.data from this: `root` scope fields in data.root, party fields in each data.parties[] entry, documents by scope. The `predefined` object and the documents' `required_when` and `metadata` are not live yet; production does not return them.",

  getAccountV2:
    "Poll after createAccountV2 until status is `active`. If requires_user_action is true: for awaiting_customer_document or awaiting_customer_data, read getAccountApplicationV2 with application_id and answer with updateAccountApplicationV2; for tos_pending or kyc_pending, send the customer to required_action_url. An unknown id is a 404.",

  listAccountApplicationsV2:
    "Use getAccountApplicationV2 for the status reason and the required fields and documents.",

  getAccountApplicationV2:
    "Read before updateAccountApplicationV2. An unknown id is a 404 `Resource not found`.",

  updateAccountApplicationV2:
    `PREREQUISITE: read getAccountApplicationV2 first and send only what required_fields and required_documents list, all in one call. Documents take file_path (a local JPEG, PNG or PDF of ${uploadLimit("updateAccountApplicationV2")}) in place of base64 content. Do not resend blindly: there is no idempotency key, so a resend uploads again.`,

  simulateDeposit:
    "SANDBOX ONLY: this server shows and runs it only with a sandbox key. PREREQUISITE: the account is `active` with bank details (getAccountV2). amount is a string in major units, such as \"250.00\". Each call makes a new deposit; leave idempotency_key out unless the outcome is unknown.",

  createExternalAccount:
    "Returns 202 with status `pending` for swift, sepa, ach_wire and fps: poll getExternalAccount until status is `active` (usable) or `setup_failed` (terminal). Returns 200 with status `active` for bank_account and mobile_money. Do not call createTransfer until the status is `active`. A duplicate returns 400 ERROR_CODE_DUPLICATE_PAYEE with data.payee_id: reuse that id. Look first with listExternalAccounts (customer_id, search): the duplicate check can miss one. For a local bank or mobile money payee, take institution_id from listExternalAccountInstitutions. ach_wire needs payment_rail (ach, wire or rtp).",

  createTransfer:
    "PREREQUISITES: (1) the source account must be funded — check getAccountV2 for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). Before a large payout, getCustomerLimits (or getRemitterLimits for a named sender) shows what is left. A 200 with `transfer_status: paused` is not a failure: read `requirements`, upload any requested document with uploadTransferDocument, then call resumeTransfer. Send a client_reference, so that a resend is recognised, and amount as a string. For SWIFT, upload the invoice with uploadTransferDocument first and pass supporting_document_ids. MOVES MONEY: requires confirm: true.",

  uploadTransferDocument:
    `Upload before createTransfer or resumeTransfer when \`requirements\` asks for a supporting document, and pass the returned id in supporting_document_ids. Pass file_path (a local PDF, PNG or JPEG of ${uploadLimit("uploadTransferDocument")}): the server reads it and fills content, file_name and content_type.`,

  resumeTransfer:
    "Only for a transfer returned as `paused`; id is the transfer `reference` from createTransfer. Send exactly what `requirements` lists, uploading documents first with uploadTransferDocument. Leave idempotency_key out on each new attempt: the same key returns the first answer. A 410 means start a new transfer. MOVES MONEY: resuming releases the payout; requires confirm: true.",

  getCustomerLimits:
    "Use before a large payout, or to explain a pause: remaining_usd is what is left in each window. A null cap means no cap only when caps_basis is `tier`.",

  getRemitterLimits:
    "remitter_id is your own id for the sender, as sent in additional_information.remitter_verification on createTransfer. An unknown id answers with the default tier, not a 404.",


  createWallet:
    "SYNCHRONOUS: the response carries the wallet address. Each call creates a NEW wallet, so do not call it again to check on a wallet; use getWallet or listWallets. network is one of polygon, ethereum, avalanche, stellar or solana. Only Stellar wallets finish their trustline setup in the background.",

  createSettlementInstruction:
    "These are your own payout destinations for createFxOrder proceeds: pass the returned id as the order destination {type: external_account, id}. This server sends currency in upper case. There is no duplicate check, so list first with listSettlementInstructions.",

  updateExternalAccount:
    "Only for a `setup_failed` (or long `pending`) external account, or to add national_id, national_id_type, pix_key or address. A null value clears a field and a missing one keeps it. It returns 202: poll getExternalAccount until `active` or `setup_failed`. A 409 means add a new external account instead.",

  getFxQuote:
    "Quotes expire after about 5 minutes (see the expiry in the response). A quote does NOT lock a rate for createTransfer; its quote_id is used only by createFxOrder. A quote holds pair liquidity, so do not quote again and again. Re-quote after expiry.",

  createFxOrder:
    "PREREQUISITE: a fresh getFxQuote (about 5 minutes). Over an API key the order is created `pending` and the source is debited at once. There is no approval step and no second user; `waiting_approval` is only for orders placed in the Dashboard. MOVES MONEY: requires confirm: true.",

  listFxPendingApprovals:
    "Only orders placed in the Dashboard wait for approval. Orders created with an API key run at once and never appear here, so this list is usually empty for an API integration. A scoped API key needs the fx:order_approve permission, or the call returns 400 `caller is not permitted to approve or reject orders`. Approving and rejecting happen in the Dashboard; the API cannot do them.",

  createCardApplication:
    "PREREQUISITES: the customer's basic KYC is completed (getCustomer), and account_id is your active `card` account (listAccounts with account_type card). In live, use activateFeature with feature_id virtual_cards instead. Poll listCardApplications for application_status, or wait for the cards.application.update webhook.",

  createCard:
    "PREREQUISITE: listCardApplications shows application_status `approved` for the customer. card_limit is a whole-dollar daily limit above 0. A physical card needs shipping_address. Each further card for the customer is a new call: leave idempotency_key out. The PIN route is not available over MCP.",

  checkFeatureEligibility:
    "The provider_data items listed as pending are the fields to pass to activateFeature. Leave idempotency_key out on each check: an answer is kept for 24 hours under its key.",

  activateFeature:
    "PREREQUISITES: checkFeatureEligibility first. For virtual_cards the cardholder needs completed card KYC with a liveness check (startCardholderKyc, or the websdk_url this call returns), and provider_data needs account_id (your active card account: listAccounts with account_type card and status active) as well as annual_remuneration and estimated_monthly_limit as JSON numbers. Requires confirm: true.",

  startCardholderKyc:
    "Card KYC for a cardholder; for a customer's own KYC use startCustomerKyc. Check getCustomer first: never call it for a customer whose basic kyc status is `completed`, because it resets it to `pending`. Returns a web_url valid for one hour.",

  uploadCardholderKycDocument:
    `STEP 1 of server-to-server card KYC; then startCardholderKycS2S. Check data.status: a validation failure is HTTP 200 with status \`error\`. Pass file_path (a local JPEG, PNG or PDF of ${uploadLimit("uploadCardholderKycDocument")}) in place of base64 content; filename must end in .jpg, .jpeg, .png or .pdf.`,

  startCardholderKycS2S:
    "STEP 2 of server-to-server card KYC: every document must already be uploaded with uploadCardholderKycDocument. Check data.status and data.code: HTTP 200 also carries MISSING_DOCUMENTS and KYC_ALREADY_COMPLETED.",

  withdrawFromCard:
    "MOVES MONEY: requires confirm: true. Works for cards on the live card programme and for older sandbox cards. New sandbox cards and some live cards refuse with 'this card withdraws by transfer'. The card must be `active`, and the amount (USD, at most 2 decimals) must not exceed the balance from getCardBalance. Funds go to the card's own account wallet.",

  updateCardStatus:
    "ALWAYS send limit (whole USD per day) together with status: leaving limit out sets the card's daily limit to 0, and a live card stops working. status is required on every call: active, freeze or blocked; blocked is permanent. To change only the limit, resend the current status.",

  cancelFxOrder:
    "Only an order in `waiting_approval`, or a `pending` order whose debit is not in flight, can be cancelled. Cancelling does NOT return funds already debited, and API-key orders are debited when they are placed. IRREVERSIBLE: requires confirm: true.",

  createCardPaymentIntent:
    "Without card_token: returns payment_link (valid 24 h); send the payer there. With card_token: charges the card at once. Check data.status (processing, requires_action or charge_failed); a decline is HTTP 200. The customer needs phone_number and date_of_birth. card_token comes from listSavedCards, not from webhooks. client_reference must be unique across collections and payment intents. MOVES MONEY: requires confirm: true.",

  createCollection:
    "MOVES MONEY: requires confirm: true. Bank transfer only. The customer must have phone_number and date_of_birth. Countries: BJ BW BF CM CI CG GA ML MW NG RW ZA TZ TG UG ZM; currency must be that country's local currency; pass metadata.bank_account_number. amount is a string with up to 2 decimals. client_reference must be unique across collections and payment intents.",

  chargeSavedCard:
    "MOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",

  startCustomerKyc:
    "For business customers, complete KYC for every associated person BEFORE starting the business's own verification. Verification is asynchronous. Read the outcome from getCustomer (the `basic` kyc status becomes `completed` or `failed`) or from the customer.kyc.status.* webhooks. Each start is billed: never call it again in a loop.",

  uploadCustomerKycDocument:
    `STEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails. Pass file_path (a local JPEG, PNG or PDF of ${uploadLimit("uploadCustomerKycDocument")}) in place of base64 content.`,

  downloadCustomerKycDocument:
    "This server saves the image to a local file (GRAVV_DOWNLOAD_DIR or --download-dir; by default a gravv-mcp-downloads folder in the system temp folder) and returns saved_to with its type and size, never the image itself. Get document_id from getCustomerKycDocuments. Documents uploaded through card KYC (uploadCardholderKycDocument) cannot be downloaded yet: the call fails with a 500.",

  startCustomerKycS2S:
    "STEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument. Each start is billed: never call it again in a loop.",

  getWebhookHistory:
    "Use an item's `id` with getWebhookEventDetail, getWebhookCallHistory or retryWebhookEvent.",

  getWebhookEventDetail:
    "Takes the `id` of a getWebhookHistory item. The stored payload is a re-serialised copy: do not use it to check a signature.",

  getWebhookCallHistory:
    "Takes the `id` of a getWebhookHistory item.",

  getCollection:
    "onramp_status `settlement_abandoned` is not live yet; production does not send it.",

  exportTransactions:
    "Returns at most the 10 newest matching rows (a known bug). For more, use listTransactions with paging. Dates are YYYY-MM-DD; export_format is csv or json, lower case.",
};

/**
 * Tools whose answer carries a file, saved to a local file instead of returned. A KYC
 * image in the model's context is both large (up to about 13 MB) and personal data.
 * `content` is the data-URI field in `data`; the file name is built from the arguments
 * named in `nameFrom`, never from the response.
 */
export interface DownloadSpec {
  content: string;
  prefix: string;
  nameFrom: string[];
}

export const DOWNLOADS: Record<string, DownloadSpec> = {
  downloadCustomerKycDocument: { content: "content", prefix: "kyc", nameFrom: ["document_id", "side"] },
};

/**
 * Top-level arguments sent in upper case, whatever the model passes.
 *
 * A settlement instruction stores its currency exactly as sent, and the list filter and
 * order matching compare it exactly, so a `usd` instruction is never found by `USD`. The
 * list filter is left as given: rows already stored in lower case must stay findable.
 */
export const UPPER_CASE_ARGS: Record<string, string[]> = {
  createSettlementInstruction: ["currency"],
};

/**
 * How to learn whether a call took effect, for every tool that sends an Idempotency-Key.
 *
 * After a timeout, a network error or a 5xx the outcome is unknown, and the error's hint
 * says to look the result up before resending. "The matching get or list tool" is not
 * enough: the obvious lookup for a transfer, a list filtered by client_reference, does
 * not exist. Each `lookup` completes "Look it up first: …". `readOnly` marks a POST that
 * changes nothing, so calling it again is safe.
 */
export type OutcomeLookup = { lookup: string } | { readOnly: true };

export const OUTCOME_LOOKUPS: Record<string, OutcomeLookup> = {
  createTransfer: {
    lookup:
      "listTransactions with account_id set to the source account (newest first), and find your client_reference in the rows (there is no client_reference filter)",
  },
  resumeTransfer: { lookup: "getTransaction with the transfer's transaction_id, and read whether it is still paused" },
  uploadTransferDocument: {
    lookup:
      "no tool lists transfer documents, so resend with the same key, which returns the first upload's id if it landed",
  },
  withdrawFromCard: { lookup: "getCardBalance, and listTransactions with card_id set to the card" },
  createFxOrder: { lookup: "listFxOrders (newest first), and match the pair, side and amount" },
  cancelFxOrder: { lookup: "getFxOrder, and read its status" },
  createCollection: { lookup: "getWebhookHistory, and find the event that carries your client_reference" },
  createCardPaymentIntent: { lookup: "getWebhookHistory, and find the event that carries your client_reference" },
  chargeSavedCard: { lookup: "getWebhookHistory, and find the event for your payment_intent_id" },
  createCustomer: { lookup: "listCustomers, and match the email" },
  createExternalAccount: { lookup: "listExternalAccounts, and match the customer, account number and rail" },
  createSettlementInstruction: {
    lookup: "listSettlementInstructions with currency, and match the account name (there is no duplicate check)",
  },
  createAccount: { lookup: "listAccounts with account_type card (a business has one card account)" },
  createAccountV2: {
    lookup: "listAccountsV2 with customer_id and currency, and listAccountApplicationsV2 with customer_id",
  },
  createWallet: {
    lookup: "listWallets with customer_id and network (a second call creates a second wallet)",
  },
  createCard: { lookup: "listCards, and match the cardholder" },
  createCardApplication: { lookup: "listCardApplications, and match the cardholder" },
  startCustomerKyc: {
    lookup: "getCustomer, and read the basic kyc status; do not start it again in a loop, as each start is billed",
  },
  startCustomerKycS2S: {
    lookup: "getCustomer, and read the basic kyc status; do not start it again in a loop, as each start is billed",
  },
  uploadCustomerKycDocument: { lookup: "getCustomerKycDocuments" },
  activateFeature: { lookup: "listFeatures, and read the feature's status" },
  startCardholderKyc: {
    lookup: "getCustomer, and read the basic kyc status; do not start it again in a loop",
  },
  startCardholderKycS2S: {
    lookup: "getCustomer, and read the basic kyc status; do not start it again in a loop",
  },
  uploadCardholderKycDocument: {
    lookup:
      "no tool lists card KYC documents, so resend with the same key, which returns the first upload's answer if it landed",
  },
  simulateDeposit: {
    lookup:
      "listTransactions with account_id set to the account (newest first), and look for the test deposit; each new key makes a new deposit",
  },
  getFxQuote: { readOnly: true },
  checkFeatureEligibility: { readOnly: true },
};

/** Routes that move money: confirm, and GRAVV_ALLOW_LIVE_WRITES on a live key. */
export function isMoneyOp(method: string, path: string): boolean {
  return MONEY_OPS.has(opKey(method, path));
}

/** Routes whose tool must carry a `confirm` argument: MONEY_OPS and CONFIRM_OPS. */
export function needsConfirmation(method: string, path: string): boolean {
  return isMoneyOp(method, path) || CONFIRM_OPS.has(opKey(method, path));
}

export function needsIdempotencyKey(method: string, path: string): boolean {
  if (method.toLowerCase() !== "post") return false;
  return !IDEMPOTENCY_EXEMPT_PREFIXES.some((p) => path.startsWith(p));
}
