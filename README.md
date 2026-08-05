# @gravv/mcp

MCP server for the [Gravv](https://gravv-docs.syntext.dev) payments API. Connects an AI
assistant to Gravv so it can onboard customers, run KYC, open accounts, add recipients,
move money, issue cards, and exchange currency — using the merchant's own API key.

**Status:** working, tested against a stub gateway. Not yet verified against real sandbox.

---

## Quick start

```bash
GRAVV_API_KEY=grvSec_sandbox_... npx @gravv/mcp
```

### Claude Code

```bash
claude mcp add gravv --env GRAVV_API_KEY=grvSec_sandbox_... -- npx -y @gravv/mcp
```

### Claude Desktop / Cursor / VS Code

```json
{
  "mcpServers": {
    "gravv": {
      "command": "npx",
      "args": ["-y", "@gravv/mcp"],
      "env": { "GRAVV_API_KEY": "grvSec_sandbox_..." }
    }
  }
}
```

---

## Safety model

Gravv moves real money, and **sandbox and live share one base URL** — only the key
prefix differs. Nothing in a request visually signals danger, so the server signals it.

**Money-moving tools take two calls.** `createTransfer`, `withdrawFromCard`,
`createFxOrder`, `createCollection`, and `chargeSavedCard` return a preview on the first
call and execute only when called again with `confirm: true`. The unconfirmed call never
reaches the API.

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

**Cardholder data is never exposed.** `GET /v1/cards/{id}/sensitive-details`,
`GET /v1/cards/{id}/pin`, and `PUT /v1/cards/{id}/pin` are not registered as tools under
any configuration, and responses are scanned for `card_number` / `cvv` / `pin` and
redacted on the way out. Use the
[client-side decryption flow](https://gravv-docs.syntext.dev/platform/cards/view-card-sensitive-details/overview)
for those.

**`--read-only`** disables every non-GET tool, for reporting deployments.

---

## Toolsets

80 tools across 13 groups. Loading all of them floods the model's context and burns the
rate limit, so they are opt-in.

```bash
npx @gravv/mcp                                       # default set
npx @gravv/mcp --toolsets=customers,accounts,cards   # specific groups
npx @gravv/mcp --toolsets=all                        # everything not blocklisted
```

| Toolset | Default | Covers |
|---|---|---|
| `customers` | ✓ | create, list, get, update customers |
| `accounts` | ✓ | accounts, applications, status, sweep rules |
| `transfers` | ✓ | transfers, rates, supported countries/currencies |
| `transactions` | ✓ | history, volume, export |
| `external-accounts` | ✓ | recipients, verification, institutions |
| `kyc` | ✓ | KYC start, S2S, document upload, status |
| `cards` | | issue, balance, status, withdraw, applications |
| `wallets` | | blockchain wallet creation and lookup |
| `fx` | | quotes, rates, OTC orders |
| `collections` | | deposits, payment intents, saved cards |
| `payment-links` | | stablecoin payment links |
| `features` | | feature eligibility and activation |
| `webhooks` | | event history, delivery calls, retry |

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GRAVV_API_KEY` | — | **Required.** The key selects sandbox or live |
| `GRAVV_ALLOW_LIVE_WRITES` | unset | `true` permits money movement on a live key |
| `GRAVV_RATE_PER_MINUTE` | `10` | Client-side throttle |
| `GRAVV_BASE_URL` | `https://api.gravv.xyz` | Override the API host |
| `GRAVV_TOOLSETS` | default set | Same as `--toolsets` |

> **Rate limit caveat.** The real ceiling is unsettled upstream: `throttler.go:15`
> configures 15/min burst 30, its comment says 5/min, and the published docs say 10/min.
> We default to the published figure. If you see repeated 429s, lower
> `GRAVV_RATE_PER_MINUTE`.

---

## How tools are produced

```
apps/client-docs/openapi/*.yaml   source of truth for API shapes (also builds the docs site)
        │  npm run sync-specs
        ▼
    specs/*.yaml                  vendored copy, so spec drift is a visible diff here
        │  npm run generate
        ▼
 src/generated/tools.ts           80 tool definitions — DO NOT EDIT
        ▲
        │
   src/curation.ts                names, toolsets, blocklist, ORDERING — hand-maintained
```

Generating from the specs means the tools cannot drift from what the docs promise.
Everything a spec cannot express lives in `curation.ts`:

- **Tool names.** The specs carry `operationId` on only 10 of 86 operations, and five of
  those are auto-generated (`get_v1-fx-orders-order_id`). Rather than requiring an edit
  to the docs repo, this server owns its own naming, keyed by `METHOD /path`.
- **Ordering and prerequisites.** This is the important one. The specs describe 86
  independent operations and say nothing about what must happen first. Without it an
  agent will create an external account and immediately transfer to it, skipping the
  poll-until-active step. So `createExternalAccount`'s description carries:

  > RETURNS 202: the recipient is not immediately usable... Poll `getExternalAccount`
  > until status is `active` before calling `createTransfer`.

- **The blocklist** and **which operations move money.**

For integration guidance beyond tool descriptions — corridor rules, worked examples,
full flows — the assistant should consult <https://gravv-docs.syntext.dev>. These tools
execute calls; the docs explain how the flows fit together.

---

## Development

```bash
npm install
npm run sync-specs          # pull specs from ../client-docs/openapi
npm run generate            # specs -> src/generated/tools.ts
npm run typecheck
npm test                    # 43 tests, no API key needed
npm run build
```

`npm run sync-specs -- --check` exits non-zero when the vendored specs are stale — wire
this into CI so an upstream spec change cannot silently diverge.

Tests run against a stub gateway on localhost. `test/e2e.test.ts` spawns the real binary
and drives it over actual MCP JSON-RPC.

---

## Known gaps

- **Not yet run against real sandbox.** Everything is verified against a stub.
- **~20 live endpoints have no OpenAPI spec** and therefore no tool: all of
  `/v1/billings/*`, `/v1/settlement-instructions/*`, `/v1/open-trade/*`,
  `/v1/accounts/sweep-rules/*`, `/v1/wallets/balances`, `/v1/wallets/total-balance`,
  `/v1/customers/email/{email}`, `/v1/cards/{id}/chain-details`.
- **Approve/reject is unavailable by design.** `middleware.DashboardOnly()` 403s
  API-key callers on the transfer, payee, and FX approval routes. Approvals are a
  dashboard action.
- **stdio only.** The hosted remote transport is not built.
