# @gravv-infra/mcp

MCP server for the [Gravv](https://gravv-docs.syntext.dev) payments API. Connects an AI
assistant to Gravv so it can onboard customers, run KYC, open accounts, add recipients,
move money, issue cards, and exchange currency — using your own API key.

Works with Claude, Cursor, VS Code, and any [MCP](https://modelcontextprotocol.io)-compatible client.

---

## Quick start

**Requires Node.js 20 or later.** Check with `node --version`.

```bash
GRAVV_API_KEY=grvSec_sandbox_... npx @gravv-infra/mcp
```

Get an API key from your [Gravv dashboard](https://gravv-docs.syntext.dev/getting-started/authentication).
Start with a sandbox key — the key itself decides which environment you reach.

To confirm it's wired up, ask your assistant:

> *What Gravv accounts do I have?*

It should call `listAccounts` and come back with real data. If you have no accounts yet,
try *"Search the Gravv docs for how to open an account"* — the documentation tools work
even before you have any.

Any MCP-compatible client works — the server speaks stdio and negotiates protocol
version `2025-06-18`, falling back to `2024-11-05` for older clients.

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add gravv --env GRAVV_API_KEY=grvSec_sandbox_... -- npx -y @gravv-infra/mcp
```
</details>

<details>
<summary><b>GitHub Copilot / VS Code</b></summary>

VS Code uses `servers`, not `mcpServers`, and requires an explicit `type`. Put this in
`.vscode/mcp.json` to share with your team, or run **MCP: Open User Configuration** for a
personal one:

```json
{
  "servers": {
    "gravv": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@gravv-infra/mcp"],
      "env": { "GRAVV_API_KEY": "grvSec_sandbox_..." }
    }
  }
}
```

Or from the CLI:

```bash
code --add-mcp '{"name":"gravv","command":"npx","args":["-y","@gravv-infra/mcp"],"env":{"GRAVV_API_KEY":"grvSec_sandbox_..."}}'
```
</details>

<details>
<summary><b>OpenAI Codex CLI</b></summary>

```bash
codex mcp add gravv --env GRAVV_API_KEY=grvSec_sandbox_... -- npx -y @gravv-infra/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.gravv]
command = "npx"
args = ["-y", "@gravv-infra/mcp"]

[mcp_servers.gravv.env]
GRAVV_API_KEY = "grvSec_sandbox_..."
```

Verify with `codex mcp list`.
</details>

<details>
<summary><b>Claude Desktop, Cursor, Windsurf, Cline, Zed</b></summary>

These use the `mcpServers` shape:

```json
{
  "mcpServers": {
    "gravv": {
      "command": "npx",
      "args": ["-y", "@gravv-infra/mcp"],
      "env": { "GRAVV_API_KEY": "grvSec_sandbox_..." }
    }
  }
}
```

| Client | Config file |
|---|---|
| Claude Desktop | `claude_desktop_config.json` (Settings → Developer → Edit Config) |
| Cursor | `~/.cursor/mcp.json`, or `.cursor/mcp.json` per project |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | the MCP Servers panel, or `cline_mcp_settings.json` |
| Zed | `settings.json` under `context_servers` |
</details>

<details>
<summary><b>Anything else</b></summary>

The server is a plain stdio MCP process. Point any client at:

```
command: npx
args:    ["-y", "@gravv-infra/mcp"]
env:     GRAVV_API_KEY=grvSec_sandbox_...
```

To try it without a client:

```bash
GRAVV_API_KEY=grvSec_sandbox_... npx -y @gravv-infra/mcp
```

then paste a JSON-RPC frame on stdin:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"manual","version":"1"}}}
```
</details>

> **Keep the key out of source control.** Several clients support environment-variable
> substitution or secret prompts — prefer those over pasting a live key into a file you
> might commit. A sandbox key is the right thing to start with either way.

---

## What you get

**Documentation tools** — `searchGravvDocs` and `getGravvDocPage` search all 177 pages of
the Gravv documentation. They need **no API key**, so you can explore Gravv before you
have credentials.

**API tools** — 72 tools (60 load by default) covering customers, KYC, accounts,
transfers, cards, wallets, FX, collections, and webhooks.

Both matter. The API tools execute calls, but they can't tell you what has to happen
first — that an account needs a KYC-verified customer, or that a new recipient must reach
`active` before you can pay them. That's what the guides are for, so they're reachable
from the same connector. Ask the assistant how to do something and it can look it up,
write your integration, then run it against sandbox to prove it works.

```bash
npx @gravv-infra/mcp     # with GRAVV_API_KEY: docs + API tools
npx @gravv-infra/mcp     # without it: docs tools only, still useful
```

---

## Safety model

Gravv moves real money, and **sandbox and live share one base URL** — only your key
differs. Nothing in a request visually signals danger, so the server signals it.

**Money-moving tools take two calls.** `createTransfer`, `withdrawFromCard`,
`createFxOrder`, `cancelFxOrder`, `createCollection`, `createCardPaymentIntent`, and
`chargeSavedCard` return a preview on the first call and execute only when called again
with `confirm: true`. The unconfirmed call never reaches the API.

`cancelFxOrder` is included because a cancel cannot be undone: funds already debited are
not returned. `createCardPaymentIntent` is included because, given a saved `card_token`,
it charges the card at once; it asks for confirmation even when it only makes a link.

```
> Send $50 from acc_1 to acc_2

  createTransfer({ amount: 50, ... })
  -> { status: "confirmation_required",
       willDo: "Transfer 50 USD from acc_1 to internal_account acc_2.
                Once submitted this cannot be reversed from the API." }

  [assistant shows this to you, you agree]

  createTransfer({ amount: 50, ..., confirm: true })
  -> { data: { transfer_id: "trf_1", status: "pending" } }
```

**A live key needs a second independent signal.** Money movement on a `grvSec_live_` key
is refused unless `GRAVV_ALLOW_LIVE_WRITES=true` is also set. Confirmation alone is not
enough. An unrecognised key format is treated as live — it fails closed.

**Cardholder data is never exposed.** The endpoints returning card PAN, CVV, and PIN are
not registered as tools under any configuration, and responses are scanned for
`card_number` / `cvv` / `pin` and redacted on the way out. Use the
[client-side decryption flow](https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview)
for those.

**Idempotency is automatic.** Every write that needs an `Idempotency-Key` gets one — a
new key for every call — and the key is returned with each successful result so you can
trace the request. A call cannot yet be resent with an old key, so after a timeout check
whether the operation happened (for example with `getTransaction`) before calling again.

**`--read-only`** disables every non-GET tool, for reporting deployments.

---

## Toolsets

Everything except `account-applications` loads by default. Account onboarding carries
large schemas and is an infrequent, deliberate flow, so it is opt-in.

```bash
npx @gravv-infra/mcp                                       # default
npx @gravv-infra/mcp --toolsets=customers,accounts,cards   # specific groups
npx @gravv-infra/mcp --toolsets=all                        # everything
```

| Toolset | Default | Covers |
|---|---|---|
| `customers` | ✓ | create, list, get, update customers |
| `accounts` | ✓ | accounts and status |
| `transfers` | ✓ | transfers, rates, supported countries and currencies |
| `transactions` | ✓ | history, volume, export |
| `external-accounts` | ✓ | recipients, verification, institutions |
| `kyc` | ✓ | KYC start, server-to-server, document upload, status |
| `cards` | ✓ | issue, balance, status, withdraw, applications |
| `wallets` | ✓ | blockchain wallet creation and lookup |
| `fx` | ✓ | quotes, rates, OTC orders |
| `collections` | ✓ | card payment intents, saved cards, and bank transfer collections |
| `features` | ✓ | feature eligibility and activation |
| `webhooks` | ✓ | event history, delivery calls, retry |
| `account-applications` | | account onboarding |

The `approvals` and `payment-links` toolsets were removed in 0.3.2. A configuration that
still names them starts with a warning, and those names are ignored.

---

## Tool reference

`*` marks a tool that moves money and therefore requires `confirm: true`.

**Documentation** — always available, no API key needed
`searchGravvDocs` · `getGravvDocPage`

**customers**
`createCustomer` · `getCustomer` · `listCustomers` · `updateCustomer`

**kyc**
`startCustomerKyc` · `startCustomerKycS2S` · `uploadCustomerKycDocument` ·
`getCustomerKycDocuments` · `getCustomerKycStatus`

**accounts**
`createAccount` · `getAccount` · `listAccounts` · `updateAccountStatus`

**external-accounts** — recipients you pay out to
`createExternalAccount` · `getExternalAccount` · `listExternalAccounts` ·
`verifyExternalAccount` · `listExternalAccountInstitutions`

**transfers**
`createTransfer*` · `getTransferRates` · `listTransferSupportedCurrencies` ·
`listTransferSupportedCountries` · `listTransferSupportedCountriesForAddress`

**transactions**
`listTransactions` · `getTransaction` · `getTransactionsVolume` · `exportTransactions`

**cards**
`createCard` · `getCard` · `listCards` · `getCardBalance` · `updateCardStatus` ·
`withdrawFromCard*` · `createCardApplication` · `getCardApplication` · `listCardApplications`

**wallets**
`createWallet` · `getWallet` · `listWallets`

**fx**
`getFxQuote` · `listFxRates` · `listFxCurrencyPairs` · `createFxOrder*` · `getFxOrder` ·
`listFxOrders` · `cancelFxOrder*` · `listFxPendingApprovals`

**collections** — taking money in

Card payments go through `createCardPaymentIntent`. It returns the same hosted payment
link as a collection, plus the intent id and the card token that recurring and
merchant-initiated charges need. `createCollection` covers bank transfer, in 16
countries.

`createCardPaymentIntent*` · `chargeSavedCard*` · `listSavedCards` · `getSavedCard` ·
`createCollection*` · `getCollection`

`deleteSavedCard` is not available in this release: the API needs a request body that the
current specification does not describe, so every call would fail.

**features**
`listFeatures` · `checkFeatureEligibility` · `activateFeature`

**webhooks**
`getWebhookHistory` · `getWebhookEventDetail` · `getWebhookCallHistory` · `retryWebhookEvent`

**account-applications** — opt-in via `--toolsets=account-applications`
`createAccountApplication` · `updateAccountApplication` · `getAccountApplication` ·
`listAccountApplications` · `listPendingAccountApplications` · `deleteAccountApplication` ·
`submitAccountApplication` · `processAccountApplication` ·
`submitAndProcessAccountApplication` · `getAccountApplicationHistory` ·
`validateAccountApplication` · `completeAccountApplicationTos`

Each tool's description carries its own prerequisites — several operations depend on
something else having happened first, and the assistant reads those before calling.

---

## A worked example

Asking an assistant to *"pay a supplier in Nigeria 200 USD from my main account"*:

```
1. searchGravvDocs("send money to a Nigerian bank account")
   -> finds the remittance guide, learns the recipient must be `active`
      before a transfer will succeed

2. listAccounts()
   -> finds the funded USD account to pay from

3. listExternalAccountInstitutions({ country_iso_code: "NG" })
   -> resolves the recipient's bank

4. createExternalAccount({ ...bank account recipient details })
   -> a Nigerian bank account comes back "active" at once

5. getExternalAccount({ external_account_id })
   -> confirms "active"; swift, sepa, ach_wire and fps recipients start
      "pending", so for those the assistant polls until "active" or "setup_failed"

6. createTransfer({ amount: 200, source, destination })
   -> returns a PREVIEW, does not execute:
      "Transfer 200 USD from acc_1 to external_account ext_9.
       Once submitted this cannot be reversed from the API."

   [you review and agree]

7. createTransfer({ ...same arguments, confirm: true })
   -> executes; returns transfer_id and status
```

Step 1 is what stops step 6 failing. Without the guides, an assistant tends to create the
recipient and immediately transfer to it, before the payment rail has finished setting
them up.

---

## Going live

1. Test the whole flow with your sandbox key first. Sandbox and live hold **entirely
   separate data** — an id from one does not exist in the other.
2. Swap `GRAVV_API_KEY` for your live key. The base URL does not change.
3. Reads and non-financial writes work immediately.
4. Money movement stays blocked until you also set `GRAVV_ALLOW_LIVE_WRITES=true`. This
   is deliberate: swapping the key alone should not silently arm real payments.

```json
{
  "mcpServers": {
    "gravv": {
      "command": "npx",
      "args": ["-y", "@gravv-infra/mcp"],
      "env": {
        "GRAVV_API_KEY": "grvSec_live_...",
        "GRAVV_ALLOW_LIVE_WRITES": "true"
      }
    }
  }
}
```

Consider a second, separate entry running `--read-only` against your live key for
reporting, and keep writes on sandbox.

---

## Troubleshooting

**The server doesn't start**
Check `node --version` is 20 or later. Without `GRAVV_API_KEY` the server still starts,
but only the two documentation tools load — that's expected, not a failure.

**`401` on every call**
The key was rejected. Confirm it is current and that you copied the whole value.

**`404` on an id you know exists**
You're probably in the other environment. Sandbox and live hold separate data. The
`environment` field in every successful result, and the ENVIRONMENT line of the server
instructions, tell you which one you're in.

**"tool exists but its toolset is not loaded"**
Restart with `--toolsets=all`, or name the group the error mentions.

**"Not available over MCP" on card PAN, CVV, or PIN**
Intentional and not configurable. Use the
[client-side decryption flow](https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview).

**A transfer returned `confirmation_required` instead of running**
Working as designed. Call again with `confirm: true` after reviewing the preview.

**"Not available over MCP" for an approve or reject tool, a payment-link tool, or `deleteSavedCard`**
These were removed in 0.3.2: approving and rejecting is done in the Gravv Dashboard,
payment links are retired, and `deleteSavedCard` returns in a later release. The message
says what to do instead.

**A `grvPub_` key**
Publishable keys cannot call the API. Set `GRAVV_API_KEY` to a secret key starting
`grvSec_sandbox_` or `grvSec_live_`.

**`422`**
Not always about idempotency. A transfer over a sender limit, a blocked sender, missing
sender information or a missing supporting document is also a `422`; the error's code and
the hint say which. A `422` with `idempotency_key_reused` means the key was seen before
with a different body; the server makes a new key for every call, so calling again sends
a fresh one.

**Repeated `429`**
The gateway allows 600 requests a minute, burst 50, per Gravv account, shared by every key
and process. This server throttles itself to 60 a minute, so repeated `429`s usually mean
another process uses the same account. Wait and try again.

**Documentation search returns nothing**
It's keyword-based, not semantic. Rephrase using the vocabulary the docs use — "transfer"
rather than an unusual synonym — or drop the section filter.

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GRAVV_API_KEY` | — | Sandbox or live key; selects the environment. Omit for docs-only mode |
| `GRAVV_ALLOW_LIVE_WRITES` | unset | `true` permits money movement on a live key |
| `GRAVV_RATE_PER_MINUTE` | `60` | Client-side request throttle |
| `GRAVV_BASE_URL` | `https://api.gravv.xyz` | Override the API host |
| `GRAVV_TOOLSETS` | default set | Same as `--toolsets` |

The client throttles requests locally (60 a minute, burst 15) and backs off on `429`. The
gateway allows 600 a minute, burst 50, per Gravv account. See
[Rate limits](https://gravv-docs.syntext.dev/getting-started/rate-limits).

Your API key is read from the environment and sent only to the Gravv API. It is never
written to disk, logged, or included in tool output.

---

## Notes

If a documentation search comes back empty, rephrase it. Search matches wording rather
than meaning, so an unusual phrasing occasionally misses a page that does exist.

---

## License

MIT — see [LICENSE](LICENSE).
