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
];

/**
 * Toolsets that existed in an earlier release, and why they are gone.
 *
 * A client configures `--toolsets` once and forgets it. Treating a retired name as an
 * unknown one would fail startup and take the whole MCP connection down on upgrade, for
 * a group that is merely no longer offered — so the name is recognised, explained on
 * stderr, and dropped from the selection instead.
 */
export const RETIRED_TOOLSETS: Record<string, string> = {
  approvals:
    "retired in 0.4.0: every approve/reject route accepts dashboard sessions only and refuses an API key with a 403, so the tools could never succeed. Approvals are done by a person in the Gravv dashboard.",
};

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
  // Taking money in is a card payment intent. `POST /v1/collections` is blocked below.
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
 * Never exposed as tools, with the reason. Three categories:
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
 *  - Generic collections. POST /v1/collections took money in over any rail, cards
 *    included, and for a card it returned the same hosted payment link the payment
 *    intent does — minus the intent id, the expiry, `requires_action`, and the
 *    `card_token` that recurring and merchant-initiated charges need. Restricting its
 *    card enum left two tools for one job and a model that sometimes picked the weaker
 *    one, so the endpoint is gone and card collection is createCardPaymentIntent.
 */
export const BLOCKED: Record<string, string> = {
  "GET /v1/cards/{card_id}/sensitive-details":
    "Returns card PAN and CVV. Use the client-side decryption flow instead: https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview",
  "GET /v1/cards/{card_id}/pin":
    "Returns the encrypted card PIN. Use the client-side decryption flow instead.",
  "PUT /v1/cards/{card_id}/pin":
    "Sets a card PIN, which requires handling cardholder data. Not exposed over MCP.",
  "POST /v1/collections":
    "Superseded by createCardPaymentIntent (POST /v1/collections/cards/payment-intents), which returns the same hosted payment link plus the intent id and the card token recurring charges need.",
  "POST /v1/risk/start-kyc": "Superseded by startCustomerKyc (POST /v1/customers/kyc/start).",
  "POST /v1/risk/start-kyc-s2s": "Superseded by startCustomerKycS2S (POST /v1/customers/kyc/start-s2s).",
  "POST /v1/risk/upload-document":
    "Superseded by uploadCustomerKycDocument (POST /v1/customers/kyc/upload-document).",
};

/**
 * Why an approve/reject name resolves to a refusal rather than a tool.
 *
 * Every approval route on the gateway carries middleware.DashboardOnly(), which
 * refuses anything presenting an API key — the only credential this server holds — with
 * a bare 403 "forbidden" that names no reason. Tools for them could therefore never
 * succeed, only waste a call and leave the model guessing, so they are not shipped.
 * The names stay here because a model asked to "approve the transfer" will reach for
 * one, and being told where approval actually happens beats an unknown-tool error.
 */
const dashboardOnly = (what: string, readBack: string) =>
  `${what} is not possible with an API key. The route accepts signed-in dashboard users only and ` +
  `refuses everything else with a bare 403, so there is no tool for it and no payload that would ` +
  `make it work. A person with the approval permission has to do it in the Gravv dashboard, and ` +
  `the instruction stays held until they do — tell the user that, rather than retrying. ` +
  `Follow the outcome with ${readBack}.`;

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
  createCollection:
    "Removed: card collection goes through createCardPaymentIntent, which returns the hosted payment link plus the intent id and the card token recurring charges need. Check a payment's status with getCollection using the transaction_id it returns.",
  approveTransfer: dashboardOnly("Approving a transfer", "getTransaction or listTransactions"),
  rejectTransfer: dashboardOnly("Rejecting a transfer", "getTransaction or listTransactions"),
  approveExternalAccount: dashboardOnly("Approving a recipient", "getExternalAccount"),
  rejectExternalAccount: dashboardOnly("Rejecting a recipient", "getExternalAccount"),
  approveFxOrder: dashboardOnly("Approving an FX order", "getFxOrder or listFxPendingApprovals"),
  rejectFxOrder: dashboardOnly("Rejecting an FX order", "getFxOrder or listFxPendingApprovals"),
  searchWebhookIngestion:
    "Not available over MCP: /v1/webhooks/ingestion/search is gated by DashboardOnly plus an admin-operations permission, so an API key is refused with a bare 403. getWebhookHistory, getWebhookEventDetail and getWebhookCallHistory do accept API keys.",
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
  "POST /v1/collections/cards/payment-intents/charge",
  // Returning a payment to the payer moves value out just as surely as taking it in,
  // and settling a hold is the moment the payer is actually charged. Rejecting a hold
  // releases it without moving anything, so it is not gated.
  "POST /v1/collections/{id}/refund",
  "POST /v1/collections/{id}/refunds/{refund_id}/retry",
  "POST /v1/collections/{id}/capture",
]);

/**
 * Operations that move money only for certain payloads.
 *
 * createCardPaymentIntent is two operations behind one path. Without a `card_token` it
 * mints a hosted checkout link and moves nothing — the payer decides later, at the
 * hosted UI. With one, the API charges that stored card as soon as the intent exists,
 * which is a merchant-initiated debit and belongs behind the same confirmation as any
 * other. Gating the path outright would put a confirmation step in front of every
 * checkout link, so the test is on the body; it runs in safety.ts, which is the only
 * layer that sees one. Listing the path here is what puts `confirm` in the schema.
 */
export const CONDITIONAL_MONEY_OPS: Record<string, string> = {
  "POST /v1/collections/cards/payment-intents":
    "Required only when you pass `card_token`: that charges the stored card immediately. " +
    "Creating an intent without a token just returns a checkout link and needs no confirmation.",
};

export function conditionalMoneyNote(method: string, path: string): string | undefined {
  return CONDITIONAL_MONEY_OPS[opKey(method, path)];
}

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
    "RESPONSE: check `requires_approval`. When it is true the transfer is HELD, not sent, and only a dashboard user can release it — API keys cannot approve. `transfer_status` alone does not tell you this.\n\nPREREQUISITES: (1) the source account must be funded — check getAccount for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). If you locked a rate with getFxQuote, pass its quote_id. MOVES MONEY: requires confirm: true.",

  submitAccountApplication:
    "ORDERING: applications flow DRAFT -> SUBMITTED -> PROCESSING -> CREATING_ACCOUNT -> APPROVED or REJECTED. Submitting only advances to SUBMITTED; call processAccountApplication next, or use submitAndProcessAccountApplication to do both.",

  processAccountApplication:
    "ASYNC: processing may be handed to a background worker rather than completing inline. Do not assume the response is terminal — poll getAccountApplication until status is APPROVED or REJECTED.",

  submitAndProcessAccountApplication:
    "ASYNC: combines submit and process. May still complete in the background — poll getAccountApplication until status is APPROVED or REJECTED.",

  createWallet:
    "ASYNC: wallet provisioning happens through the custody provider and may not be complete when this returns. Poll getWallet until the wallet reports an address.",

  getFxQuote:
    "STEP 1 of an FX order, and the only way to get the quote_id createFxOrder requires. Name the corridor with either `currency_pair` (exact market, e.g. USD_US_XAF_CM) or `direction` (e.g. USD_XAF, service picks the market) — NOT a buy/sell side, and not separate from/to currency fields. Quotes expire: the response carries quote_id and expires_at, and an expired quote is refused by createFxOrder. A quote_id also locks the rate for createTransfer.",

  createFxOrder:
    "PREREQUISITE: take a quote with getFxQuote and pass its quote_id — the quote carries the corridor, the rate and the amounts, and an order without a valid, unexpired quote_id is refused outright. `source` and `destination` are objects ({type, id}), where type is account, wallet or ssi.\n\nNO SECOND PAIR OF EYES ON THIS PATH: an order placed with an API key — which is what this server holds — is created in `pending` and proceeds. The `waiting_approval` queue applies to dashboard users without FX approval rights, not to you, and the approve/reject endpoints refuse API keys outright. Treat a confirmed call as final. MOVES MONEY: requires confirm: true.",

  withdrawFromCard: "MOVES MONEY: moves funds off a card balance. Requires confirm: true.",

  createCardPaymentIntent:
    "THE CARD COLLECTION PATH — every card payment starts here. Returns a hosted `payment_link` for the payer, plus the `intent_id` and `expires_at`. The reusable `card_token` arrives on the webhook once the payer completes checkout; store it to charge the same card again with chargeSavedCard. MOVES MONEY when `card_token` is supplied — the API charges that card immediately, so that form requires confirm: true.",

  getCollection:
    "Status lookup for a collection transaction, including one started by a payment intent — pass the `transaction_id` from createCardPaymentIntent or chargeSavedCard. The status field is named `transaction_status` here, not `status`.",

  chargeSavedCard:
    "PREREQUISITE: a payment intent and a card token from an earlier completed checkout — create the intent with createCardPaymentIntent and take the token from the webhook. MOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",

  startCustomerKyc:
    "Handles both individuals and businesses: a customer whose type is business is routed to KYB automatically, so there is no separate call for it here. For a business, complete KYC for every associated person BEFORE starting the business's own verification. Some tenants are configured for document-based auto-verification and reject this call — on that refusal use uploadCustomerKycDocument instead. Poll getCustomerKycStatus for the outcome: verification is asynchronous and driven by the provider.",

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
