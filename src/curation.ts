/**
 * Hand-maintained curation over the generated tool surface.
 *
 * Most operations in the source specifications carry no `operationId`, and MCP tool
 * names have to be stable and human-legible. So this server owns its own naming, keyed
 * by `METHOD /path`, rather than depending on the specifications for it. The
 * specifications remain the source of truth for request and response *shapes*; this
 * file is the source of truth for how the tools *present*.
 *
 * Four things live here, none of which can be derived from a spec:
 *   1. NAMES        — stable tool names
 *   2. TOOLSETS     — which domain a tool belongs to, for opt-in loading
 *   3. BLOCKED      — operations that must never become tools
 *   4. PREREQUISITES — call ordering, which only the guides encode
 */

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
  "account-applications",
  "transfers",
  "transactions",
  "external-accounts",
  "cards",
  "wallets",
  "fx",
  "collections",
  "kyc",
  "features",
  "webhooks",
] as const;

export type Toolset = (typeof TOOLSETS)[number];

/**
 * Toolset names that existed in earlier releases. Saved configurations still name them
 * (`--toolsets=approvals`, `GRAVV_TOOLSETS=...`), so they are accepted with a warning and
 * ignored rather than refused: refusing them would stop those servers from starting.
 */
export const RETIRED_TOOLSETS: Readonly<Record<string, string>> = {
  approvals: "approving and rejecting is Dashboard-only, and API keys always got 403",
  "payment-links": "payment links are retired from the Gravv API",
};

/** Toolsets that load only when named, or with --toolsets=all. */
export const OPT_IN_TOOLSETS: ReadonlySet<Toolset> = new Set<Toolset>(["account-applications"]);

/**
 * Loaded when the operator passes no --toolsets flag: everything except
 * `account-applications`.
 *
 * Gating most domains behind opt-in flags turned out to cost context rather than save
 * it: a handful of account-application tools carry very large onboarding schemas and
 * dominate the total, while every other domain is cheap. Excluding just those buys more
 * than gating half the API did.
 *
 * So everything else loads by default and nobody restarts the server to create a wallet.
 * Account onboarding is a deliberate, infrequent flow; `--toolsets=all` or
 * `--toolsets=account-applications` turns it on when it is actually needed.
 */
export const DEFAULT_TOOLSETS: Toolset[] = TOOLSETS.filter((t) => !OPT_IN_TOOLSETS.has(t));

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
    (t) => !(TOOLSETS as readonly string[]).includes(t) && !Object.hasOwn(RETIRED_TOOLSETS, t),
  );
  if (bad.length) throw new UnknownToolsetError(bad);

  const kept: Toolset[] = [];
  for (const t of requested) {
    if (Object.hasOwn(RETIRED_TOOLSETS, t)) {
      warn(`toolset "${t}" was removed in 0.3.2 (${RETIRED_TOOLSETS[t]}); ignoring it.`);
      continue;
    }
    kept.push(t as Toolset);
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

  // ---- accounts ------------------------------------------------------------
  "POST /v1/accounts": { name: "createAccount", toolset: "accounts" },
  "GET /v1/accounts": { name: "listAccounts", toolset: "accounts" },
  "GET /v1/accounts/{account_id}": { name: "getAccount", toolset: "accounts" },
  "PATCH /v1/accounts/{account_id}/status": { name: "updateAccountStatus", toolset: "accounts" },
  "POST /v1/accounts/applications": { name: "createAccountApplication", toolset: "account-applications" },
  "GET /v1/accounts/applications": { name: "listAccountApplications", toolset: "account-applications" },
  "GET /v1/accounts/applications/pending": { name: "listPendingAccountApplications", toolset: "account-applications" },
  "GET /v1/accounts/applications/{id}": { name: "getAccountApplication", toolset: "account-applications" },
  "PUT /v1/accounts/applications/{id}": { name: "updateAccountApplication", toolset: "account-applications" },
  "DELETE /v1/accounts/applications/{id}": { name: "deleteAccountApplication", toolset: "account-applications" },
  "POST /v1/accounts/applications/{id}/submit": { name: "submitAccountApplication", toolset: "account-applications" },
  "POST /v1/accounts/applications/{id}/process": { name: "processAccountApplication", toolset: "account-applications" },
  "POST /v1/accounts/applications/{id}/submit-and-process": {
    name: "submitAndProcessAccountApplication",
    toolset: "account-applications",
  },
  "GET /v1/accounts/applications/{id}/history": { name: "getAccountApplicationHistory", toolset: "account-applications" },
  "POST /v1/accounts/applications/tos": { name: "completeAccountApplicationTos", toolset: "account-applications" },
  "POST /v1/accounts/applications/validate": { name: "validateAccountApplication", toolset: "account-applications" },

  // ---- external accounts (payees) -----------------------------------------
  "POST /v1/external-accounts": { name: "createExternalAccount", toolset: "external-accounts" },
  "GET /v1/external-accounts": { name: "listExternalAccounts", toolset: "external-accounts" },
  "GET /v1/external-accounts/{external_account_id}": { name: "getExternalAccount", toolset: "external-accounts" },
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

  // ---- collections / onramp ------------------------------------------------
  "POST /v1/collections": { name: "createCollection", toolset: "collections" },
  "GET /v1/collections/{id}": { name: "getCollection", toolset: "collections" },
  "POST /v1/collections/cards/payment-intents": { name: "createCardPaymentIntent", toolset: "collections" },
  "POST /v1/collections/cards/payment-intents/charge": { name: "chargeSavedCard", toolset: "collections" },
  "GET /v1/collections/cards": { name: "listSavedCards", toolset: "collections" },
  "GET /v1/collections/cards/{card_id}": { name: "getSavedCard", toolset: "collections" },

  // ---- features ------------------------------------------------------------
  "GET /v1/risk/features": { name: "listFeatures", toolset: "features" },
  "POST /v1/risk/features/eligibility": { name: "checkFeatureEligibility", toolset: "features" },
  "POST /v1/risk/features/activate": { name: "activateFeature", toolset: "features" },

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
 *  - Superseded KYC. /v1/risk/* is replaced by /v1/customers/kyc/*. Exposing both
 *    gives the model two plausible paths for the same job and it will sometimes pick
 *    the deprecated one.
 *
 *  - Retired. Payment links are no longer part of the Gravv API. Their specification is
 *    still vendored until the next spec sync removes it, so the routes must be listed
 *    here or the generator reports them as unmapped.
 *
 *  - Broken until the specification is fixed. The vendored spec omits a request body the
 *    API requires, so a generated tool would fail on every call. These return when the
 *    spec sync brings the body in.
 *
 *  - Dashboard-only. These routes refuse API keys, so a tool for them fails on every
 *    call. They are in no specification, so the generator never meets them; the
 *    entries are the written record of why they are absent.
 */
export const BLOCKED: Record<string, string> = {
  "GET /v1/cards/{card_id}/sensitive-details":
    "Returns card PAN and CVV. Use the client-side decryption flow instead: https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview",
  "GET /v1/cards/{card_id}/pin":
    "Returns the encrypted card PIN. Use the client-side decryption flow instead.",
  "PUT /v1/cards/{card_id}/pin":
    "Sets a card PIN, which requires handling cardholder data. Not exposed over MCP.",
  "POST /v1/risk/start-kyc": "Superseded by startCustomerKyc (POST /v1/customers/kyc/start).",
  "POST /v1/risk/start-kyc-s2s": "Superseded by startCustomerKycS2S (POST /v1/customers/kyc/start-s2s).",
  "POST /v1/risk/upload-document":
    "Superseded by uploadCustomerKycDocument (POST /v1/customers/kyc/upload-document).",
  "POST /v1/payment-links": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "PUT /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "DELETE /v1/payment-links/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "PATCH /v1/payment-links/{id}/status": "Retired: payment links are not part of the Gravv API any more.",
  "GET /v1/payment-links/public/{id}": "Retired: payment links are not part of the Gravv API any more.",
  "DELETE /v1/collections/cards/{card_id}":
    "The API needs customer_id and card_token in a JSON body, and the vendored spec declares none, so every call would fail with EOF.",
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
  /** Replaces the description of the named input properties. */
  params?: Record<string, string>;
}

export const DESCRIPTION_OVERRIDES: Record<string, DescriptionOverride> = {
  // ---- customers -----------------------------------------------------------
  updateCustomer: {
    whileSpecSays: "Cosmetic path parameter",
    description:
      "Update details of a customer. The customer is taken from the path customer_id; a customer_id in the " +
      "body is overwritten by the path value. Only provided fields are updated.",
    params: { customer_id: "Customer to update. Taken from the path; any body value is overwritten." },
  },

  // ---- external accounts ---------------------------------------------------
  createExternalAccount: {
    whileSpecSays: "is idempotent and returns the existing",
    description:
      "Adds an external account (a payee) for transfers to accounts outside Gravv. swift, sepa, ach_wire and " +
      "fps payees return HTTP 202 with status `pending` while setup runs in the background; bank_account and " +
      "mobile_money payees return HTTP 200 with status `active`. Track a pending payee with " +
      "getExternalAccount or the external_account.active and external_account.setup_failed webhooks. A " +
      "duplicate is not idempotent: it returns 400 ERROR_CODE_DUPLICATE_PAYEE with the existing id in " +
      "data.payee_id.",
  },
  getExternalAccount: {
    whileSpecSays: "calling it until the status changes to",
    description:
      "Retrieve details of an external account. After a 202 from createExternalAccount, poll until status is " +
      "`active` (usable) or `setup_failed` (terminal: read error_message). A missing id returns HTTP 400 with " +
      "code ERROR_CODE_NOT_FOUND.",
  },

  // ---- transactions --------------------------------------------------------
  exportTransactions: {
    whileSpecSays: "Maximum 50,000 records per export",
    description:
      "Exports matching transactions as a downloadable file, in CSV or JSON. Today it returns at most the 10 " +
      "newest matching rows (a known bug).",
  },

  // ---- collections ---------------------------------------------------------
  createCollection: {
    whileSpecSays: "(card, bank transfer, and mobile money)",
    description:
      "Initiates a bank-transfer collection. The response carries the payment instructions for the payer.",
  },
  getCollection: {
    whileSpecSays: "no API key is required",
    description:
      "Returns the status and details of a collection. It needs an API key like every other call. Pass the " +
      "transaction_id from createCollection, chargeSavedCard or a webhook, not the `id` field of an earlier " +
      "getCollection. transaction_status is pending, completed, failed, refunded, refund_pending or disputed.",
  },
  createCardPaymentIntent: {
    whileSpecSays: "token you got from the webhook",
    params: {
      card_token: "Saved card token from listSavedCards. When set, the card is charged at once.",
    },
  },

  // ---- cards ---------------------------------------------------------------
  updateCardStatus: {
    whileSpecSays: "Optional spending limit",
    params: {
      limit: "Daily limit in whole USD. Always send it: leaving it out sets the daily limit to 0.",
    },
  },

  // ---- fx ------------------------------------------------------------------
  // The fx spec predates the current API: its request fields and the approval and
  // rate-lock claims are all out of date. The schemas stay as generated until the spec
  // is fixed, so the descriptions say which fields the API actually reads.
  getFxQuote: {
    whileSpecSays: "lock in the quoted rate",
    description:
      "The API reads `currency_pair` (FROM_TO, the currency you sell first, for example `USD_XAF`) and " +
      "`amount` (the sell amount in major units, sent as a string such as \"1000\"). When currency_pair is " +
      "sent, from_currency, to_currency and direction are ignored, so any value passes the schema. The " +
      "response carries a `quote_id` and an `expires_at` about 5 minutes ahead. Use the quote_id only with " +
      "createFxOrder: it does not lock a rate for transfers. The `Idempotency-Key` header is required; this " +
      "server sends one.",
    params: {
      amount:
        "The sell amount in major units of the FROM currency, sent as a STRING (for example \"1000\"). A JSON " +
        "number is rejected with `invalid request encoding`.",
      direction:
        "Ignored when currency_pair is sent. BUY and SELL are not values the API accepts; send currency_pair " +
        "(for example USD_XAF) instead.",
    },
  },
  createFxOrder: {
    whileSpecSays: "doesn't execute until a second user approves it",
    description:
      "Creates an OTC order from a quote. Over an API key the order is created `pending` and the source is " +
      "debited at once: there is no approval step and no second user (`waiting_approval` is only for orders " +
      "placed in the Dashboard). The API reads `quote_id` (from getFxQuote), `source` {type: " +
      "internal_account | internal_crypto_wallet, id} and `destination` {type: external_account (a settlement " +
      "instruction id) | internal_account | internal_crypto_wallet, id}, plus optional `client_reference` and " +
      "`metadata`. It ignores order_type, side, pair, target_rate, amount and customer_id: the schema comes " +
      "from an older spec and still asks for some of them, so any value passes. The amount is the quote's. " +
      "The `Idempotency-Key` header is required; this server sends one.",
  },
};

/**
 * Names a model is likely to reach for that map to blocked operations.
 *
 * Without this, asking for `getCardSensitiveDetails` returns a bare "unknown tool" and
 * the model tends to retry variations. Naming the refusal and pointing at the supported
 * path stops that loop.
 */
export const BLOCKED_TOOL_NAMES: Record<string, string> = {
  getCardSensitiveDetails:
    "Not available over MCP: this returns the card PAN and CVV, which must not enter a model's context. Merchants retrieve these client-side with their own key pair — see https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview",
  getCardPin:
    "Not available over MCP: returns the encrypted card PIN. Use the client-side decryption flow.",
  updateCardPin: "Not available over MCP: setting a PIN requires handling cardholder data.",
  startRiskKyc: "Use startCustomerKyc instead — /v1/risk/start-kyc is superseded by /v1/customers/kyc/start.",
  startRiskKycS2S: "Use startCustomerKycS2S instead — /v1/risk/* KYC is superseded by /v1/customers/kyc/*.",
  uploadRiskDocument: "Use uploadCustomerKycDocument instead — /v1/risk/* KYC is superseded.",
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
  deleteSavedCard:
    "Not available in this release: the API needs customer_id and card_token in a JSON request body, and the current spec sends no body, so every call fails with EOF. The tool returns when the spec is fixed. Until then, call DELETE /v1/collections/cards/{card_id} directly with a body of {customer_id, card_token}.",
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
]);

/**
 * The API requires an Idempotency-Key on every POST and returns 400 without one. These
 * paths are the documented exceptions — sending a key to them is harmless but pointless.
 */
export const IDEMPOTENCY_EXEMPT_PREFIXES = ["/v1/external-accounts/verify", "/v1/webhooks/"];

/**
 * Call-ordering and preconditions, appended to the generated tool description.
 *
 * This is the knowledge that exists only in the guides — the OpenAPI specs describe 86
 * independent operations and say nothing about what must happen first. Without this an
 * agent will, for example, create an external account and immediately transfer to it,
 * skipping the poll-until-active step from
 * https://gravv-docs.syntext.dev/recipes/remit-funds-to-a-recipient
 */
export const PREREQUISITES: Record<string, string> = {
  createAccount:
    "PREREQUISITE: the customer must exist and have passed KYC. Call getCustomer and check that the `kyc` entry with type `basic` has status `completed`. An account cannot be opened for an unverified customer.",

  createExternalAccount:
    "Returns 202 with status `pending` for swift, sepa, ach_wire and fps: poll getExternalAccount until status is `active` (usable) or `setup_failed` (terminal). Returns 200 with status `active` for bank_account and mobile_money. Do not call createTransfer until the status is `active`. A duplicate returns 400 ERROR_CODE_DUPLICATE_PAYEE with data.payee_id: reuse that id. ach_wire needs payment_rail (ach, wire or rtp).",

  createTransfer:
    "PREREQUISITES: (1) the source account must be funded — check getAccount for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). MOVES MONEY: requires confirm: true.",

  submitAccountApplication:
    "ORDERING: statuses are lower case: draft -> submitted -> processing -> approved, rejected or manual_review (`expired` exists but is not set today). Submitting needs zero validation errors and moves a draft or rejected application to submitted. Call processAccountApplication next, or use submitAndProcessAccountApplication to do both.",

  processAccountApplication:
    "ASYNC: returns status `processing`. Poll getAccountApplication until status is `approved`, `rejected` or `manual_review`. A 200 can carry status `rejected` with an errors[] list.",

  submitAndProcessAccountApplication:
    "ASYNC: submits and starts processing. is_fully_processed=false is normal. Poll getAccountApplication until status is `approved`, `rejected` or `manual_review`. If processing_result is null, call processAccountApplication.",

  createWallet:
    "SYNCHRONOUS: the response carries the wallet address. Each call creates a NEW wallet, so do not call it again to check on a wallet; use getWallet or listWallets. Only Stellar wallets finish their trustline setup in the background.",

  getFxQuote:
    "Quotes expire after about 5 minutes (see the expiry in the response). A quote does NOT lock a rate for createTransfer; its quote_id is used only by createFxOrder. A quote holds pair liquidity, so do not quote again and again. Re-quote after expiry.",

  createFxOrder:
    "PREREQUISITE: a fresh getFxQuote (about 5 minutes). Over an API key the order is created `pending` and the source is debited at once. There is no approval step and no second user; `waiting_approval` is only for orders placed in the Dashboard. MOVES MONEY: requires confirm: true.",

  listFxPendingApprovals:
    "Only orders placed in the Dashboard wait for approval. Orders created with an API key run at once and never appear here, so this list is usually empty for an API integration. A scoped API key needs the fx:order_approve permission, or the call returns 400 `caller is not permitted to approve or reject orders`. Approving and rejecting happen in the Dashboard; the API cannot do them.",

  withdrawFromCard:
    "MOVES MONEY: requires confirm: true. Works for cards on the live card programme and for older sandbox cards. New sandbox cards and some live cards refuse with 'this card withdraws by transfer'. The card must be `active`, and the amount (USD, at most 2 decimals) must not exceed the balance from getCardBalance. Funds go to the card's own account wallet.",

  updateCardStatus:
    "ALWAYS send limit (whole USD per day) together with status: leaving limit out sets the card's daily limit to 0, and a live card stops working. status is required on every call: active, freeze or blocked; blocked is permanent. To change only the limit, resend the current status.",

  cancelFxOrder:
    "Only an order in `waiting_approval`, or a `pending` order whose debit is not in flight, can be cancelled. Cancelling does NOT return funds already debited, and API-key orders are debited when they are placed. IRREVERSIBLE: requires confirm: true.",

  createCardPaymentIntent:
    "Without card_token: returns payment_link (valid 24 h); send the payer there. With card_token: charges the card at once. Check data.status (processing, requires_action or charge_failed); a decline is HTTP 200. The customer needs phone_number and date_of_birth. card_token comes from listSavedCards, not from webhooks. MOVES MONEY: requires confirm: true.",

  createCollection:
    "MOVES MONEY: requires confirm: true. Bank transfer only. The customer must have phone_number and date_of_birth. Countries: BJ BW BF CM CI CG GA ML MW NG RW ZA TZ TG UG ZM; currency must be that country's local currency; pass metadata.bank_account_number. amount is a string with up to 2 decimals.",

  chargeSavedCard:
    "MOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",

  startCustomerKyc:
    "For business customers, complete KYC for every associated person BEFORE starting the business's own verification. Verification is asynchronous. Read the outcome from getCustomer (the `basic` kyc status becomes `completed` or `failed`) or from the customer.kyc.status.* webhooks.",

  uploadCustomerKycDocument:
    "STEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails.",

  startCustomerKycS2S:
    "STEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument.",

  exportTransactions:
    "Returns at most the 10 newest matching rows (a known bug). For more, use listTransactions with paging. Dates are YYYY-MM-DD; export_format is csv or json, lower case.",
};

/** Tool names that must carry a `confirm` argument, derived from MONEY_OPS. */
export function isMoneyOp(method: string, path: string): boolean {
  return MONEY_OPS.has(opKey(method, path));
}

export function needsIdempotencyKey(method: string, path: string): boolean {
  if (method.toLowerCase() !== "post") return false;
  return !IDEMPOTENCY_EXEMPT_PREFIXES.some((p) => path.startsWith(p));
}
