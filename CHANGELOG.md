# Changelog

All notable changes to `@gravv-infra/mcp` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/).

## 0.3.2 (unreleased)

This release removes tools that could never succeed and corrects tool descriptions that
gave wrong answers. API tools go from 87 to 72 (60 in the default load).

### Removed

- `approveTransfer`, `rejectTransfer`, `approveExternalAccount`, `rejectExternalAccount`,
  `approveFxOrder`, `rejectFxOrder` and `searchWebhookIngestion`. These routes are
  Dashboard-only and refuse API keys, so every call failed. Approve and reject in the
  Gravv Dashboard.
- The seven payment-link tools (`createPaymentLink`, `listPaymentLinks`,
  `getPaymentLink`, `updatePaymentLink`, `deletePaymentLink`, `updatePaymentLinkStatus`,
  `getPublicPaymentLink`). Payment links are retired from the Gravv API.
- The `approvals` and `payment-links` toolsets. A configuration that still names them
  starts with a warning and the names are ignored. If they were the only names given, the
  server starts with the documentation tools alone.

Calling a removed tool by name returns a message that says why and what to do instead,
not "Unknown tool".

### Changed

- `createCardPaymentIntent` and `cancelFxOrder` now return a preview first and run only
  with `confirm: true`, and on a live key only with `GRAVV_ALLOW_LIVE_WRITES=true`.
  `createCardPaymentIntent` charges a saved card at once when given a `card_token`; it
  asks for confirmation even when it only makes a payment link. A cancelled FX order does
  not return funds already debited.
- `deleteSavedCard` is unavailable until its request body is in the specification. The
  API needs `customer_id` and `card_token` in the body, and every call without them
  failed.
- `createCollection` offers bank transfer only. `pix` and `mobile_money` were always
  rejected; they are now refused before the call, with the reason.
- Key detection is exact and case-sensitive: `grvSec_live_` is live, `grvSec_sandbox_` is
  sandbox, anything else is unknown and treated as live. A `grvPub_` (publishable) key now
  gets a message saying it cannot call the API.

### Fixed

- FX: orders placed with an API key run at once and debit the source; they do not wait
  for a second user. A quote does not lock a rate for transfers. The `createFxOrder` and
  `getFxQuote` descriptions say which request fields the API reads.
- Confirmation previews: FX orders no longer print `[object Object]`, transfers read
  `source.currency`, collections name the method from `source.methods`, and saved-card
  charges name the card token and payment intent.
- Payees: bank account and mobile money payees are active at once; the failure state is
  `setup_failed`, not `failed`; a duplicate is a 400 with the existing payee id.
- Account applications: statuses are lower case and include `manual_review`.
- KYC: the result is the customer's `basic` kyc status on `getCustomer`, not
  `getCustomerKycStatus`.
- `updateCustomer`: the path `customer_id` wins over the body value.
- `createWallet` returns the address at once, and each call creates a new wallet.
- `exportTransactions` returns at most the 10 newest rows today; use `listTransactions`
  with paging for more.
- `getCollection` needs an API key.
- `updateCardStatus`: always send `limit`, or the daily limit becomes 0.
- `withdrawFromCard`: new sandbox cards and some live cards refuse withdrawal; the card
  must be active and the amount must not exceed its balance.
- A `422` is no longer always blamed on idempotency: limit, blocked-sender,
  missing-information and missing-document errors get their own hints.
- The server no longer says a returned idempotency key can be reused; no tool accepts one
  yet.
- Rate limits: the gateway allows 600 requests a minute, burst 50, per Gravv account. The
  local default stays 60 a minute, burst 15; the help text no longer says 10.
