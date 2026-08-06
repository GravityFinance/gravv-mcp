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

export type Toolset =
  | "customers"
  | "accounts"
  | "account-applications"
  | "approvals"
  | "transfers"
  | "transactions"
  | "external-accounts"
  | "cards"
  | "wallets"
  | "fx"
  | "collections"
  | "payment-links"
  | "kyc"
  | "features"
  | "webhooks";

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
export const DEFAULT_TOOLSETS: Toolset[] = [
  "customers",
  "accounts",
  "transfers",
  "transactions",
  "external-accounts",
  "kyc",
  "cards",
  "wallets",
  "fx",
  "collections",
  "payment-links",
  "features",
  "webhooks",
  "approvals",
];

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
  "DELETE /v1/collections/cards/{card_id}": { name: "deleteSavedCard", toolset: "collections" },

  // ---- payment links -------------------------------------------------------
  "POST /v1/payment-links": { name: "createPaymentLink", toolset: "payment-links" },
  "GET /v1/payment-links": { name: "listPaymentLinks", toolset: "payment-links" },
  "GET /v1/payment-links/{id}": { name: "getPaymentLink", toolset: "payment-links" },
  "PUT /v1/payment-links/{id}": { name: "updatePaymentLink", toolset: "payment-links" },
  "DELETE /v1/payment-links/{id}": { name: "deletePaymentLink", toolset: "payment-links" },
  "PATCH /v1/payment-links/{id}/status": { name: "updatePaymentLinkStatus", toolset: "payment-links" },
  "GET /v1/payment-links/public/{id}": { name: "getPublicPaymentLink", toolset: "payment-links" },

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
 * Never exposed as tools, with the reason. Two categories:
 *
 *  - Cardholder data. These return PAN, CVV, and PIN. That must not enter a model's
 *    context under any configuration, so there is no flag to enable them. Merchants
 *    use the client-side decryption flow documented under
 *    platform/cards/view-card-sensitive-details/.
 *
 *  - Superseded KYC. /v1/risk/* is replaced by /v1/customers/kyc/*. Exposing both
 *    gives the model two plausible paths for the same job and it will sometimes pick
 *    the deprecated one.
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
  // Approving releases a held instruction for execution, so it moves money just as
  // surely as initiating one. Rejecting does not, and is not gated.
  "POST /v1/transfer/{id}/approve",
  "POST /v1/fx/orders/{order_id}/approve",
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
    "PREREQUISITE: the customer must exist and have completed KYC. Check getCustomerKycStatus first — an account cannot be opened for an unverified customer.",

  createExternalAccount:
    "RETURNS 202: the recipient is not immediately usable. This returns status `pending` while the payment rail sets the recipient up. Poll getExternalAccount until status is `active` before calling createTransfer — transferring to a `pending` recipient fails. Terminal states are `active` and `failed`.",

  createTransfer:
    "PREREQUISITES: (1) the source account must be funded — check getAccount for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). If you locked a rate with getFxQuote, pass its quote_id. MOVES MONEY: requires confirm: true.",

  submitAccountApplication:
    "ORDERING: applications flow DRAFT -> SUBMITTED -> PROCESSING -> CREATING_ACCOUNT -> APPROVED or REJECTED. Submitting only advances to SUBMITTED; call processAccountApplication next, or use submitAndProcessAccountApplication to do both.",

  processAccountApplication:
    "ASYNC: processing may be handed to a background worker rather than completing inline. Do not assume the response is terminal — poll getAccountApplication until status is APPROVED or REJECTED.",

  submitAndProcessAccountApplication:
    "ASYNC: combines submit and process. May still complete in the background — poll getAccountApplication until status is APPROVED or REJECTED.",

  createWallet:
    "ASYNC: wallet provisioning happens through the custody provider and may not be complete when this returns. Poll getWallet until the wallet reports an address.",

  getFxQuote:
    "Quotes expire. The response carries a quote_id and an expiry — pass quote_id to createTransfer to lock the rate. Re-quote if it has expired rather than transferring at an unlocked rate.",

  createFxOrder:
    "Orders are created in `waiting_approval` and do NOT execute until a second user approves them in the dashboard. Approval is not available over the API — API-key callers are blocked from the approve/reject endpoints. MOVES MONEY: requires confirm: true.",

  withdrawFromCard: "MOVES MONEY: moves funds off a card balance. Requires confirm: true.",

  createCollection:
    "MOVES MONEY: initiates a collection from a payer. Requires confirm: true.",

  chargeSavedCard:
    "MOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",

  startCustomerKyc:
    "For business customers, complete KYC for every associated person BEFORE starting the business's own verification. Poll getCustomerKycStatus for the outcome — verification is asynchronous and driven by the provider.",

  uploadCustomerKycDocument:
    "STEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails.",

  startCustomerKycS2S:
    "STEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument.",

  exportTransactions: "Capped at 50,000 records per export. Narrow the filters for larger ranges.",
};

/** Tool names that must carry a `confirm` argument, derived from MONEY_OPS. */
export function isMoneyOp(method: string, path: string): boolean {
  return MONEY_OPS.has(opKey(method, path));
}

export function needsIdempotencyKey(method: string, path: string): boolean {
  if (method.toLowerCase() !== "post") return false;
  return !IDEMPOTENCY_EXEMPT_PREFIXES.some((p) => path.startsWith(p));
}
