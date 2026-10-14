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
  "DELETE /v1/collections/cards/{card_id}": { name: "deleteSavedCard", toolset: "collections" },

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
 * family is removed from createCollection, leaving it responsible for the rails payment
 * intents cannot express.
 */
export const ENUM_RESTRICTIONS: Record<string, { remove: string[]; because: string }> = {
  createCollection: {
    remove: ["card", "apple_pay", "google_pay"],
    because:
      "Card payments go through createCardPaymentIntent, which returns the same hosted " +
      "payment link plus the intent id and card token this endpoint cannot provide.",
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
