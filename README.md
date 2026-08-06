# @gravvfi/mcp

MCP server for the [Gravv](https://gravv-docs.syntext.dev) payments API. Connects an AI
assistant to Gravv so it can onboard customers, run KYC, open accounts, add recipients,
move money, issue cards, and exchange currency — using your own API key.

Works with Claude, Cursor, VS Code, and any [MCP](https://modelcontextprotocol.io)-compatible client.

---

## Quick start

**Requires Node.js 20 or later.** Check with `node --version`.

```bash
GRAVV_API_KEY=grvSec_sandbox_... npx @gravvfi/mcp
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
claude mcp add gravv --env GRAVV_API_KEY=grvSec_sandbox_... -- npx -y @gravvfi/mcp
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
      "args": ["-y", "@gravvfi/mcp"],
      "env": { "GRAVV_API_KEY": "grvSec_sandbox_..." }
    }
  }
}
```

Or from the CLI:

```bash
code --add-mcp '{"name":"gravv","command":"npx","args":["-y","@gravvfi/mcp"],"env":{"GRAVV_API_KEY":"grvSec_sandbox_..."}}'
```
</details>

<details>
<summary><b>OpenAI Codex CLI</b></summary>

```bash
codex mcp add gravv --env GRAVV_API_KEY=grvSec_sandbox_... -- npx -y @gravvfi/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.gravv]
command = "npx"
args = ["-y", "@gravvfi/mcp"]

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
      "args": ["-y", "@gravvfi/mcp"],
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
args:    ["-y", "@gravvfi/mcp"]
env:     GRAVV_API_KEY=grvSec_sandbox_...
```

To try it without a client:

```bash
GRAVV_API_KEY=grvSec_sandbox_... npx -y @gravvfi/mcp
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

**API tools** — 87 tools covering customers, KYC, accounts, transfers, cards, wallets,
FX, collections, payment links, webhooks, and approvals.

Both matter. The API tools execute calls, but they can't tell you what has to happen
first — that an account needs a KYC-verified customer, or that a new recipient must reach
`active` before you can pay them. That's what the guides are for, so they're reachable
from the same connector. Ask the assistant how to do something and it can look it up,
write your integration, then run it against sandbox to prove it works.

```bash
npx @gravvfi/mcp     # with GRAVV_API_KEY: docs + API tools
npx @gravvfi/mcp     # without it: docs tools only, still useful
```

---

## Safety model

Gravv moves real money, and **sandbox and live share one base URL** — only your key
differs. Nothing in a request visually signals danger, so the server signals it.

**Money-moving tools take two calls.** `createTransfer`, `withdrawFromCard`,
`createFxOrder`, `createCollection`, `chargeSavedCard`, `approveTransfer`, and
`approveFxOrder` return a preview on the first call and execute only when called again
with `confirm: true`. The unconfirmed call never reaches the API.

Approving is included because releasing a held instruction has the same consequence as
initiating one. Rejecting is not gated — it only prevents execution.

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

**Idempotency is automatic.** Every write that needs an `Idempotency-Key` gets one, and
the key used is returned with the result so a deliberate retry can reuse it.

**`--read-only`** disables every non-GET tool, for reporting deployments.

---

## Toolsets

Everything except `account-applications` loads by default. Account onboarding carries
large schemas and is an infrequent, deliberate flow, so it is opt-in.

```bash
npx @gravvfi/mcp                                       # default
npx @gravvfi/mcp --toolsets=customers,accounts,cards   # specific groups
npx @gravvfi/mcp --toolsets=all                        # everything
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
| `collections` | ✓ | deposits, payment intents, saved cards |
| `payment-links` | ✓ | stablecoin payment links |
| `features` | ✓ | feature eligibility and activation |
| `webhooks` | ✓ | event history, delivery calls, retry |
| `approvals` | ✓ | approve/reject transfers, recipients and FX orders |
| `account-applications` | | account onboarding |

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
`listFxOrders` · `cancelFxOrder` · `listFxPendingApprovals`

**collections** — taking money in
`createCollection*` · `getCollection` · `createCardPaymentIntent` · `chargeSavedCard*` ·
`listSavedCards` · `getSavedCard` · `deleteSavedCard`

**payment-links**
`createPaymentLink` · `getPaymentLink` · `listPaymentLinks` · `updatePaymentLink` ·
`updatePaymentLinkStatus` · `deletePaymentLink` · `getPublicPaymentLink`

**features**
`listFeatures` · `checkFeatureEligibility` · `activateFeature`

**webhooks**
`getWebhookHistory` · `getWebhookEventDetail` · `getWebhookCallHistory` · `retryWebhookEvent`

**approvals** — sign off on held instructions
`approveTransfer*` · `rejectTransfer` · `approveExternalAccount` · `rejectExternalAccount` ·
`approveFxOrder*` · `rejectFxOrder` · `searchWebhookIngestion`

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

3. listExternalAccountInstitutions({ country: "NG" })
   -> resolves the recipient's bank

4. createExternalAccount({ ...recipient details })
   -> returns status "pending" — not yet usable

5. getExternalAccount({ external_account_id })
   -> polls until status is "active"

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
      "args": ["-y", "@gravvfi/mcp"],
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
`environment` field in every response tells you which one you're in.

**"tool exists but its toolset is not loaded"**
Restart with `--toolsets=all`, or name the group the error mentions.

**"Not available over MCP" on card PAN, CVV, or PIN**
Intentional and not configurable. Use the
[client-side decryption flow](https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview).

**A transfer returned `confirmation_required` instead of running**
Working as designed. Call again with `confirm: true` after reviewing the preview.

**`422` mentioning an idempotency key**
The same key was reused with a different payload. A genuinely new operation needs a new
key; the server generates one per call, so this usually means a retry changed the body.

**Repeated `429`**
Lower `GRAVV_RATE_PER_MINUTE`.

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

The client throttles requests locally and backs off on `429`. If you hit rate limits,
lower `GRAVV_RATE_PER_MINUTE`. See
[Rate limits](https://gravv-docs.syntext.dev/getting-started/rate-limits).

Your API key is read from the environment and sent only to the Gravv API. It is never
written to disk, logged, or included in tool output.

---

## Notes

- **Documentation search is keyword-based** with payments-vocabulary synonym expansion.
  It handles most phrasings — "send money to a recipient" finds the remittance guide —
  but it is not semantic search and can miss unusual wording. Rephrase if a search comes
  back empty.
- **stdio transport only** in this release.

---

## Development

**Development requires Node.js 22.6 or later** — the tests and build scripts are
TypeScript executed directly via `--experimental-strip-types`. The *published* package is
compiled JavaScript and runs on Node 20+, which CI verifies separately.

```bash
npm install
npm run generate    # regenerate tool definitions from specs/
npm run typecheck
npm test            # 86 tests, no API key or network required
npm run build
```

Tools are generated from the OpenAPI specifications vendored in `specs/`, so they stay in
step with the published API. Everything a specification cannot express — tool names,
which operations move money, and the call-ordering prerequisites in tool descriptions —
is hand-maintained in `src/curation.ts`. `src/generated/tools.ts` is build output; don't
edit it.

`npm run sync-specs` refreshes `specs/` from a local checkout of the specification
source; set `GRAVV_OPENAPI_DIR` to point at it. `npm run sync-specs -- --check` exits
non-zero when the vendored copies are stale.

Tests run against a local stub, so no API key or network access is needed.
`test/e2e.test.ts` spawns the binary and drives it over real MCP JSON-RPC, and
`test/protocol.test.ts` checks protocol conformance — version negotiation, `ping`,
method-not-found handling, and that every tool name and schema is valid for any client.

---

## Releasing

Publishing is automated via GitHub Releases and npm trusted publishing — see
[RELEASING.md](RELEASING.md).

---

## License

MIT — see [LICENSE](LICENSE).
