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

import { uploadLimit } from "./curation.ts";

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

/** The next step after an upload is refused for its size, with the size the tool takes. */
export function uploadTooLargeHint(tool: string): string {
  return (
    `The file is too large, whatever size the message states: ${tool} takes files of ${uploadLimit(tool)}. ` +
    "Compress the file or scan it at a lower resolution, then call again without idempotency_key."
  );
}

function tooLarge(id: string, scenarios: string[], tool: string, own: RegExp): ErrorFix {
  return {
    id,
    scenarios,
    tools: [tool],
    codes: ["request_body_too_large"],
    messages: [/uploaded file is too large/i, /larger than max/i, /request entity too large/i, own],
    hint: uploadTooLargeHint(tool),
  };
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
    scenarios: ["S-ACC2-01"],
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
      "createAccount with type card, currency USD, bank lead_bank or cross_river_bank and the business's own " +
      "customer id, or the Dashboard. It is ready at account.activated.",
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
      "An order may still have been created. Read listFxOrders and match client_reference, the pair and the amount " +
      "in the rows before any retry, and check the source balance.",
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
  // ---- uploads -----------------------------------------------------------------
  // A size refusal comes in several shapes: the gateway's 413 `request_body_too_large`, a
  // 413 "the maximum is 10MB" for a refusal further on (in sandbox, from about 576 KiB), the
  // card KYC route's 400 with the gRPC size message, and each service's own 400. Not one
  // states the size the route takes.
  tooLarge("kyc-file-too-large", ["S-CUS-02"], "uploadCustomerKycDocument", /document exceeds maximum allowed size/i),
  tooLarge("card-kyc-file-too-large", ["S-CRD-02"], "uploadCardholderKycDocument", /content exceeds maximum allowed size/i),
  tooLarge("transfer-document-too-large", ["S-PAY-06"], "uploadTransferDocument", /the largest accepted is/i),
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

/**
 * Next steps for answers that succeed but are not done.
 *
 * An HTTP 200 can be a paused transfer, a declined card, a file the card KYC refused, or an
 * application id that does not exist. The data says so, in a field a model can miss; the
 * server returns the matching step as `next_step`, ahead of `data` so a cut answer keeps it.
 */
export interface ResultStep {
  id: string;
  scenarios: string[];
  tools: string[];
  /** The step for this answer, or undefined when it does not apply. */
  step: (data: unknown) => string | undefined;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});

/** True when any object in `v`, at any depth, has `key` set to `value`. */
function hasDeep(v: unknown, key: string, value: unknown, depth = 0): boolean {
  if (depth > 6 || !v || typeof v !== "object") return false;
  if (Array.isArray(v)) return v.some((x) => hasDeep(x, key, value, depth + 1));
  const o = v as Obj;
  if (o[key] === value) return true;
  return Object.values(o).some((x) => hasDeep(x, key, value, depth + 1));
}

const LIMIT_WINDOWS = new Set(["per_transfer", "daily", "weekly", "monthly", "annual"]);

/** What a paused transfer needs, by pause_reason. */
function pauseAsk(reason: unknown): string {
  if (reason === "supporting_document_required") {
    return `Upload the document with uploadTransferDocument (PDF, PNG or JPEG of ${uploadLimit("uploadTransferDocument")}) and pass its id in supporting_document_ids.`;
  }
  if (reason === "sender_details_required") {
    return "Ask the user for exactly the sender details listed and send them in additional_information; for `customer_email`, updateCustomer first.";
  }
  if (typeof reason === "string" && LIMIT_WINDOWS.has(reason)) {
    return "It is over a limit window (`breached_window`, `remaining_usd`): getCustomerLimits or getRemitterLimits shows what is left. Send real verification details only, never invented ones.";
  }
  if (reason === "annual_requires_approval" || reason === "screening") {
    return "Gravv reviews it, so there is nothing to send: follow it with getTransaction.";
  }
  return "Ask the user for exactly what `requirements` lists.";
}

export const RESULT_STEPS: ResultStep[] = [
  {
    id: "transfer-paused",
    scenarios: ["S-PAY-06", "S-PAY-11", "S-CUS-07", "S-REM-02", "S-REM-10", "S-TXN-05"],
    tools: ["createTransfer", "resumeTransfer"],
    step: (data) => {
      const d = obj(data);
      if (d.transfer_status !== "paused" && d.resumed !== false) return undefined;
      return (
        `Not a failure: the transfer is paused${typeof d.pause_reason === "string" ? ` (${d.pause_reason})` : ""} and ` +
        `needs what \`requirements\` lists. ${pauseAsk(d.pause_reason)} Then call resumeTransfer with id set to the ` +
        "transfer `reference`, before `expires_at`, after the user agrees. Never send the transfer again."
      );
    },
  },
  {
    id: "transfer-waiting-approval",
    scenarios: ["S-TXN-05"],
    tools: ["createTransfer", "getTransaction"],
    step: (data) => {
      const d = obj(data);
      if (d.transfer_status !== "waiting_approval" && d.status !== "waiting_approval") return undefined;
      return "Waiting for approval in the Gravv Dashboard: there is nothing to send, and it must not be sent again. Follow it with getTransaction.";
    },
  },
  {
    id: "transaction-paused",
    scenarios: ["S-TXN-05", "S-REM-10"],
    tools: ["getTransaction"],
    step: (data) =>
      obj(data).status === "paused"
        ? "Paused, not failed. The requirements are in the createTransfer answer, or in the `transfer.requires_information` event (getWebhookHistory with transaction_id). Resume it with resumeTransfer, id set to this row's `reference`. Never send it again."
        : undefined,
  },
  {
    id: "manual-review",
    scenarios: ["S-PAY-12", "S-REM-10", "S-TXN-05"],
    tools: ["getWebhookHistory", "getWebhookEventDetail"],
    step: (data) =>
      hasDeep(data, "transfer_status", "manual_processing_required")
        ? "An event here says `manual_processing_required`: the transfer is held for manual review, and its transaction stays pending. The money is not lost and the outcome is not final. Do not send it again; escalate to support if it stays held."
        : undefined,
  },
  {
    id: "intent-charge-failed",
    scenarios: ["S-COL-04"],
    tools: ["createCardPaymentIntent"],
    step: (data) =>
      obj(data).status === "charge_failed"
        ? "The card was declined: a decline, not an error. Tell the payer, and ask before trying again. A payment intent takes at most 5 attempts within 24 hours; after that, create a new one."
        : undefined,
  },
  {
    id: "intent-requires-action",
    scenarios: ["S-COL-03", "S-COL-04"],
    tools: ["createCardPaymentIntent", "chargeSavedCard"],
    step: (data) =>
      obj(data).status === "requires_action"
        ? "The payer must complete a 3-D Secure check: give them `next_action_url`, then follow with getCollection (its `transaction_id`) and the collection webhooks."
        : undefined,
  },
  {
    id: "card-kyc-upload-error",
    scenarios: ["S-CRD-02"],
    tools: ["uploadCardholderKycDocument"],
    step: (data) =>
      obj(data).status === "error"
        ? `The file was refused (\`error_code\`), although the call answered 200. Use a JPEG, PNG or PDF (of ${uploadLimit("uploadCardholderKycDocument")}) with its extension in the filename, and a 3-letter country code (a selfie needs one too). Upload again without idempotency_key.`
        : undefined,
  },
  {
    id: "card-kyc-s2s-code",
    scenarios: ["S-CRD-02"],
    tools: ["startCardholderKycS2S"],
    step: (data) => {
      const d = obj(data);
      if (d.code === "MISSING_DOCUMENTS") {
        return "Nothing was started: upload the documents in `details.missing_documents` with uploadCardholderKycDocument, then call again without idempotency_key.";
      }
      if (d.code === "KYC_ALREADY_COMPLETED") {
        return "The cardholder is already verified: go on to activateFeature. Do not start KYC again.";
      }
      if (d.status === "partial_success") {
        return "Some documents failed (`failed_documents`): give the cardholder `web_url` to finish on the hosted page.";
      }
      return undefined;
    },
  },
  {
    id: "feature-liveness",
    scenarios: ["S-CRD-02"],
    tools: ["activateFeature"],
    step: (data) =>
      obj(data).status === "pending_liveness"
        ? "Give the cardholder `websdk_url` for the liveness check, then call activateFeature again without idempotency_key."
        : undefined,
  },
  {
    id: "account-v2-action",
    scenarios: ["S-ACC2-09"],
    tools: ["getAccountV2"],
    step: (data) =>
      obj(data).requires_user_action === true
        ? "The bank needs something (`status_reason`). getAccountApplicationV2 with `application_id` lists it: send `required_documents` and `required_fields` in one updateAccountApplicationV2 call, or, for `tos_pending` or `kyc_pending`, give the user `required_action_url`."
        : undefined,
  },
  {
    id: "payee-pending",
    scenarios: ["S-PAY-01", "S-PAY-09"],
    tools: ["createExternalAccount", "updateExternalAccount", "getExternalAccount"],
    step: (data) => {
      const s = obj(data).status;
      if (s === "pending") return "Not ready for transfers yet: poll getExternalAccount until `active`, and stop on `setup_failed`.";
      if (s === "setup_failed") {
        return "Setup failed (`error_message`): ask the user which detail is wrong and fix it with updateExternalAccount, sending only the changed fields.";
      }
      return undefined;
    },
  },
  {
    id: "limits-default-tier",
    scenarios: ["S-TXN-06"],
    tools: ["getRemitterLimits"],
    step: (data) =>
      hasDeep(data, "tier_assignment", "default")
        ? "This remitter is on the default tier, which is also what an unknown remitter id gets: check the id is right."
        : undefined,
  },
  {
    id: "limits-shadow",
    scenarios: ["S-TXN-06", "S-CUS-06"],
    tools: ["getCustomerLimits", "getRemitterLimits"],
    step: (data) =>
      hasDeep(data, "mode", "shadow")
        ? "These limits are measured, not enforced (`mode: shadow`): no transfer is paused or refused for them."
        : undefined,
  },
];

const STEPS_BY_TOOL = new Map<string, ResultStep[]>();
for (const s of RESULT_STEPS) {
  for (const t of s.tools) STEPS_BY_TOOL.set(t, [...(STEPS_BY_TOOL.get(t) ?? []), s]);
}

/** The next step for a successful answer, or undefined when the answer needs none. */
export function nextStepFor(tool: string, data: unknown): string | undefined {
  const steps = (STEPS_BY_TOOL.get(tool) ?? []).map((s) => s.step(data)).filter((s): s is string => Boolean(s));
  return steps.length > 0 ? steps.join(" ") : undefined;
}
