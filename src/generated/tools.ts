// GENERATED FILE — DO NOT EDIT.
// Produced by scripts/generate.ts from specs/*.yaml.
// To change a tool's name, toolset, blocklist status, or ordering guidance,
// edit src/curation.ts and re-run: npm run generate

import type { Toolset } from "../curation.ts";

export interface GeneratedTool {
  /** MCP tool name, unique across all specs. */
  name: string;
  /** Which --toolsets group this belongs to. */
  toolset: Toolset;
  /** HTTP method to call on the Gravv API. */
  method: string;
  /** Path template, e.g. /v1/accounts/{account_id}. */
  path: string;
  /** Tool description shown to the model, including any ordering prerequisites. */
  description: string;
  /** JSON Schema for the tool's flat argument object. */
  inputSchema: Record<string, unknown>;
  /** Argument names substituted into the path template. */
  pathParams: string[];
  /** Argument names sent as query string. */
  queryParams: string[];
  /** How to assemble the request body from the flat arguments. */
  bodyMode: "inline" | "wrapped" | "none";
  /** For bodyMode "inline": argument names belonging in the JSON body. */
  bodyProps: string[];
  /** Path parameters that must also be written into the body. */
  alsoInBody: string[];
  /** The route rejects unknown body fields: undeclared arguments are not passed through. */
  closedBody: boolean;
  /** Moves money: GRAVV_ALLOW_LIVE_WRITES is needed on a live key, as well as confirm. */
  movesMoney: boolean;
  /** Requires confirm: true (every money-moving tool, and the irreversible ones). */
  needsConfirm: boolean;
  /** Client must attach a generated Idempotency-Key. */
  needsIdempotency: boolean;
  /** Works only with a sandbox key: hidden and refused on any other. */
  sandboxOnly: boolean;
  /** Source spec filename, for traceability. */
  spec: string;
}

export const TOOLS: GeneratedTool[] = [
  {
    "name": "activateFeature",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/risk/features/activate",
    "description": "Activate a feature — Turns on a feature for a customer. For `virtual_cards` it creates a card application and, when the application is approved, issues a virtual card. Cards need completed KYC with a liveness check, a card-type account, and `provider_data` with `annual_remuneration` and `estimated_monthly_limit`. If the customer has no liveness check, the status is `pending_liveness`. Give the cardholder `websdk_url`, then call again. `crypto_wallet` and `international_transfers` become active at once. An activation that already exists is returned unchanged. Every error is HTTP 400.\n\nPREREQUISITES: checkFeatureEligibility first. For virtual_cards the cardholder needs completed card KYC with a liveness check (startCardholderKyc, or the websdk_url this call returns), and provider_data needs account_id (your active card account: listAccounts with account_type card and status active) as well as annual_remuneration and estimated_monthly_limit as JSON numbers. Requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer",
          "example": "302dabcb-d4fd-4a00-a80b-afad70982614"
        },
        "feature_id": {
          "type": "string",
          "description": "The catalogue lists six features: `virtual_cards` (Cards), `usd_account`, `eur_account` and `gbp_account` (accounts), `crypto_wallet` (Wallet) and `international_transfers` (Payout). These routes serve cards, so send `virtual_cards`. Open accounts, wallets and payouts with their own APIs.",
          "enum": [
            "crypto_wallet",
            "virtual_cards",
            "eur_account",
            "usd_account",
            "gbp_account",
            "international_transfers"
          ],
          "example": "virtual_cards"
        },
        "activated_by": {
          "type": "string",
          "format": "uuid",
          "description": "Optional ID of the user who made the request. An invalid value is ignored."
        },
        "provider_data": {
          "type": "object",
          "description": "Data the feature needs. Only `virtual_cards` reads it today, and that feature requires it. Send numbers as JSON numbers.",
          "properties": {
            "annual_remuneration": {
              "type": "number",
              "minimum": 1000,
              "description": "Cardholder's yearly income. Required for `virtual_cards`.",
              "example": 12000
            },
            "estimated_monthly_limit": {
              "type": "number",
              "minimum": 1,
              "description": "Expected monthly card spend. Required for `virtual_cards`. When a card is issued during activation, it also becomes that card's daily limit.",
              "example": 200
            },
            "account_id": {
              "type": "string",
              "format": "uuid",
              "description": "Always send it for `virtual_cards`. It is the ID of your business's card account (type `card`, status `active`). The same card account backs every cardholder. Leaving it out fails with `cards service: internal server error`.",
              "example": "5d9e677f-f071-4881-a861-7cdcebacd9d5"
            },
            "funding": {
              "type": "object",
              "description": "How the card is funded",
              "properties": {
                "mode": {
                  "type": "string",
                  "enum": [
                    "shared",
                    "own"
                  ]
                },
                "card_group_id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Only with `mode` `shared`"
                }
              }
            },
            "ip_address": {
              "type": "string",
              "description": "Gravv replaces it with the IP address of the calling server when one is present. You do not need to send it."
            }
          },
          "additionalProperties": true
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "feature_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "feature_id",
      "activated_by",
      "provider_data"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "features.yaml"
  },
  {
    "name": "cancelFxOrder",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/orders/{order_id}/cancel",
    "description": "Cancel an order — Cancels a `waiting_approval` or `pending` order whose debit is not in progress. Cancelling does not return money that was already debited; contact support for that. The request has no body.\n\nOnly an order in `waiting_approval`, or a `pending` order whose debit is not in flight, can be cancelled. Cancelling does NOT return funds already debited, and API-key orders are debited when they are placed. IRREVERSIBLE: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "format": "uuid",
          "description": "The `order_id` returned when the order was created"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "order_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "order_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "chargeSavedCard",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections/cards/payment-intents/charge",
    "description": "Charge card — Charges a saved card against an open payment intent, server to server. Use it for repeat charges after the payer saved a card. The card must be saved under the intent's `client_customer_id`. You can charge a saved card at most 5 times in 24 hours, and each charge can be at most 3 times the card's first payment. A declined charge returns HTTP 400 with a sentence such as `The card has insufficient funds: payment declined`.\n\nMOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "payment_intent_id": {
          "type": "string",
          "description": "The `intent_id`, with its `pi_` prefix",
          "example": "pi_429f578b-675a-4b68-abe3-856cd976257f"
        },
        "card_token": {
          "type": "string",
          "description": "A card token saved under the intent's `client_customer_id`",
          "example": "tokn_80aebb6ea2594a74bc"
        },
        "first_name": {
          "type": "string",
          "example": "Jane"
        },
        "last_name": {
          "type": "string",
          "example": "Doe"
        },
        "email": {
          "type": "string",
          "format": "email",
          "example": "jane@example.com"
        },
        "phone_number": {
          "type": "string",
          "description": "E.164 format",
          "example": "+14155551234"
        },
        "date_of_birth": {
          "type": "string",
          "description": "`YYYY-MM-DD`, `MM/DD/YYYY` or `DD/MM/YYYY`",
          "example": "1990-05-12"
        },
        "billing_address1": {
          "type": "string",
          "example": "123 Market St"
        },
        "billing_city": {
          "type": "string",
          "example": "San Francisco"
        },
        "billing_state": {
          "type": "string",
          "example": "CA"
        },
        "billing_zip": {
          "type": "string",
          "description": "Checked against the billing country",
          "example": "94105"
        },
        "billing_country": {
          "type": "string",
          "description": "ISO 3166-1 alpha-2",
          "example": "US"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "payment_intent_id",
        "card_token"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "payment_intent_id",
      "card_token",
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "date_of_birth",
      "billing_address1",
      "billing_city",
      "billing_state",
      "billing_zip",
      "billing_country"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "checkFeatureEligibility",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/risk/features/eligibility",
    "description": "Check feature eligibility — Lists the requirements a customer has met, and those still pending, for one feature. The call only reads data, but it is a POST and needs an Idempotency-Key. A repeated key returns the cached answer for 24 hours, so use a new key for each check. Every error is HTTP 400.\n\nThe provider_data items listed as pending are the fields to pass to activateFeature. Leave idempotency_key out on each check: an answer is kept for 24 hours under its key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "feature_id": {
          "type": "string",
          "description": "The catalogue lists six features: `virtual_cards` (Cards), `usd_account`, `eur_account` and `gbp_account` (accounts), `crypto_wallet` (Wallet) and `international_transfers` (Payout). These routes serve cards, so send `virtual_cards`. Open accounts, wallets and payouts with their own APIs.",
          "enum": [
            "crypto_wallet",
            "virtual_cards",
            "eur_account",
            "usd_account",
            "gbp_account",
            "international_transfers"
          ],
          "example": "virtual_cards"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer",
          "example": "5793f1ea-91f0-4892-9705-d37e0592dd3a"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "feature_id",
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "feature_id",
      "customer_id"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "features.yaml"
  },
  {
    "name": "createAccount",
    "toolset": "accounts",
    "method": "post",
    "path": "/v1/accounts",
    "description": "Open your card account — Opens your business's one card account, which backs every card you issue. Send `type` `card`, `currency` `USD` and your business's own customer ID, which is the `customer_id` on your account whose `category` is `main`. The API refuses an end customer's ID and a second card account. The account starts `pending`. Wait for the `account.activated` webhook, or read the account until it is `active`, before you activate cards with it. `POST /v1/accounts` opens card accounts only at `lead_bank` and `cross_river_bank`, in USD. Leave `bank` out and Gravv tries `lead_bank` first, then `cross_river_bank`. Gravv sets `category` itself: `main` for your business's own customer. v1 reads your business's KYC from its customer record and takes no KYC data in the body. This is the only use of `POST /v1/accounts` that Gravv documents. Open every other account, for any bank, currency or country, with `POST /v2/accounts`. Every error is HTTP 400, for example: - `failed to create internal account: card accounts cannot be created for this customer — this account type is reserved for the tenant`: you sent an end customer's ID. - `failed to create internal account: card account already exists for customer (account_id: <id>)`: use that card account. A `deleted`, `frozen` or `failed` card account does not count. - `failed to create internal account: kyc validation failed: no KYC information found for the customer`: your business's `basic` KYC is not `completed`. - `failed to create internal account: account issuance for the requested currency USD and network <network> is not supported`: a `bank` other than `lead_bank` or `cross_river_bank`. - `missing idempotency key in request headers`: send an `Idempotency-Key`.\n\nONLY for your business's one card account. Open every other account with createAccountV2. A business has one card account: look first with listAccounts (account_type card). bank is `lead_bank` or `cross_river_bank`. It is ready at account.activated, when getAccount shows `active`. After a failed call, fix the request and leave idempotency_key out.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency": {
          "type": "string",
          "enum": [
            "USD"
          ],
          "description": "Always `USD`",
          "example": "USD"
        },
        "type": {
          "type": "string",
          "enum": [
            "card"
          ],
          "description": "Always `card`",
          "example": "card"
        },
        "label": {
          "type": "string",
          "description": "Label for the account",
          "example": "ops",
          "maxLength": 50
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your business's own customer ID. It is the `customer_id` on your account whose `category` is `main`.",
          "example": "550e8400-e29b-41d4-a716-446655440178"
        },
        "blockchain_network": {
          "type": "string",
          "enum": [
            "polygon",
            "ethereum",
            "solana",
            "stellar",
            "avalanche_c_chain"
          ],
          "description": "Network of the account's wallet, in lower case",
          "example": "polygon"
        },
        "bank": {
          "type": "string",
          "enum": [
            "lead_bank",
            "cross_river_bank"
          ],
          "description": "Bank that holds the card account. Leave it out and Gravv tries `lead_bank` first, then `cross_river_bank`. Any other value is refused.",
          "example": "cross_river_bank"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "currency",
        "type",
        "label",
        "customer_id",
        "blockchain_network"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "currency",
      "type",
      "label",
      "customer_id",
      "blockchain_network",
      "bank"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "card-account.yaml"
  },
  {
    "name": "createAccountV2",
    "toolset": "accounts",
    "method": "post",
    "path": "/v2/accounts",
    "description": "Create an account — Opens a bank account, with a token wallet where the bank offers one, for a customer whose KYC is completed. First call getAccountCapabilities to choose `bank_code`, `currency` and `account_type`, then getAccountRequirements to build `data`. The response has only `account_id` and `status: pending`. Get the account (getAccountV2) for `application_id` and `status_reason`, and poll until it is `active`, or wait for the `applications.accounts.completed` webhook. v2 accounts do not send `account.activated`. Unknown fields are rejected.\n\nPREREQUISITES: (1) the customer exists and its basic KYC is completed (getCustomer); (2) bank_code, currency and account_type come from getAccountCapabilities, and customer_type is always sent; (3) data is built from getAccountRequirements. Do not send data.root.autofill_tax_form: it is not live yet. Documents take file_path (a local JPEG, PNG or PDF of at most 2 MB each; in sandbox, under 500 KB for all of one call's files) in place of base64 content. Then poll getAccountV2 until `active`, and act on status_reason with updateAccountApplicationV2. A SAVINGS account is customer_type (required), category `savings`, currency USD, no wallet_id, account_type left out or `regular`, network left out or `avalanche_c_chain`; one per customer (409 SAVINGS_ACCOUNT_ALREADY_EXISTS). It is sandbox-only for now.\n\nThe body takes one of these shapes. Wallet-backed USD account: also requires network or wallet_id. Wallet-backed EUR or GBP account: also requires network or wallet_id. USD account in the US (no wallet): also requires bank_code. EUR or GBP account with its own IBAN: also requires bank_code. NGN account: nothing more is required. Account held in Kenya: nothing more is required. Savings account: also requires customer_type, category.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "description": "An existing customer whose KYC is completed. The API checks it before every other field.",
          "format": "uuid",
          "example": "0b6f3c1e-2a4d-4c8e-9f10-7d2a6b5e4c33"
        },
        "customer_type": {
          "type": "string",
          "description": "`individual` or `business`. Always send it, because bank choice and routing use the value you send. Defaults to the customer's profile type.",
          "enum": [
            "individual",
            "business"
          ],
          "example": "individual"
        },
        "account_type": {
          "type": "string",
          "description": "Account type from the option's `account_types`: `operating`, `regular`, `card` or `default`. Defaults to `operating`. Only your business's own customer can hold `card` or `default`.",
          "example": "operating"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code. The API also accepts lower case.",
          "enum": [
            "USD",
            "EUR",
            "GBP",
            "NGN",
            "KES",
            "TZS",
            "UGX",
            "CNY",
            "RWF"
          ],
          "example": "USD"
        },
        "category": {
          "type": "string",
          "description": "`main` for your business's own account, `sub_account` for a customer's account. Defaults to `main` for your business's own customer and `sub_account` for any other customer.",
          "enum": [
            "main",
            "sub_account",
            "savings"
          ],
          "example": "sub_account"
        },
        "label": {
          "type": "string",
          "description": "Your label for the account, at most 255 bytes",
          "example": "Jane USD"
        },
        "bank_code": {
          "type": "string",
          "description": "A `bank_code` from `GET /v1/accounts/capabilities` whose option has a non-empty `token_wallets`. Leave it out to use the default USD option, the highest-priority bank that fits.",
          "example": "cross_river_bank"
        },
        "network": {
          "type": "string",
          "description": "Network for the account's token wallet. Send `network` or `wallet_id`, never both. It must be one of the networks in the option's `token_wallets` (`token_options` on the requirements form), and one of stellar, polygon, ethereum, avalanche_c_chain or solana.",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "avalanche_c_chain",
            "solana"
          ],
          "example": "polygon"
        },
        "wallet_id": {
          "type": "string",
          "description": "An existing wallet of yours to use instead of `network`. Gravv takes the network from the wallet, and the option must offer that network. Send one, not both."
        },
        "data": {
          "type": "object",
          "description": "The form from `GET /v2/accounts/requirements`. Put `root` scope fields in `data.root`, party fields in `data.parties[]`, and documents in `data.documents[]` or a party's `documents`.",
          "properties": {
            "root": {
              "type": "object",
              "description": "The root fields of the option's form from `GET /v2/accounts/requirements`, which is the full and current list. The fields below are those the forms of this kind of account ask for. Gravv fills in the fields the customer record already answers. Three forms apply: one for the default USD option, one for the USD, EUR and GBP option, and one for the EUR and USD option. Include `citizenship_country` for a person or `incorporation_country` for a business, because Gravv routes by it. Do not put `network` or `wallet_id` here.",
              "additionalProperties": true,
              "properties": {
                "first_name": {
                  "type": "string",
                  "description": "Person, every form",
                  "example": "Jane"
                },
                "middle_name": {
                  "type": "string",
                  "description": "Person, optional"
                },
                "last_name": {
                  "type": "string",
                  "description": "Person, every form",
                  "example": "Doe"
                },
                "date_of_birth": {
                  "type": "string",
                  "description": "Person, every form. YYYY-MM-DD.",
                  "example": "1990-04-02"
                },
                "email": {
                  "type": "string",
                  "description": "Person, every form. Business, on the default USD option (the business email) and the USD, EUR and GBP option.",
                  "example": "jane@example.com"
                },
                "phone": {
                  "type": "string",
                  "description": "Business, on the default USD option. The business phone number with its country code, such as `+442071234567`."
                },
                "phone_daytime": {
                  "type": "string",
                  "description": "Phone number in E.164 format. Person, on the default USD option and the EUR and USD option. Business, on the USD, EUR and GBP option.",
                  "example": "+447700900123"
                },
                "gender": {
                  "type": "string",
                  "description": "Person, on the default USD option",
                  "enum": [
                    "female",
                    "male"
                  ]
                },
                "citizenship_country": {
                  "type": "string",
                  "description": "Person, every form. Alpha-2 code. Gravv routes a person by it.",
                  "example": "GB"
                },
                "tax_residence_country": {
                  "type": "string",
                  "description": "Person. Alpha-2 code. Required on the default USD option and the EUR and USD option, and on the USD, EUR and GBP option for anyone who is not a US citizen.",
                  "example": "GB"
                },
                "permanent_address": {
                  "type": "object",
                  "properties": {
                    "address_line": {
                      "type": "string",
                      "description": "Street address",
                      "example": "1 High St"
                    },
                    "city": {
                      "type": "string",
                      "example": "London"
                    },
                    "state": {
                      "type": "string",
                      "description": "State or region as an ISO 3166-2 code, such as `GB-LND` or `US-CA`",
                      "example": "GB-LND"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "EC1A 1BB"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country as an alpha-2 code",
                      "example": "GB"
                    }
                  },
                  "description": "Person's home address, every form. Send `state`."
                },
                "tax_id_type": {
                  "type": "string",
                  "description": "Person: on the default USD option, `ssn` for a US citizen; on the USD, EUR and GBP option, `ssn` once you send `tax_id_number`. Business: required on the default USD option and the USD, EUR and GBP option, and `ein` for a company incorporated in the US. On the default USD option a business sends `ein`, `ssn`, `tin`, `vat` or `utr`.",
                  "enum": [
                    "ssn",
                    "ein",
                    "tin",
                    "vat",
                    "utr"
                  ]
                },
                "tax_id_number": {
                  "type": "string",
                  "description": "Write-only. The number of `tax_id_type`, in any format. Gravv sends only its letters and digits to the bank. A US citizen sends it on the default USD option. A business sends it on the default USD option and the USD, EUR and GBP option. If the business has no tax ID for a valid reason, send `999999999`."
                },
                "immigration_status": {
                  "type": "string",
                  "description": "Person who is not a US citizen, on the USD, EUR and GBP option",
                  "enum": [
                    "permanent_resident",
                    "non_permanent_resident",
                    "non_resident"
                  ]
                },
                "international_supplement": {
                  "type": "object",
                  "description": "A person who is not a US citizen, on the USD, EUR and GBP option. Four yes or no questions. When an answer is true, also send its details field.",
                  "properties": {
                    "has_us_bank_account": {
                      "type": "boolean",
                      "description": "Whether the person has a US bank account"
                    },
                    "has_denied_bank_account": {
                      "type": "boolean",
                      "description": "Whether a bank has refused the person an account"
                    },
                    "denial_details": {
                      "type": "string",
                      "description": "Required when `has_denied_bank_account` is true"
                    },
                    "has_regulatory_action": {
                      "type": "boolean",
                      "description": "Whether a regulator has taken action against the person"
                    },
                    "regulatory_action_details": {
                      "type": "string",
                      "description": "Required when `has_regulatory_action` is true"
                    },
                    "is_politically_exposed": {
                      "type": "boolean",
                      "description": "Whether the person is politically exposed"
                    },
                    "pep_details": {
                      "type": "string",
                      "description": "Required when `is_politically_exposed` is true"
                    }
                  }
                },
                "expected_activity": {
                  "type": "object",
                  "description": "Person, on the USD, EUR and GBP option, for every currency. Other channels, such as `ach_out` and `wire_domestic_in`, are optional.",
                  "additionalProperties": true,
                  "properties": {
                    "expected_avg_daily_balance": {
                      "description": "Expected average daily balance, in the account currency. Required."
                    },
                    "ach_in": {
                      "type": "object",
                      "description": "Expected incoming ACH payments. Required, and `0` is a valid count.",
                      "properties": {
                        "monthly_count": {
                          "type": "integer",
                          "description": "Payments a month"
                        },
                        "monthly_amount": {
                          "description": "Total a month, in the account currency"
                        }
                      }
                    }
                  }
                },
                "source_of_income": {
                  "type": "string",
                  "description": "Person, on the EUR and USD option",
                  "enum": [
                    "salary",
                    "pension",
                    "investment",
                    "property",
                    "friends_and_family",
                    "benefits"
                  ]
                },
                "employment_status": {
                  "type": "string",
                  "description": "Person, on the EUR and USD option",
                  "enum": [
                    "employed",
                    "homemaker",
                    "retired",
                    "self_employed",
                    "student",
                    "unemployed"
                  ]
                },
                "work_industry": {
                  "type": "string",
                  "description": "Person, on the EUR and USD option. One of the form's `options`."
                },
                "annual_deposit_range": {
                  "type": "string",
                  "description": "Person, on the EUR and USD option",
                  "enum": [
                    "less_than_5k",
                    "from_5k_to_50k",
                    "from_50k_to_150k",
                    "more_than_150k"
                  ]
                },
                "transaction_frequency": {
                  "type": "string",
                  "description": "Person, on the EUR and USD option",
                  "enum": [
                    "once_per_year",
                    "once_every_few_months",
                    "a_few_times_per_month",
                    "once_per_week",
                    "more_than_once_per_week"
                  ]
                },
                "legal_name": {
                  "type": "string",
                  "description": "Business, every form",
                  "example": "Acme Exports Ltd"
                },
                "dba_name": {
                  "type": "string",
                  "description": "Business. Trading name, required on the USD, EUR and GBP option."
                },
                "business_type": {
                  "type": "string",
                  "description": "Business, on the default USD option and the USD, EUR and GBP option"
                },
                "business_description": {
                  "type": "string",
                  "description": "Business, on the default USD option and the USD, EUR and GBP option"
                },
                "registration_number": {
                  "type": "string",
                  "description": "Business, on the default USD option and the EUR and USD option"
                },
                "industry": {
                  "type": "string",
                  "description": "Business, on the default USD option and the EUR and USD option. One of the form's `options`."
                },
                "incorporation_country": {
                  "type": "string",
                  "description": "Business, every form. Alpha-2 code. Gravv routes a business by it.",
                  "example": "GB"
                },
                "incorporation_date": {
                  "type": "string",
                  "description": "Business, on the default USD option and the EUR and USD option. YYYY-MM-DD."
                },
                "website": {
                  "type": "string",
                  "description": "Business. Required on the default USD option and the EUR and USD option, starting with `http://` or `https://`."
                },
                "business_address": {
                  "type": "object",
                  "properties": {
                    "address_line": {
                      "type": "string",
                      "description": "Street address",
                      "example": "1 High St"
                    },
                    "city": {
                      "type": "string",
                      "example": "London"
                    },
                    "state": {
                      "type": "string",
                      "description": "State or region as an ISO 3166-2 code, such as `GB-LND` or `US-CA`",
                      "example": "GB-LND"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "EC1A 1BB"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country as an alpha-2 code",
                      "example": "GB"
                    }
                  },
                  "description": "Business address, every form. Send `state`, except on the USD, EUR and GBP option, which needs it only for an address in the US."
                },
                "source_of_funds": {
                  "description": "Business, on the EUR and USD option: required, one of `revenue`, `trading_income`, `investments`, `loans_credits`, `crypto_mining` or `client_funds`. On the default USD option, an optional object of questions about the money in the account. In that object, `expected_monthly_payments_usd` is an amount, a number or a decimal string such as `\"25000\"`. The API refuses the old ranges, such as `under_5k`."
                },
                "legal_entity_type": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. One of the form's `options`, such as `limited_liability_company`."
                },
                "business_tax_id": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. Write-only. The company's tax ID."
                },
                "business_ownership_type": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. One of the form's `options`, such as `private`."
                },
                "estimated_monthly_turnover": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. One of the form's `options`, such as `up_to_50k`."
                },
                "estimated_transaction_value": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. One of the form's `options`, such as `up_to_15k`."
                },
                "monthly_transaction_frequency": {
                  "type": "string",
                  "description": "Business, on the EUR and USD option. One of the form's `options`, such as `up_to_20`."
                },
                "mailing_address": {
                  "type": "object",
                  "properties": {
                    "address_line": {
                      "type": "string",
                      "description": "Street address",
                      "example": "1 High St"
                    },
                    "city": {
                      "type": "string",
                      "example": "London"
                    },
                    "state": {
                      "type": "string",
                      "description": "State or region as an ISO 3166-2 code, such as `GB-LND` or `US-CA`",
                      "example": "GB-LND"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "EC1A 1BB"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country as an alpha-2 code",
                      "example": "GB"
                    }
                  },
                  "required": [],
                  "description": "Optional mailing address, for a person or a business"
                },
                "employer_info": {
                  "type": "object",
                  "description": "Person, when `employment_status` is `employed`",
                  "properties": {
                    "current_employer": {
                      "type": "string",
                      "description": "Name of the employer"
                    },
                    "occupation": {
                      "type": "string",
                      "description": "The person's occupation"
                    },
                    "permanent_address": {
                      "type": "object",
                      "properties": {
                        "address_line": {
                          "type": "string",
                          "description": "Street address",
                          "example": "1 High St"
                        },
                        "city": {
                          "type": "string",
                          "example": "London"
                        },
                        "state": {
                          "type": "string",
                          "description": "State or region as an ISO 3166-2 code, such as `GB-LND` or `US-CA`",
                          "example": "GB-LND"
                        },
                        "postal_code": {
                          "type": "string",
                          "example": "EC1A 1BB"
                        },
                        "country": {
                          "type": "string",
                          "description": "Country as an alpha-2 code",
                          "example": "GB"
                        }
                      },
                      "required": [],
                      "description": "The employer's address"
                    }
                  }
                },
                "income_source": {
                  "type": "string",
                  "description": "Person, when you send no `employer_info.current_employer`"
                },
                "state_incorporated": {
                  "type": "string",
                  "description": "Business, optional. State of incorporation."
                },
                "business_status": {
                  "type": "string",
                  "description": "Business",
                  "enum": [
                    "operating",
                    "non_operating"
                  ]
                },
                "business_entity_type": {
                  "type": "string",
                  "description": "Business",
                  "enum": [
                    "corporation",
                    "llc",
                    "partnership",
                    "unincorporated_business",
                    "international"
                  ]
                },
                "corporation_taxed_as": {
                  "type": "string",
                  "description": "Business, when `business_entity_type` is `corporation`",
                  "enum": [
                    "c_corp",
                    "s_corp"
                  ]
                },
                "llc_taxed_as": {
                  "type": "string",
                  "description": "Business, when `business_entity_type` is `llc`",
                  "enum": [
                    "c_corp",
                    "s_corp",
                    "partnership"
                  ]
                },
                "birth_place": {
                  "type": "string",
                  "description": "Person. The town or city of birth."
                },
                "bank_verification_number": {
                  "type": "string",
                  "description": "Required and write-only. The 11-digit Bank Verification Number. Gravv checks it against the national registry. The API accepts the old name `bvn`, but never both."
                }
              }
            },
            "parties": {
              "type": "array",
              "description": "Business only. The API refuses it for individuals. Declare 1 to 10 people. Each entry is an associated person from the customer record (`id` plus any changes) or a new person with the new-party fields. Leave it out to declare every associated person on the record. Every form asks for names, `date_of_birth`, `email`, `phone_daytime`, `has_ownership`, `has_control` and `is_signer`, and `ownership_percentage` for an owner. The default USD option adds `citizenship_country`, the person's own `residential_address`, and `tax_id_type` and `tax_id_number` for every party: `ssn` for a US citizen, otherwise `tin` (a national tax or identity number) or `utr`, or `999999999` for a person who has none. The USD, EUR and GBP option adds `citizenship_country` and `is_director`, and needs `ownership_percentage` from 1 to 100, and at least 25 for a person with control. The EUR and USD option adds `tax_residence_country` and `residential_address`.",
              "items": {
                "type": "object",
                "description": "A person declared on a business account: an associated person on the customer record by `id`, with any changes, or a new person with the new-party fields.",
                "additionalProperties": true,
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "ID of an associated person on the customer record"
                  },
                  "documents": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "description": "A document. Send `id` to reuse a document already on file, or `content` to upload a new one, never both.",
                      "properties": {
                        "id": {
                          "type": "string",
                          "description": "ID of a document already on file"
                        },
                        "document_type": {
                          "type": "string",
                          "description": "Type of a new document. Required with `content`.",
                          "enum": [
                            "national_id",
                            "passport",
                            "drivers_license",
                            "permanent_resident_card",
                            "employment_authorization",
                            "other",
                            "proof_of_address",
                            "selfie_photo",
                            "tax_form_w8ben",
                            "signed_terms_document",
                            "articles_of_incorporation",
                            "ownership_document",
                            "control_structure",
                            "compliance_document",
                            "tax_id_letter",
                            "bank_statement",
                            "source_of_funds",
                            "denial_explanation_letter",
                            "regulatory_action_explanation"
                          ],
                          "example": "passport"
                        },
                        "document_type_side": {
                          "type": "string",
                          "description": "Which side, for identity documents sent one side at a time",
                          "enum": [
                            "front",
                            "back"
                          ],
                          "default": "front"
                        },
                        "document_subtype": {
                          "type": "string",
                          "description": "Optional subtype"
                        },
                        "content": {
                          "type": "string",
                          "description": "The file as standard or URL-safe base64. JPEG, PNG or PDF, at most 2 MB decoded.",
                          "example": "<base64>"
                        },
                        "filename": {
                          "type": "string",
                          "example": "passport.jpg"
                        },
                        "issuing_country": {
                          "type": "string",
                          "description": "Issuing country as an alpha-2 code. Required for every type except `selfie_photo`.",
                          "example": "GB"
                        },
                        "number": {
                          "type": "string",
                          "description": "Document number. Required for identity documents.",
                          "example": "123456789"
                        },
                        "issued_date": {
                          "type": "string",
                          "description": "Issue date as YYYY-MM-DD. Required for identity documents.",
                          "example": "2020-01-15"
                        },
                        "expiration_date": {
                          "type": "string",
                          "description": "Expiry date as YYYY-MM-DD. Required for identity documents.",
                          "example": "2030-01-14"
                        },
                        "file_path": {
                          "type": "string",
                          "minLength": 1,
                          "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 2 MB, and sends it as content, filling filename when you leave them out. Send file_path or content, not both; with content, send filename yourself."
                        }
                      }
                    }
                  }
                }
              }
            },
            "documents": {
              "type": "array",
              "description": "Root documents. When you send none, Gravv uses the documents on the customer record. A person sends one identity document and a `proof_of_address`. A business sends `articles_of_incorporation`, `ownership_document` and `proof_of_address`, plus `control_structure` on the default USD option and the EUR and USD option. Each party sends an identity document in its own `documents`, and a `proof_of_address` too on the default USD option.",
              "items": {
                "type": "object",
                "description": "A document. Send `id` to reuse a document already on file, or `content` to upload a new one, never both.",
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "ID of a document already on file"
                  },
                  "document_type": {
                    "type": "string",
                    "description": "Type of a new document. Required with `content`.",
                    "enum": [
                      "national_id",
                      "passport",
                      "drivers_license",
                      "permanent_resident_card",
                      "employment_authorization",
                      "other",
                      "proof_of_address",
                      "selfie_photo",
                      "tax_form_w8ben",
                      "signed_terms_document",
                      "articles_of_incorporation",
                      "ownership_document",
                      "control_structure",
                      "compliance_document",
                      "tax_id_letter",
                      "bank_statement",
                      "source_of_funds",
                      "denial_explanation_letter",
                      "regulatory_action_explanation"
                    ],
                    "example": "passport"
                  },
                  "document_type_side": {
                    "type": "string",
                    "description": "Which side, for identity documents sent one side at a time",
                    "enum": [
                      "front",
                      "back"
                    ],
                    "default": "front"
                  },
                  "document_subtype": {
                    "type": "string",
                    "description": "Optional subtype"
                  },
                  "content": {
                    "type": "string",
                    "description": "The file as standard or URL-safe base64. JPEG, PNG or PDF, at most 2 MB decoded.",
                    "example": "<base64>"
                  },
                  "filename": {
                    "type": "string",
                    "example": "passport.jpg"
                  },
                  "issuing_country": {
                    "type": "string",
                    "description": "Issuing country as an alpha-2 code. Required for every type except `selfie_photo`.",
                    "example": "GB"
                  },
                  "number": {
                    "type": "string",
                    "description": "Document number. Required for identity documents.",
                    "example": "123456789"
                  },
                  "issued_date": {
                    "type": "string",
                    "description": "Issue date as YYYY-MM-DD. Required for identity documents.",
                    "example": "2020-01-15"
                  },
                  "expiration_date": {
                    "type": "string",
                    "description": "Expiry date as YYYY-MM-DD. Required for identity documents.",
                    "example": "2030-01-14"
                  },
                  "file_path": {
                    "type": "string",
                    "minLength": 1,
                    "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 2 MB, and sends it as content, filling filename when you leave them out. Send file_path or content, not both; with content, send filename yourself."
                  }
                }
              }
            }
          }
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "currency"
      ],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "customer_type",
      "account_type",
      "currency",
      "category",
      "label",
      "bank_code",
      "network",
      "wallet_id",
      "data"
    ],
    "alsoInBody": [],
    "closedBody": true,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "createCard",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards",
    "description": "Create a card — Issues a virtual or physical card once the customer's application is `approved`. The first card gets the application's ID. Each further card needs a new Idempotency-Key; a customer can hold 10 cards, not counting blocked ones. Gravv sets a PIN for you; read it with `GET /v1/cards/{card_id}/pin`. Fund the card with a transfer whose destination is the card.\n\nPREREQUISITE: listCardApplications shows application_status `approved` for the customer. card_limit is a whole-dollar daily limit above 0. A physical card needs shipping_address. Each further card for the customer is a new call: leave idempotency_key out. The PIN route is not available over MCP.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "card_limit": {
          "type": "number",
          "exclusiveMinimum": 0,
          "description": "Spending limit in whole USD per day. Decimals are dropped.",
          "example": 50
        },
        "card_type": {
          "type": "string",
          "enum": [
            "virtual",
            "physical"
          ]
        },
        "name_on_card": {
          "type": "string",
          "maxLength": 100,
          "example": "Jane Doe"
        },
        "shipping_address": {
          "type": "object",
          "description": "Required for a physical card. `address_line2` is not read.",
          "required": [
            "address_line1",
            "city",
            "postal_code",
            "country_code",
            "phone_number",
            "method"
          ],
          "properties": {
            "address_line1": {
              "type": "string",
              "maxLength": 255,
              "example": "201 Allen St"
            },
            "city": {
              "type": "string",
              "maxLength": 100,
              "example": "New York"
            },
            "state": {
              "type": "string",
              "maxLength": 100,
              "example": "New York"
            },
            "postal_code": {
              "type": "string",
              "description": "Send it as a string, so leading zeros are kept",
              "example": "10002"
            },
            "country_code": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            },
            "phone_number": {
              "type": "string",
              "minLength": 10,
              "maxLength": 20,
              "example": "12125550123"
            },
            "method": {
              "type": "string",
              "enum": [
                "standard",
                "express",
                "international",
                "apc",
                "uspsInternational",
                "overnight"
              ],
              "example": "standard"
            }
          }
        },
        "funding": {
          "type": "object",
          "description": "How the card is funded. `shared` joins a card group and shares its balance; without `card_group_id` it joins the cardholder's default group. `own` gives the card its own balance. Leave it out to use the application's group.",
          "required": [
            "mode"
          ],
          "properties": {
            "mode": {
              "type": "string",
              "enum": [
                "shared",
                "own"
              ]
            },
            "card_group_id": {
              "type": "string",
              "format": "uuid",
              "description": "Only with `shared`"
            },
            "ip_address": {
              "type": "string",
              "description": "Cardholder's IP address, for `own` on some live cards"
            },
            "annual_remuneration": {
              "type": "number",
              "description": "Cardholder's yearly income, for `own` on some live cards"
            }
          }
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "card_limit",
        "card_type",
        "name_on_card"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "card_limit",
      "card_type",
      "name_on_card",
      "shipping_address",
      "funding"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "createCardApplication",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards/applications/new",
    "description": "Create a card application — Opens a card application for a customer whose `basic` KYC is completed, using your active `card` account. In live, apply with `POST /v1/risk/features/activate` and `feature_id: virtual_cards` instead; this route works in sandbox. A second call for the same customer returns the existing application, in the shape of `GET /v1/cards/applications/{application_id}`, and does not check the new body. The response has no `application_status`; read it from `GET /v1/cards/applications`.\n\nPREREQUISITES: the customer's basic KYC is completed (getCustomer), and account_id is your active `card` account (listAccounts with account_type card). In live, use activateFeature with feature_id virtual_cards instead. Poll listCardApplications for application_status, or wait for the cards.application.update webhook.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The cardholder. Their `basic` KYC must be completed. For a business card, an associated person of the business.",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your active account of type `card`",
          "example": "9b40be8d-9d74-4d2a-8897-dea3ef80ad23"
        },
        "annual_remuneration": {
          "type": "number",
          "exclusiveMinimum": 0,
          "description": "Cardholder's yearly income in USD",
          "example": 60000
        },
        "estimated_monthly_limit": {
          "type": "number",
          "exclusiveMinimum": 0,
          "description": "Expected monthly spend in USD, not more than `annual_remuneration`",
          "example": 2000
        },
        "ip_address": {
          "type": "string",
          "description": "The cardholder's IP address",
          "example": "203.0.113.24"
        },
        "type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ],
          "default": "individual"
        },
        "business_customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Required with `type: business`. The business must have completed KYB and have a `business_name`, which is printed on the card."
        },
        "funding": {
          "type": "object",
          "description": "How the card is funded. `shared` joins a card group and shares its balance; without `card_group_id` it joins the cardholder's default group. `own` gives the card its own balance. Leave it out to use the application's group.",
          "required": [
            "mode"
          ],
          "properties": {
            "mode": {
              "type": "string",
              "enum": [
                "shared",
                "own"
              ]
            },
            "card_group_id": {
              "type": "string",
              "format": "uuid",
              "description": "Only with `shared`"
            },
            "ip_address": {
              "type": "string",
              "description": "Cardholder's IP address, for `own` on some live cards"
            },
            "annual_remuneration": {
              "type": "number",
              "description": "Cardholder's yearly income, for `own` on some live cards"
            }
          }
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "account_id",
        "annual_remuneration",
        "estimated_monthly_limit",
        "ip_address"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "account_id",
      "annual_remuneration",
      "estimated_monthly_limit",
      "ip_address",
      "type",
      "business_customer_id",
      "funding"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "createCardPaymentIntent",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections/cards/payment-intents",
    "description": "Create payment intent — Creates a card payment intent. It lasts 24 hours and allows at most 5 charge attempts. Without `card_token`, the response has a `payment_link` for the payer. With `card_token`, Gravv charges the saved card at once. The response is then HTTP 200 whatever the outcome, so check `data.status`.\n\nWithout card_token: returns payment_link (valid 24 h); send the payer there. With card_token: charges the card at once. Check data.status (processing, requires_action or charge_failed); a decline is HTTP 200. The customer needs phone_number and date_of_birth. card_token comes from listSavedCards, not from webhooks. client_reference must be unique across collections and payment intents. MOVES MONEY: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your Gravv customer. The customer record must have a phone number and a date of birth.",
          "example": "f827e428-c497-4b21-8855-99d978909c28"
        },
        "client_customer_id": {
          "type": "string",
          "description": "Your reference for the customer. Saved cards are looked up by this value, so use the same one every time.",
          "example": "merchant-user-123"
        },
        "amount": {
          "type": "string",
          "description": "USD amount in major units, as a string with at most 2 decimal places.",
          "example": "3.50"
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3,
          "example": "USD"
        },
        "country": {
          "type": "string",
          "description": "Alpha-2 country code, stored on the intent. Card availability still uses the customer's address country.",
          "example": "US"
        },
        "client_reference": {
          "type": "string",
          "description": "Your reference. It must be unique across your collections and payment intents.",
          "example": "order-abc-123"
        },
        "card_token": {
          "type": "string",
          "description": "A saved card token from `GET /v1/collections/cards`. When you send it, Gravv charges the card at once.",
          "example": "tokn_80aebb6ea2594a74bc"
        },
        "save_card": {
          "type": "boolean",
          "default": false,
          "description": "When true, asks the checkout to save the card"
        },
        "redirect_url": {
          "type": "string",
          "format": "uri",
          "description": "Where to send the payer after checkout. Gravv adds `payment_intent_id` and `client_reference` to it.",
          "example": "https://example.com/checkout/done"
        },
        "asset": {
          "type": "string",
          "description": "Stablecoin to settle in. If you leave it out, USD settles as USDC.",
          "example": "USDC"
        },
        "network": {
          "type": "string",
          "description": "Settlement network. If you send it, it must match the destination.",
          "enum": [
            "polygon",
            "ethereum",
            "base",
            "stellar",
            "solana",
            "avalanche"
          ],
          "example": "polygon"
        },
        "metadata": {
          "type": "object",
          "description": "Your own data, returned in webhooks for this collection. At most 50 keys. The keys `provider_response`, `internal_transaction_id` and `system_metadata` are reserved. For `bank_transfer`, put the payer's bank account number in `bank_account_number`.",
          "additionalProperties": true,
          "properties": {
            "bank_account_number": {
              "type": "string",
              "description": "The payer's bank account number, for `bank_transfer`",
              "example": "0123456789"
            }
          },
          "example": {
            "order_id": "12345"
          }
        },
        "destination": {
          "oneOf": [
            {
              "title": "Internal destination",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "description": "Type of internal destination",
                  "enum": [
                    "internal_account",
                    "internal_crypto_wallet"
                  ],
                  "example": "internal_crypto_wallet"
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "An account ID for `internal_account`, or a wallet ID for `internal_crypto_wallet`",
                  "example": "88d645b6-6d27-4d20-ae1b-9469343156fa"
                }
              }
            },
            {
              "title": "External crypto wallet",
              "type": "object",
              "required": [
                "destination_type",
                "wallet_address",
                "network"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "external_crypto_wallet"
                  ],
                  "example": "external_crypto_wallet"
                },
                "wallet_address": {
                  "type": "string",
                  "minLength": 26,
                  "description": "Address of the external wallet. Gravv checks only its length, so check that the address is on `network`. Funds sent to a wrong address are lost.",
                  "example": "0x445906a6766927c5da8b2fca0e0db5d7b5565ef8"
                },
                "network": {
                  "type": "string",
                  "description": "Settlement network",
                  "enum": [
                    "polygon",
                    "ethereum",
                    "base",
                    "stellar",
                    "solana",
                    "avalanche"
                  ],
                  "example": "polygon"
                }
              }
            }
          ]
        },
        "source": {
          "type": "object",
          "required": [
            "source_type",
            "methods"
          ],
          "properties": {
            "source_type": {
              "type": "string",
              "enum": [
                "external"
              ],
              "example": "external"
            },
            "methods": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "string",
                "enum": [
                  "card"
                ]
              },
              "example": [
                "card"
              ]
            }
          }
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "client_customer_id",
        "amount",
        "currency",
        "destination",
        "source"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "client_customer_id",
      "amount",
      "currency",
      "country",
      "client_reference",
      "card_token",
      "save_card",
      "redirect_url",
      "asset",
      "network",
      "metadata",
      "destination",
      "source"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "createCollection",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections",
    "description": "Initiate a collection — Starts a bank-transfer collection from a payer. The response carries the payment instructions and bank details. The funds settle in stablecoin to the destination. Bank transfer works in BJ, BW, BF, CM, CI, CG, GA, ML, MW, NG, RW, ZA, TZ, TG, UG and ZM, chosen by the customer's address country.\n\nMOVES MONEY: requires confirm: true. Bank transfer only. The customer must have phone_number and date_of_birth. Countries: BJ BW BF CM CI CG GA ML MW NG RW ZA TZ TG UG ZM; currency must be that country's local currency; pass metadata.bank_account_number. amount is a string with up to 2 decimals. client_reference must be unique across collections and payment intents.\n\nNOT FOR CARD PAYMENTS. Bank transfer only: pix and mobile_money are always rejected, and card payments go through createCardPaymentIntent, which returns the same hosted payment link plus the intent id and card token.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your Gravv customer. The customer record must have a phone number and a date of birth. Its address country decides which methods are available; there is no `country` field.",
          "example": "04dfb2e5-1274-4214-b5fd-3415fde7dc17"
        },
        "client_customer_id": {
          "type": "string",
          "description": "Your own reference for the customer",
          "example": "checkers_user"
        },
        "amount": {
          "type": "string",
          "description": "Amount in major units, as a string with at most 2 decimal places.",
          "example": "50.00"
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3,
          "description": "Three-letter ISO 4217 code in upper case. For `bank_transfer`, use the local currency of the customer's country.",
          "example": "USD"
        },
        "asset": {
          "type": "string",
          "description": "Stablecoin to settle in, such as `USDC` or `USDT`. If you leave it out, USD settles as USDC, and a local currency settles as its tokenized asset where there is one.",
          "example": "USDC"
        },
        "network": {
          "type": "string",
          "description": "Settlement network. If you send it, it must match the destination network.",
          "enum": [
            "polygon",
            "ethereum",
            "base",
            "stellar",
            "solana",
            "avalanche"
          ],
          "example": "polygon"
        },
        "client_reference": {
          "type": "string",
          "description": "Your reference. It must be unique across your collections and payment intents. Gravv generates one if you leave it out.",
          "example": "order-1001"
        },
        "is_anonymous": {
          "type": "boolean",
          "default": false,
          "description": "Applies to the card checkout, which this tool does not offer. Leave it out."
        },
        "save_card": {
          "type": "boolean",
          "default": false,
          "description": "Applies to the card checkout, which this tool does not offer. Leave it out."
        },
        "metadata": {
          "type": "object",
          "description": "Your own data, returned in webhooks for this collection. At most 50 keys. The keys `provider_response`, `internal_transaction_id` and `system_metadata` are reserved. For `bank_transfer`, put the payer's bank account number in `bank_account_number`.",
          "additionalProperties": true,
          "properties": {
            "bank_account_number": {
              "type": "string",
              "description": "The payer's bank account number, for `bank_transfer`",
              "example": "0123456789"
            }
          },
          "example": {
            "order_id": "12345"
          }
        },
        "source": {
          "title": "External source",
          "type": "object",
          "required": [
            "source_type",
            "methods"
          ],
          "properties": {
            "source_type": {
              "type": "string",
              "enum": [
                "external"
              ],
              "example": "external"
            },
            "methods": {
              "type": "array",
              "minItems": 1,
              "description": "Payment methods to offer. This tool takes `bank_transfer` alone: pix and mobile_money are rejected in every country, and card payments go through createCardPaymentIntent. Availability depends on the customer's address country.",
              "items": {
                "type": "string",
                "enum": [
                  "bank_transfer"
                ]
              }
            }
          }
        },
        "destination": {
          "oneOf": [
            {
              "title": "Internal destination",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "description": "Type of internal destination",
                  "enum": [
                    "internal_account",
                    "internal_crypto_wallet"
                  ],
                  "example": "internal_crypto_wallet"
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "An account ID for `internal_account`, or a wallet ID for `internal_crypto_wallet`",
                  "example": "88d645b6-6d27-4d20-ae1b-9469343156fa"
                }
              }
            },
            {
              "title": "External crypto wallet",
              "type": "object",
              "required": [
                "destination_type",
                "wallet_address",
                "network"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "external_crypto_wallet"
                  ],
                  "example": "external_crypto_wallet"
                },
                "wallet_address": {
                  "type": "string",
                  "minLength": 26,
                  "description": "Address of the external wallet. Gravv checks only its length, so check that the address is on `network`. Funds sent to a wrong address are lost.",
                  "example": "0x445906a6766927c5da8b2fca0e0db5d7b5565ef8"
                },
                "network": {
                  "type": "string",
                  "description": "Settlement network",
                  "enum": [
                    "polygon",
                    "ethereum",
                    "base",
                    "stellar",
                    "solana",
                    "avalanche"
                  ],
                  "example": "polygon"
                }
              }
            }
          ]
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "client_customer_id",
        "amount",
        "currency",
        "source",
        "destination"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "client_customer_id",
      "amount",
      "currency",
      "asset",
      "network",
      "client_reference",
      "is_anonymous",
      "save_card",
      "metadata",
      "source",
      "destination"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "createCustomer",
    "toolset": "customers",
    "method": "post",
    "path": "/v1/customers",
    "description": "Create a customer — Creates an individual or business customer. A business is created with its associated persons in the same call, and each person becomes its own customer of type `ubo`. Each new customer gets `basic` and `intermediate` KYC records with status `not_started`, and a `customer.created` webhook. A duplicate email or `external_id` is a 400, not a 409.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "body": {
          "oneOf": [
            {
              "title": "Individual customer",
              "type": "object",
              "required": [
                "first_name",
                "last_name",
                "email",
                "type",
                "gender",
                "date_of_birth",
                "address",
                "phone"
              ],
              "properties": {
                "first_name": {
                  "type": "string",
                  "pattern": "^[A-Za-z\\s'-]+$",
                  "description": "Letters, spaces, apostrophes and hyphens only."
                },
                "middle_name": {
                  "type": "string"
                },
                "last_name": {
                  "type": "string",
                  "pattern": "^[A-Za-z\\s'-]+$",
                  "description": "Letters, spaces, apostrophes and hyphens only."
                },
                "email": {
                  "type": "string",
                  "format": "email",
                  "example": "ada.obi@example.com"
                },
                "phone": {
                  "type": "string",
                  "description": "A valid phone number in international format with a leading `+`, such as `+2348031234567`. Fictional ranges such as +1 555-01xx are rejected.",
                  "example": "+2348031234567"
                },
                "date_of_birth": {
                  "type": "string",
                  "format": "date",
                  "description": "Date of birth as YYYY-MM-DD",
                  "example": "1990-04-16"
                },
                "gender": {
                  "type": "string",
                  "enum": [
                    "male",
                    "female",
                    "other"
                  ],
                  "example": "female"
                },
                "type": {
                  "type": "string",
                  "description": "Lower case only.",
                  "enum": [
                    "individual"
                  ],
                  "example": "individual"
                },
                "external_id": {
                  "type": "string",
                  "description": "Your own reference for the customer. It must be unique in your tenant.",
                  "example": "individual_12345"
                },
                "address": {
                  "type": "object",
                  "required": [
                    "address_line1",
                    "city",
                    "postal_code",
                    "state",
                    "country"
                  ],
                  "properties": {
                    "address_line1": {
                      "type": "string",
                      "example": "12 Admiralty Way"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "maxLength": 100,
                      "example": "Lagos"
                    },
                    "postal_code": {
                      "type": "string",
                      "maxLength": 20,
                      "example": "106104"
                    },
                    "state": {
                      "type": "string",
                      "pattern": "^[A-Z]{2}-[A-Z0-9]{2,3}$",
                      "description": "ISO 3166-2 code, such as `NG-LA` or `US-FL`. It must belong to `country`.",
                      "example": "NG-LA"
                    },
                    "country": {
                      "type": "string",
                      "pattern": "^[A-Z]{2}$",
                      "description": "ISO 3166-1 alpha-2 code in upper case, such as `NG`.",
                      "example": "NG"
                    }
                  }
                }
              }
            },
            {
              "title": "Business customer",
              "type": "object",
              "required": [
                "email",
                "type",
                "business_name",
                "business_description",
                "business_type",
                "business_industry",
                "registration_number",
                "address",
                "phone",
                "associated_persons"
              ],
              "properties": {
                "email": {
                  "type": "string",
                  "format": "email",
                  "description": "Business contact email. It must use a company domain. Free email domains, such as gmail.com, are rejected.",
                  "example": "ops@acmecorp.com"
                },
                "type": {
                  "type": "string",
                  "description": "Lower case only.",
                  "enum": [
                    "business"
                  ],
                  "example": "business"
                },
                "business_name": {
                  "type": "string",
                  "pattern": "^[A-Za-z0-9\\s'&,.()-]+$",
                  "description": "Registered business name. Letters, digits, spaces and `' & , . ( ) -` only.",
                  "example": "Acme Corporation"
                },
                "phone": {
                  "type": "string",
                  "description": "A valid phone number in international format with a leading `+`, such as `+2348031234567`. Fictional ranges such as +1 555-01xx are rejected.",
                  "example": "+2348031234567"
                },
                "business_description": {
                  "type": "string",
                  "description": "Short description of what the business does",
                  "example": "Payments software"
                },
                "business_type": {
                  "type": "string",
                  "description": "Type of business entity",
                  "example": "private_limited",
                  "maxLength": 100
                },
                "business_industry": {
                  "type": "string",
                  "description": "Industry of the business. An exact match of one of these sets `industry_code`: Agriculture, Forestry, Fishing and Hunting; Mining, Quarrying, and Oil and Gas Extraction; Utilities; Construction; Manufacturing; Wholesale Trade; Retail Trade; Transportation and Warehousing; Information. Any other value gives `999999`.",
                  "example": "Information",
                  "maxLength": 150
                },
                "registration_number": {
                  "type": "string",
                  "description": "Business registration number",
                  "example": "RC-987654",
                  "maxLength": 100
                },
                "external_id": {
                  "type": "string",
                  "description": "Your own reference for the customer. It must be unique in your tenant.",
                  "example": "business_12345"
                },
                "address": {
                  "type": "object",
                  "required": [
                    "address_line1",
                    "city",
                    "postal_code",
                    "state",
                    "country"
                  ],
                  "properties": {
                    "address_line1": {
                      "type": "string",
                      "example": "12 Admiralty Way"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "maxLength": 100,
                      "example": "Lagos"
                    },
                    "postal_code": {
                      "type": "string",
                      "maxLength": 20,
                      "example": "106104"
                    },
                    "state": {
                      "type": "string",
                      "pattern": "^[A-Z]{2}-[A-Z0-9]{2,3}$",
                      "description": "ISO 3166-2 code, such as `NG-LA` or `US-FL`. It must belong to `country`.",
                      "example": "NG-LA"
                    },
                    "country": {
                      "type": "string",
                      "pattern": "^[A-Z]{2}$",
                      "description": "ISO 3166-1 alpha-2 code in upper case, such as `NG`.",
                      "example": "NG"
                    }
                  }
                },
                "associated_persons": {
                  "type": "array",
                  "minItems": 1,
                  "description": "Directors and owners of the business. Each becomes its own customer of type `ubo` and must complete KYC before the business can. Each email must be unique and differ from the business email.",
                  "items": {
                    "type": "object",
                    "required": [
                      "first_name",
                      "last_name",
                      "email",
                      "date_of_birth",
                      "gender",
                      "address"
                    ],
                    "properties": {
                      "first_name": {
                        "type": "string",
                        "pattern": "^[A-Za-z\\s'-]+$",
                        "description": "Letters, spaces, apostrophes and hyphens only."
                      },
                      "middle_name": {
                        "type": "string",
                        "example": "A."
                      },
                      "last_name": {
                        "type": "string",
                        "pattern": "^[A-Za-z\\s'-]+$",
                        "description": "Letters, spaces, apostrophes and hyphens only."
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "example": "jane.doe@acmecorp.com"
                      },
                      "date_of_birth": {
                        "type": "string",
                        "format": "date",
                        "example": "1990-06-15"
                      },
                      "gender": {
                        "type": "string",
                        "enum": [
                          "male",
                          "female",
                          "other"
                        ],
                        "example": "female"
                      },
                      "phone": {
                        "type": "string",
                        "description": "A valid phone number in international format with a leading `+`, such as `+2348031234567`. Fictional ranges such as +1 555-01xx are rejected.",
                        "example": "+2348031234567"
                      },
                      "address": {
                        "type": "object",
                        "required": [
                          "address_line1",
                          "city",
                          "postal_code",
                          "state",
                          "country"
                        ],
                        "properties": {
                          "address_line1": {
                            "type": "string",
                            "example": "12 Admiralty Way"
                          },
                          "address_line2": {
                            "type": "string",
                            "example": "Suite 202"
                          },
                          "city": {
                            "type": "string",
                            "maxLength": 100,
                            "example": "Lagos"
                          },
                          "postal_code": {
                            "type": "string",
                            "maxLength": 20,
                            "example": "106104"
                          },
                          "state": {
                            "type": "string",
                            "pattern": "^[A-Z]{2}-[A-Z0-9]{2,3}$",
                            "description": "ISO 3166-2 code, such as `NG-LA` or `US-FL`. It must belong to `country`.",
                            "example": "NG-LA"
                          },
                          "country": {
                            "type": "string",
                            "pattern": "^[A-Z]{2}$",
                            "description": "ISO 3166-1 alpha-2 code in upper case, such as `NG`.",
                            "example": "NG"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          "description": "Request body. Choose exactly one shape: Individual customer | Business customer. "
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "body"
      ],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "wrapped",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "customers.yaml"
  },
  {
    "name": "createExternalAccount",
    "toolset": "external-accounts",
    "method": "post",
    "path": "/v1/external-accounts",
    "description": "Add an external account — Adds a bank account or mobile wallet that a customer pays out to. Use `GET /v1/external-accounts/institutions` for `institution_id`, and `POST /v1/external-accounts/verify` to check the holder's name first. `bank_account` and `mobile_money` return 200 with status `active`. `swift`, `sepa`, `ach_wire` and `fps` return 202 with status `pending` while setup runs. Get the account until it is `active` or `setup_failed`, or wait for the `external_account.active` or `external_account.setup_failed` webhook. A duplicate (same customer, holder name, and account and bank) is a 400 with code `ERROR_CODE_DUPLICATE_PAYEE` and the existing `payee_id`. Deleted and failed accounts count as duplicates.\n\nReturns 202 with status `pending` for swift, sepa, ach_wire and fps: poll getExternalAccount until status is `active` (usable) or `setup_failed` (terminal). Returns 200 with status `active` for bank_account and mobile_money. Do not call createTransfer until the status is `active`. A duplicate returns 400 ERROR_CODE_DUPLICATE_PAYEE with data.payee_id: reuse that id. Look first with listExternalAccounts (customer_id, search): the duplicate check can miss one. For a local bank or mobile money payee, take institution_id from listExternalAccountInstitutions. ach_wire needs payment_rail (ach, wire or rtp).\n\nThe body takes one of these shapes. African bank account (NGN, GHS, KES, XOF, XAF): nothing more is required. Moroccan bank account (MAD): also requires institution_id. Mexican bank account (MXN): nothing more is required. Brazilian account (BRL): nothing more is required. Colombian bank account (COP): nothing more is required. Indian bank account (INR): nothing more is required. Hong Kong bank account (HKD): nothing more is required. Bank account in another currency: nothing more is required. Mobile money wallet: also requires phone_number. US bank account (ACH, wire, RTP): also requires account_number, routing_number, payment_rail, account_owner_type, bank_name, address. SWIFT (USD): also requires account_number, bic, account_owner_type, address, bank_address_line_1, bank_city, bank_state, bank_postal_code, bank_country. SEPA (EUR): also requires iban, account_owner_type, bank_name, address. Faster Payments (GBP): also requires account_number, routing_number, account_owner_type, bank_name, address.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "payee_type": {
          "type": "string",
          "description": "Leave it out to detect the type from the fields you send.",
          "enum": [
            "bank_account",
            "mobile_money",
            "ach_wire",
            "swift",
            "sepa",
            "fps"
          ],
          "example": "bank_account"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The customer who owns this external account",
          "example": "3130ca8b-8b32-4843-8623-bf83e766b86a"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code of the currency paid out",
          "example": "NGN"
        },
        "account_name": {
          "type": "string",
          "description": "Account holder's name. Unaccented letters, spaces and `' - . , & / ( )` only, starting with a letter, with no digits. It comes back in upper case, and may be replaced by the name the bank holds.",
          "example": "Jane Doe"
        },
        "account_number": {
          "type": "string",
          "description": "Letters and digits, with no spaces. Each country has its own rule: 10 digits in Nigeria (NUBAN), 10 to 16 digits in Ghana, 8 to 20 characters in Kenya, 24 characters in the WAEMU zone (the RIB) and 23 digits in the CEMAC zone. Needed to pay this payee.",
          "example": "0123456789"
        },
        "institution_id": {
          "type": "string",
          "format": "uuid",
          "description": "An `id` from `GET /v1/external-accounts/institutions`. Gravv saves a payee without one, but cannot pay it."
        },
        "institution_country_iso_code": {
          "type": "string",
          "description": "Bank country as an alpha-2 code. It picks the account number rule. Defaults to the institution's country.",
          "example": "NG"
        },
        "account_owner_type": {
          "type": "string",
          "description": "`individual` for a person, `business` for a company",
          "enum": [
            "individual",
            "business"
          ]
        },
        "address": {
          "type": "object",
          "description": "The account holder's address. Required for `swift`, `sepa`, `ach_wire` and `fps`, and for some banks and payout corridors.",
          "properties": {
            "address_line1": {
              "type": "string",
              "minLength": 4,
              "maxLength": 34,
              "example": "350 Fifth Avenue"
            },
            "address_line2": {
              "type": "string",
              "maxLength": 35
            },
            "house_building_number": {
              "type": "string",
              "maxLength": 35
            },
            "city": {
              "type": "string",
              "maxLength": 35,
              "example": "New York"
            },
            "state": {
              "type": "string",
              "maxLength": 35,
              "example": "NY"
            },
            "postal_code": {
              "type": "string",
              "description": "Checked against the country's postal code format",
              "example": "10118"
            },
            "country": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            }
          }
        },
        "internal_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your account that pays this external account"
        },
        "iban": {
          "type": "string",
          "description": "IBAN, for a bank whose `account_number_type` is `iban`. Gravv checks it with mod 97."
        },
        "national_id": {
          "type": "string",
          "maxLength": 64,
          "description": "The holder's CURP or RFC. Send it with `national_id_type`. Needed to pay this payee.",
          "example": "GODE561231HDFRRN09"
        },
        "national_id_type": {
          "type": "string",
          "description": "A Mexican payee takes `CURP` or `RFC` only.",
          "enum": [
            "CURP",
            "RFC",
            "CPF",
            "CNPJ",
            "CC",
            "NIT"
          ],
          "example": "CURP"
        },
        "pix_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 77,
          "description": "PIX key, with no spaces. Needed to pay this payee.",
          "example": "maria.souza@example.com"
        },
        "bank_account_type": {
          "type": "string",
          "description": "Needed to pay this payee",
          "enum": [
            "checking",
            "savings"
          ]
        },
        "routing_number": {
          "type": "string",
          "description": "The IFSC. Needed to pay this payee.",
          "example": "HDFC0000123"
        },
        "bank_name": {
          "type": "string",
          "description": "The bank's name, used when you send no `institution_id`"
        },
        "phone_number": {
          "type": "string",
          "description": "Mobile money number with the country code",
          "example": "+256772123456"
        },
        "payment_rail": {
          "type": "string",
          "description": "There is no default. `wire` needs a routing number that takes wires, and `rtp` one that takes instant payments. Check it first with `GET /v1/external-accounts/routing-numbers/{routing_number}/wire` or `/rtp`.",
          "enum": [
            "ach",
            "wire",
            "rtp"
          ],
          "example": "wire"
        },
        "bic": {
          "type": "string",
          "description": "BIC of 8 or 11 characters. The bank must be in the SWIFT directory. Gravv fills in its `institution_id` and `bank_name` for you.",
          "example": "DEUTDEFF"
        },
        "bank_address_line_1": {
          "type": "string",
          "description": "The bank's street address"
        },
        "bank_city": {
          "type": "string"
        },
        "bank_state": {
          "type": "string"
        },
        "bank_postal_code": {
          "type": "string",
          "description": "Checked against `bank_country`"
        },
        "bank_country": {
          "type": "string",
          "description": "The bank's country as an alpha-2 code"
        },
        "intermediary_financial_institution": {
          "type": "string",
          "description": "Optional intermediary bank. Send all the intermediary fields or none. Only `intermediary_bank_address2` is optional."
        },
        "intermediary_bank_routing_number": {
          "type": "string"
        },
        "intermediary_bank_address1": {
          "type": "string"
        },
        "intermediary_bank_address2": {
          "type": "string"
        },
        "intermediary_bank_city": {
          "type": "string"
        },
        "intermediary_bank_state": {
          "type": "string"
        },
        "intermediary_bank_zip_code": {
          "type": "string"
        },
        "intermediary_bank_country": {
          "type": "string"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "currency",
        "account_name"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "payee_type",
      "customer_id",
      "currency",
      "account_name",
      "account_number",
      "institution_id",
      "institution_country_iso_code",
      "account_owner_type",
      "address",
      "internal_account_id",
      "iban",
      "national_id",
      "national_id_type",
      "pix_key",
      "bank_account_type",
      "routing_number",
      "bank_name",
      "phone_number",
      "payment_rail",
      "bic",
      "bank_address_line_1",
      "bank_city",
      "bank_state",
      "bank_postal_code",
      "bank_country",
      "intermediary_financial_institution",
      "intermediary_bank_routing_number",
      "intermediary_bank_address1",
      "intermediary_bank_address2",
      "intermediary_bank_city",
      "intermediary_bank_state",
      "intermediary_bank_zip_code",
      "intermediary_bank_country"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "createFxOrder",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/orders",
    "description": "Create an order — Trades a quote. With an API key there is no approval step. The order starts as `pending` and Gravv debits the source at once. Then get the order until it is `completed` or `cancelled`. FX orders send no webhooks. If the error is `order source could not be charged`, an order may still exist; list your orders before you retry with a new quote.\n\nPREREQUISITE: a fresh getFxQuote (about 5 minutes). Over an API key the order is created `pending` and the source is debited at once. There is no approval step and no second user; `waiting_approval` is only for orders placed in the Dashboard. MOVES MONEY: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "quote_id": {
          "type": "string",
          "description": "A quote from `POST /v1/fx/quote` that has not expired or been used",
          "example": "GRVOTC_3F9A1C"
        },
        "source": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "description": "`internal_account` or `internal_crypto_wallet`. For a destination, `external_account` means a settlement instruction, not a customer's external account.",
              "enum": [
                "internal_account",
                "internal_crypto_wallet",
                "external_account"
              ]
            },
            "id": {
              "type": "string",
              "description": "ID of your account, crypto wallet or settlement instruction"
            }
          },
          "required": [
            "type",
            "id"
          ],
          "description": "Your account or crypto wallet that pays the sold amount. It must hold at least `from_amount` in the FROM currency. It cannot be `external_account`."
        },
        "destination": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "description": "`internal_account` or `internal_crypto_wallet`. For a destination, `external_account` means a settlement instruction, not a customer's external account.",
              "enum": [
                "internal_account",
                "internal_crypto_wallet",
                "external_account"
              ]
            },
            "id": {
              "type": "string",
              "description": "ID of your account, crypto wallet or settlement instruction"
            }
          },
          "required": [
            "type",
            "id"
          ],
          "description": "Where the bought amount goes. It is your account or crypto wallet, or an active settlement instruction (`external_account`) in the TO currency."
        },
        "transaction_id": {
          "type": "string",
          "format": "uuid",
          "description": "Optional ID to give the order. It becomes `order_id`."
        },
        "client_reference": {
          "type": "string",
          "description": "Your reference. It does not have to be unique.",
          "example": "inv-2026-1042"
        },
        "metadata": {
          "type": "object",
          "description": "Your data, returned on the order",
          "additionalProperties": true
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "quote_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "quote_id",
      "source",
      "destination",
      "transaction_id",
      "client_reference",
      "metadata"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "createSettlementInstruction",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/settlement-instructions",
    "description": "Create a settlement instruction — Saves one of your own bank accounts or crypto wallets to receive FX order proceeds. Pass its `id` as the order destination with type `external_account`. Its currency must match the currency the order buys. Gravv does not check the details with a bank or check for duplicates.\n\nThese are your own payout destinations for createFxOrder proceeds: pass the returned id as the order destination {type: external_account, id}. This server sends currency in upper case. There is no duplicate check, so list first with listSettlementInstructions.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "instruction_type": {
          "type": "string",
          "description": "Send it in lower case, exactly as listed",
          "enum": [
            "bank_account",
            "crypto_wallet"
          ],
          "example": "bank_account"
        },
        "account_name": {
          "type": "string",
          "description": "Name on the account or wallet",
          "example": "Acme Treasury LLC"
        },
        "currency": {
          "type": "string",
          "description": "Currency this destination receives, such as `USD` or `USDC`. Gravv stores it as sent and filters match it exactly, so always send upper case.",
          "example": "USD"
        },
        "is_default": {
          "type": "boolean",
          "default": false,
          "description": "Makes this the default for its currency and unsets the old default."
        },
        "account_number": {
          "type": "string",
          "description": "Required for `bank_account`",
          "example": "000987654321"
        },
        "bank_name": {
          "type": "string",
          "description": "Required for `bank_account`",
          "example": "Example Bank"
        },
        "bank_code": {
          "type": "string"
        },
        "routing_number": {
          "type": "string",
          "example": "026009593"
        },
        "swift_code": {
          "type": "string"
        },
        "iban": {
          "type": "string"
        },
        "country": {
          "type": "string",
          "example": "US"
        },
        "address": {
          "type": "object",
          "description": "The bank's address, stored as sent",
          "additionalProperties": true
        },
        "wallet_address": {
          "type": "string",
          "description": "Required for `crypto_wallet`. Gravv does not check its format, so check it yourself."
        },
        "network": {
          "type": "string",
          "description": "Required for `crypto_wallet`, such as `polygon` or `stellar`. Send lower case.",
          "example": "polygon"
        },
        "memo": {
          "type": "string",
          "description": "Required when `network` is `stellar`"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "instruction_type",
        "account_name",
        "currency"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "instruction_type",
      "account_name",
      "currency",
      "is_default",
      "account_number",
      "bank_name",
      "bank_code",
      "routing_number",
      "swift_code",
      "iban",
      "country",
      "address",
      "wallet_address",
      "network",
      "memo"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "settlement-instructions.yaml"
  },
  {
    "name": "createTransfer",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer",
    "description": "Create a transfer — Sends money from a customer's account, crypto wallet, card or savings to an account, crypto wallet, crypto address, card, savings or external account. The call returns once the transfer is recorded; it then runs in the background. Follow it with `GET /v1/transactions/{transaction_id}` or the `transfer.status.*` webhooks. A 200 can still be `transfer_status: paused`. Read `requirements`, upload documents with `POST /v1/transfer/documents` if asked, then call `POST /v1/transfer/{id}/resume`. Put `rail` inside `destination`. Send at most 2 decimal places. Most errors are a 400 with no code.\n\nPREREQUISITES: (1) the source account must be funded — check getAccountV2 for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). Before a large payout, getCustomerLimits (or getRemitterLimits for a named sender) shows what is left. A 200 with `transfer_status: paused` is not a failure: read `requirements`, upload any requested document with uploadTransferDocument, then call resumeTransfer. Send a client_reference, so that a resend is recognised, and amount as a string. For SWIFT, upload the invoice with uploadTransferDocument first and pass supporting_document_ids. SAVINGS: to save, source {source_type: internal_account, id: <savings account id>} and destination {destination_type: savings, id: <the same id>}; to withdraw, swap them (source_type savings, destination_type internal_account). USDC only, at most 2 decimals, no documents, no fee; a withdrawal cannot exceed getSavings saved_balance, and in live a save must be at least 1. transfer.savings.awaiting_liquidity on a withdrawal is not a failure: transfer.status.completed follows. In sandbox the cents choose the outcome: a save ending .13 fails, a withdrawal ending .13 waits about 2 minutes then completes, one ending .14 fails. MOVES MONEY: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": "object",
          "required": [
            "source_type",
            "id"
          ],
          "properties": {
            "source_type": {
              "type": "string",
              "description": "A `card` source can only be withdrawn to its own card account. A `savings` source withdraws from savings: send the savings account id, and the same id as an `internal_account` destination.",
              "enum": [
                "internal_account",
                "internal_crypto_wallet",
                "card",
                "savings"
              ]
            },
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of the account, crypto wallet, card or savings account (UUID version 4)",
              "example": "b9c2cb0d-e09a-496f-8655-d8c4b7aaf2f8"
            },
            "currency": {
              "type": "string",
              "description": "Accepted but ignored. The transfer uses the source's own currency.",
              "enum": [
                "USD",
                "EUR",
                "GBP"
              ]
            },
            "crypto_asset": {
              "type": "string",
              "description": "Asset sent, such as `USDC` or `USDT`. Defaults to the network's usual asset.",
              "example": "USDC"
            }
          }
        },
        "destination": {
          "oneOf": [
            {
              "title": "External account",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "external_account"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "An `active` external account"
                },
                "rail": {
                  "type": "string",
                  "description": "Payout rail. `ach`, `wire` and `rtp` are US domestic rails; `wire` is not an international wire. Leave it out, or send `globalbank`, for local bank and mobile money payouts.",
                  "enum": [
                    "ach",
                    "wire",
                    "rtp",
                    "sepa",
                    "swift",
                    "fps",
                    "globalbank"
                  ],
                  "example": "ach"
                }
              }
            },
            {
              "title": "Internal account",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "internal_account"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "An active account. For a `card` source, its own card account."
                }
              }
            },
            {
              "title": "Internal crypto wallet",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "internal_crypto_wallet"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "crypto_asset": {
                  "type": "string",
                  "description": "Asset received. Between two wallets of the same customer, `USDT` to `USDC` or back converts the asset.",
                  "enum": [
                    "USDC",
                    "USDT"
                  ]
                }
              }
            },
            {
              "title": "Crypto address",
              "type": "object",
              "required": [
                "destination_type",
                "wallet_address",
                "blockchain_network"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "crypto_wallet"
                  ]
                },
                "wallet_address": {
                  "type": "string",
                  "example": "0x25a4c9853e761753ae18d6871731e305b8b0b2a4"
                },
                "blockchain_network": {
                  "type": "string",
                  "description": "Must match the source's network, except for USDC moved between networks",
                  "enum": [
                    "avalanche",
                    "ethereum",
                    "polygon",
                    "solana",
                    "stellar",
                    "tron",
                    "sui",
                    "base"
                  ],
                  "example": "polygon"
                },
                "blockchain_memo": {
                  "type": "string",
                  "description": "Memo for addresses that need one, such as some stellar exchange addresses"
                }
              }
            },
            {
              "title": "Card",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "card"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "ID of the card to fund"
                }
              }
            },
            {
              "title": "Savings",
              "type": "object",
              "required": [
                "destination_type",
                "id"
              ],
              "properties": {
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "savings"
                  ]
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "The savings account id. The source is the same id as an `internal_account`. See [Save and withdraw](/platform/savings/save-and-withdraw)."
                }
              }
            }
          ]
        },
        "amount": {
          "type": "string",
          "description": "Positive amount in major units of the source currency, with at most 2 decimal places. Send it as a string; a number is accepted but can lose precision.",
          "example": "250.00"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The customer sending the transfer (UUID version 4)",
          "example": "bb6c6022-f1d8-492f-80f0-7547134bb42f"
        },
        "description": {
          "type": "string",
          "description": "Optional note for your records",
          "example": "Invoice 114"
        },
        "client_reference": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100,
          "description": "Your unique reference. On tenants whose limits are enforced, a reused reference returns the first transfer, or a 409 when the request differs. Send it so that a retry does not pay out twice.",
          "example": "inv-114"
        },
        "client_metadata": {
          "type": "string",
          "maxLength": 4096,
          "description": "Your data, often JSON text, returned on the transaction"
        },
        "payment_rail_reference": {
          "type": "string",
          "maxLength": 140,
          "description": "Note the receiving bank shows the payee. Plain ASCII, at most 140 characters. ACH allows 10 letters, digits or spaces. A US wire allows 35 letters, digits, spaces and / - ? : ( ) . , ' +. Other rails ignore it.",
          "example": "INV 114"
        },
        "supporting_document_ids": {
          "type": "array",
          "maxItems": 5,
          "description": "Up to 5 IDs from `POST /v1/transfer/documents` for this customer, each unused. Needed when a payout requires a document; otherwise the transfer pauses for one.",
          "items": {
            "type": "string",
            "format": "uuid"
          }
        },
        "additional_information": {
          "type": "object",
          "description": "Sender details. Some payout routes need them; without them the transfer pauses with `sender_details_required`.",
          "properties": {
            "remitter_full_name": {
              "type": "string",
              "example": "John Doe"
            },
            "remitter_country": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            },
            "remitter_document_number": {
              "type": "string",
              "example": "A123456789"
            },
            "remitter_document_issue_date": {
              "type": "string",
              "description": "YYYY-MM-DD",
              "example": "2020-01-15"
            },
            "remitter_document_expiry_date": {
              "type": "string",
              "description": "YYYY-MM-DD",
              "example": "2030-01-15"
            },
            "remitter_date_of_birth": {
              "type": "string",
              "description": "YYYY-MM-DD, not in the future",
              "example": "1990-06-25"
            },
            "remitter_nationality": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            },
            "remitter_address": {
              "type": "object",
              "properties": {
                "address_line1": {
                  "type": "string",
                  "example": "123 Main Street"
                },
                "city": {
                  "type": "string",
                  "example": "New York"
                },
                "state": {
                  "type": "string",
                  "example": "NY"
                },
                "postal_code": {
                  "type": "string",
                  "example": "10001"
                },
                "country": {
                  "type": "string",
                  "example": "US"
                }
              }
            },
            "remitter_verification": {
              "type": "object",
              "description": "Your record of how you verified the sender. When your limits policy uses attested tiers, the transfer counts against this remitter instead of the customer.",
              "properties": {
                "remitter_id": {
                  "type": "string",
                  "description": "Your ID for the sender",
                  "example": "rem_8842"
                },
                "level": {
                  "type": "string",
                  "example": "enhanced"
                },
                "provider": {
                  "type": "string",
                  "description": "Who verified the sender"
                },
                "provider_reference": {
                  "type": "string"
                },
                "verified_at": {
                  "type": "string",
                  "format": "date-time"
                },
                "screening": {
                  "type": "object",
                  "description": "Each value must be `clear`",
                  "properties": {
                    "sanctions": {
                      "type": "string",
                      "example": "clear"
                    },
                    "pep": {
                      "type": "string",
                      "example": "clear"
                    },
                    "adverse_media": {
                      "type": "string",
                      "example": "clear"
                    }
                  }
                }
              }
            }
          }
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "source",
        "destination",
        "amount",
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "source",
      "destination",
      "amount",
      "customer_id",
      "description",
      "client_reference",
      "client_metadata",
      "payment_rail_reference",
      "supporting_document_ids",
      "additional_information"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "createWallet",
    "toolset": "wallets",
    "method": "post",
    "path": "/v1/wallets",
    "description": "Create a wallet — Creates a blockchain wallet for a customer on one network. The call is synchronous: the response has the address. Every call creates a new wallet with a new address, even for the same customer and network. A Stellar wallet finishes its trustline setup in the background, so it can take a short time before it can hold USDC.\n\nSYNCHRONOUS: the response carries the wallet address. Each call creates a NEW wallet, so do not call it again to check on a wallet; use getWallet or listWallets. network is one of polygon, ethereum, avalanche, stellar or solana. Only Stellar wallets finish their trustline setup in the background.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to create the wallet for. Gravv does not check that the customer exists, so check the ID before you send it.",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "name": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 255,
          "description": "Optional name for the wallet",
          "example": "my wallet"
        },
        "network": {
          "type": "string",
          "description": "Blockchain network, in lower case",
          "enum": [
            "polygon",
            "ethereum",
            "avalanche",
            "stellar",
            "solana"
          ],
          "example": "stellar"
        },
        "wallet_type": {
          "type": "string",
          "description": "Wallet type. A tenant can have one `master` wallet on each network.",
          "enum": [
            "customer",
            "master"
          ],
          "default": "customer",
          "example": "customer"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "network"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "name",
      "network",
      "wallet_type"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "deleteSavedCard",
    "toolset": "collections",
    "method": "delete",
    "path": "/v1/collections/cards/{card_id}",
    "description": "Delete saved card — Removes a saved card. Send the owner's `customer_id` and the `card_token` in the body. Gravv deletes the card that `card_token` names, not the one in the path. A request without a body fails with `EOF`. A token that matches no active card returns `card already deleted`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "description": "The saved card `id`. It does not choose the card."
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The card owner's customer ID",
          "example": "f827e428-c497-4b21-8855-99d978909c28"
        },
        "card_token": {
          "type": "string",
          "description": "Token of the card to delete",
          "example": "tokn_80aebb6ea2594a74bc"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        }
      },
      "required": [
        "card_id",
        "customer_id",
        "card_token"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "card_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "card_token"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": true,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "deleteSettlementInstruction",
    "toolset": "fx",
    "method": "delete",
    "path": "/v1/settlement-instructions/{id}",
    "description": "Delete a settlement instruction — Retires a settlement instruction. You can no longer read or use it, and you cannot restore it. Orders that used it keep its ID. Deleting the default leaves its currency with no default.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the settlement instruction"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": true,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "settlement-instructions.yaml"
  },
  {
    "name": "downloadCustomerKycDocument",
    "toolset": "kyc",
    "method": "get",
    "path": "/v1/customers/{customer_id}/kyc/documents/{document_id}/download",
    "description": "Download a KYC document — Returns one side of a stored document as a data URI. Get the `document_id` from the documents list. A two-sided card is two documents. Read the back image of the `BACK_SIDE` document with `side=back`. Responses can be large, up to about 13 MB. A scoped API key needs the `customer:update` permission.\n\nThis server saves the image to a local file (GRAVV_DOWNLOAD_DIR or --download-dir; by default a gravv-mcp-downloads folder in the system temp folder) and returns saved_to with its type and size, never the image itself. Get document_id from getCustomerKycDocuments. Documents uploaded through card KYC (uploadCardholderKycDocument) cannot be downloaded yet: the call fails with a 500.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the customer"
        },
        "document_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the KYC document, from the documents list"
        },
        "side": {
          "type": "string",
          "enum": [
            "front",
            "back"
          ],
          "description": "Which image to return"
        }
      },
      "required": [
        "customer_id",
        "document_id",
        "side"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "customer_id",
      "document_id"
    ],
    "queryParams": [
      "side"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "exportTransactions",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/export",
    "description": "Export transactions — Returns the 10 newest matching transactions as a base64 file. For more rows, page through `GET /v1/transactions`. CSV columns are id, date_created, amount, currency, direction, transaction_type, status, channel, description, fee, reference, tx_hash, sending_account_id, receiving_account_id, client_reference, balance_before and balance_after.\n\nReturns at most the 10 newest matching rows (a known bug). For more, use listTransactions with paging. Dates are YYYY-MM-DD; export_format is csv or json, lower case.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Transactions that send from or receive into this account"
        },
        "card_id": {
          "type": "string",
          "format": "uuid"
        },
        "tx_hash": {
          "type": "string",
          "description": "Exact blockchain transaction hash"
        },
        "wallet_address": {
          "type": "string",
          "description": "Sending or receiving wallet address, not case-sensitive"
        },
        "channel": {
          "type": "string",
          "description": "One or more channels, comma-separated, such as `ach,wire`. See the `channel` values on the transaction. An unknown value returns nothing."
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ]
        },
        "status": {
          "type": "string",
          "description": "One or more of `pending`, `completed`, `failed`, `waiting_approval` and `paused`, comma-separated"
        },
        "transaction_type": {
          "type": "string",
          "description": "One or more transaction types, comma-separated. See the `transaction_type` values on the transaction. An unknown value returns nothing."
        },
        "start_date": {
          "type": "string",
          "format": "date",
          "description": "First day, as YYYY-MM-DD. The API ignores other formats."
        },
        "end_date": {
          "type": "string",
          "format": "date",
          "description": "Last day, included, as YYYY-MM-DD. The API ignores other formats."
        },
        "export_format": {
          "type": "string",
          "enum": [
            "csv",
            "json"
          ],
          "default": "json",
          "description": "Send it in lower case"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "account_id",
      "card_id",
      "tx_hash",
      "wallet_address",
      "channel",
      "direction",
      "status",
      "transaction_type",
      "start_date",
      "end_date",
      "export_format"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getAccount",
    "toolset": "accounts",
    "method": "get",
    "path": "/v1/accounts/{account_id}",
    "description": "Get your card account — Returns one account with its deposit details, balance and assets. Poll it after you create an account until `status` is `active`. Deposit details appear only then. An unknown ID returns a 400 with `internal account not found`.\n\nONLY for your business's one card account: poll it after createAccount until `active`. For every other account, use getAccountV2.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "account_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "account_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "card-account.yaml"
  },
  {
    "name": "getAccountApplicationV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/applications/{application_id}",
    "description": "Get an account application — Returns one application with what it waits for. Act on `status_reason`. Upload `required_documents` or send `required_fields` with the update, or send the customer to `required_action_url` for terms or verification. Use `status`, not the deprecated `provisioning` object.\n\nRead before updateAccountApplicationV2. An unknown id is a 404 `Resource not found`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the account application. Read it from the account (`application_id`) or from the application webhooks."
        }
      },
      "required": [
        "application_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "application_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "getAccountCapabilities",
    "toolset": "accounts",
    "method": "get",
    "path": "/v1/accounts/capabilities",
    "description": "Get account capabilities — Lists the accounts a customer can open from their country: bank, currency, account types, token wallets, rails and the per-customer limit. Call it before you create an account. Send `customer_id`, or `country` with `customer_type`. If you send `customer_id` without `customer_type`, the response lists options for both types. The accepted query parameters are `customer_id`, `country`, `subdivision`, `customer_type`, `currency` and `account_type`. The route is under `/v1`, but it is the first step of a v2 account. The API rejects unknown query parameters.\n\nCall first, before getAccountRequirements and createAccountV2. Always send customer_type, also with customer_id: without it options for both types come back. Pass the chosen bank_code, currency and account_type on.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Customer to check. Their profile address gives the country when you do not send `country`."
        },
        "country": {
          "type": "string",
          "description": "Residence country as an ISO 3166-1 alpha-2 or alpha-3 code"
        },
        "subdivision": {
          "type": "string",
          "description": "Residence state, such as `US-NY` or `NY`"
        },
        "customer_type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ],
          "description": "Customer type to list options for"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code to filter by"
        },
        "account_type": {
          "type": "string",
          "enum": [
            "operating",
            "regular",
            "card",
            "default"
          ],
          "description": "Keeps only the options that offer this account type. With `card` or `default`, each option reports `max_accounts_per_customer` 1."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "country",
      "subdivision",
      "customer_type",
      "currency",
      "account_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "getAccountRequirements",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/requirements",
    "description": "Get account requirements — Returns the form that create checks for one bank, currency and customer type: fields, documents, party rules and token networks. Send `customer_id` to see the values already on file, and `country` so that this call chooses the same bank as create. A field is needed only when `required` is true and its `applies_when` and `required_when` conditions hold. When `has_existing_ref` is true, send no `data.root` on create. When `existing_application` is present, finish that application instead.\n\nBuild createAccountV2.data from this: `root` scope fields in data.root, party fields in each data.parties[] entry, documents by scope. The `predefined` object and the documents' `required_when` and `metadata` are not live yet; production does not return them.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ]
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code"
        },
        "bank_code": {
          "type": "string",
          "description": "A `bank_code` from the capabilities"
        },
        "account_type": {
          "type": "string"
        },
        "category": {
          "type": "string",
          "description": "`main` is your business's own account. `sub_account` is an account for one of your customers. These are the only two categories you can open.",
          "enum": [
            "main",
            "sub_account"
          ],
          "example": "sub_account"
        },
        "country": {
          "type": "string",
          "description": "The customer's citizenship or incorporation country, alpha-2 or alpha-3"
        },
        "subdivision": {
          "type": "string",
          "description": "ISO 3166-2 code or a bare state code. Needs `country`."
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Customer to fill the form for"
        }
      },
      "required": [
        "customer_type",
        "currency"
      ],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_type",
      "currency",
      "bank_code",
      "account_type",
      "category",
      "country",
      "subdivision",
      "customer_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "getAccountV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/{id}",
    "description": "Get an account — Returns one account with bank details, balances and, when it is not `active`, the reason. Poll it after create until `status` is `active`. When `requires_user_action` is true, act on `status_reason` with `application_id`. `balance` and `balance_details` are in major units. `ledger_balance` is in minor units.\n\nPoll after createAccountV2 until status is `active`. If requires_user_action is true: for awaiting_customer_document or awaiting_customer_data, read getAccountApplicationV2 with application_id and answer with updateAccountApplicationV2; for tos_pending or kyc_pending, send the customer to required_action_url. An unknown id is a 404.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the account"
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "getCard",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/{card_id}",
    "description": "Get a card — Returns one card without its full number. `daily_transaction_limit` is the card's only limit. The format of `masked_pan` and `expiry` differs from the list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the card"
        }
      },
      "required": [
        "card_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "card_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCardApplication",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/applications/{application_id}",
    "description": "Get a card application — Returns one application. Its `status` is the card's status and stays empty until a card is issued, so use `GET /v1/cards/applications` to wait for approval.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "application_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "application_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCardBalance",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/{card_id}/balance",
    "description": "Get a card balance — Returns what the card can spend and the balance of its card group, in USD as JSON numbers. `balance` is 0 unless the card is `active`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the card"
        }
      },
      "required": [
        "card_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "card_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCollection",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/{id}",
    "description": "Get a collection — Returns the status and details of a collection. Pass the `transaction_id` from the create call, the charge call or a webhook. The `id` in this response is a different value.\n\nonramp_status `settlement_abandoned` is not live yet; production does not send it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "The collection's `transaction_id`"
        },
        "enrich": {
          "type": "string",
          "enum": [
            "true",
            "false"
          ],
          "description": "Send `true` to include the payer details in `enriched_info`"
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [
      "enrich"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "getCustomer",
    "toolset": "customers",
    "method": "get",
    "path": "/v1/customers/{customer_id}",
    "description": "Get a customer — Returns one customer with its KYC records, and for a business its associated persons. It also returns an associated person by its own `id`. Send no query parameters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "customer_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "customers.yaml"
  },
  {
    "name": "getCustomerKycDocuments",
    "toolset": "kyc",
    "method": "get",
    "path": "/v1/customers/{customer_id}/kyc/documents",
    "description": "List KYC documents — Lists the documents stored for a customer, with their details and which sides have an image. Use a document's `id` to download its image. The response includes each document number in plain text. Treat it as personal data. A customer with no documents gets a 404, not an empty list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the customer"
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "customer_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "getCustomerKycStatus",
    "toolset": "kyc",
    "method": "get",
    "path": "/v1/customers/{customer_id}/kyc/status",
    "description": "Get a customer's KYC review status — Reads the live review state for a customer's verification. It does not change the customer's KYC status, which only the webhooks update. For the final result, read `kyc` on the customer (`GET /v1/customers/{customer_id}`) or listen for the `customer.kyc.status.*` webhooks. `reviewStatus: completed` with `reviewAnswer: rejected` means verification failed. Customers verified by automatic document verification have no review and get a 404 here.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the customer"
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "customer_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "getCustomerLimits",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/customers/{customer_id}/limits",
    "description": "Get a customer's limits — Returns a customer's transfer tier, the caps for each window and what is left in each. Use it before a large payout, or to explain why a transfer paused. All amounts are USD strings.\n\nUse before a large payout, or to explain a pause: remaining_usd is what is left in each window. A null cap means no cap only when caps_basis is `tier`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer"
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "customer_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "limits.yaml"
  },
  {
    "name": "getExternalAccount",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/{external_account_id}",
    "description": "Get an external account — Returns one external account. After a 202, poll every 30 to 60 seconds until `status` is `active` (ready for transfers) or `setup_failed` (read `error_message`, then correct the account with PATCH). Not-found is a 400.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "external_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the external account"
        }
      },
      "required": [
        "external_account_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "external_account_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "getFxOrder",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders/{order_id}",
    "description": "Get an order — Returns one order. `pending` covers both a debit in progress and a debit that landed and is waiting to settle. An unknown order returns a 400.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "format": "uuid",
          "description": "The `order_id` returned when the order was created"
        }
      },
      "required": [
        "order_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "order_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "getFxQuote",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/quote",
    "description": "Get a quote — Returns a firm price to sell an amount of one currency for another. The quote lasts 5 minutes and can be used once, only by `POST /v1/fx/orders`. It does not set the rate of a transfer. A pair that is not enabled for you returns `quote currency pair is not supported`.\n\nQuotes expire after about 5 minutes (see the expiry in the response). A quote does NOT lock a rate for createTransfer; its quote_id is used only by createFxOrder. A quote holds pair liquidity, so do not quote again and again. Re-quote after expiry.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency_pair": {
          "type": "string",
          "description": "The currency you sell, then the currency you buy, in `FROM_TO` form, such as `USD_XAF`. The four-part form `USD_US_XAF_CM` is also accepted; its countries do not change the price. It takes precedence over `direction`.",
          "example": "USD_XAF"
        },
        "direction": {
          "type": "string",
          "description": "The same `FROM_TO` form as `currency_pair`. It is not BUY or SELL.",
          "example": "USD_XAF"
        },
        "amount": {
          "type": "string",
          "description": "Amount you sell, in major units of the FROM currency, as a string. The API rejects a JSON number.",
          "example": "10000"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "amount"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "currency_pair",
      "direction",
      "amount"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "getRemitterLimits",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/limits/remitters/{remitter_id}",
    "description": "Get a remitter's limits — Returns the same view for a remitter: the sender you name in `additional_information.remitter_verification` on a transfer. Usage counts only transfers that carry it, on a policy with attested tiers. An unknown remitter gets the policy's default tier.\n\nremitter_id is your own id for the sender, as sent in additional_information.remitter_verification on createTransfer. An unknown id answers with the default tier, not a 404.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "remitter_id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "description": "Your ID for the sender, 1 to 255 characters. It is case-sensitive."
        }
      },
      "required": [
        "remitter_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "remitter_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "limits.yaml"
  },
  {
    "name": "getSavedCard",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/cards/{card_id}",
    "description": "Get saved card — Returns one active saved card by the `id` from the list. Ignore `is_active` in this response, as it is always `false`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "The saved card `id`, not the card token"
        }
      },
      "required": [
        "card_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "card_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "getSavings",
    "toolset": "savings",
    "method": "get",
    "path": "/v1/savings/{id}",
    "description": "Get a customer's savings — Returns what is saved, what is still on the account, what is moving and what has been earned. Read it after a `transfer.status.completed` for a save or a withdrawal, or after `savings.interest.credited`.\n\nid is the savings account id (category `savings` on getAccountV2). The savings wallet id also works but its available_balance is the wallet's own, so prefer the account id. Amounts are USDC strings with 6 places: available_balance is not saved yet, saved_balance earns and is the most a withdrawal can take, pending_balance is negative while a withdrawal is on its way. Read it after transfer.status.completed for a save or withdrawal. A live key gets 501 for now.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The savings account id from `POST /v2/accounts`. The id of the savings wallet behind it also works, but its `available_balance` is the wallet's own, so use the account id."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "savings.yaml"
  },
  {
    "name": "getSavingsRate",
    "toolset": "savings",
    "method": "get",
    "path": "/v1/savings/rate",
    "description": "Get the savings rate — Returns today's yearly savings rate. The rate moves once a day, so you can show it next to a save button. In sandbox it is fixed at 3.50 and `indicative` is true.\n\nToday's yearly rate in percent (apy) and basis points (apy_bps). In sandbox it is fixed at 3.50 with indicative true. Savings is sandbox-only for now: a live key gets 501.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "savings.yaml"
  },
  {
    "name": "getSavingsStatement",
    "toolset": "savings",
    "method": "get",
    "path": "/v1/savings/{id}/statement",
    "description": "Get a savings statement — Returns one row per UTC day with the opening balance, what was saved, withdrawn and earned, and the closing balance. With `format=csv` the same rows download as a CSV file. A statement covers at most 92 days.\n\nfrom and to are YYYY-MM-DD in UTC; to cannot be after today, the range is at most 92 days, and leaving both out gives the last 30 days. One row per day: closing = opening + saved - withdrawn + interest, completed moves only. format=csv answers a CSV file. A live key gets 501 for now.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The savings account id from `POST /v2/accounts`. The id of the savings wallet behind it also works, but its `available_balance` is the wallet's own, so use the account id."
        },
        "from": {
          "type": "string",
          "format": "date",
          "description": "First day, as YYYY-MM-DD in UTC. Defaults to 30 days before `to`."
        },
        "to": {
          "type": "string",
          "format": "date",
          "description": "Last day, as YYYY-MM-DD in UTC. Defaults to today and cannot be after today."
        },
        "format": {
          "type": "string",
          "enum": [
            "json",
            "csv"
          ],
          "description": "`json` (the default) or `csv`. A CSV comes back as a file download with the columns date, opening_balance, saved, withdrawn, interest, closing_balance and currency."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [
      "from",
      "to",
      "format"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "savings.yaml"
  },
  {
    "name": "getSettlementInstruction",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/settlement-instructions/{id}",
    "description": "Get a settlement instruction — Returns one active settlement instruction. A deleted one returns not found.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the settlement instruction"
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "settlement-instructions.yaml"
  },
  {
    "name": "getTransaction",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/{transaction_id}",
    "description": "Get a transaction — Returns one transaction. Poll it after a transfer until `status` is `completed` or `failed`; `paused` means the transfer needs something from you. An unknown ID returns a 400.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "transaction_id": {
          "type": "string",
          "format": "uuid",
          "description": "The `transaction_id` from `POST /v1/transfer`"
        }
      },
      "required": [
        "transaction_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "transaction_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getTransactionsVolume",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/volume",
    "description": "Get transaction volume — Returns the sum of the matching amounts. It adds up every currency, direction and status you do not filter out, so filter by an account and `status=completed`. There is no date filter.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "sending_account_id": {
          "type": "string",
          "format": "uuid"
        },
        "receiving_account_id": {
          "type": "string",
          "format": "uuid"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid"
        },
        "channel": {
          "type": "string",
          "description": "One or more channels, comma-separated, such as `ach,wire`. See the `channel` values on the transaction. An unknown value returns nothing."
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ]
        },
        "status": {
          "type": "string",
          "description": "One or more of `pending`, `completed`, `failed`, `waiting_approval` and `paused`, comma-separated"
        },
        "transaction_type": {
          "type": "string",
          "description": "One or more transaction types, comma-separated. See the `transaction_type` values on the transaction. An unknown value returns nothing."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "sending_account_id",
      "receiving_account_id",
      "customer_id",
      "channel",
      "direction",
      "status",
      "transaction_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getTransferRates",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/rates",
    "description": "Get transfer rates — Without `source_wallet_id`, returns indicative exchange rates, which you can filter by `currency`. With `source_wallet_id`, `destination_wallet_id`, `receive_asset` and `amount`, it prices a USDT and USDC conversion between two wallets of one customer. Neither is a locked price; the transfer is priced again when you create it.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency": {
          "type": "string",
          "description": "The currency received. Not case-sensitive."
        },
        "source_wallet_id": {
          "type": "string",
          "format": "uuid",
          "description": "Prices a conversion from this crypto wallet"
        },
        "destination_wallet_id": {
          "type": "string",
          "format": "uuid",
          "description": "Conversion price only. A wallet of the same customer."
        },
        "receive_asset": {
          "type": "string",
          "enum": [
            "USDT",
            "USDC"
          ],
          "description": "Conversion price only. It must differ from the asset sent."
        },
        "send_asset": {
          "type": "string",
          "enum": [
            "USDT",
            "USDC"
          ],
          "description": "Conversion price only. Defaults to the wallet's asset."
        },
        "amount": {
          "type": "string",
          "description": "Conversion price only. Positive, with at most 2 decimal places."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "currency",
      "source_wallet_id",
      "destination_wallet_id",
      "receive_asset",
      "send_asset",
      "amount"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "getWallet",
    "toolset": "wallets",
    "method": "get",
    "path": "/v1/wallets/{wallet_id}",
    "description": "Get a single wallet — Returns one wallet with its balances. Balances come from a cache. When one is missing or older than 5 minutes, Gravv queues a refresh and returns without waiting for it. Gravv tracks balances for USDC on every listed network, USDT on polygon, ethereum, avalanche and solana, and the network's own coin.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "wallet_id": {
          "type": "string",
          "format": "uuid",
          "description": "Wallet ID"
        }
      },
      "required": [
        "wallet_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "wallet_id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "getWebhookCallHistory",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/calls/{id}",
    "description": "Get call history for a webhook event — Lists every delivery attempt for one record, newest first, with the status code, time taken and any connection error. The list leaves out attempts that failed before Gravv made the call, such as a missing or unsafe URL. Those only add to `attempts` on the detail route.\n\nTakes the `id` of a getWebhookHistory item.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The delivery record `id` from the history list. It is not the `event_id` in the delivered body."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "getWebhookEventDetail",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/event/{id}",
    "description": "Get webhook event details — Returns one delivery record with the stored payload, the delivery state and your endpoint's last response. Use it to see what was sent and why a delivery failed. The response does not include request headers.\n\nTakes the `id` of a getWebhookHistory item. The stored payload is a re-serialised copy: do not use it to check a signature.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The delivery record `id` from the history list. It is not the `event_id` in the delivered body."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "getWebhookHistory",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/history",
    "description": "List webhook event history — Lists the webhook delivery records for your business, newest first. There is one record for each event Gravv sent you. Sandbox and live keys see separate records. You can combine all filters.\n\nUse an item's `id` with getWebhookEventDetail, getWebhookCallHistory or retryWebhookEvent.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "transaction_id": {
          "type": "string",
          "description": "Exact transaction ID stored with the event. For transfers it is the first of `associated_transactions`, not the transfer `reference`."
        },
        "event_type": {
          "type": "string",
          "description": "Event category: `transfer`, `inflow`, `account`, `applications.accounts`, `external_account`, `cards`, `collection` or `customer`. A full event type such as `transfer.status.completed` matches nothing and returns an empty list."
        },
        "status": {
          "type": "string",
          "description": "Delivery status. Any other value returns an empty list, not an error.",
          "enum": [
            "pending",
            "processing",
            "sent",
            "failed",
            "retrying"
          ],
          "example": "sent"
        },
        "start_date": {
          "type": "string",
          "description": "Records created at or after this time. Send RFC3339 (`2026-10-01T00:00:00Z`), a date (`2026-10-01`, read as 00:00 UTC) or a datetime without a zone (read as UTC)."
        },
        "end_date": {
          "type": "string",
          "description": "Records created at or before this time, in the same formats. A date alone means 00:00 of that day, so the day itself is left out. It must not be before `start_date`."
        },
        "limit": {
          "type": "integer",
          "format": "int32",
          "minimum": 0,
          "maximum": 100,
          "default": 50,
          "description": "Records per page. The API lowers a value over 100 to 100, and 0 means the default."
        },
        "page": {
          "type": "integer",
          "format": "int32",
          "minimum": 1,
          "default": 1,
          "description": "Page number, starting at 1"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "transaction_id",
      "event_type",
      "status",
      "start_date",
      "end_date",
      "limit",
      "page"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "listAccountApplicationsV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/applications",
    "description": "List account applications — Lists your account applications, newest first, without status reasons. `count` is the number on this page, not a total. Page until `count` is less than `limit`. A misspelled `status` returns an empty list.\n\nUse getAccountApplicationV2 for the status reason and the required fields and documents.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "description": "`processing` while the bank works, `blocked` while it waits on you or the customer, `manual_review` while Gravv holds it, then `approved` or `rejected`. `draft` and `submitted` appear only on applications not made with `POST /v2/accounts`.",
          "enum": [
            "draft",
            "submitted",
            "processing",
            "blocked",
            "manual_review",
            "approved",
            "rejected",
            "expired",
            "cancelled"
          ],
          "example": "blocked"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200,
          "default": 50
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "default": 0
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "status",
      "limit",
      "offset"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "listAccounts",
    "toolset": "accounts",
    "method": "get",
    "path": "/v1/accounts",
    "description": "List your accounts — Lists your accounts, newest first. Use it to find your card account with `account_type=card&status=active`, and your business's own customer ID on the account whose `category` is `main`. Filters combine with AND.\n\nONLY to find your business's one card account (account_type card, status active) and your business's own customer id (the customer_id on your account whose category is `main`). For every other account, use listAccountsV2.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of items per page, up to 100"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number, from 1"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by customer"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "pending",
            "frozen",
            "deleted",
            "manual_review"
          ],
          "description": "Filter by status"
        },
        "account_type": {
          "type": "string",
          "description": "Filter by account type, such as `regular` or `card`"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "items_per_page",
      "page",
      "customer_id",
      "status",
      "account_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "card-account.yaml"
  },
  {
    "name": "listAccountsV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts",
    "description": "List accounts — Lists all your accounts, newest first, with bank details and balances. Only the single-account read returns status reasons. The API rejects unknown query parameters with a 400. A bad filter value is an error, not an empty page.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "description": "Filter by customer"
        },
        "excluded_customer_id": {
          "type": "string",
          "description": "Leave out this customer's accounts"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "active",
            "frozen",
            "closed",
            "rejected",
            "failed",
            "deleted",
            "manual_review"
          ]
        },
        "category": {
          "type": "string",
          "description": "Filter by category. `virtual` and `multi_currency` find older accounts only.",
          "enum": [
            "main",
            "sub_account",
            "savings",
            "virtual",
            "multi_currency"
          ],
          "example": "sub_account"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code"
        },
        "network": {
          "type": "string",
          "description": "Blockchain network, in lower case. Gravv supports stellar, polygon, ethereum, avalanche_c_chain and solana.",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "avalanche_c_chain",
            "solana"
          ],
          "example": "polygon"
        },
        "bank_code": {
          "type": "string"
        },
        "label": {
          "type": "string",
          "description": "Exact label. Use `search` for part of a label."
        },
        "type": {
          "type": "string",
          "description": "Account type, such as `operating`"
        },
        "search": {
          "type": "string",
          "description": "Case-insensitive search across label, currency, status, type and wallet address"
        },
        "created_from": {
          "type": "string",
          "description": "Created at or after, as RFC 3339 or YYYY-MM-DD (inclusive)"
        },
        "created_to": {
          "type": "string",
          "description": "Created before, as RFC 3339 or YYYY-MM-DD (exclusive)"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 200,
          "default": 50,
          "description": "Page size, 1 to 200. A `limit` that is not a whole number returns 400. A whole number outside 1 to 200 becomes 50."
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "default": 0
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "excluded_customer_id",
      "status",
      "category",
      "currency",
      "network",
      "bank_code",
      "label",
      "type",
      "search",
      "created_from",
      "created_to",
      "limit",
      "offset"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "listCardApplications",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/applications",
    "description": "List card applications — Lists your card applications, newest first, with `application_status`. This is the only route that returns it. Poll it until the status is `approved`, or wait for the `cards.application.update` webhook. It takes no filters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "listCards",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards",
    "description": "List cards — Lists your cards, newest first. Applications with no card yet are included with an empty `status`; send `status=active,freeze,blocked,inactive` to list cards only.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        },
        "status": {
          "type": "string",
          "description": "One or more card statuses, comma-separated"
        },
        "card_type": {
          "type": "string",
          "description": "`virtual`, `physical` or both, comma-separated"
        },
        "customer_id": {
          "type": "string"
        },
        "card_id": {
          "type": "string"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "status",
      "card_type",
      "customer_id",
      "card_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "listCustomers",
    "toolset": "customers",
    "method": "get",
    "path": "/v1/customers",
    "description": "List customers — Lists your individual and business customers, newest first. Associated persons are not listed. Get their business to see them. Unknown or invalid filters are ignored.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number, from 1"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 20,
          "description": "Items per page. There is no maximum, so page through large sets."
        },
        "status": {
          "type": "string",
          "description": "Filter by customer status. `active` is the only status set today."
        },
        "type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ],
          "description": "Filter by customer type"
        },
        "keyword": {
          "type": "string",
          "description": "Search first name, last name, email and customer ID. It does not search the business name."
        },
        "kyc_status": {
          "type": "string",
          "enum": [
            "not_started",
            "initiating",
            "pending",
            "completed",
            "failed"
          ],
          "description": "Filter by the status of the customer's `basic` KYC record"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "status",
      "type",
      "keyword",
      "kyc_status"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "customers.yaml"
  },
  {
    "name": "listExternalAccountInstitutions",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/institutions",
    "description": "List institutions — Lists the banks and mobile money operators an external account can name in `institution_id`. SWIFT banks appear only when you send `institution_type=swift`, `swift_code` or `search`. Filters match exactly, so send codes in upper case.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        },
        "country_iso_code": {
          "type": "string",
          "description": "Alpha-2 country code"
        },
        "institution_type": {
          "type": "string",
          "enum": [
            "bank",
            "mobile_money",
            "swift",
            "swift_intermediary"
          ],
          "description": "Defaults to every type except `swift_intermediary`"
        },
        "account_number_type": {
          "type": "string",
          "enum": [
            "bank_account_number",
            "iban",
            "phone_number",
            "clabe"
          ]
        },
        "currency": {
          "type": "string"
        },
        "swift_code": {
          "type": "string",
          "pattern": "^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$",
          "description": "Find a SWIFT bank by its 8- or 11-character BIC"
        },
        "search": {
          "type": "string",
          "minLength": 3,
          "description": "Find SWIFT banks by name or BIC, at least 3 characters"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "country_iso_code",
      "institution_type",
      "account_number_type",
      "currency",
      "swift_code",
      "search"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "listExternalAccounts",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts",
    "description": "List external accounts — Lists your external accounts, newest first, in every status including `deleted`. There is no status filter. Filters match exactly and are case-sensitive, so send currencies in upper case. `total_items` is an estimate. Stop when a page has fewer items than `items_per_page`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The full customer ID"
        },
        "payee_type": {
          "type": "string",
          "description": "How the account is paid. `bank_account` and `mobile_money` are active at once. `swift`, `sepa`, `ach_wire` and `fps` need a setup step and start as `pending`.",
          "enum": [
            "bank_account",
            "mobile_money",
            "swift",
            "sepa",
            "ach_wire",
            "fps"
          ],
          "example": "bank_account"
        },
        "currency": {
          "type": "string"
        },
        "search": {
          "type": "string",
          "description": "Matches part of the holder name, account number or phone number"
        },
        "internal_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Your account that pays the external accounts"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "customer_id",
      "payee_type",
      "currency",
      "search",
      "internal_account_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "listFeatures",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/risk/features",
    "description": "List available features — Returns the feature catalogue. With `customer_id`, `activated` shows which features are active for that customer. The order is not fixed. Every error on this route is HTTP 400.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "A customer in your tenant. An unknown customer is a 400 `CUSTOMER_NOT_FOUND` error."
        },
        "country": {
          "type": "string",
          "description": "Country code. It has no effect today, because every feature is available in every country."
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "inactive",
            "all"
          ],
          "default": "all",
          "description": "Filter by activation. It needs `customer_id`. Without it, every feature is inactive. Other values act as `all`."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "country",
      "status"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "features.yaml"
  },
  {
    "name": "listFxCurrencyPairs",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/supported-currencies",
    "description": "List supported currency pairs — Lists every currency pair in FX. A listed pair is not always enabled for you; `POST /v1/fx/quote` returns an error for a pair that is not. This route reads no query parameters.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxOrders",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders",
    "description": "List orders — Lists your orders, newest first. `status` is the only filter.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 20,
          "description": "Page size. The API caps values above 100 at 100."
        },
        "status": {
          "type": "string",
          "description": "An order made with an API key starts as `pending`, and Gravv debits its source at once. It then becomes `completed`, or `cancelled` if the debit fails. `waiting_approval` is for orders made in the Dashboard.",
          "enum": [
            "waiting_approval",
            "pending",
            "completed",
            "rejected",
            "cancelled"
          ],
          "example": "pending"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "status"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxPendingApprovals",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders/pending-approvals",
    "description": "List orders waiting for approval — Lists orders in `waiting_approval`, newest first. Only orders made in the Dashboard wait for approval, so orders made with an API key never appear here. A scoped key needs `fx:order_approve`. You approve and reject orders in the Dashboard.\n\nOnly orders placed in the Dashboard wait for approval. Orders created with an API key run at once and never appear here, so this list is usually empty for an API integration. A scoped API key needs the fx:order_approve permission, or the call returns 400 `caller is not permitted to approve or reject orders`. Approving and rejecting happen in the Dashboard; the API cannot do them.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 20,
          "description": "Page size. The API caps values above 100 at 100."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxRates",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/rates",
    "description": "List exchange rates — Returns indicative rates for display, sorted by pair. You cannot trade at these rates; call `POST /v1/fx/quote` for a firm price. Filters are not case-sensitive. When rates are not loaded yet, the error is `fx cache is not ready`; retry the call.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency_type": {
          "type": "string",
          "enum": [
            "fiat",
            "crypto"
          ]
        },
        "from_currency": {
          "type": "string"
        },
        "to_currency": {
          "type": "string"
        },
        "directions": {
          "type": "string",
          "description": "Comma-separated `FROM_TO` values, such as `USD_NGN,USD_EUR`"
        },
        "currency_pairs": {
          "type": "string",
          "description": "Comma-separated four-part pair keys, such as `USD_US_EUR_FR`"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "currency_type",
      "from_currency",
      "to_currency",
      "directions",
      "currency_pairs"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listSavedCards",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/cards",
    "description": "Get saved cards — Lists a customer's saved cards, default card first, then newest. The list includes cards that are not active yet; only a card with `is_active` true can be charged.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The customer's ID. Always send it."
        },
        "client_customer_id": {
          "type": "string",
          "description": "When set, Gravv matches cards by this value only and does not filter by `customer_id`."
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "client_customer_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "listSettlementInstructions",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/settlement-instructions",
    "description": "List settlement instructions — Lists your active settlement instructions, defaults first, then newest. Filters match exactly, including case.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        },
        "currency": {
          "type": "string"
        },
        "instruction_type": {
          "type": "string",
          "description": "Send it in lower case, exactly as listed",
          "enum": [
            "bank_account",
            "crypto_wallet"
          ],
          "example": "bank_account"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "currency",
      "instruction_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "settlement-instructions.yaml"
  },
  {
    "name": "listTransactions",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions",
    "description": "List transactions — Lists your transactions, newest first. Filters that take values accept a comma-separated list. There is no date filter; use the export for dates. A typo in a filter value returns an empty list, not an error. Page through the results with `total_pages` until a page is empty.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        },
        "customer_id": {
          "type": "string",
          "format": "uuid"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Transactions that send from or receive into this account"
        },
        "card_id": {
          "type": "string",
          "format": "uuid"
        },
        "tx_hash": {
          "type": "string",
          "description": "Exact blockchain transaction hash"
        },
        "wallet_address": {
          "type": "string",
          "description": "Sending or receiving wallet address, not case-sensitive"
        },
        "channel": {
          "type": "string",
          "description": "One or more channels, comma-separated, such as `ach,wire`. See the `channel` values on the transaction. An unknown value returns nothing."
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ]
        },
        "status": {
          "type": "string",
          "description": "One or more of `pending`, `completed`, `failed`, `waiting_approval` and `paused`, comma-separated"
        },
        "transaction_type": {
          "type": "string",
          "description": "One or more transaction types, comma-separated. See the `transaction_type` values on the transaction. An unknown value returns nothing."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "customer_id",
      "account_id",
      "card_id",
      "tx_hash",
      "wallet_address",
      "channel",
      "direction",
      "status",
      "transaction_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "listTransferSupportedCountries",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-countries",
    "description": "List supported countries — Lists countries with their alpha-3 code and local currency. A listed country may still have no payout route open; the transfer then says so.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "iso_code": {
          "type": "string",
          "description": "Part of an alpha-2 code, not case-sensitive. `N` matches every code that contains N."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "iso_code"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listTransferSupportedCountriesForAddress",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-countries-for-address",
    "description": "List countries and states for addresses — Lists countries with their states or regions, for address forms. Both filters match part of the value and are not case-sensitive.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "iso_code": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "iso_code",
      "name"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listTransferSupportedCurrencies",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-currencies",
    "description": "List supported currency pairs — Lists the currency pairs you can pay out in. It takes no filters.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listWallets",
    "toolset": "wallets",
    "method": "get",
    "path": "/v1/wallets",
    "description": "Get wallets — Lists your wallets, newest first. Filters are exact and case-sensitive, except `wallet_name`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by customer ID"
        },
        "network": {
          "type": "string",
          "description": "Filter by blockchain network",
          "enum": [
            "polygon",
            "ethereum",
            "avalanche",
            "stellar",
            "solana"
          ],
          "example": "stellar"
        },
        "wallet_name": {
          "type": "string",
          "description": "Matches part of the name you gave, in any case. It does not match the default label."
        },
        "wallet_address": {
          "type": "string",
          "description": "Exact address. EVM addresses must be in checksum case."
        },
        "wallet_type": {
          "type": "string",
          "enum": [
            "customer",
            "master"
          ],
          "description": "Filter by wallet type"
        },
        "include_balances": {
          "type": "boolean",
          "default": false,
          "description": "When true, each wallet has its `assets`"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Wallets per page. The API lowers a larger value to 100 instead of rejecting it."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "network",
      "wallet_name",
      "wallet_address",
      "wallet_type",
      "include_balances",
      "page",
      "items_per_page"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "resumeTransfer",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer/{id}/resume",
    "description": "Resume a paused transfer — Continues a transfer that returned `transfer_status: paused`, with what its `requirements` asked for. When the transfer can go ahead, `resumed` is true and Gravv sends the `transfer.resumed` webhook. When it still cannot, `resumed` is false and the response lists the new requirements. Gravv does not charge the fee again. Use a new Idempotency-Key for each attempt with new information, as a retry with the same key returns the first answer. A 410 means the pause expired or was cancelled; start a new transfer.\n\nOnly for a transfer returned as `paused`; id is the transfer `reference` from createTransfer. Send exactly what `requirements` lists, uploading documents first with uploadTransferDocument. Leave idempotency_key out on each new attempt: the same key returns the first answer. A 410 means start a new transfer. MOVES MONEY: resuming releases the payout; requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The transfer `reference` from `POST /v1/transfer`"
        },
        "transfer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Optional. It must match the path."
        },
        "remitter_verification": {
          "type": "object",
          "description": "Your record of how you verified the sender. When your limits policy uses attested tiers, the transfer counts against this remitter instead of the customer.",
          "properties": {
            "remitter_id": {
              "type": "string",
              "description": "Your ID for the sender",
              "example": "rem_8842"
            },
            "level": {
              "type": "string",
              "example": "enhanced"
            },
            "provider": {
              "type": "string",
              "description": "Who verified the sender"
            },
            "provider_reference": {
              "type": "string"
            },
            "verified_at": {
              "type": "string",
              "format": "date-time"
            },
            "screening": {
              "type": "object",
              "description": "Each value must be `clear`",
              "properties": {
                "sanctions": {
                  "type": "string",
                  "example": "clear"
                },
                "pep": {
                  "type": "string",
                  "example": "clear"
                },
                "adverse_media": {
                  "type": "string",
                  "example": "clear"
                }
              }
            }
          }
        },
        "additional_information": {
          "type": "object",
          "description": "Sender details. Some payout routes need them; without them the transfer pauses with `sender_details_required`.",
          "properties": {
            "remitter_full_name": {
              "type": "string",
              "example": "John Doe"
            },
            "remitter_country": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            },
            "remitter_document_number": {
              "type": "string",
              "example": "A123456789"
            },
            "remitter_document_issue_date": {
              "type": "string",
              "description": "YYYY-MM-DD",
              "example": "2020-01-15"
            },
            "remitter_document_expiry_date": {
              "type": "string",
              "description": "YYYY-MM-DD",
              "example": "2030-01-15"
            },
            "remitter_date_of_birth": {
              "type": "string",
              "description": "YYYY-MM-DD, not in the future",
              "example": "1990-06-25"
            },
            "remitter_nationality": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            },
            "remitter_address": {
              "type": "object",
              "properties": {
                "address_line1": {
                  "type": "string",
                  "example": "123 Main Street"
                },
                "city": {
                  "type": "string",
                  "example": "New York"
                },
                "state": {
                  "type": "string",
                  "example": "NY"
                },
                "postal_code": {
                  "type": "string",
                  "example": "10001"
                },
                "country": {
                  "type": "string",
                  "example": "US"
                }
              }
            },
            "remitter_verification": {
              "type": "object",
              "description": "Your record of how you verified the sender. When your limits policy uses attested tiers, the transfer counts against this remitter instead of the customer.",
              "properties": {
                "remitter_id": {
                  "type": "string",
                  "description": "Your ID for the sender",
                  "example": "rem_8842"
                },
                "level": {
                  "type": "string",
                  "example": "enhanced"
                },
                "provider": {
                  "type": "string",
                  "description": "Who verified the sender"
                },
                "provider_reference": {
                  "type": "string"
                },
                "verified_at": {
                  "type": "string",
                  "format": "date-time"
                },
                "screening": {
                  "type": "object",
                  "description": "Each value must be `clear`",
                  "properties": {
                    "sanctions": {
                      "type": "string",
                      "example": "clear"
                    },
                    "pep": {
                      "type": "string",
                      "example": "clear"
                    },
                    "adverse_media": {
                      "type": "string",
                      "example": "clear"
                    }
                  }
                }
              }
            }
          }
        },
        "supporting_document_ids": {
          "type": "array",
          "maxItems": 5,
          "items": {
            "type": "string",
            "format": "uuid"
          }
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "transfer_id",
      "remitter_verification",
      "additional_information",
      "supporting_document_ids"
    ],
    "alsoInBody": [],
    "closedBody": true,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "retryWebhookEvent",
    "toolset": "webhooks",
    "method": "post",
    "path": "/v1/webhooks/event/send/{id}",
    "description": "Resend a webhook event — Sends one stored event to your current webhook URL now and returns your endpoint's response. The call waits up to 30 seconds for your endpoint. It needs the `webhook:create` permission. No `Idempotency-Key` is needed, and each call sends the event again. The resend is not signed and carries no `X-Signature` header. The call returns HTTP 200 with your endpoint's status code, even when your endpoint returned a non-2xx status. A failed resend puts the event back into signed automatic retries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "The delivery record `id` from the history list. It is not the `event_id` in the delivered body."
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "simulateDeposit",
    "toolset": "sandbox",
    "method": "post",
    "path": "/v2/accounts/simulate/deposit",
    "description": "Simulate a deposit — Sandbox only. A live key gets a 403. Sends a test bank deposit to an account through the normal deposit flow, with fees, ledger entries and webhooks. The account must be `active` with bank details. A 200 means Gravv accepted the deposit, not that it settled. Wait for the `transfer.inflow.completed` or `transfer.inflow.deposit_settled` webhook. Each new Idempotency-Key makes a new deposit.\n\nSANDBOX ONLY: this server shows and runs it only with a sandbox key. PREREQUISITE: the account is `active` with bank details (getAccountV2). amount is a string in major units, such as \"250.00\". Each call makes a new deposit; leave idempotency_key out unless the outcome is unknown.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "An `active` account of yours with bank details",
          "example": "6f1c2a9e-3b1d-4f7a-9c62-0d8e4b7a5c11"
        },
        "amount": {
          "type": "string",
          "description": "Positive amount in major units, as a string. It must fit the rail's smallest unit.",
          "example": "250.00"
        },
        "currency": {
          "type": "string",
          "description": "Defaults to the account currency",
          "example": "USD"
        },
        "rail": {
          "type": "string",
          "description": "Rail the deposit arrives on. Defaults to the bank's usual rail.",
          "enum": [
            "ach",
            "wire",
            "rtp",
            "swift",
            "sepa",
            "fps"
          ],
          "example": "wire"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "account_id",
        "amount"
      ],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "account_id",
      "amount",
      "currency",
      "rail"
    ],
    "alsoInBody": [],
    "closedBody": true,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": true,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "simulateSavingsInterest",
    "toolset": "sandbox",
    "method": "post",
    "path": "/v1/savings/simulate/interest",
    "description": "Simulate interest (sandbox) — Sandbox only. Adds interest to a savings now, as the nightly run does in live, and sends `savings.interest.credited` with `source` `simulated`. The savings must hold money first. Needs a key that can initiate transfers. A live key gets a 400.\n\nSANDBOX ONLY: this server shows and runs it only with a sandbox key. Adds interest now, as the nightly run does in live, and sends savings.interest.credited with source `simulated`. Send account_id (the savings account) or wallet_id, not both, and amount as a string from 0.000001 to 1000. PREREQUISITE: a completed save, or it answers 400 `nothing saved`. Reuse the same idempotency_key only to retry.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "The savings account",
          "example": "d9eae506-77b4-4e8b-8ab3-caaf96054d79"
        },
        "wallet_id": {
          "type": "string",
          "format": "uuid",
          "description": "A savings wallet with no account"
        },
        "amount": {
          "type": "string",
          "description": "The interest to add, from 0.000001 to 1000, with at most 6 decimal places",
          "example": "0.25"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "amount"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "account_id",
      "wallet_id",
      "amount"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": true,
    "spec": "savings.yaml"
  },
  {
    "name": "startCardholderKyc",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/risk/start-kyc",
    "description": "Start cardholder KYC verification — Starts hosted verification for a cardholder, with a liveness check, and returns a link. The link expires after one hour. Do not call this for a customer whose KYC is already `completed`. It sets the customer's KYC back to `pending` until the new review ends, which can block accounts and cards. To get only a liveness check, use the link that feature activation returns. Every error on this route is HTTP 400.\n\nCard KYC for a cardholder; for a customer's own KYC use startCustomerKyc. Check getCustomer first: never call it for a customer whose basic kyc status is `completed`, because it resets it to `pending`. Returns a web_url valid for one hour.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to verify. Other fields are ignored."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "risk.yaml"
  },
  {
    "name": "startCardholderKycS2S",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/risk/start-kyc-s2s",
    "description": "Start server-to-server cardholder KYC verification — Sends the documents you uploaded for a cardholder for review. This is step 2 of server-to-server card KYC. Three outcomes return HTTP 200, so check `data.status` and `data.code`: `pending` (sent for review), `partial_success` (the customer finishes on `web_url`), or a `code` of `MISSING_DOCUMENTS` or `KYC_ALREADY_COMPLETED`. This flow records no liveness check, so card activation will ask for one. Other errors are HTTP 400.\n\nSTEP 2 of server-to-server card KYC: every document must already be uploaded with uploadCardholderKycDocument. Check data.status and data.code: HTTP 200 also carries MISSING_DOCUMENTS and KYC_ALREADY_COMPLETED.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to verify. Upload the required documents for this customer first.",
          "example": "aabe0a33-6716-42e2-bbca-7abf1a8bd91c"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "risk.yaml"
  },
  {
    "name": "startCustomerKyc",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/start",
    "description": "Start KYC verification — Starts hosted verification and returns a link for the person or business to complete. The link expires after one hour. Call again with a new Idempotency-Key for a fresh link. The same key returns the old link. A customer who is already verified gets `review_status: completed` and no link. For a business, every associated person must complete verification first. Tenants with automatic document verification get a 400 and must use the upload route instead. Gravv sends the result in the `customer.kyc.status.*` webhooks. Each first start charges one KYC fee.\n\nFor business customers, complete KYC for every associated person BEFORE starting the business's own verification. Verification is asynchronous. Read the outcome from getCustomer (the `basic` kyc status becomes `completed` or `failed`) or from the customer.kyc.status.* webhooks. Each start is billed: never call it again in a loop.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the individual, business or UBO customer to verify. Other fields are ignored."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "startCustomerKycS2S",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/start-s2s",
    "description": "Start server-to-server KYC verification — Sends the documents you uploaded for review, with no hosted page. This is step 2 of server-to-server verification. Upload every required document first. For a business, every associated person must complete verification first, and the business needs each `COMPANY_DOC` subtype. Gravv sends the result in the `customer.kyc.status.*` webhooks. This flow records no liveness check. A customer verified this way must still complete a liveness step before a card can be issued.\n\nSTEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument. Each start is billed: never call it again in a loop.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to verify. Upload the required documents for this customer first.",
          "example": "aabe0a33-6716-42e2-bbca-7abf1a8bd91c"
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "updateAccountApplicationV2",
    "toolset": "accounts",
    "method": "patch",
    "path": "/v2/accounts/applications/{application_id}",
    "description": "Update an account application — Sends the data or documents the bank asked for, and resumes opening the account. Get the application first. It must be `blocked`, or `manual_review` for documents. Send every requested item in one call. After a partial answer, the application stays `blocked`. This route takes no Idempotency-Key, so a retry uploads again. The response leaves out the status reason fields. Get the application again to see what is still needed. For terms or verification, send the customer to `required_action_url` instead.\n\nPREREQUISITE: read getAccountApplicationV2 first and send only what required_fields and required_documents list, all in one call. Documents take file_path (a local JPEG, PNG or PDF of at most 2 MB each; in sandbox, under 500 KB for all of one call's files) in place of base64 content. Do not resend blindly: there is no idempotency key, so a resend uploads again.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the account application. Read it from the account (`application_id`) or from the application webhooks."
        },
        "metadata": {
          "type": "object",
          "description": "Field values by field name, such as `{\"tax_id_number\": \"123456789\"}`. On a blocked application, send only fields the bank asked for.",
          "additionalProperties": true
        },
        "customer": {
          "type": "object",
          "description": "Changes to the customer record. Gravv saves them on the customer, not only on this application.",
          "properties": {
            "first_name": {
              "type": "string"
            },
            "middle_name": {
              "type": "string"
            },
            "last_name": {
              "type": "string"
            },
            "email": {
              "type": "string"
            },
            "phone": {
              "type": "string"
            },
            "date_of_birth": {
              "type": "string"
            },
            "gender": {
              "type": "string"
            },
            "tax_id_number": {
              "type": "string"
            },
            "business_name": {
              "type": "string"
            },
            "business_description": {
              "type": "string"
            },
            "business_type": {
              "type": "string"
            },
            "business_industry": {
              "type": "string"
            },
            "registration_number": {
              "type": "string"
            },
            "external_id": {
              "type": "string"
            },
            "address": {
              "type": "object",
              "properties": {
                "address_line": {
                  "type": "string"
                },
                "address_line2": {
                  "type": "string"
                },
                "city": {
                  "type": "string"
                },
                "state": {
                  "type": "string"
                },
                "postal_code": {
                  "type": "string"
                },
                "country": {
                  "type": "string"
                }
              }
            },
            "associated_persons": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        },
        "parties": {
          "type": "array",
          "description": "Party changes, in the create shape. Send them only on a `draft` or `blocked` application.",
          "items": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "documents": {
          "type": "array",
          "description": "Documents to upload. Send them only on a `draft`, `blocked` or `manual_review` application. Upload every requested type in this one call.",
          "items": {
            "type": "object",
            "required": [
              "document_type"
            ],
            "properties": {
              "document_type": {
                "type": "string",
                "example": "proof_of_address"
              },
              "document_type_side": {
                "type": "string",
                "enum": [
                  "front",
                  "back"
                ]
              },
              "document_subtype": {
                "type": "string"
              },
              "party_id": {
                "type": "string",
                "description": "Required for an identity document on a business application"
              },
              "party_role": {
                "type": "string"
              },
              "party_name": {
                "type": "string"
              },
              "filename": {
                "type": "string",
                "example": "bill.pdf"
              },
              "content": {
                "type": "string",
                "description": "Standard or URL-safe base64. JPEG, PNG or PDF, at most 2 MB.",
                "example": "<base64>"
              },
              "issuing_country": {
                "type": "string",
                "description": "Alpha-2 code. Required except for `selfie_photo`.",
                "example": "US"
              },
              "number": {
                "type": "string"
              },
              "issued_date": {
                "type": "string"
              },
              "expiration_date": {
                "type": "string"
              },
              "date_of_birth": {
                "type": "string"
              },
              "document_place_of_birth": {
                "type": "string"
              },
              "file_path": {
                "type": "string",
                "minLength": 1,
                "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 2 MB, and sends it as content, filling filename when you leave them out. Send file_path or content, not both; with content, send filename yourself."
              }
            }
          }
        }
      },
      "required": [
        "application_id"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "application_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "metadata",
      "customer",
      "parties",
      "documents"
    ],
    "alsoInBody": [],
    "closedBody": true,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "updateCardStatus",
    "toolset": "cards",
    "method": "patch",
    "path": "/v1/cards/{card_id}/update",
    "description": "Update a card's status and limit — Freezes, unfreezes or blocks a card, and sets its daily limit. Always send `limit` with `status`. A call without `limit` sets the limit to 0, which stops a live card from spending. To change only the limit, send the current status with the new limit. `blocked` is permanent. Allowed changes are `active` to `freeze` or `blocked`, `freeze` to `active` or `blocked`, and `inactive` to `active` or `blocked`. Gravv sends the `cards.status.update` webhook when the status changes. This route needs no Idempotency-Key.\n\nALWAYS send limit (whole USD per day) together with status: leaving limit out sets the card's daily limit to 0, and a live card stops working. status is required on every call: active, freeze or blocked; blocked is permanent. To change only the limit, resend the current status.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the card"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "freeze",
            "blocked"
          ]
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "description": "Daily limit in whole USD. Send it on every call.",
          "example": 200
        }
      },
      "required": [
        "card_id",
        "status",
        "limit"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "card_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "status",
      "limit"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  },
  {
    "name": "updateCustomer",
    "toolset": "customers",
    "method": "put",
    "path": "/v1/customers/{customer_id}",
    "description": "Update a customer — Updates the fields you send on one customer. The path `customer_id` selects the customer and replaces any `customer_id` in the body. Empty values change nothing, the customer type cannot change, and KYC status is not reset. The response does not include the customer. Get the customer to read the result.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The customer to update. It replaces any `customer_id` in the body."
        },
        "first_name": {
          "type": "string",
          "pattern": "^[A-Za-z\\s'-]+$",
          "description": "Letters, spaces, apostrophes and hyphens only."
        },
        "middle_name": {
          "type": "string",
          "example": "A."
        },
        "last_name": {
          "type": "string",
          "pattern": "^[A-Za-z\\s'-]+$",
          "description": "Letters, spaces, apostrophes and hyphens only."
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "New email. It must be unique in your tenant and use a company domain, for every customer type.",
          "example": "jane@acmecorp.com"
        },
        "phone": {
          "type": "string",
          "description": "A valid phone number in international format with a leading `+`, such as `+2348031234567`. Fictional ranges such as +1 555-01xx are rejected.",
          "example": "+2348031234567"
        },
        "date_of_birth": {
          "type": "string",
          "format": "date",
          "example": "1990-04-16"
        },
        "gender": {
          "type": "string",
          "enum": [
            "male",
            "female",
            "other"
          ],
          "example": "female"
        },
        "address": {
          "type": "object",
          "properties": {
            "address_line1": {
              "type": "string",
              "example": "12 Admiralty Way"
            },
            "address_line2": {
              "type": "string",
              "example": "Suite 202"
            },
            "city": {
              "type": "string",
              "example": "Lagos"
            },
            "postal_code": {
              "type": "string",
              "example": "106104"
            },
            "state": {
              "type": "string",
              "pattern": "^[A-Z]{2}-[A-Z0-9]{2,3}$",
              "example": "NG-LA"
            },
            "country": {
              "type": "string",
              "pattern": "^[A-Z]{2}$",
              "example": "NG"
            }
          },
          "required": [],
          "description": "New address. The state and country check runs only when you send both."
        },
        "business_name": {
          "type": "string",
          "pattern": "^[A-Za-z0-9\\s'&,.()-]+$",
          "example": "Acme Corporation"
        },
        "business_description": {
          "type": "string",
          "example": "Payments software"
        },
        "business_type": {
          "type": "string",
          "example": "private_limited"
        },
        "business_industry": {
          "type": "string",
          "example": "Information"
        },
        "registration_number": {
          "type": "string",
          "example": "RC-987654"
        },
        "external_id": {
          "type": "string",
          "example": "business_12345"
        },
        "associated_persons": {
          "type": "array",
          "description": "Business customers only. Ignored for individuals. Send `id` to edit a person. Omit it to add a new person, who then needs `first_name`, `last_name`, `email`, `gender`, `date_of_birth`, `phone` and `address`.",
          "items": {
            "type": "object",
            "description": "Send `id` to edit an existing person. Omit it to add a new person, who then needs `first_name`, `last_name`, `email`, `gender`, `date_of_birth`, `phone` and `address`.",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid",
                "description": "ID of an existing associated person. Omit it to add a new person.",
                "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              },
              "first_name": {
                "type": "string",
                "pattern": "^[A-Za-z\\s'-]+$",
                "description": "Letters, spaces, apostrophes and hyphens only."
              },
              "middle_name": {
                "type": "string",
                "example": "A."
              },
              "last_name": {
                "type": "string",
                "pattern": "^[A-Za-z\\s'-]+$",
                "description": "Letters, spaces, apostrophes and hyphens only."
              },
              "email": {
                "type": "string",
                "format": "email",
                "example": "jane.doe@acmecorp.com"
              },
              "date_of_birth": {
                "type": "string",
                "format": "date",
                "example": "1990-06-15"
              },
              "gender": {
                "type": "string",
                "enum": [
                  "male",
                  "female",
                  "other"
                ],
                "example": "female"
              },
              "phone": {
                "type": "string",
                "description": "A valid phone number in international format with a leading `+`, such as `+2348031234567`. Fictional ranges such as +1 555-01xx are rejected.",
                "example": "+2348031234567"
              },
              "address": {
                "type": "object",
                "required": [
                  "address_line1",
                  "city",
                  "postal_code",
                  "state",
                  "country"
                ],
                "properties": {
                  "address_line1": {
                    "type": "string",
                    "example": "12 Admiralty Way"
                  },
                  "address_line2": {
                    "type": "string",
                    "example": "Suite 202"
                  },
                  "city": {
                    "type": "string",
                    "maxLength": 100,
                    "example": "Lagos"
                  },
                  "postal_code": {
                    "type": "string",
                    "maxLength": 20,
                    "example": "106104"
                  },
                  "state": {
                    "type": "string",
                    "pattern": "^[A-Z]{2}-[A-Z0-9]{2,3}$",
                    "description": "ISO 3166-2 code, such as `NG-LA` or `US-FL`. It must belong to `country`.",
                    "example": "NG-LA"
                  },
                  "country": {
                    "type": "string",
                    "pattern": "^[A-Z]{2}$",
                    "description": "ISO 3166-1 alpha-2 code in upper case, such as `NG`.",
                    "example": "NG"
                  }
                }
              }
            }
          }
        }
      },
      "required": [
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "customer_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "phone",
      "date_of_birth",
      "gender",
      "address",
      "business_name",
      "business_description",
      "business_type",
      "business_industry",
      "registration_number",
      "external_id",
      "associated_persons"
    ],
    "alsoInBody": [
      "customer_id"
    ],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "customers.yaml"
  },
  {
    "name": "updateExternalAccount",
    "toolset": "external-accounts",
    "method": "patch",
    "path": "/v1/external-accounts/{external_account_id}",
    "description": "Update an external account — Corrects an external account. Use it to fix the bank details of a `setup_failed` account, which runs setup again, or to add the national ID, PIX key or address that a payout corridor asks for. An empty body on a failed account retries setup. It always returns 202. Get the account until it is `active` or `setup_failed`. A 409 means the account cannot change in its current state, so add a new one instead. This route needs no Idempotency-Key. A change to `routing_number` or `payment_rail` that leaves a US account on `wire` or `rtp` gets the same routing check as POST.\n\nOnly for a `setup_failed` (or long `pending`) external account, or to add national_id, national_id_type, pix_key or address. A null value clears a field and a missing one keeps it. It returns 202: poll getExternalAccount until `active` or `setup_failed`. A 409 means add a new external account instead.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "external_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the external account"
        },
        "account_name": {
          "type": "string",
          "description": "Cannot be cleared"
        },
        "account_number": {
          "type": [
            "string",
            "null"
          ]
        },
        "iban": {
          "type": [
            "string",
            "null"
          ]
        },
        "bic": {
          "type": [
            "string",
            "null"
          ]
        },
        "routing_number": {
          "type": [
            "string",
            "null"
          ]
        },
        "bank_name": {
          "type": [
            "string",
            "null"
          ]
        },
        "institution_id": {
          "type": [
            "string",
            "null"
          ]
        },
        "account_owner_type": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "individual",
            "business",
            null
          ]
        },
        "institution_country_iso_code": {
          "type": [
            "string",
            "null"
          ]
        },
        "payment_rail": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "ach",
            "wire",
            "rtp",
            null
          ]
        },
        "bank_account_type": {
          "type": [
            "string",
            "null"
          ],
          "enum": [
            "checking",
            "savings",
            null
          ]
        },
        "bank_address_line_1": {
          "type": [
            "string",
            "null"
          ]
        },
        "bank_city": {
          "type": [
            "string",
            "null"
          ]
        },
        "bank_state": {
          "type": [
            "string",
            "null"
          ]
        },
        "bank_postal_code": {
          "type": [
            "string",
            "null"
          ]
        },
        "bank_country": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_financial_institution": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_routing_number": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_address1": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_address2": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_city": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_state": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_zip_code": {
          "type": [
            "string",
            "null"
          ]
        },
        "intermediary_bank_country": {
          "type": [
            "string",
            "null"
          ]
        },
        "address": {
          "type": "object",
          "properties": {
            "address_line1": {
              "type": "string",
              "minLength": 4,
              "maxLength": 34,
              "example": "350 Fifth Avenue"
            },
            "address_line2": {
              "type": "string",
              "maxLength": 35
            },
            "house_building_number": {
              "type": "string",
              "maxLength": 35
            },
            "city": {
              "type": "string",
              "maxLength": 35,
              "example": "New York"
            },
            "state": {
              "type": "string",
              "maxLength": 35,
              "example": "NY"
            },
            "postal_code": {
              "type": "string",
              "description": "Checked against the country's postal code format",
              "example": "10118"
            },
            "country": {
              "type": "string",
              "description": "Alpha-2 code",
              "example": "US"
            }
          },
          "required": [],
          "description": "A new address needs `address_line1`, `city` and `country`. It cannot be cleared."
        },
        "national_id": {
          "type": [
            "string",
            "null"
          ]
        },
        "national_id_type": {
          "type": [
            "string",
            "null"
          ]
        },
        "pix_key": {
          "type": [
            "string",
            "null"
          ]
        }
      },
      "required": [
        "external_account_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "external_account_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "account_name",
      "account_number",
      "iban",
      "bic",
      "routing_number",
      "bank_name",
      "institution_id",
      "account_owner_type",
      "institution_country_iso_code",
      "payment_rail",
      "bank_account_type",
      "bank_address_line_1",
      "bank_city",
      "bank_state",
      "bank_postal_code",
      "bank_country",
      "intermediary_financial_institution",
      "intermediary_bank_routing_number",
      "intermediary_bank_address1",
      "intermediary_bank_address2",
      "intermediary_bank_city",
      "intermediary_bank_state",
      "intermediary_bank_zip_code",
      "intermediary_bank_country",
      "address",
      "national_id",
      "national_id_type",
      "pix_key"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "updateSettlementInstruction",
    "toolset": "fx",
    "method": "patch",
    "path": "/v1/settlement-instructions/{id}",
    "description": "Update a settlement instruction — Changes the details of an active settlement instruction, or makes it the default for its currency. To change the currency or type, delete it and create a new one. This route needs no Idempotency-Key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the settlement instruction"
        },
        "is_default": {
          "type": "boolean"
        },
        "account_name": {
          "type": "string"
        },
        "account_number": {
          "type": "string"
        },
        "bank_name": {
          "type": "string"
        },
        "bank_code": {
          "type": "string"
        },
        "routing_number": {
          "type": "string"
        },
        "swift_code": {
          "type": "string"
        },
        "iban": {
          "type": "string"
        },
        "country": {
          "type": "string"
        },
        "address": {
          "type": "object",
          "additionalProperties": true
        },
        "wallet_address": {
          "type": "string"
        },
        "network": {
          "type": "string"
        },
        "memo": {
          "type": "string"
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "is_default",
      "account_name",
      "account_number",
      "bank_name",
      "bank_code",
      "routing_number",
      "swift_code",
      "iban",
      "country",
      "address",
      "wallet_address",
      "network",
      "memo"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "settlement-instructions.yaml"
  },
  {
    "name": "uploadCardholderKycDocument",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/risk/upload-document",
    "description": "Upload a cardholder KYC document — Stores one document file for a cardholder. This is step 1 of server-to-server card KYC. Nothing is sent for review until you call `POST /v1/risk/start-kyc-s2s`. **Check `data.status`.** A validation failure returns HTTP 200 with `data.status: error` and a generic message. Common causes are a two-letter country, a file name that does not end in `.jpg`, `.jpeg`, `.png` or `.pdf`, a PDF selfie, or a date that is not YYYY-MM-DD. Every upload is stored as a front image. Send the back of a card as a second upload with `idDocSubType: BACK_SIDE`. Uploading the same type and subtype again replaces the earlier file. Keep files under 5 MB.\n\nSTEP 1 of server-to-server card KYC; then startCardholderKycS2S. Check data.status: a validation failure is HTTP 200 with status `error`. Pass file_path (a local JPEG, PNG or PDF of at most 5 MB; in sandbox, under 500 KB) in place of base64 content; filename must end in .jpg, .jpeg, .png or .pdf.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer this document belongs to",
          "example": "b84d9a52-2978-43e5-9b86-eac9839e1146"
        },
        "metadata": {
          "type": "object",
          "required": [
            "idDocType",
            "country"
          ],
          "properties": {
            "idDocType": {
              "type": "string",
              "description": "Type of document, in lower case. Individual customers need a `selfie` plus one of `passport`, `id_card` or `drivers_license`. Business customers need one of `company_doc`, `registration_certificate` or `formation_document`. These names differ from the customer KYC upload. Do not mix the two upload flows for one customer.",
              "enum": [
                "passport",
                "id_card",
                "drivers_license",
                "selfie",
                "residence_permit",
                "utility_bill",
                "bank_card",
                "vehicle_registration_certificate",
                "other",
                "registration_certificate",
                "company_doc",
                "formation_document",
                "ownership_document",
                "proof_of_address",
                "proof_of_address_document"
              ],
              "example": "passport"
            },
            "idDocSubType": {
              "type": "string",
              "description": "Which side of the document this is. Send the back of a card as a second upload with `BACK_SIDE`.",
              "enum": [
                "FRONT_SIDE",
                "BACK_SIDE"
              ],
              "example": "FRONT_SIDE"
            },
            "country": {
              "type": "string",
              "minLength": 3,
              "maxLength": 3,
              "description": "Issuing country as an ISO 3166-1 alpha-3 code. Required for every type, including `selfie`.",
              "example": "NGA"
            },
            "firstName": {
              "type": "string",
              "description": "First name as shown on the document",
              "example": "John",
              "maxLength": 100
            },
            "middleName": {
              "type": "string",
              "description": "Middle name as shown on the document",
              "example": "Michael",
              "maxLength": 100
            },
            "lastName": {
              "type": "string",
              "description": "Last name as shown on the document",
              "example": "Doe",
              "maxLength": 100
            },
            "issuedDate": {
              "type": "string",
              "format": "date",
              "description": "Issue date as YYYY-MM-DD",
              "example": "2020-01-15"
            },
            "validUntil": {
              "type": "string",
              "format": "date",
              "description": "Expiry date as YYYY-MM-DD",
              "example": "2030-01-15"
            },
            "number": {
              "type": "string",
              "description": "Document number",
              "example": "A12345678",
              "maxLength": 50
            },
            "dob": {
              "type": "string",
              "format": "date",
              "description": "Date of birth as YYYY-MM-DD",
              "example": "1990-05-20"
            },
            "placeOfBirth": {
              "type": "string",
              "description": "Place of birth as shown on the document",
              "example": "New York, NY",
              "maxLength": 100
            }
          }
        },
        "content": {
          "type": "string",
          "format": "byte",
          "description": "The file as plain standard base64. The decoded file must be a JPEG, PNG or PDF. Keep files under 5 MB. Larger files fail with a 400.",
          "example": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        "filename": {
          "type": "string",
          "description": "Name of the file. It must end in `.jpg`, `.jpeg`, `.png` or `.pdf`, in any case.",
          "example": "passport_front.jpg",
          "maxLength": 255,
          "pattern": "\\.([Jj][Pp][Ee]?[Gg]|[Pp][Nn][Gg]|[Pp][Dd][Ff])$"
        },
        "file_path": {
          "type": "string",
          "minLength": 1,
          "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 5 MB, and sends it as content, filling filename when you leave them out. Send file_path or content, not both; with content, send filename yourself."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "metadata"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "metadata",
      "content",
      "filename"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "risk.yaml"
  },
  {
    "name": "uploadCustomerKycDocument",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/upload-document",
    "description": "Upload a KYC document — Stores one document file for a customer. This is step 1 of server-to-server verification. Upload each document, and each side of a two-sided card, in a separate call. Nothing is sent for review until you call `POST /v1/customers/kyc/start-s2s`. Individual and UBO customers need one identity document (`PASSPORT`, `ID_CARD` or `DRIVERS`) with `FRONT_SIDE`, plus a `SELFIE`. Identity documents also need `country`, `number` and `validUntil`. A selfie must be a JPEG or PNG. Business customers use `idDocType: COMPANY_DOC` for every file and set `idDocSubType` to `INCORPORATION_CERT`, `SHAREHOLDER_REGISTRY`, `PROOF_OF_ADDRESS` and `TAX_DOCUMENT` (or `OTHER`). Uploading the same type and subtype again replaces the earlier file. On tenants with automatic document verification, the upload that completes the required set also completes KYC.\n\nSTEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails. Pass file_path (a local JPEG, PNG or PDF of at most 10 MB; in sandbox, under 500 KB) in place of base64 content.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer this document belongs to",
          "example": "b84d9a52-2978-43e5-9b86-eac9839e1146"
        },
        "metadata": {
          "type": "object",
          "required": [
            "idDocType"
          ],
          "properties": {
            "idDocType": {
              "type": "string",
              "description": "Type of document. Individual and UBO customers may upload `PASSPORT`, `ID_CARD`, `DRIVERS`, `SELFIE`, `PROOF_OF_ADDRESS` or `TAX_DECLARATION`. To start verification they need one identity document (`PASSPORT`, `ID_CARD` or `DRIVERS`) with a front image, plus a `SELFIE`. Business customers upload only `COMPANY_DOC`, once for each `idDocSubType`.",
              "enum": [
                "PASSPORT",
                "ID_CARD",
                "DRIVERS",
                "SELFIE",
                "PROOF_OF_ADDRESS",
                "TAX_DECLARATION",
                "COMPANY_DOC"
              ],
              "example": "PASSPORT"
            },
            "idDocSubType": {
              "type": "string",
              "description": "Which part of the document this is. Values are case-sensitive. Identity documents need `FRONT_SIDE`, and `BACK_SIDE` as a separate upload for two-sided cards. `COMPANY_DOC` needs one of `INCORPORATION_CERT`, `SHAREHOLDER_REGISTRY`, `PROOF_OF_ADDRESS`, `TAX_DOCUMENT` or `OTHER`. A business needs each of the first three, plus `TAX_DOCUMENT` or `OTHER`. Omit it for `SELFIE`, `PROOF_OF_ADDRESS` and `TAX_DECLARATION`.",
              "enum": [
                "FRONT_SIDE",
                "BACK_SIDE",
                "INCORPORATION_CERT",
                "SHAREHOLDER_REGISTRY",
                "PROOF_OF_ADDRESS",
                "TAX_DOCUMENT",
                "OTHER"
              ],
              "example": "FRONT_SIDE"
            },
            "country": {
              "type": "string",
              "minLength": 2,
              "maxLength": 3,
              "description": "Issuing country as an ISO 3166-1 alpha-2 or alpha-3 code. Required for every type except `SELFIE`. The response gives it as alpha-3.",
              "example": "NGA"
            },
            "number": {
              "type": "string",
              "description": "Document number. Required for `PASSPORT`, `ID_CARD` and `DRIVERS`.",
              "example": "A12345678",
              "maxLength": 50
            },
            "validUntil": {
              "type": "string",
              "description": "Expiry date as YYYY-MM-DD. Required for `PASSPORT`, `ID_CARD` and `DRIVERS`. The format is not checked here, but the verification review may reject a bad date.",
              "example": "2030-01-15"
            },
            "issuedDate": {
              "type": "string",
              "description": "Issue date as YYYY-MM-DD.",
              "example": "2020-01-15"
            },
            "firstName": {
              "type": "string",
              "description": "First name as shown on the document",
              "example": "John",
              "maxLength": 100
            },
            "middleName": {
              "type": "string",
              "description": "Middle name as shown on the document",
              "example": "Michael",
              "maxLength": 100
            },
            "lastName": {
              "type": "string",
              "description": "Last name as shown on the document",
              "example": "Doe",
              "maxLength": 100
            },
            "dob": {
              "type": "string",
              "description": "Date of birth as YYYY-MM-DD.",
              "example": "1990-05-20"
            },
            "placeOfBirth": {
              "type": "string",
              "description": "Place of birth as shown on the document",
              "example": "New York, NY",
              "maxLength": 100
            }
          }
        },
        "content": {
          "type": "string",
          "format": "byte",
          "description": "The file as plain standard base64, with no `data:` prefix. The decoded file must be a JPEG, PNG or PDF. The service checks the file bytes, not the name. The maximum decoded size is 10 MB. In sandbox, keep files under about 500 KB.",
          "example": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        "filename": {
          "type": "string",
          "description": "Name of the file. The extension is not checked. The content decides the file type.",
          "example": "passport_front.jpg",
          "maxLength": 255
        },
        "file_path": {
          "type": "string",
          "minLength": 1,
          "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 10 MB, and sends it as content, filling filename when you leave them out. Send file_path or content, not both; with content, send filename yourself."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "metadata"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "metadata",
      "content",
      "filename"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "uploadTransferDocument",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer/documents",
    "description": "Upload a supporting document — Uploads a document, such as an invoice, for a payout that needs one. Pass the returned `id` in `supporting_document_ids` on `POST /v1/transfer` or on resume. A document can be used by one transfer only, and an unused one is deleted after 7 days. The file must be PDF, PNG or JPEG, at most 700 KB.\n\nUpload before createTransfer or resumeTransfer when `requirements` asks for a supporting document, and pass the returned id in supporting_document_ids. Pass file_path (a local PDF, PNG or JPEG of at most 700 KB; in sandbox, under 500 KB): the server reads it and fills content, file_name and content_type.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "example": "bb6c6022-f1d8-492f-80f0-7547134bb42f"
        },
        "document_type": {
          "type": "string",
          "enum": [
            "invoice",
            "proforma_invoice",
            "purchase_order",
            "contract",
            "receipt",
            "bill_of_lading",
            "customs_declaration",
            "bank_statement",
            "proof_of_income",
            "tax_document",
            "other"
          ],
          "example": "invoice"
        },
        "description": {
          "type": "string",
          "maxLength": 140,
          "description": "Required when `document_type` is `other`"
        },
        "file_name": {
          "type": "string",
          "example": "inv-2026-114.pdf"
        },
        "content_type": {
          "type": "string",
          "description": "Must match the file itself",
          "enum": [
            "application/pdf",
            "image/png",
            "image/jpeg"
          ]
        },
        "content": {
          "type": "string",
          "description": "The file as standard base64, at most 700 KB decoded",
          "example": "<base64>"
        },
        "file_path": {
          "type": "string",
          "minLength": 1,
          "description": "Path of a local file to send instead of content. The server reads it, checks that it is JPEG, PNG, PDF (by its bytes, not its name) and at most 700 KB, and sends it as content, filling file_name and content_type when you leave them out. Send file_path or content, not both; with content, send file_name and content_type yourself."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "customer_id",
        "document_type"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "document_type",
      "description",
      "file_name",
      "content_type",
      "content"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "verifyExternalAccount",
    "toolset": "external-accounts",
    "method": "post",
    "path": "/v1/external-accounts/verify",
    "description": "Verify an external account — Checks account details before you add the external account, and returns the holder's name when the bank can look it up. Send `account_number` with `institution_id`. Only that pair reaches the bank. `verified: true` with `verification_source: local` means only the format was checked. Trust the name only when `verification_source` is `provider`. An IBAN, phone or CLABE alone is checked locally. This route needs no Idempotency-Key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_number": {
          "type": "string",
          "description": "The only identifier that the bank looks up",
          "example": "0123456789"
        },
        "institution_id": {
          "type": "string",
          "format": "uuid",
          "description": "The bank to ask. Without it the lookup is not scoped to a bank.",
          "example": "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f"
        },
        "iban": {
          "type": "string",
          "description": "Checked with mod 97 only"
        },
        "bic": {
          "type": "string"
        },
        "phone": {
          "type": "string",
          "description": "Accepted, but not verified"
        },
        "clabe": {
          "type": "string",
          "description": "Accepted, but not verified"
        }
      },
      "required": [],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "account_number",
      "institution_id",
      "iban",
      "bic",
      "phone",
      "clabe"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "verifyRtpRoutingNumber",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/routing-numbers/{routing_number}/rtp",
    "description": "Check a routing number for RTP — Checks whether a US routing number can receive instant payments through Gravv, before you add an `ach_wire` external account with `payment_rail` `rtp`. A bank can take some instant payments and still answer false. When `valid` is false, adding the account for `rtp` returns 400 with the code `ERROR_CODE_INVALID_RTP_ROUTING_NUMBER`, so add it for `ach` or `wire` instead. `valid: false` is a 200, not an error. A 503 means the check could not run, so retry it. This route needs no Idempotency-Key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "routing_number": {
          "type": "string",
          "pattern": "^[0-9]{9}$",
          "description": "A US ABA routing number, 9 digits"
        }
      },
      "required": [
        "routing_number"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "routing_number"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "verifyWireRoutingNumber",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/routing-numbers/{routing_number}/wire",
    "description": "Check a routing number for wire — Checks whether a US routing number can receive wires, before you add an `ach_wire` external account with `payment_rail` `wire`. Some banks use one routing number for ACH and another for wires. When `valid` is false, adding the account for `wire` returns 400 with the code `ERROR_CODE_INVALID_WIRE_ROUTING_NUMBER`, so ask for the bank's wire routing number or add the account for `ach`. `valid: false` is a 200, not an error. A 503 means the check could not run, so retry it. This route needs no Idempotency-Key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "routing_number": {
          "type": "string",
          "pattern": "^[0-9]{9}$",
          "description": "A US ABA routing number, 9 digits"
        }
      },
      "required": [
        "routing_number"
      ],
      "additionalProperties": false
    },
    "pathParams": [
      "routing_number"
    ],
    "queryParams": [],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "withdrawFromCard",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards/withdraw",
    "description": "Withdraw from a card — Moves money from an `active` card back to its card account. Some cards, including every new sandbox card, answer `this card withdraws by transfer`; for those, use createTransfer from the card to its card account. The result is also sent as the `cards.transaction.withdraw` webhook.\n\nMOVES MONEY: requires confirm: true. Works for cards on the live card programme and for older sandbox cards. New sandbox cards and some live cards refuse with 'this card withdraws by transfer'. The card must be `active`, and the amount (USD, at most 2 decimals) must not exceed the balance from getCardBalance. Funds go to the card's own account wallet.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "example": "dce0192a-9b3d-440b-9500-33dc9ac8dc20"
        },
        "amount": {
          "type": "number",
          "exclusiveMinimum": 0,
          "description": "USD, as a JSON number with at most 2 decimal places, not more than the card's `balance`",
          "example": 20
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        },
        "idempotency_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[\\x20-\\x7E]+$",
          "description": "Optional. Leave it out and a new key is made for this call. Set it only to repeat a call whose outcome is unknown (a timeout, a network error or a 5xx answer): pass the idempotency_key from that result and exactly the same arguments. If the first call took effect, the API returns its answer instead of running it again. A 5xx answer is not kept, so look the result up first. After a 4xx answer, leave it out: that answer is kept for 24 hours under its key."
        }
      },
      "required": [
        "card_id",
        "amount"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "card_id",
      "amount"
    ],
    "alsoInBody": [],
    "closedBody": false,
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "cards.yaml"
  }
];

export const TOOLS_BY_NAME: ReadonlyMap<string, GeneratedTool> = new Map(
  TOOLS.map((t) => [t.name, t]),
);
