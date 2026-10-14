/**
 * Fix hints for the errors the integration scenarios name.
 *
 * The status hints in client.ts say what a status means: a 409 is a conflict, a 422 is a
 * limit or a missing detail, a 400 is a bad field or a precondition. Many 4xx answers say
 * more than their status, though, and the next step depends on that: a duplicate payee
 * carries the id to reuse, a closed route will not open on a retry, an expired FX quote
 * needs a new price. Each entry here is one such answer, matched by its error code or,
 * where the API sends none, by its message, for the tools that return it.
 *
 * The message patterns are the API's own wording; a test checks each entry against an
 * error body in the shape the API sends.
 */

export interface ErrorFix {
  id: string;
  /** Scenario ids whose "what can go wrong" rows this answers. */
  scenarios: string[];
  /** Tools that return this error. */
  tools: string[];
  /** Codes looked for in the body (top level, `error`, or `details`). */
  codes?: string[];
  /** Patterns for the error message, for answers with no code. */
  messages?: RegExp[];
  /**
   * The error proves the call did not run. Default true. An answer that looks like a
   * server fault (an "internal server error" 400) but has a known cause sets it false, so
   * the model still looks the result up before calling again.
   */
  outcomeKnown?: boolean;
  hint: string;
}

/** Transfer limit codes: all 422, none fixed by a retry. */
export const TRANSFER_LIMIT_CODES = [
  "ERROR_CODE_LIMIT_EXCEEDED",
  "ERROR_CODE_DAILY_LIMIT_EXCEEDED",
  "ERROR_CODE_PER_TRANSFER_LIMIT_EXCEEDED",
  "ERROR_CODE_MONTHLY_LIMIT_EXCEEDED",
  "ERROR_CODE_ANNUAL_LIMIT_EXCEEDED",
];

export const ERROR_FIXES: ErrorFix[] = [
  // ---- payees ----------------------------------------------------------------
  {
    id: "payee-duplicate",
    scenarios: ["S-PAY-01", "S-PAY-04", "S-REM-01"],
    tools: ["createExternalAccount", "updateExternalAccount"],
    codes: ["ERROR_CODE_DUPLICATE_PAYEE"],
    messages: [/a recipient with the same account name, account number and bank already exists/i],
    hint:
      "This payee already exists: its id is `data.payee_id` in details. Deleted and setup_failed payees count too. " +
      "Reuse that id after confirming its rail with the user (getExternalAccount); if it is setup_failed, fix it with " +
      "updateExternalAccount. Do not create it again.",
  },
  {
    id: "payee-not-correctable",
    scenarios: ["S-PAY-09"],
    tools: ["updateExternalAccount"],
    codes: ["ERROR_CODE_PAYEE_INVALID_STATE"],
    messages: [/is not correctable in its current state/i, /cannot be changed: it is already registered/i],
    hint:
      "This payee cannot be changed now. Create a new payee with the corrected details (createExternalAccount); one " +
      "with the same account name, number and bank is refused as a duplicate of this one.",
  },
  // ---- transfers -------------------------------------------------------------
  {
    id: "payee-missing-info",
    scenarios: ["S-PAY-01", "S-REM-01"],
    tools: ["createTransfer"],
    messages: [/payee is missing required information for this transfer type/i],
    hint:
      "If the payee already has every field this rail needs, its bank or operator is not yet set up for payouts on " +
      "Gravv's side. Editing the payee or retrying will not help: ask support.",
  },
  {
    id: "payee-not-set-up",
    scenarios: ["S-REM-01", "S-REM-02"],
    tools: ["createTransfer"],
    messages: [/payee is not yet set up for transfers/i],
    hint:
      "The payee has no institution. Create it again with an institution_id from listExternalAccountInstitutions for " +
      "its country, or ask support to finish its setup. Retrying the transfer will not help.",
  },
  {
    id: "route-closed",
    scenarios: ["S-REM-01", "S-REM-06", "S-PAY-05"],
    tools: ["createTransfer"],
    messages: [/transfers to [A-Z]{2}\/[A-Z]{3} are not available at this time/i],
    hint:
      "This route is not open for this business in this environment, and nothing was debited. Tell the user, and ask " +
      "support to confirm it is switched on. Do not retry.",
  },
  {
    id: "transfer-limit",
    scenarios: ["S-PAY-11", "S-TXN-06", "S-CUS-06"],
    tools: ["createTransfer", "resumeTransfer"],
    codes: TRANSFER_LIMIT_CODES,
    hint:
      "The transfer is over a sender limit; `window` names the cap. getCustomerLimits (or getRemitterLimits for a " +
      "named sender) shows what is left. Reduce the amount or wait for the window to reset, and never split the " +
      "payment to get under the cap. Retrying the same call will not help.",
  },
  {
    id: "not-paused",
    scenarios: ["S-TXN-05", "S-REM-10"],
    tools: ["resumeTransfer"],
    messages: [/this transfer is not paused/i],
    hint:
      "There is nothing to resume. Read the transfer with getTransaction: it may have resumed already, completed or " +
      "failed. Do not resume it or send it again.",
  },
  // ---- customers and KYC -----------------------------------------------------
  {
    id: "customer-exists",
    scenarios: ["S-CUS-01"],
    tools: ["createCustomer"],
    messages: [/email already exists/i],
    hint:
      "A customer with this email exists. Find it with listCustomers (keyword set to the email) and reuse it rather " +
      "than creating another.",
  },
  {
    id: "kyc-incomplete",
    scenarios: ["S-ACC2-01", "S-ACC1-02"],
    tools: ["createAccountV2", "createAccount"],
    codes: ["CUSTOMER_KYC_INCOMPLETE"],
    messages: [/has not completed KYC/i, /kyc validation failed/i],
    hint:
      "The customer's KYC is not completed. Read getCustomer: the `kyc` entry with type `basic` must be `completed`. " +
      "If it is pending, wait for the KYC webhook; if it was not started or failed, verify the customer first. Do not " +
      "start KYC again in a loop: each start is billed.",
  },
  {
    id: "kyc-already-completed",
    scenarios: ["S-CUS-02", "S-CUS-04"],
    tools: ["startCustomerKycS2S", "startCustomerKyc"],
    codes: ["KYC_ALREADY_COMPLETED"],
    hint: "This customer's KYC is already completed. There is nothing to do: do not start it again, as each start is billed.",
  },
  {
    id: "kyc-missing-documents",
    scenarios: ["S-CUS-02", "S-CUS-03"],
    tools: ["startCustomerKycS2S"],
    messages: [/missing required (business )?documents/i, /no documents found/i],
    hint:
      "Upload exactly the documents the message lists with uploadCustomerKycDocument, then call startCustomerKycS2S " +
      "again without idempotency_key.",
  },
  // ---- accounts --------------------------------------------------------------
  {
    id: "account-limit",
    scenarios: ["S-ACC2-10"],
    tools: ["createAccountV2"],
    codes: ["APPLICATION_IN_PROGRESS"],
    messages: [/already holds the maximum number of/i, /already has an application in progress/i],
    hint:
      "The customer is at the limit for this account option, or already has an application in progress at this " +
      "bank. Quote the message to the user and offer an existing account (listAccountsV2), another option from " +
      "getAccountCapabilities, or support. Do not resend the same body.",
  },
  // ---- cards -----------------------------------------------------------------
  {
    id: "card-account",
    scenarios: ["S-CRD-01", "S-ACC1-07"],
    tools: ["createCardApplication", "activateFeature"],
    messages: [
      /account must be a card account/i,
      /must be active to be used for cards/i,
      /account_id is required/i,
      /account does not exist/i,
      /not operated by the authenticated tenant/i,
    ],
    hint:
      "account_id (provider_data.account_id on activateFeature) must be the business's own card account, and it must " +
      "be active: find it with listAccounts (account_type card, status active). If there is none, open it first: " +
      "createAccount with type card, currency USD and the business's own customer id, or the Dashboard. It is ready " +
      "at account.activated.",
  },
  {
    id: "card-activate-fault",
    scenarios: ["S-CRD-01", "S-CRD-02"],
    tools: ["activateFeature"],
    messages: [/cards service: internal server error/i],
    outcomeKnown: false,
    hint:
      "Most often provider_data.account_id was left out, or annual_remuneration was sent as a string. Check with " +
      "listFeatures (customer_id) whether the activation landed. If not, send account_id (the business's active card " +
      "account, from listAccounts) and the amounts as numbers, and call again without idempotency_key.",
  },
  {
    id: "card-account-create",
    scenarios: ["S-ACC1-07"],
    tools: ["createAccount"],
    messages: [/reserved for the tenant/i, /card account already exists for customer/i],
    hint:
      "A business has one card account, opened under its own customer id (the customer_id on its main accounts), not " +
      "an end customer's. If one exists, reuse it: listAccounts with account_type card. Do not create another.",
  },
  // ---- collections -----------------------------------------------------------
  {
    id: "card-declined",
    scenarios: ["S-COL-04"],
    tools: ["chargeSavedCard"],
    messages: [/payment declined/i],
    hint:
      "The card was declined. Tell the payer, and ask before trying again. A payment intent takes at most 5 attempts " +
      "within 24 hours; after that, create a new intent.",
  },
  {
    id: "intent-id",
    scenarios: ["S-COL-04"],
    tools: ["chargeSavedCard"],
    messages: [/invalid payment_intent_id format/i, /unable to charge card/i, /this payment has expired/i],
    hint:
      "Send payment_intent_id exactly as createCardPaymentIntent returned it, prefix included, and a card_token from " +
      "listSavedCards saved under the same client_customer_id. An intent expires after 24 hours: create a new one.",
  },
  {
    id: "client-reference-used",
    scenarios: ["S-COL-02", "S-COL-03", "S-COL-04"],
    tools: ["createCollection", "createCardPaymentIntent", "chargeSavedCard"],
    messages: [/client_reference: '[^']*' already exists/i],
    hint:
      "client_reference must be unique across collections and payment intents. If this call resends one whose " +
      "outcome was unknown, the first call landed: look it up (getCollection, or getWebhookHistory with event_type " +
      "collection) before anything else. Otherwise use a new client_reference.",
  },
  // ---- FX --------------------------------------------------------------------
  {
    id: "fx-quote-expired",
    scenarios: ["S-FX-01", "S-FX-03"],
    tools: ["createFxOrder"],
    messages: [/quote is invalid or expired/i],
    hint:
      "Nothing was ordered. Get a new quote with getFxQuote, show the user the new price, and place the order only " +
      "after they agree.",
  },
  {
    id: "fx-source-not-charged",
    scenarios: ["S-FX-01", "S-FX-03"],
    tools: ["createFxOrder"],
    messages: [/order source could not be charged/i],
    hint:
      "An order may still have been created. Read listFxOrders and match client_reference in the rows before any " +
      "retry, and check the source balance.",
  },
  {
    id: "fx-destination",
    scenarios: ["S-FX-02"],
    tools: ["createFxOrder"],
    messages: [/invalid order destination/i],
    hint:
      "The destination must be your account, your crypto wallet, or an active settlement instruction in the quote's " +
      "TO currency (type external_account): find one with listSettlementInstructions. A payee is not a destination.",
  },
];

const BY_TOOL = new Map<string, ErrorFix[]>();
for (const fix of ERROR_FIXES) {
  for (const t of fix.tools) BY_TOOL.set(t, [...(BY_TOOL.get(t) ?? []), fix]);
}

/** The body as text, for finding a code wherever the API put it. */
function bodyText(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body);
  } catch {
    return "";
  }
}

/**
 * The fix for a 4xx answer, or undefined. A timeout (408) and a 429 have their own rules,
 * which depend on whether the call ran, so they are left to the status hints.
 */
export function errorFixFor(tool: string, status: number, message: string, body: unknown): ErrorFix | undefined {
  if (status < 400 || status >= 500 || status === 408 || status === 429) return undefined;
  const fixes = BY_TOOL.get(tool);
  if (!fixes) return undefined;
  const text = `${message}\n${bodyText(body)}`;
  return fixes.find(
    (f) =>
      (f.codes ?? []).some((c) => new RegExp(`\\b${c}\\b`).test(text)) || (f.messages ?? []).some((m) => m.test(message)),
  );
}
