# Changelog

All notable changes to `@gravv-infra/mcp` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/).

## 0.3.2 (unreleased)

This release removes tools that could never succeed and corrects tool descriptions that
gave wrong answers. API tools go from 87 to 72 (60 in the default load). It also lets a
call whose outcome is unknown be resent under its first idempotency key, makes every
error say what to do next, and gives every documentation page its own text again.

### Added

- An optional `idempotency_key` argument on the 25 tools that send an `Idempotency-Key`.
  Pass the key from a result whose outcome is unknown (a timeout, a network error or a
  `5xx`), with exactly the same arguments, to resend that call; if it had taken effect,
  the API returns its answer instead of running it again. It is sent as the header, never
  in the body, and a value that is not 1-255 printable ASCII characters is refused before
  any request. Leave it out and a new key is made, as before.
- `GRAVV_DOCS_ORIGIN` and `--docs-origin` set where the documentation tools read the
  docs, for when the docs site moves. The docs links the server returns follow the
  setting. A value that is not an `http` or `https` URL stops the server with the
  reason. The default stays `https://gravv-docs.syntext.dev`.

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
- A POST refused by the gateway's rate limiter is retried under a new key. The `429` was
  stored under the old key, so a same-key retry could never succeed. A key the caller
  passed is never swapped: that `429` is returned with a hint to look the result up first.
- A `409` is retried only while the first request is still running
  (`idempotency_in_flight`, `ERROR_CODE_TRANSFER_IN_PROGRESS`), with the same key. Every
  other `409` is final at once. A `Retry-After` given as a date is read, and waits are
  capped at 30 s.
- Request bodies are sent with their keys sorted, so the same arguments in another order
  no longer get `422 idempotency_key_reused` on a resend. The API reads the same request.
- The `section` argument of `searchGravvDocs` has no fixed list. It takes any section the
  docs site's index has (each result names its section), and an unknown one returns the
  list. `Home`, which matched no page, is gone.
- `getGravvDocPage` also accepts a page's full docs URL.

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
- The server instructions give the key rule the client applies: after an unknown outcome,
  look the result up, then resend with the same key; after any other `4xx`, call again
  without `idempotency_key`, because a `4xx` answer is kept under its key for 24 hours.
  The advice to look up a transfer with a list filtered by `client_reference` is gone: no
  list has that filter.
- Timeouts, network errors, `5xx` answers and server faults answered as a `400` set
  `outcome_unknown` and name the tool that shows whether the call landed. Reads, and
  POSTs that change nothing, say they are safe to repeat. A `503` or `504` from before the
  request ran says so.
- Error results carry `environment` and the `idempotency_key` that was sent, flag a
  replayed answer with `replayed`, and lift `code`, `window` and `transfer_status` beside
  the hint. `details` stays the raw body.
- Error messages keep the text of a `service_unavailable` answer, name the permission a
  scoped key lacks, and no longer include an HTML error page.
- New hints for a scoped key's `403`, a Dashboard-only route and the feature-access gate;
  a duplicate `client_reference` (`409`, used for a different transfer, so do not
  resend); a conflict; an ended transfer pause (`410`); an oversized upload (`413`); a
  missing operation (`501`); and limits or auth outages (`503`, `504`).
- Rate limits: the gateway allows 600 requests a minute, burst 50, per Gravv account. The
  local default stays 60 a minute, burst 15; the help text no longer says 10.
- Documentation search: each page is paired with its own text by title and URL, not by
  position. When the docs site listed its pages in a different order in its index and its
  full text, 71 pages had only their one-line description, and searches missed them. A
  page containing a `---` line is no longer cut short.
- Documentation slugs come from the URL path, so they stay the same if the index names
  another host.
- When a refresh of the docs index fails, the documentation tools keep answering from the
  last copy, with a note saying so, instead of failing.
