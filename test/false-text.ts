/**
 * Texts that were false and were corrected. A spec sync or a hint edit that brings one
 * back fails here rather than reaching a model. Shared by the suites that check
 * model-facing text: tool descriptions (curation.test.ts), prompts (prompts.test.ts).
 */
export const FALSE_TEXT: Array<[RegExp, string]> = [
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
  [
    /reuse the same Idempotency-Key|Retry a failed call with the same|Reuse the `?Idempotency-Key`? to retry/i,
    "a failed call's answer is kept under its key; reuse a key only after an unknown outcome",
  ],
  [/Card methods return|Card amounts are charged/i, "createCollection offers bank_transfer only"],
];
