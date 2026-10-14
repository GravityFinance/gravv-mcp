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
    "toolset": "features",
    "method": "post",
    "path": "/v1/risk/features/activate",
    "description": "Activate a feature — Turns on a feature for a customer. For `virtual_cards` it creates a card application and, when the application is approved, issues a virtual card. Cards need completed KYC with a liveness check, a card-type account, and `provider_data` with `annual_remuneration` and `estimated_monthly_limit`. If the customer has no liveness check, the status is `pending_liveness`: give the cardholder `websdk_url`, then call again. `crypto_wallet` and `international_transfers` become active at once. An activation that already exists is returned unchanged. Every error is HTTP 400.",
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
          "description": "`virtual_cards` (Cards), `usd_account`, `eur_account` and `gbp_account` (accounts), `crypto_wallet` (Wallet) and `international_transfers` (Payout).",
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
          "description": "Data the feature needs. Only `virtual_cards` reads it today; it is required for that feature. Send numbers as JSON numbers.",
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
              "description": "Expected monthly card spend. Required for `virtual_cards`. It also becomes the card's spending limit.",
              "example": 200
            },
            "account_id": {
              "type": "string",
              "format": "uuid",
              "description": "A card-type account of this customer. Leave it out to use the customer's card account.",
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
              "description": "Replaced by the IP address of the calling server when one is present. You do not need to send it."
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
    "description": "Charge card — Charges a saved card against an open payment intent, server to server. Use it for repeat charges after the payer saved a card. The card must be saved under the intent's `client_customer_id`. A saved card can be charged at most 5 times in 24 hours, and each charge can be at most 3 times the card's first payment. A declined charge returns HTTP 400 with a sentence such as `The card has insufficient funds: payment declined`.\n\nMOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",
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
          "description": "A saved card token, saved under the intent's `client_customer_id`",
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
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "checkFeatureEligibility",
    "toolset": "features",
    "method": "post",
    "path": "/v1/risk/features/eligibility",
    "description": "Check feature eligibility — Lists the requirements a customer has met, and those still pending, for one feature. The call only reads data, but it is a POST and needs an Idempotency-Key. A repeated key returns the cached answer for 24 hours, so use a new key for each check. Every error is HTTP 400.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "feature_id": {
          "type": "string",
          "description": "`virtual_cards` (Cards), `usd_account`, `eur_account` and `gbp_account` (accounts), `crypto_wallet` (Wallet) and `international_transfers` (Payout).",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "features.yaml"
  },
  {
    "name": "completeAccountApplicationTos",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/tos",
    "description": "Complete TOS acceptance — Record the applicant's acceptance of the provider terms of service for a draft application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the draft application accepting the terms.",
          "example": "550e8400-e29b-41d4-a716-446655440001"
        },
        "agreement_id": {
          "type": "string",
          "description": "Provider agreement identifier being accepted.",
          "example": "agr_123"
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
        "application_id",
        "agreement_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "application_id",
      "agreement_id"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "createAccount",
    "toolset": "accounts",
    "method": "post",
    "path": "/v1/accounts",
    "description": "Create an account — Opens an internal account for a customer whose KYC is completed. Call `GET /v1/accounts/capabilities` first to choose the bank, currency and network. Business customers and customer card accounts use the account application flow instead. USD, EUR, GBP, MXN and BRL accounts return `status: pending` while the bank sets them up. Wait for the `account.activated` webhook, or get the account until it is `active`, before you share deposit details. NGN and `non_custodial` accounts are `active` at once. Every error is HTTP 400, including not found and duplicates. Use `polygon` for sandbox testing.\n\nPREREQUISITE: the customer must exist and have passed KYC. Call getCustomer and check that the `kyc` entry with type `basic` has status `completed`. An account cannot be opened for an unverified customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency": {
          "type": "string",
          "description": "Currency code. Each bank supports fewer currencies than this list: `lead_bank` USD, EUR, GBP, MXN and BRL; `cross_river_bank` USD; `nigerian_bank` NGN. Call `GET /v1/accounts/capabilities` first.",
          "example": "USD",
          "enum": [
            "USD",
            "CAD",
            "MXN",
            "EUR",
            "GBP",
            "CHF",
            "NGN",
            "KES",
            "ZAR",
            "GHS",
            "UGX",
            "TZS",
            "EGP",
            "XOF",
            "XAF",
            "BRL"
          ]
        },
        "type": {
          "type": "string",
          "description": "Type of account. `card`, `auto_sweep` and `default` are only for your own accounts; open a customer's card account with an account application.",
          "example": "regular",
          "enum": [
            "regular",
            "savings",
            "collection",
            "non_custodial",
            "card",
            "auto_sweep",
            "default"
          ]
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
          "description": "ID of the customer who owns this account",
          "example": "550e8400-e29b-41d4-a716-446655440178"
        },
        "blockchain_network": {
          "type": "string",
          "description": "Network of the account's wallet, in lower case. `lead_bank` takes arbitrum, avalanche_c_chain, base, celo, ethereum, optimism, polygon, solana, stellar, tempo and tron. `cross_river_bank` takes polygon, ethereum, solana, base, bsc, flow_evm, canton and tron. NGN accounts always use polygon. Only polygon, ethereum, base, solana and stellar work end to end today, so prefer those.",
          "example": "polygon",
          "enum": [
            "polygon",
            "ethereum",
            "base",
            "solana",
            "stellar",
            "arbitrum",
            "avalanche_c_chain",
            "celo",
            "optimism",
            "tempo",
            "tron",
            "bsc",
            "flow_evm",
            "canton"
          ]
        },
        "bank": {
          "type": "string",
          "description": "Bank to open the account with. Leave it out to let Gravv choose the first bank that supports the currency, network and type.",
          "enum": [
            "lead_bank",
            "cross_river_bank",
            "nigerian_bank"
          ],
          "example": "lead_bank"
        },
        "wallet_address": {
          "type": "string",
          "description": "An existing wallet of yours on `blockchain_network`. Leave it out to create a new wallet.",
          "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
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
      "bank",
      "wallet_address"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "createAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications",
    "description": "Create account application — Create a new account application for a given customer. For sandbox and testing integrations, use `polygon` as the `blockchain_network`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the customer submitting the application.",
          "example": "123e4567-e89b-12d3-a456-426614174000"
        },
        "application_type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ],
          "description": "Type of application. One of individual or business.",
          "example": "individual"
        },
        "data": {
          "type": "object",
          "description": "Application data including KYC information and account configuration.",
          "required": [
            "account_type",
            "currency"
          ],
          "properties": {
            "individual": {
              "type": "object",
              "properties": {
                "first_name": {
                  "type": "string",
                  "description": "First name of the individual. Required.",
                  "example": "John"
                },
                "last_name": {
                  "type": "string",
                  "description": "Last name of the individual. Required.",
                  "example": "Doe"
                },
                "middle_name": {
                  "type": "string",
                  "description": "Middle name of the individual.",
                  "example": "Robert"
                },
                "email": {
                  "type": "string",
                  "format": "email",
                  "description": "Email address of the individual. Required.",
                  "example": "john.doe@example.com"
                },
                "role": {
                  "type": "string",
                  "description": "Role of the individual in the application (for example, owner).",
                  "example": "owner"
                },
                "phone": {
                  "type": "string",
                  "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                  "example": "+14155552671"
                },
                "date_of_birth": {
                  "type": "string",
                  "format": "date",
                  "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                  "example": "1980-01-01"
                },
                "gender": {
                  "type": "string",
                  "description": "Gender of the individual.",
                  "example": "male"
                },
                "nationality": {
                  "type": "string",
                  "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "ssn": {
                  "type": "string",
                  "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "tin": {
                  "type": "string",
                  "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "income_source": {
                  "type": "string",
                  "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                  "example": "employment"
                },
                "employment_status": {
                  "type": "string",
                  "description": "Current employment status of the individual (for example, employed or self_employed).",
                  "example": "employed"
                },
                "citizenship": {
                  "type": "string",
                  "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": "US"
                },
                "identification_type": {
                  "type": "string",
                  "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                  "example": "passport"
                },
                "identification_number": {
                  "type": "string",
                  "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                  "example": "P1234567"
                },
                "identification_country": {
                  "type": "string",
                  "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "identification_expiry": {
                  "type": "string",
                  "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                  "example": "2030-01-01"
                },
                "address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "id_document_front": {
                  "type": "string",
                  "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "id_document_back": {
                  "type": "string",
                  "description": "Back of the government-issued ID, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of address document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "source_of_wealth": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                  "example": [
                    "SALARY"
                  ]
                },
                "source_of_wealth_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of wealth when not covered by the standard options.",
                  "example": "Salary from tech job"
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "PERSONAL_BANKING"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Personal savings"
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "INCOME"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Income"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "business": {
              "type": "object",
              "properties": {
                "legal_name": {
                  "type": "string",
                  "description": "Registered legal name of the business. Required.",
                  "example": "Acme Corp"
                },
                "trade_name": {
                  "type": "string",
                  "description": "Trading name or DBA (doing business as) name of the business.",
                  "example": "Acme"
                },
                "description": {
                  "type": "string",
                  "description": "Description of the business operations. May be required (minimum 100 characters).",
                  "example": "A software development company specializing in enterprise tools and developer infrastructure."
                },
                "type": {
                  "type": "string",
                  "description": "Legal entity type of the business (for example, llc or corporation). Required.",
                  "example": "llc"
                },
                "industry": {
                  "type": "string",
                  "description": "Industry category of the business. May be required depending on your account configuration.",
                  "example": "software"
                },
                "website": {
                  "type": "string",
                  "description": "Public-facing website URL of the business.",
                  "example": "https://acme.corp"
                },
                "registration_number": {
                  "type": "string",
                  "description": "Official registration or incorporation number of the business.",
                  "example": "12345678"
                },
                "tax_id_number": {
                  "type": "string",
                  "description": "Tax Identification Number (TIN) of the business. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "date_of_incorporation": {
                  "type": "string",
                  "description": "Date the business was incorporated, in YYYY-MM-DD format.",
                  "example": "2010-01-01"
                },
                "country_of_incorporation": {
                  "type": "string",
                  "description": "Country where the business is incorporated, in ISO 3166-1 alpha-2 format. Some account configurations require this to be US.",
                  "example": "US"
                },
                "state_of_incorporation": {
                  "type": "string",
                  "description": "US state where the business is incorporated. May be required depending on your account configuration.",
                  "example": "DE"
                },
                "business_status": {
                  "type": "string",
                  "description": "Current operating status of the business (for example, active or inactive).",
                  "example": "active"
                },
                "registered_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "physical_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "mailing_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "primary_contact": {
                  "type": "object",
                  "properties": {
                    "first_name": {
                      "type": "string",
                      "description": "First name of the individual. Required.",
                      "example": "John"
                    },
                    "last_name": {
                      "type": "string",
                      "description": "Last name of the individual. Required.",
                      "example": "Doe"
                    },
                    "middle_name": {
                      "type": "string",
                      "description": "Middle name of the individual.",
                      "example": "Robert"
                    },
                    "email": {
                      "type": "string",
                      "format": "email",
                      "description": "Email address of the individual. Required.",
                      "example": "john.doe@example.com"
                    },
                    "role": {
                      "type": "string",
                      "description": "Role of the individual in the application (for example, owner).",
                      "example": "owner"
                    },
                    "phone": {
                      "type": "string",
                      "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                      "example": "+14155552671"
                    },
                    "date_of_birth": {
                      "type": "string",
                      "format": "date",
                      "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                      "example": "1980-01-01"
                    },
                    "gender": {
                      "type": "string",
                      "description": "Gender of the individual.",
                      "example": "male"
                    },
                    "nationality": {
                      "type": "string",
                      "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "ssn": {
                      "type": "string",
                      "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "tin": {
                      "type": "string",
                      "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "income_source": {
                      "type": "string",
                      "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                      "example": "employment"
                    },
                    "employment_status": {
                      "type": "string",
                      "description": "Current employment status of the individual (for example, employed or self_employed).",
                      "example": "employed"
                    },
                    "citizenship": {
                      "type": "string",
                      "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": "US"
                    },
                    "identification_type": {
                      "type": "string",
                      "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                      "example": "passport"
                    },
                    "identification_number": {
                      "type": "string",
                      "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                      "example": "P1234567"
                    },
                    "identification_country": {
                      "type": "string",
                      "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "identification_expiry": {
                      "type": "string",
                      "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                      "example": "2030-01-01"
                    },
                    "address": {
                      "type": "object",
                      "properties": {
                        "street_line_1": {
                          "type": "string",
                          "description": "Street address, PO box, company name, c/o",
                          "example": "123 Main St"
                        },
                        "street_line_2": {
                          "type": "string",
                          "description": "Apartment, suite, unit, building, floor, etc.",
                          "example": "Apt 4B"
                        },
                        "city": {
                          "type": "string",
                          "description": "City",
                          "example": "San Francisco"
                        },
                        "state": {
                          "type": "string",
                          "description": "State, province, county",
                          "example": "CA"
                        },
                        "postal_code": {
                          "type": "string",
                          "description": "ZIP or postal code",
                          "example": "94105"
                        },
                        "country": {
                          "type": "string",
                          "description": "Country (ISO 3166-1 alpha-2)",
                          "example": "US"
                        }
                      },
                      "required": [
                        "street_line_1",
                        "city",
                        "state",
                        "postal_code",
                        "country"
                      ]
                    },
                    "id_document_front": {
                      "type": "string",
                      "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "id_document_back": {
                      "type": "string",
                      "description": "Back of the government-issued ID, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "proof_of_address_document": {
                      "type": "string",
                      "description": "Proof of address document, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "source_of_wealth": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                      "example": [
                        "SALARY"
                      ]
                    },
                    "source_of_wealth_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of wealth when not covered by the standard options.",
                      "example": "Salary from tech job"
                    },
                    "account_purposes": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Purposes for opening the account. May be required depending on your account configuration.",
                      "example": [
                        "PERSONAL_BANKING"
                      ]
                    },
                    "account_purposes_other_description": {
                      "type": "string",
                      "description": "Free-text description of account purposes when not covered by the standard options.",
                      "example": "Personal savings"
                    },
                    "source_of_funds_list": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of funds for the account. May be required depending on your account configuration.",
                      "example": [
                        "INCOME"
                      ]
                    },
                    "source_of_funds_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of funds when not covered by the standard options.",
                      "example": "Income"
                    },
                    "expected_counterparty_countries": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": [
                        "US",
                        "GB"
                      ]
                    },
                    "expected_fiat_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                      "example": "10000_TO_50000"
                    },
                    "expected_crypto_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of crypto transactions.",
                      "example": "10000_TO_50000"
                    }
                  }
                },
                "associated_persons": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "description": "Standardized associated person (UBO, control person, etc.)",
                    "properties": {
                      "first_name": {
                        "type": "string",
                        "description": "First name of the associated person.",
                        "example": "Jane"
                      },
                      "last_name": {
                        "type": "string",
                        "description": "Last name of the associated person.",
                        "example": "Smith"
                      },
                      "middle_name": {
                        "type": "string",
                        "description": "Middle name of the associated person.",
                        "example": "Anne"
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "description": "Email address of the associated person.",
                        "example": "jane@acme.corp"
                      },
                      "phone": {
                        "type": "string",
                        "description": "Phone number of the associated person, in E.164 format.",
                        "example": "+14155552672"
                      },
                      "date_of_birth": {
                        "type": "string",
                        "format": "date",
                        "description": "Date of birth of the associated person, in YYYY-MM-DD format.",
                        "example": "1985-06-15"
                      },
                      "citizenship": {
                        "type": "string",
                        "description": "Country of citizenship, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "ssn": {
                        "type": "string",
                        "description": "Social Security Number of the associated person.",
                        "example": "000000000"
                      },
                      "title": {
                        "type": "string",
                        "description": "Job title of the associated person (for example, CEO or CFO).",
                        "example": "CEO"
                      },
                      "role": {
                        "type": "string",
                        "description": "Role of the associated person in the business (for example, director or officer).",
                        "example": "director"
                      },
                      "has_ownership": {
                        "type": "boolean",
                        "description": "Indicates whether the person holds an ownership stake in the business.",
                        "example": true
                      },
                      "has_control": {
                        "type": "boolean",
                        "description": "Indicates whether the person has control over the business.",
                        "example": true
                      },
                      "is_signer": {
                        "type": "boolean",
                        "description": "Indicates whether the person is an authorized signer on the account.",
                        "example": true
                      },
                      "is_director": {
                        "type": "boolean",
                        "description": "Indicates whether the person is a director of the business.",
                        "example": true
                      },
                      "ownership_percentage": {
                        "type": "integer",
                        "description": "Percentage of the business owned by this person.",
                        "example": 100
                      },
                      "address": {
                        "type": "object",
                        "properties": {
                          "street_line_1": {
                            "type": "string",
                            "description": "Street address, PO box, company name, c/o",
                            "example": "123 Main St"
                          },
                          "street_line_2": {
                            "type": "string",
                            "description": "Apartment, suite, unit, building, floor, etc.",
                            "example": "Apt 4B"
                          },
                          "city": {
                            "type": "string",
                            "description": "City",
                            "example": "San Francisco"
                          },
                          "state": {
                            "type": "string",
                            "description": "State, province, county",
                            "example": "CA"
                          },
                          "postal_code": {
                            "type": "string",
                            "description": "ZIP or postal code",
                            "example": "94105"
                          },
                          "country": {
                            "type": "string",
                            "description": "Country (ISO 3166-1 alpha-2)",
                            "example": "US"
                          }
                        },
                        "required": [
                          "street_line_1",
                          "city",
                          "state",
                          "postal_code",
                          "country"
                        ]
                      },
                      "identification_type": {
                        "type": "string",
                        "description": "Type of government-issued ID (for example, passport or drivers_license).",
                        "example": "passport"
                      },
                      "identification_number": {
                        "type": "string",
                        "description": "Document number of the government-issued ID.",
                        "example": "P7654321"
                      },
                      "identification_country": {
                        "type": "string",
                        "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "identification_expiry": {
                        "type": "string",
                        "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                        "example": "2030-01-01"
                      },
                      "id_document_front": {
                        "type": "string",
                        "description": "Front of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "id_document_back": {
                        "type": "string",
                        "description": "Back of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "proof_of_address_document": {
                        "type": "string",
                        "description": "Proof of address document, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      }
                    }
                  },
                  "description": "Provide at least one associated person."
                },
                "has_material_intermediary_ownership": {
                  "type": "boolean",
                  "description": "Indicates whether the business has ownership held through a material intermediary.",
                  "example": false
                },
                "formation_document": {
                  "type": "string",
                  "description": "Business formation document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "ownership_document": {
                  "type": "string",
                  "description": "Document showing the ownership structure of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of business address, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_nature_of_business": {
                  "type": "string",
                  "description": "Document that verifies the nature of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_dao": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a decentralized autonomous organization (DAO).",
                  "example": false
                },
                "account_purpose": {
                  "type": "string",
                  "description": "Primary purpose for opening the account (for example, operations or payroll).",
                  "example": "operations"
                },
                "source_of_funds": {
                  "type": "string",
                  "description": "Primary source of business funds (for example, revenue or investment).",
                  "example": "revenue"
                },
                "industry_financial_services_subtype": {
                  "type": "string",
                  "description": "Subtype of financial services industry, if applicable.",
                  "example": "none"
                },
                "industry_crypto_subtype": {
                  "type": "string",
                  "description": "Subtype of crypto industry, if applicable.",
                  "example": "none"
                },
                "industry_other_description": {
                  "type": "string",
                  "description": "Description of the industry when it does not fit a standard category.",
                  "example": "Software dev"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the business expects to transact, in ISO 3166-1 alpha-2 format.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "REVENUE"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Sales revenue"
                },
                "tin_verification_document": {
                  "type": "string",
                  "description": "Document verifying the business TIN, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "authorization_document": {
                  "type": "string",
                  "description": "Authorization document for the account, as a Base64 data URI. May be used depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_msb": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a money services business (MSB).",
                  "example": false
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "BUSINESS_OPERATIONS"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Operations"
                },
                "primary_target_market": {
                  "type": "string",
                  "description": "Primary geographic market the business targets.",
                  "example": "US"
                },
                "primary_target_market_other_description": {
                  "type": "string",
                  "description": "Free-text description of the primary target market when not covered by the standard options.",
                  "example": "US market"
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "account_type": {
              "type": "string",
              "enum": [
                "regular",
                "savings",
                "card",
                "auto_sweep",
                "collection"
              ],
              "description": "Kind of account to open. This is the account type, not the customer type; use `application_type` for individual or business. A customer can have one `card` account.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Network of the account's wallet, in lower case. Required by every bank that issues a wallet, which is most of them. Use `polygon` for sandbox testing.",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Address of an existing wallet of yours on `blockchain_network`. Send it together with `wallet_id`, or send neither.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of an existing wallet of yours. Send it together with `wallet_address`, or send neither.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the signed terms of service agreement. Set it while the application is `draft` or `rejected`, or use the terms of service route while it is `draft`.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "Set by Gravv on create when the end customer must accept the bank's terms of service. Show it to them before you submit.",
              "example": "https://example.com/tos"
            },
            "metadata": {
              "type": "object",
              "additionalProperties": true,
              "description": "Arbitrary key-value pairs for storing additional information about the application.",
              "example": {
                "source": "web"
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
        "application_type",
        "data"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "application_type",
      "data"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "createAccountV2",
    "toolset": "accounts",
    "method": "post",
    "path": "/v2/accounts",
    "description": "Create an account — Opens a bank account, with a token wallet where the bank offers one, for a customer whose KYC is completed. First call `GET /v1/accounts/capabilities` to choose `bank_code`, `currency` and `account_type`, then `GET /v2/accounts/requirements` to build `data`. The response has only `account_id` and `status: pending`. Get the account for `application_id` and `status_reason`, and poll until it is `active`, or wait for the `applications.accounts.completed` webhook. v2 accounts do not send `account.activated`. Unknown fields are rejected. When you retry, reuse the same Idempotency-Key.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "An existing customer whose KYC is completed. It is checked before every other field.",
          "example": "0b6f3c1e-2a4d-4c8e-9f10-7d2a6b5e4c33"
        },
        "customer_type": {
          "type": "string",
          "description": "`individual` or `business`. Always send it: bank choice and routing use the value you send. Defaults to the customer's profile type.",
          "enum": [
            "individual",
            "business"
          ],
          "example": "individual"
        },
        "account_type": {
          "type": "string",
          "description": "Account type from the capabilities, such as `operating`, `yield` or `revenue`. Defaults to `operating`.",
          "example": "operating"
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Za-z]{3}$",
          "description": "Three-letter ISO 4217 code",
          "example": "USD"
        },
        "category": {
          "type": "string",
          "enum": [
            "main",
            "sub_account",
            "virtual",
            "multi_currency"
          ],
          "example": "main",
          "description": "Defaults to `multi_currency` for NGN and `main` for other currencies."
        },
        "label": {
          "type": "string",
          "description": "Your label for the account, at most 255 bytes",
          "example": "Jane USD"
        },
        "bank_code": {
          "type": "string",
          "description": "A `bank_code` from `GET /v1/accounts/capabilities`. Leave it out to use the highest-priority bank that fits.",
          "example": "cross_river_bank"
        },
        "network": {
          "type": "string",
          "description": "Network for the account's token wallet. Required when the bank offers token wallets, unless you send `wallet_id`; refused otherwise. It must be one of the bank's `token_options`. Prefer polygon, ethereum, base or solana, which work end to end.",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "base",
            "solana",
            "avalanche_c_chain",
            "sui",
            "tron",
            "bsc",
            "flow_evm",
            "canton",
            "bitcoin",
            "celo",
            "gnosis",
            "arbitrum",
            "optimism",
            "xdc",
            "tempo"
          ],
          "example": "polygon"
        },
        "wallet_id": {
          "type": "string",
          "description": "An existing wallet of yours to use instead of `network`. Send one, not both."
        },
        "account_structure": {
          "type": "string",
          "description": "For banks that offer FBO accounts only",
          "enum": [
            "fbo_account",
            "subledger"
          ]
        },
        "parent_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "The FBO account, with `account_structure` `subledger`"
        },
        "data": {
          "type": "object",
          "description": "The form from `GET /v2/accounts/requirements`. Put `root` scope fields in `data.root`, party fields in `data.parties[]`, and documents in `data.documents[]` or a party's `documents`. Fields the customer record already answers are filled in for you.",
          "properties": {
            "root": {
              "type": "object",
              "description": "Applicant fields for an individual, or business fields for a business. Include `citizenship_country` or `incorporation_country`, which routing reads. Do not put `network` or `wallet_id` here.",
              "additionalProperties": true
            },
            "parties": {
              "type": "array",
              "description": "Business only; refused for individuals. Each entry is an associated person from the customer record (`id` plus any changes) or a new person with the new-party fields. Leave it out to declare every associated person on the record.",
              "items": {
                "type": "object",
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
                          "description": "Optional sub-type"
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
                        }
                      }
                    }
                  }
                }
              }
            },
            "documents": {
              "type": "array",
              "description": "Root documents. When you send none, documents on the customer record are used.",
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
                    "description": "Optional sub-type"
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
      "additionalProperties": true
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
      "account_structure",
      "parent_account_id",
      "data"
    ],
    "alsoInBody": [],
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
    "description": "Create a card — Issues a virtual or physical card once the customer's application is `approved`. The first card gets the application's ID. Each further card needs a new Idempotency-Key; a customer can hold 10 cards, not counting blocked ones. A PIN is set for you; read it with `GET /v1/cards/{card_id}/pin`. Fund the card with a transfer whose destination is the card.",
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
    "description": "Create a card application — Opens a card application for a customer whose `basic` KYC is completed, using your active `card` account. In live, apply with `POST /v1/risk/features/activate` and `feature_id: virtual_cards` instead; this route works in sandbox. A second call for the same customer returns the existing application, in the shape of `GET /v1/cards/applications/{application_id}`, and does not check the new body. The response has no `application_status`; read it from `GET /v1/cards/applications`.",
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
    "description": "Create payment intent — Creates a card payment intent. It lasts 24 hours and allows at most 5 charge attempts. Without `card_token`, the response has a `payment_link` for the payer. With `card_token`, Gravv charges the saved card at once. The response is then HTTP 200 whatever the outcome, so check `data.status`.\n\nWithout card_token: returns payment_link (valid 24 h); send the payer there. With card_token: charges the card at once. Check data.status (processing, requires_action or charge_failed); a decline is HTTP 200. The customer needs phone_number and date_of_birth. card_token comes from listSavedCards, not from webhooks. MOVES MONEY: requires confirm: true.",
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
          "description": "A saved card token from `GET /v1/collections/cards`. When you send it, the card is charged at once.",
          "example": "tokn_80aebb6ea2594a74bc"
        },
        "save_card": {
          "type": "boolean",
          "default": false,
          "description": "Ask the checkout to save the card"
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
    "description": "Initiate a collection — Starts a collection from a payer. Card methods return a `payment_link` for the payer. `bank_transfer` returns payment instructions and bank details. The funds settle in stablecoin to the destination. Card amounts are charged in USD. Bank transfer works in BJ, BW, BF, CM, CI, CG, GA, ML, MW, NG, RW, ZA, TZ, TG, UG and ZM, chosen by the customer's address country. For saved cards and repeat charges, use payment intents.\n\nMOVES MONEY: requires confirm: true. Bank transfer only. The customer must have phone_number and date_of_birth. Countries: BJ BW BF CM CI CG GA ML MW NG RW ZA TZ TG UG ZM; currency must be that country's local currency; pass metadata.bank_account_number. amount is a string with up to 2 decimals.\n\nNOT FOR CARD PAYMENTS. Bank transfer only: pix and mobile_money are always rejected, and card payments go through createCardPaymentIntent, which returns the same hosted payment link plus the intent id and card token.",
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
          "description": "Amount in major units, as a string with at most 2 decimal places. For card methods it is a USD amount, whatever `currency` you send.",
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
          "description": "When true, the payer's name and email are not sent to the card checkout"
        },
        "save_card": {
          "type": "boolean",
          "default": false,
          "description": "Ask the card checkout to save the card"
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
              "description": "Payment methods to offer. Send one group only: `card`, `apple_pay` and `google_pay` together, or `bank_transfer` alone. `pix` and `mobile_money` are not available in any country, so a request with them is rejected. Availability depends on the customer's address country.",
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
    "description": "Add a customer — Creates an individual or business customer. A business is created with its associated persons in the same call, and each person becomes its own customer of type `ubo`. Each new customer gets `basic` and `intermediate` KYC records with status `not_started`, and a `customer.created` webhook. A duplicate email or `external_id` is a 400, not a 409.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "body": {
          "oneOf": [
            {
              "title": "Individual Customer",
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
              "title": "Business Customer",
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
                  "description": "Business contact email. It must use a company domain; free email domains such as gmail.com are rejected.",
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
          "description": "Request body. Choose exactly one shape: Individual Customer | Business Customer. "
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
    "description": "Add an external account — Adds a bank account or mobile wallet that a customer pays out to. Use `GET /v1/external-accounts/institutions` for `institution_id`, and `POST /v1/external-accounts/verify` to check the holder's name first. `bank_account` and `mobile_money` return 200 with status `active`. `swift`, `sepa`, `ach_wire` and `fps` return 202 with status `pending` while setup runs. Get the account until it is `active` or `setup_failed`, or wait for the `external_account.active` or `external_account.setup_failed` webhook. A duplicate (same customer, holder name, and account and bank) is a 400 with code `ERROR_CODE_DUPLICATE_PAYEE` and the existing `payee_id`. Deleted and failed accounts count as duplicates.\n\nReturns 202 with status `pending` for swift, sepa, ach_wire and fps: poll getExternalAccount until status is `active` (usable) or `setup_failed` (terminal). Returns 200 with status `active` for bank_account and mobile_money. Do not call createTransfer until the status is `active`. A duplicate returns 400 ERROR_CODE_DUPLICATE_PAYEE with data.payee_id: reuse that id. ach_wire needs payment_rail (ach, wire or rtp).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "The customer who owns this external account",
          "example": "3130ca8b-8b32-4843-8623-bf83e766b86a"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code of the currency paid out",
          "example": "USD"
        },
        "account_name": {
          "type": "string",
          "description": "Account holder's name. Unaccented letters, spaces and `' - . , & / ( )` only, starting with a letter, with no digits. It comes back in upper case, and may be replaced by the name the bank holds.",
          "example": "Jane Doe"
        },
        "payee_type": {
          "type": "string",
          "description": "Leave it out to detect the type from the fields you send. Send it for a Mexican CLABE paid in MXN, which is otherwise read as `ach_wire`.",
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
        "account_number": {
          "type": "string",
          "description": "4 to 34 letters and digits, with no spaces. Some countries have their own rule: 10 digits in Nigeria, 10 to 16 digits in Ghana, and 8 to 20 characters in Kenya.",
          "example": "000123456789"
        },
        "iban": {
          "type": "string",
          "description": "IBAN, checked with mod 97. Required for `sepa`.",
          "example": "DE89370400440532013000"
        },
        "bic": {
          "type": "string",
          "description": "BIC of 8 or 11 characters. Required for `swift`. The bank must be in the SWIFT directory; its `institution_id` and `bank_name` are filled in for you.",
          "example": "DEUTDEFF"
        },
        "routing_number": {
          "type": "string",
          "description": "For `ach_wire`, a 9-digit ABA routing number. For `fps`, the sort code. For India, the IFSC.",
          "example": "021000021"
        },
        "payment_rail": {
          "type": "string",
          "description": "Required for `ach_wire`; there is no default. `wire` needs a routing number that takes wires, and `rtp` one that takes instant payments.",
          "enum": [
            "ach",
            "wire",
            "rtp"
          ],
          "example": "wire"
        },
        "bank_account_type": {
          "type": "string",
          "enum": [
            "checking",
            "savings"
          ]
        },
        "phone_number": {
          "type": "string",
          "description": "Mobile money number with the country code. Required for `mobile_money`.",
          "example": "+256772123456"
        },
        "institution_id": {
          "type": "string",
          "format": "uuid",
          "description": "An `id` from `GET /v1/external-accounts/institutions`. Required for MAD payouts and filled in from `bic` for `swift`."
        },
        "institution_country_iso_code": {
          "type": "string",
          "description": "Bank country as an alpha-2 code. It picks the account number rule. Defaults to the institution's country.",
          "example": "NG"
        },
        "account_owner_type": {
          "type": "string",
          "description": "Required for `swift`, `sepa`, `ach_wire` and `fps`",
          "enum": [
            "individual",
            "business"
          ]
        },
        "bank_name": {
          "type": "string",
          "description": "Required for `sepa`, `ach_wire` and `fps`",
          "example": "Example Bank"
        },
        "bank_address_line_1": {
          "type": "string",
          "description": "Required for `swift`"
        },
        "bank_city": {
          "type": "string",
          "description": "Required for `swift`"
        },
        "bank_state": {
          "type": "string",
          "description": "Required for `swift`"
        },
        "bank_postal_code": {
          "type": "string",
          "description": "Required for `swift`. Checked against `bank_country`."
        },
        "bank_country": {
          "type": "string",
          "description": "Required for `swift`"
        },
        "intermediary_financial_institution": {
          "type": "string",
          "description": "Optional intermediary bank for `swift`. Send all the intermediary fields or none; only `intermediary_bank_address2` is optional."
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
        "national_id": {
          "type": "string",
          "maxLength": 64,
          "description": "The holder's national ID. Send it with `national_id_type`. Some payout corridors need it, such as CURP or RFC for Mexico and CPF or CNPJ for Brazil."
        },
        "national_id_type": {
          "type": "string",
          "enum": [
            "CURP",
            "RFC",
            "CPF",
            "CNPJ",
            "NIT",
            "CC",
            "PAN",
            "BVN",
            "NIN",
            "OTHER"
          ]
        },
        "pix_key": {
          "type": "string",
          "minLength": 1,
          "maxLength": 77,
          "description": "PIX key, for payouts to Brazil"
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
      "customer_id",
      "currency",
      "account_name",
      "payee_type",
      "account_number",
      "iban",
      "bic",
      "routing_number",
      "payment_rail",
      "bank_account_type",
      "phone_number",
      "institution_id",
      "institution_country_iso_code",
      "account_owner_type",
      "bank_name",
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
      "internal_account_id",
      "national_id",
      "national_id_type",
      "pix_key"
    ],
    "alsoInBody": [],
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
    "description": "Create an order — Trades a quote. With an API key there is no approval step: the order starts as `pending` and the source is debited at once. Then get the order until it is `completed` or `cancelled`. FX orders send no webhooks. If the error is `order source could not be charged`, an order may still exist; list your orders before you retry with a new quote.\n\nPREREQUISITE: a fresh getFxQuote (about 5 minutes). Over an API key the order is created `pending` and the source is debited at once. There is no approval step and no second user; `waiting_approval` is only for orders placed in the Dashboard. MOVES MONEY: requires confirm: true.",
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
          "description": "Where the sold amount comes from: your account or crypto wallet holding at least `from_amount` in the FROM currency. It cannot be `external_account`."
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
          "description": "Where the bought amount goes: your account or crypto wallet, or an active settlement instruction (`external_account`) in the TO currency."
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
    "movesMoney": true,
    "needsConfirm": true,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "createTransfer",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer",
    "description": "Create a transfer — Sends money from a customer's account, crypto wallet or card to an account, crypto wallet, crypto address, card or external account. The call returns once the transfer is recorded; it then runs in the background. Follow it with `GET /v1/transactions/{transaction_id}` or the `transfer.status.*` webhooks. A 200 can still be `transfer_status: paused`. Read `requirements`, upload documents with `POST /v1/transfer/documents` if asked, then call `POST /v1/transfer/{id}/resume`. Put `rail` inside `destination`. Send at most 2 decimal places. Most errors are a 400 with no code.\n\nPREREQUISITES: (1) the source account must be funded — check getAccount for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). MOVES MONEY: requires confirm: true.",
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
              "description": "A `card` source can only be withdrawn to its own card account.",
              "enum": [
                "internal_account",
                "internal_crypto_wallet",
                "card"
              ]
            },
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of the account, crypto wallet or card (UUID version 4)",
              "example": "b9c2cb0d-e09a-496f-8655-d8c4b7aaf2f8"
            },
            "currency": {
              "type": "string",
              "description": "Accepted, but the source's own currency is used",
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
          "description": "Your unique reference. On tenants whose limits are enforced, a reused reference returns the first transfer, or a 409 when the request differs. Send it so retries are not paid twice.",
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
    "description": "Create a wallet — Creates a blockchain wallet for a customer on one network. The call is synchronous: the response has the address. Every call creates a new wallet with a new address, even for the same customer and network. Reuse the `Idempotency-Key` to retry. A Stellar wallet finishes its trustline setup in the background, so it can take a short time before it can hold USDC.\n\nSYNCHRONOUS: the response carries the wallet address. Each call creates a NEW wallet, so do not call it again to check on a wallet; use getWallet or listWallets. Only Stellar wallets finish their trustline setup in the background.",
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
            "base",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "deleteAccountApplication",
    "toolset": "account-applications",
    "method": "delete",
    "path": "/v1/accounts/applications/{id}",
    "description": "Delete account application — Delete a single application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "movesMoney": false,
    "needsConfirm": true,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
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
          "description": "First day, as YYYY-MM-DD. Other formats are ignored."
        },
        "end_date": {
          "type": "string",
          "format": "date",
          "description": "Last day, included, as YYYY-MM-DD. Other formats are ignored."
        },
        "export_format": {
          "type": "string",
          "enum": [
            "csv",
            "json"
          ],
          "default": "json",
          "description": "Lower case only"
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
    "description": "Get a single account — Returns one account with its deposit details, balance and assets. Poll it after you create an account until `status` is `active`; deposit details appear only then. An unknown ID is a 400 with `internal account not found`.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "getAccountApplication",
    "toolset": "account-applications",
    "method": "get",
    "path": "/v1/accounts/applications/{id}",
    "description": "Get account application — Retrieve details of a single application by ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "getAccountApplicationHistory",
    "toolset": "account-applications",
    "method": "get",
    "path": "/v1/accounts/applications/{id}/history",
    "description": "Get application history — Get the audit log or history of an application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "getAccountApplicationV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/applications/{application_id}",
    "description": "Get an account application — Returns one application with what it waits for. Act on `status_reason`: upload `required_documents` or send `required_fields` with the update, or send the customer to `required_action_url` for terms or verification. Use `status`, not the deprecated `provisioning` object.",
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
    "description": "Get account capabilities — Lists the accounts a customer can open from their country: bank, currency, account types, token wallets, rails and the per-customer limit. Call it before you create an account or an application. Send `customer_id`, or `country` with `customer_type`. Send `customer_type` with `customer_id` too, or options for both types come back. The answer uses the v2 account rules. A v1 create picks a bank with its own rules, so an option here does not promise that the same v1 create succeeds. Unknown query parameters are rejected.",
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
      "currency"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "getAccountRequirements",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/requirements",
    "description": "Get account requirements — Returns the form that create checks for one bank, currency and customer type: fields, documents, party rules and token networks. Send `customer_id` to see the values already on file, and `country` so that the same bank as create is chosen. A field is needed only when `required` is true and its `applies_when` and `required_when` conditions hold. When `has_existing_ref` is true, send no `data.root` on create. When `existing_application` is present, finish that application instead.",
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
          "enum": [
            "main",
            "sub_account",
            "virtual",
            "multi_currency"
          ],
          "example": "main"
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
    "description": "Get an account — Returns one account with bank details, balances and, when it is not `active`, the reason. Poll it after create until `status` is `active`. When `requires_user_action` is true, act on `status_reason` with `application_id`. `balance` and `balance_details` are major units; `ledger_balance` is minor units.",
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
    "description": "Get transaction by ID — Returns the status and details of a collection. Pass the `transaction_id` from the create call, the charge call or a webhook. The `id` in this response is a different value.",
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
    "description": "Get a single customer — Returns one customer with its KYC records, and for a business its associated persons. It also returns an associated person by its own `id`. Send no query parameters.",
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
    "description": "Get KYC document data — Lists the documents stored for a customer, with their details and which sides have an image. Use a document's `id` to download its image. The response includes each document number in plain text. Treat it as personal data. A customer with no documents gets a 404, not an empty list.",
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
    "description": "Get applicant verification status — Reads the live review state for a customer's verification. It does not change the customer's KYC status, which only the webhooks update. For the final result, read `kyc` on the customer (`GET /v1/customers/{customer_id}`) or listen for the `customer.kyc.status.*` webhooks. `reviewStatus: completed` with `reviewAnswer: rejected` means verification failed. Customers verified by automatic document verification have no review and get a 404 here.",
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
    "description": "Get a customer's limits — Returns a customer's transfer tier, the caps for each window and what is left in each. Use it before a large payout, or to explain why a transfer paused. All amounts are USD strings.",
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
    "description": "Get an order — Returns one order. `pending` covers both a debit in progress and a debit that landed and is waiting to settle. Not-found is a 400.",
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
          "description": "`FROM_TO`: the currency you sell, then the currency you buy, such as `USD_XAF`. The four-part form `USD_US_XAF_CM` is also accepted; its countries do not change the price. It wins over `direction`.",
          "example": "USD_XAF"
        },
        "direction": {
          "type": "string",
          "description": "The same `FROM_TO` form as `currency_pair`. It is not BUY or SELL.",
          "example": "USD_XAF"
        },
        "amount": {
          "type": "string",
          "description": "Amount you sell, in major units of the FROM currency, as a string. A JSON number is rejected.",
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
    "description": "Get a remitter's limits — Returns the same view for a remitter: the sender you name in `additional_information.remitter_verification` on a transfer. Usage counts only transfers that carry it, on a policy with attested tiers. An unknown remitter gets the policy's default tier.",
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
    "description": "Get saved card — Returns one active saved card by the `id` from the list. Ignore `is_active` in this response: it always reads `false`.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "getTransaction",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/{transaction_id}",
    "description": "Get a transaction — Returns one transaction. Poll it after a transfer until `status` is `completed` or `failed`; `paused` means the transfer needs something from you. Not-found is a 400.",
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
    "description": "Get a single wallet — Returns one wallet with its balances. Balances come from a cache. When one is missing or older than 5 minutes, Gravv queues a refresh and returns without waiting for it. Balances are tracked for USDC on every listed network, USDT on polygon, ethereum, avalanche and solana, and the network's own coin.",
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
    "description": "Get call history for a webhook event — Lists every delivery attempt for one record, newest first, with the status code, time taken and any connection error. Attempts that failed before the call was made, such as a missing or unsafe URL, are not listed; they only add to `attempts` on the detail route.",
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
    "description": "Get webhook event details — Returns one delivery record with the stored payload, the delivery state and your endpoint's last response. Use it to see what was sent and why a delivery failed. Request headers are not returned.",
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
    "description": "Get paginated webhook event history — Lists the webhook delivery records for your business, newest first. There is one record for each event Gravv sent you. Sandbox and live keys see separate records. All filters combine.",
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
          "description": "Records per page. A value over 100 is lowered to 100, and 0 means the default."
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "listAccountApplications",
    "toolset": "account-applications",
    "method": "get",
    "path": "/v1/accounts/applications",
    "description": "Get account applications — Retrieve a list of applications with optional filters and pagination.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "description": "Page number"
        },
        "items_per_page": {
          "type": "integer",
          "description": "Number of items per page"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "type": "string",
          "enum": [
            "draft",
            "submitted",
            "processing",
            "approved",
            "manual_review",
            "rejected"
          ],
          "description": "Filter by status, in lower case"
        },
        "application_type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ]
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
      "status",
      "application_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "listAccountApplicationsV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts/applications",
    "description": "List account applications — Lists your account applications, newest first, without status reasons. `count` is the number on this page, not a total; page until `count` is less than `limit`. A misspelt `status` returns an empty list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "description": "`processing` while the bank works, `blocked` while it waits on you or the customer, `manual_review` while Gravv holds it, then `approved` or `rejected`. `draft` and `submitted` come only from v1 flows.",
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
    "description": "Get accounts — Lists your internal accounts, newest first, with balances. Accounts opened with `/v2/accounts` are included. Filters combine with AND, and a filter that matches nothing returns an empty list.",
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
        "currency": {
          "type": "string",
          "description": "Filter by currency code"
        },
        "account_type": {
          "type": "string",
          "description": "Filter by account type, such as `regular` or `card`"
        },
        "blockchain_network": {
          "type": "string",
          "description": "Filter by network, such as `polygon`"
        },
        "wallet_address": {
          "type": "string",
          "description": "Filter by exact wallet address"
        },
        "search": {
          "type": "string",
          "description": "Case-insensitive text search across label, currency, status, type and wallet address. Use it to find an account by label."
        },
        "excluded_customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Leave out this customer's accounts"
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
      "currency",
      "account_type",
      "blockchain_network",
      "wallet_address",
      "search",
      "excluded_customer_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "listAccountsV2",
    "toolset": "accounts",
    "method": "get",
    "path": "/v2/accounts",
    "description": "List accounts — Lists your accounts, v1 and v2, newest first, with bank details and balances. Status reasons are only on the single read. Unknown query parameters are rejected with a 400. A bad filter value is an error, not an empty page.",
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
          "enum": [
            "main",
            "sub_account",
            "virtual",
            "multi_currency"
          ],
          "example": "main"
        },
        "currency": {
          "type": "string",
          "description": "Three-letter ISO 4217 code"
        },
        "network": {
          "type": "string",
          "description": "Network name in lower case",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "base",
            "solana",
            "avalanche_c_chain",
            "sui",
            "tron",
            "bsc",
            "flow_evm",
            "canton",
            "bitcoin",
            "celo",
            "gnosis",
            "arbitrum",
            "optimism",
            "xdc",
            "tempo"
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
          "description": "Page size, 1 to 200. Values out of range give 50."
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
    "description": "List card applications — Lists your card applications, newest first, with `application_status`. This is the only route that returns it: poll it until the status is `approved`, or wait for the `cards.application.update` webhook. There are no filters.",
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
    "description": "Get customers — Lists your individual and business customers, newest first. Associated persons are not listed; get their business to see them. Unknown or invalid filters are ignored.",
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
          "description": "Find a SWIFT bank by its 8 or 11 character BIC"
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
    "description": "List external accounts — Lists your external accounts, newest first, in every status including `deleted`. There is no status filter. Filters match exactly and are case-sensitive, so send currencies in upper case. `total_items` is an estimate; stop when a page has fewer items than `items_per_page`.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "listFeatures",
    "toolset": "features",
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
          "description": "Filter by activation. It needs `customer_id`; without it every feature is inactive. Other values act as `all`."
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
    "description": "List supported currency pairs — Lists every currency pair FX knows. A listed pair is not always enabled for you; `POST /v1/fx/quote` tells you. This route reads no query parameters.",
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
          "description": "Page size. Values above 100 give 100."
        },
        "status": {
          "type": "string",
          "description": "An order made with an API key starts as `pending` and its source is debited at once. It then becomes `completed`, or `cancelled` if the debit fails. `waiting_approval` is for orders made in the dashboard.",
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
    "description": "List orders waiting for approval — Lists orders in `waiting_approval`, newest first. Only orders made in the dashboard wait for approval, so orders made with an API key never appear here. A scoped key needs `fx:order_approve`. Approving and rejecting are done in the dashboard.\n\nOnly orders placed in the Dashboard wait for approval. Orders created with an API key run at once and never appear here, so this list is usually empty for an API integration. A scoped API key needs the fx:order_approve permission, or the call returns 400 `caller is not permitted to approve or reject orders`. Approving and rejecting happen in the Dashboard; the API cannot do them.",
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
          "description": "Page size. Values above 100 give 100."
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
    "description": "List exchange rates — Returns indicative rates for display, sorted by pair. You cannot trade at these rates; call `POST /v1/fx/quote` for a firm price. Filters are not case-sensitive. When rates are not loaded yet, the error is `fx cache is not ready`; retry.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listPendingAccountApplications",
    "toolset": "account-applications",
    "method": "get",
    "path": "/v1/accounts/applications/pending",
    "description": "Get pending applications — Returns up to 10 applications in status `submitted`, oldest first. These are submitted applications that were never processed; `processing` applications are not included. The route takes no parameters; a `limit` parameter makes it fail.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
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
          "description": "When set, cards are matched by this value only, and `customer_id` is not used to filter."
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "collections.yaml"
  },
  {
    "name": "listTransactions",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions",
    "description": "List transactions — Lists your transactions, newest first. Filters that take values accept a comma-separated list. There is no date filter; use the export for dates. A typo in a filter value returns an empty list, not an error. Page until a page is empty, using `total_pages`.",
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
            "base",
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
          "description": "Wallets per page. A larger value is lowered to 100, not rejected."
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "processAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/process",
    "description": "Process account application — Process the submitted application with the relevant provider.\n\nASYNC: returns status `processing`. Poll getAccountApplication until status is `approved`, `rejected` or `manual_review`. A 200 can carry status `rejected` with an errors[] list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "resumeTransfer",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer/{id}/resume",
    "description": "Resume a paused transfer — Continues a transfer that returned `transfer_status: paused`, with what its `requirements` asked for. When the transfer can go ahead, `resumed` is true and the `transfer.resumed` webhook is sent. When it still cannot, `resumed` is false and the response lists the new requirements. The fee is not charged again. Use a new Idempotency-Key for each attempt with new information, as a retry with the same key returns the first answer. A 410 means the pause expired or was cancelled; start a new transfer.",
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
      "additionalProperties": true
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
    "description": "Manually retry a webhook event — Sends one stored event to your current webhook URL now and returns your endpoint's response. The call waits up to 30 seconds for your endpoint. It needs the `webhook:create` permission. No `Idempotency-Key` is needed, and each call sends the event again. The resend is not signed: it carries no X-Signature header. The call returns HTTP 200 with your endpoint's status code, even when your endpoint answered non-2xx, and a failed resend puts the event back into signed automatic retries.",
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
    "description": "Simulate a deposit — Sandbox only; a live key gets a 403. Makes a test bank deposit land on an account through the normal deposit flow, with fees, ledger entries and webhooks. The account must be `active` with bank details. A 200 means the deposit was accepted, not settled; wait for the `transfer.inflow.completed` or `transfer.inflow.deposit_settled` webhook. Each new Idempotency-Key makes a new deposit.",
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
      "additionalProperties": true
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": true,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "startCustomerKyc",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/start",
    "description": "Start KYC verification — Starts hosted verification and returns a link for the person or business to complete. The link expires after one hour. Call again with a new Idempotency-Key for a fresh link; the same key returns the old link. A customer who is already verified gets `review_status: completed` and no link. For a business, every associated person must complete verification first. Tenants with automatic document verification get a 400 and must use the upload route instead. The result arrives by the `customer.kyc.status.*` webhooks. Each first start charges one KYC fee.\n\nFor business customers, complete KYC for every associated person BEFORE starting the business's own verification. Verification is asynchronous. Read the outcome from getCustomer (the `basic` kyc status becomes `completed` or `failed`) or from the customer.kyc.status.* webhooks.",
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
    "description": "Initiate server-to-server KYC verification — Sends the documents you uploaded for review, with no hosted page. This is step 2 of server-to-server verification. Upload every required document first. For a business, every associated person must complete verification first, and the business needs each `COMPANY_DOC` sub-type. The result arrives by the `customer.kyc.status.*` webhooks. This flow records no liveness check. A customer verified this way must still complete a liveness step before a card can be issued.\n\nSTEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "submitAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/submit",
    "description": "Submit account application — Mark the application as submitted for provider processing.\n\nORDERING: statuses are lower case: draft -> submitted -> processing -> approved, rejected or manual_review (`expired` exists but is not set today). Submitting needs zero validation errors and moves a draft or rejected application to submitted. Call processAccountApplication next, or use submitAndProcessAccountApplication to do both.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "submitAndProcessAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/submit-and-process",
    "description": "Submit and process application — Combine submission and processing into a single call.\n\nASYNC: submits and starts processing. is_fully_processed=false is normal. Poll getAccountApplication until status is `approved`, `rejected` or `manual_review`. If processing_result is null, call processAccountApplication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
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
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "updateAccountApplication",
    "toolset": "account-applications",
    "method": "put",
    "path": "/v1/accounts/applications/{id}",
    "description": "Update account application — Update data for a draft or rejected application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "data": {
          "type": "object",
          "description": "Application data. Unknown keys are dropped. On create, empty fields are filled from the customer record. The bank the application is routed to decides which other fields are required, and reports what is missing in `validation_errors`.",
          "required": [
            "account_type",
            "currency"
          ],
          "properties": {
            "individual": {
              "type": "object",
              "properties": {
                "first_name": {
                  "type": "string",
                  "description": "First name of the individual. Required.",
                  "example": "John"
                },
                "last_name": {
                  "type": "string",
                  "description": "Last name of the individual. Required.",
                  "example": "Doe"
                },
                "middle_name": {
                  "type": "string",
                  "description": "Middle name of the individual.",
                  "example": "Robert"
                },
                "email": {
                  "type": "string",
                  "format": "email",
                  "description": "Email address of the individual. Required.",
                  "example": "john.doe@example.com"
                },
                "role": {
                  "type": "string",
                  "description": "Role of the individual in the application (for example, owner).",
                  "example": "owner"
                },
                "phone": {
                  "type": "string",
                  "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                  "example": "+14155552671"
                },
                "date_of_birth": {
                  "type": "string",
                  "format": "date",
                  "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                  "example": "1980-01-01"
                },
                "gender": {
                  "type": "string",
                  "description": "Gender of the individual.",
                  "example": "male"
                },
                "nationality": {
                  "type": "string",
                  "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "ssn": {
                  "type": "string",
                  "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "tin": {
                  "type": "string",
                  "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "income_source": {
                  "type": "string",
                  "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                  "example": "employment"
                },
                "employment_status": {
                  "type": "string",
                  "description": "Current employment status of the individual (for example, employed or self_employed).",
                  "example": "employed"
                },
                "citizenship": {
                  "type": "string",
                  "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": "US"
                },
                "identification_type": {
                  "type": "string",
                  "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                  "example": "passport"
                },
                "identification_number": {
                  "type": "string",
                  "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                  "example": "P1234567"
                },
                "identification_country": {
                  "type": "string",
                  "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "identification_expiry": {
                  "type": "string",
                  "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                  "example": "2030-01-01"
                },
                "address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "id_document_front": {
                  "type": "string",
                  "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "id_document_back": {
                  "type": "string",
                  "description": "Back of the government-issued ID, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of address document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "source_of_wealth": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                  "example": [
                    "SALARY"
                  ]
                },
                "source_of_wealth_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of wealth when not covered by the standard options.",
                  "example": "Salary from tech job"
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "PERSONAL_BANKING"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Personal savings"
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "INCOME"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Income"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "business": {
              "type": "object",
              "properties": {
                "legal_name": {
                  "type": "string",
                  "description": "Registered legal name of the business. Required.",
                  "example": "Acme Corp"
                },
                "trade_name": {
                  "type": "string",
                  "description": "Trading name or DBA (doing business as) name of the business.",
                  "example": "Acme"
                },
                "description": {
                  "type": "string",
                  "description": "Description of the business operations. May be required (minimum 100 characters).",
                  "example": "A software development company specializing in enterprise tools and developer infrastructure."
                },
                "type": {
                  "type": "string",
                  "description": "Legal entity type of the business (for example, llc or corporation). Required.",
                  "example": "llc"
                },
                "industry": {
                  "type": "string",
                  "description": "Industry category of the business. May be required depending on your account configuration.",
                  "example": "software"
                },
                "website": {
                  "type": "string",
                  "description": "Public-facing website URL of the business.",
                  "example": "https://acme.corp"
                },
                "registration_number": {
                  "type": "string",
                  "description": "Official registration or incorporation number of the business.",
                  "example": "12345678"
                },
                "tax_id_number": {
                  "type": "string",
                  "description": "Tax Identification Number (TIN) of the business. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "date_of_incorporation": {
                  "type": "string",
                  "description": "Date the business was incorporated, in YYYY-MM-DD format.",
                  "example": "2010-01-01"
                },
                "country_of_incorporation": {
                  "type": "string",
                  "description": "Country where the business is incorporated, in ISO 3166-1 alpha-2 format. Some account configurations require this to be US.",
                  "example": "US"
                },
                "state_of_incorporation": {
                  "type": "string",
                  "description": "US state where the business is incorporated. May be required depending on your account configuration.",
                  "example": "DE"
                },
                "business_status": {
                  "type": "string",
                  "description": "Current operating status of the business (for example, active or inactive).",
                  "example": "active"
                },
                "registered_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "physical_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "mailing_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "primary_contact": {
                  "type": "object",
                  "properties": {
                    "first_name": {
                      "type": "string",
                      "description": "First name of the individual. Required.",
                      "example": "John"
                    },
                    "last_name": {
                      "type": "string",
                      "description": "Last name of the individual. Required.",
                      "example": "Doe"
                    },
                    "middle_name": {
                      "type": "string",
                      "description": "Middle name of the individual.",
                      "example": "Robert"
                    },
                    "email": {
                      "type": "string",
                      "format": "email",
                      "description": "Email address of the individual. Required.",
                      "example": "john.doe@example.com"
                    },
                    "role": {
                      "type": "string",
                      "description": "Role of the individual in the application (for example, owner).",
                      "example": "owner"
                    },
                    "phone": {
                      "type": "string",
                      "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                      "example": "+14155552671"
                    },
                    "date_of_birth": {
                      "type": "string",
                      "format": "date",
                      "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                      "example": "1980-01-01"
                    },
                    "gender": {
                      "type": "string",
                      "description": "Gender of the individual.",
                      "example": "male"
                    },
                    "nationality": {
                      "type": "string",
                      "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "ssn": {
                      "type": "string",
                      "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "tin": {
                      "type": "string",
                      "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "income_source": {
                      "type": "string",
                      "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                      "example": "employment"
                    },
                    "employment_status": {
                      "type": "string",
                      "description": "Current employment status of the individual (for example, employed or self_employed).",
                      "example": "employed"
                    },
                    "citizenship": {
                      "type": "string",
                      "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": "US"
                    },
                    "identification_type": {
                      "type": "string",
                      "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                      "example": "passport"
                    },
                    "identification_number": {
                      "type": "string",
                      "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                      "example": "P1234567"
                    },
                    "identification_country": {
                      "type": "string",
                      "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "identification_expiry": {
                      "type": "string",
                      "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                      "example": "2030-01-01"
                    },
                    "address": {
                      "type": "object",
                      "properties": {
                        "street_line_1": {
                          "type": "string",
                          "description": "Street address, PO box, company name, c/o",
                          "example": "123 Main St"
                        },
                        "street_line_2": {
                          "type": "string",
                          "description": "Apartment, suite, unit, building, floor, etc.",
                          "example": "Apt 4B"
                        },
                        "city": {
                          "type": "string",
                          "description": "City",
                          "example": "San Francisco"
                        },
                        "state": {
                          "type": "string",
                          "description": "State, province, county",
                          "example": "CA"
                        },
                        "postal_code": {
                          "type": "string",
                          "description": "ZIP or postal code",
                          "example": "94105"
                        },
                        "country": {
                          "type": "string",
                          "description": "Country (ISO 3166-1 alpha-2)",
                          "example": "US"
                        }
                      },
                      "required": [
                        "street_line_1",
                        "city",
                        "state",
                        "postal_code",
                        "country"
                      ]
                    },
                    "id_document_front": {
                      "type": "string",
                      "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "id_document_back": {
                      "type": "string",
                      "description": "Back of the government-issued ID, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "proof_of_address_document": {
                      "type": "string",
                      "description": "Proof of address document, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "source_of_wealth": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                      "example": [
                        "SALARY"
                      ]
                    },
                    "source_of_wealth_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of wealth when not covered by the standard options.",
                      "example": "Salary from tech job"
                    },
                    "account_purposes": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Purposes for opening the account. May be required depending on your account configuration.",
                      "example": [
                        "PERSONAL_BANKING"
                      ]
                    },
                    "account_purposes_other_description": {
                      "type": "string",
                      "description": "Free-text description of account purposes when not covered by the standard options.",
                      "example": "Personal savings"
                    },
                    "source_of_funds_list": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of funds for the account. May be required depending on your account configuration.",
                      "example": [
                        "INCOME"
                      ]
                    },
                    "source_of_funds_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of funds when not covered by the standard options.",
                      "example": "Income"
                    },
                    "expected_counterparty_countries": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": [
                        "US",
                        "GB"
                      ]
                    },
                    "expected_fiat_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                      "example": "10000_TO_50000"
                    },
                    "expected_crypto_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of crypto transactions.",
                      "example": "10000_TO_50000"
                    }
                  }
                },
                "associated_persons": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "description": "Standardized associated person (UBO, control person, etc.)",
                    "properties": {
                      "first_name": {
                        "type": "string",
                        "description": "First name of the associated person.",
                        "example": "Jane"
                      },
                      "last_name": {
                        "type": "string",
                        "description": "Last name of the associated person.",
                        "example": "Smith"
                      },
                      "middle_name": {
                        "type": "string",
                        "description": "Middle name of the associated person.",
                        "example": "Anne"
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "description": "Email address of the associated person.",
                        "example": "jane@acme.corp"
                      },
                      "phone": {
                        "type": "string",
                        "description": "Phone number of the associated person, in E.164 format.",
                        "example": "+14155552672"
                      },
                      "date_of_birth": {
                        "type": "string",
                        "format": "date",
                        "description": "Date of birth of the associated person, in YYYY-MM-DD format.",
                        "example": "1985-06-15"
                      },
                      "citizenship": {
                        "type": "string",
                        "description": "Country of citizenship, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "ssn": {
                        "type": "string",
                        "description": "Social Security Number of the associated person.",
                        "example": "000000000"
                      },
                      "title": {
                        "type": "string",
                        "description": "Job title of the associated person (for example, CEO or CFO).",
                        "example": "CEO"
                      },
                      "role": {
                        "type": "string",
                        "description": "Role of the associated person in the business (for example, director or officer).",
                        "example": "director"
                      },
                      "has_ownership": {
                        "type": "boolean",
                        "description": "Indicates whether the person holds an ownership stake in the business.",
                        "example": true
                      },
                      "has_control": {
                        "type": "boolean",
                        "description": "Indicates whether the person has control over the business.",
                        "example": true
                      },
                      "is_signer": {
                        "type": "boolean",
                        "description": "Indicates whether the person is an authorized signer on the account.",
                        "example": true
                      },
                      "is_director": {
                        "type": "boolean",
                        "description": "Indicates whether the person is a director of the business.",
                        "example": true
                      },
                      "ownership_percentage": {
                        "type": "integer",
                        "description": "Percentage of the business owned by this person.",
                        "example": 100
                      },
                      "address": {
                        "type": "object",
                        "properties": {
                          "street_line_1": {
                            "type": "string",
                            "description": "Street address, PO box, company name, c/o",
                            "example": "123 Main St"
                          },
                          "street_line_2": {
                            "type": "string",
                            "description": "Apartment, suite, unit, building, floor, etc.",
                            "example": "Apt 4B"
                          },
                          "city": {
                            "type": "string",
                            "description": "City",
                            "example": "San Francisco"
                          },
                          "state": {
                            "type": "string",
                            "description": "State, province, county",
                            "example": "CA"
                          },
                          "postal_code": {
                            "type": "string",
                            "description": "ZIP or postal code",
                            "example": "94105"
                          },
                          "country": {
                            "type": "string",
                            "description": "Country (ISO 3166-1 alpha-2)",
                            "example": "US"
                          }
                        },
                        "required": [
                          "street_line_1",
                          "city",
                          "state",
                          "postal_code",
                          "country"
                        ]
                      },
                      "identification_type": {
                        "type": "string",
                        "description": "Type of government-issued ID (for example, passport or drivers_license).",
                        "example": "passport"
                      },
                      "identification_number": {
                        "type": "string",
                        "description": "Document number of the government-issued ID.",
                        "example": "P7654321"
                      },
                      "identification_country": {
                        "type": "string",
                        "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "identification_expiry": {
                        "type": "string",
                        "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                        "example": "2030-01-01"
                      },
                      "id_document_front": {
                        "type": "string",
                        "description": "Front of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "id_document_back": {
                        "type": "string",
                        "description": "Back of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "proof_of_address_document": {
                        "type": "string",
                        "description": "Proof of address document, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      }
                    }
                  },
                  "description": "Provide at least one associated person."
                },
                "has_material_intermediary_ownership": {
                  "type": "boolean",
                  "description": "Indicates whether the business has ownership held through a material intermediary.",
                  "example": false
                },
                "formation_document": {
                  "type": "string",
                  "description": "Business formation document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "ownership_document": {
                  "type": "string",
                  "description": "Document showing the ownership structure of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of business address, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_nature_of_business": {
                  "type": "string",
                  "description": "Document that verifies the nature of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_dao": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a decentralized autonomous organization (DAO).",
                  "example": false
                },
                "account_purpose": {
                  "type": "string",
                  "description": "Primary purpose for opening the account (for example, operations or payroll).",
                  "example": "operations"
                },
                "source_of_funds": {
                  "type": "string",
                  "description": "Primary source of business funds (for example, revenue or investment).",
                  "example": "revenue"
                },
                "industry_financial_services_subtype": {
                  "type": "string",
                  "description": "Subtype of financial services industry, if applicable.",
                  "example": "none"
                },
                "industry_crypto_subtype": {
                  "type": "string",
                  "description": "Subtype of crypto industry, if applicable.",
                  "example": "none"
                },
                "industry_other_description": {
                  "type": "string",
                  "description": "Description of the industry when it does not fit a standard category.",
                  "example": "Software dev"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the business expects to transact, in ISO 3166-1 alpha-2 format.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "REVENUE"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Sales revenue"
                },
                "tin_verification_document": {
                  "type": "string",
                  "description": "Document verifying the business TIN, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "authorization_document": {
                  "type": "string",
                  "description": "Authorization document for the account, as a Base64 data URI. May be used depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_msb": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a money services business (MSB).",
                  "example": false
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "BUSINESS_OPERATIONS"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Operations"
                },
                "primary_target_market": {
                  "type": "string",
                  "description": "Primary geographic market the business targets.",
                  "example": "US"
                },
                "primary_target_market_other_description": {
                  "type": "string",
                  "description": "Free-text description of the primary target market when not covered by the standard options.",
                  "example": "US market"
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "account_type": {
              "type": "string",
              "enum": [
                "regular",
                "savings",
                "card",
                "auto_sweep",
                "collection"
              ],
              "description": "Kind of account to open. This is the account type, not the customer type; use `application_type` for individual or business. A customer can have one `card` account.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Network of the account's wallet, in lower case. Required by every bank that issues a wallet, which is most of them. Use `polygon` for sandbox testing.",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Address of an existing wallet of yours on `blockchain_network`. Send it together with `wallet_id`, or send neither.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of an existing wallet of yours. Send it together with `wallet_address`, or send neither.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the signed terms of service agreement. Set it while the application is `draft` or `rejected`, or use the terms of service route while it is `draft`.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "Set by Gravv on create when the end customer must accept the bank's terms of service. Show it to them before you submit.",
              "example": "https://example.com/tos"
            },
            "metadata": {
              "type": "object",
              "additionalProperties": true,
              "description": "Arbitrary key-value pairs for storing additional information about the application.",
              "example": {
                "source": "web"
              }
            }
          }
        }
      },
      "required": [
        "id",
        "data"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "data"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "updateAccountApplicationV2",
    "toolset": "accounts",
    "method": "patch",
    "path": "/v2/accounts/applications/{application_id}",
    "description": "Update an account application — Sends the data or documents the bank asked for, and resumes opening the account. Get the application first. It must be `blocked`, or `manual_review` for documents. Send every requested item in one call; a partial answer stays `blocked`. There is no Idempotency-Key on this route, so a retry uploads again. The response leaves out the status reason fields; get the application again to see what is still needed. For terms or verification, send the customer to `required_action_url` instead.",
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
          "description": "Changes to the customer record. They are saved on the customer, not only on this application.",
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
          "description": "Party changes, in the create shape. Only on `draft` or `blocked`.",
          "items": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "documents": {
          "type": "array",
          "description": "Documents to upload. Only on `draft`, `blocked` or `manual_review`. Upload every requested type in this one call.",
          "items": {
            "type": "object",
            "required": [
              "document_type",
              "filename",
              "content"
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
              }
            }
          }
        }
      },
      "required": [
        "application_id"
      ],
      "additionalProperties": true
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts-v2.yaml"
  },
  {
    "name": "updateAccountStatus",
    "toolset": "accounts",
    "method": "patch",
    "path": "/v1/accounts/{account_id}/status",
    "description": "Update account status — Changes an account's status. Set `frozen` to suspend an account, `active` to reactivate it, `manual_review` to hold it, or `deleted` to close it. Each change sends an account webhook. Setting the current status again changes nothing and sends no webhook. Deleting needs a zero balance and cannot be undone. `auto_sweep` and `default` accounts cannot change status. Do not use `active` to move a `pending` account forward; that skips the bank set-up. An unknown ID returns the generic error message.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string",
          "format": "uuid"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "frozen",
            "manual_review",
            "deleted"
          ],
          "description": "The new account status, in lower case."
        }
      },
      "required": [
        "account_id",
        "status"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "account_id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "status"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "updateCardStatus",
    "toolset": "cards",
    "method": "patch",
    "path": "/v1/cards/{card_id}/update",
    "description": "Update a card's status and limit — Freezes, unfreezes or blocks a card, and sets its daily limit. Always send `limit` with `status`: a call without `limit` sets the limit to 0, which stops the card spending on live cards. To change only the limit, send the current status with the new limit. `blocked` is permanent. Allowed changes are `active` to `freeze` or `blocked`, `freeze` to `active` or `blocked`, and `inactive` to `active` or `blocked`. A status change sends the `cards.status.update` webhook. This route needs no Idempotency-Key.\n\nALWAYS send limit (whole USD per day) together with status: leaving limit out sets the card's daily limit to 0, and a live card stops working. status is required on every call: active, freeze or blocked; blocked is permanent. To change only the limit, resend the current status.",
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
    "description": "Update a customer — Updates the fields you send on one customer. The path `customer_id` selects the customer and replaces any `customer_id` in the body. Empty values change nothing, the customer type cannot change, and KYC status is not reset. The response does not include the customer; get it to read the result.",
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
          "description": "Business customers only; ignored for individuals. Send `id` to edit a person. Omit it to add a new person, who then needs `first_name`, `last_name`, `email`, `gender`, `date_of_birth`, `phone` and `address`.",
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": false,
    "sandboxOnly": false,
    "spec": "customers.yaml"
  },
  {
    "name": "uploadCustomerKycDocument",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/upload-document",
    "description": "Upload document — Stores one document file for a customer. This is step 1 of server-to-server verification. Upload each document, and each side of a two-sided card, in a separate call. Nothing is sent for review until you call `POST /v1/customers/kyc/start-s2s`. Individual and UBO customers need one identity document (`PASSPORT`, `ID_CARD` or `DRIVERS`) with `FRONT_SIDE`, plus a `SELFIE`. Identity documents also need `country`, `number` and `validUntil`. A selfie must be a JPEG or PNG. Business customers use `idDocType: COMPANY_DOC` for every file and set `idDocSubType` to `INCORPORATION_CERT`, `SHAREHOLDER_REGISTRY`, `PROOF_OF_ADDRESS` and `TAX_DOCUMENT` (or `OTHER`). Uploading the same type and sub-type again replaces the earlier file. On tenants with automatic document verification, the upload that completes the required set also completes KYC.\n\nSTEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails.",
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
          "description": "Name of the file. The extension is not checked; the content decides the file type.",
          "example": "passport_front.jpg",
          "maxLength": 255
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
        "metadata",
        "content",
        "filename"
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
    "description": "Upload a supporting document — Uploads a document, such as an invoice, for a payout that needs one. Pass the returned `id` in `supporting_document_ids` on `POST /v1/transfer` or on resume. A document can be used by one transfer only, and an unused one is deleted after 7 days. The file must be PDF, PNG or JPEG, at most 700 KB.",
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
        "document_type",
        "file_name",
        "content_type",
        "content"
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
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "validateAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/validate",
    "description": "Validate application data — Checks application data against the bank it would be sent to, and returns that bank's requirements, without saving anything. It checks only the data you send: there is no fill from the customer record and no KYC or duplicate check. Fix every `validation_errors` entry before you create or submit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_type": {
          "type": "string",
          "enum": [
            "individual",
            "business"
          ],
          "description": "Type of application. One of individual or business.",
          "example": "individual"
        },
        "data": {
          "type": "object",
          "description": "Application data to validate. Not persisted.",
          "required": [
            "account_type",
            "currency"
          ],
          "properties": {
            "individual": {
              "type": "object",
              "properties": {
                "first_name": {
                  "type": "string",
                  "description": "First name of the individual. Required.",
                  "example": "John"
                },
                "last_name": {
                  "type": "string",
                  "description": "Last name of the individual. Required.",
                  "example": "Doe"
                },
                "middle_name": {
                  "type": "string",
                  "description": "Middle name of the individual.",
                  "example": "Robert"
                },
                "email": {
                  "type": "string",
                  "format": "email",
                  "description": "Email address of the individual. Required.",
                  "example": "john.doe@example.com"
                },
                "role": {
                  "type": "string",
                  "description": "Role of the individual in the application (for example, owner).",
                  "example": "owner"
                },
                "phone": {
                  "type": "string",
                  "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                  "example": "+14155552671"
                },
                "date_of_birth": {
                  "type": "string",
                  "format": "date",
                  "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                  "example": "1980-01-01"
                },
                "gender": {
                  "type": "string",
                  "description": "Gender of the individual.",
                  "example": "male"
                },
                "nationality": {
                  "type": "string",
                  "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "ssn": {
                  "type": "string",
                  "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "tin": {
                  "type": "string",
                  "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "income_source": {
                  "type": "string",
                  "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                  "example": "employment"
                },
                "employment_status": {
                  "type": "string",
                  "description": "Current employment status of the individual (for example, employed or self_employed).",
                  "example": "employed"
                },
                "citizenship": {
                  "type": "string",
                  "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": "US"
                },
                "identification_type": {
                  "type": "string",
                  "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                  "example": "passport"
                },
                "identification_number": {
                  "type": "string",
                  "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                  "example": "P1234567"
                },
                "identification_country": {
                  "type": "string",
                  "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                  "example": "US"
                },
                "identification_expiry": {
                  "type": "string",
                  "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                  "example": "2030-01-01"
                },
                "address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "id_document_front": {
                  "type": "string",
                  "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "id_document_back": {
                  "type": "string",
                  "description": "Back of the government-issued ID, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of address document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "source_of_wealth": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                  "example": [
                    "SALARY"
                  ]
                },
                "source_of_wealth_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of wealth when not covered by the standard options.",
                  "example": "Salary from tech job"
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "PERSONAL_BANKING"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Personal savings"
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "INCOME"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Income"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "business": {
              "type": "object",
              "properties": {
                "legal_name": {
                  "type": "string",
                  "description": "Registered legal name of the business. Required.",
                  "example": "Acme Corp"
                },
                "trade_name": {
                  "type": "string",
                  "description": "Trading name or DBA (doing business as) name of the business.",
                  "example": "Acme"
                },
                "description": {
                  "type": "string",
                  "description": "Description of the business operations. May be required (minimum 100 characters).",
                  "example": "A software development company specializing in enterprise tools and developer infrastructure."
                },
                "type": {
                  "type": "string",
                  "description": "Legal entity type of the business (for example, llc or corporation). Required.",
                  "example": "llc"
                },
                "industry": {
                  "type": "string",
                  "description": "Industry category of the business. May be required depending on your account configuration.",
                  "example": "software"
                },
                "website": {
                  "type": "string",
                  "description": "Public-facing website URL of the business.",
                  "example": "https://acme.corp"
                },
                "registration_number": {
                  "type": "string",
                  "description": "Official registration or incorporation number of the business.",
                  "example": "12345678"
                },
                "tax_id_number": {
                  "type": "string",
                  "description": "Tax Identification Number (TIN) of the business. May be required depending on your account configuration.",
                  "example": "000000000"
                },
                "date_of_incorporation": {
                  "type": "string",
                  "description": "Date the business was incorporated, in YYYY-MM-DD format.",
                  "example": "2010-01-01"
                },
                "country_of_incorporation": {
                  "type": "string",
                  "description": "Country where the business is incorporated, in ISO 3166-1 alpha-2 format. Some account configurations require this to be US.",
                  "example": "US"
                },
                "state_of_incorporation": {
                  "type": "string",
                  "description": "US state where the business is incorporated. May be required depending on your account configuration.",
                  "example": "DE"
                },
                "business_status": {
                  "type": "string",
                  "description": "Current operating status of the business (for example, active or inactive).",
                  "example": "active"
                },
                "registered_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "physical_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "mailing_address": {
                  "type": "object",
                  "properties": {
                    "street_line_1": {
                      "type": "string",
                      "description": "Street address, PO box, company name, c/o",
                      "example": "123 Main St"
                    },
                    "street_line_2": {
                      "type": "string",
                      "description": "Apartment, suite, unit, building, floor, etc.",
                      "example": "Apt 4B"
                    },
                    "city": {
                      "type": "string",
                      "description": "City",
                      "example": "San Francisco"
                    },
                    "state": {
                      "type": "string",
                      "description": "State, province, county",
                      "example": "CA"
                    },
                    "postal_code": {
                      "type": "string",
                      "description": "ZIP or postal code",
                      "example": "94105"
                    },
                    "country": {
                      "type": "string",
                      "description": "Country (ISO 3166-1 alpha-2)",
                      "example": "US"
                    }
                  },
                  "required": [
                    "street_line_1",
                    "city",
                    "state",
                    "postal_code",
                    "country"
                  ]
                },
                "primary_contact": {
                  "type": "object",
                  "properties": {
                    "first_name": {
                      "type": "string",
                      "description": "First name of the individual. Required.",
                      "example": "John"
                    },
                    "last_name": {
                      "type": "string",
                      "description": "Last name of the individual. Required.",
                      "example": "Doe"
                    },
                    "middle_name": {
                      "type": "string",
                      "description": "Middle name of the individual.",
                      "example": "Robert"
                    },
                    "email": {
                      "type": "string",
                      "format": "email",
                      "description": "Email address of the individual. Required.",
                      "example": "john.doe@example.com"
                    },
                    "role": {
                      "type": "string",
                      "description": "Role of the individual in the application (for example, owner).",
                      "example": "owner"
                    },
                    "phone": {
                      "type": "string",
                      "description": "Phone number of the individual, in E.164 format. May be required depending on your account configuration.",
                      "example": "+14155552671"
                    },
                    "date_of_birth": {
                      "type": "string",
                      "format": "date",
                      "description": "Date of birth of the individual, in YYYY-MM-DD format. Required.",
                      "example": "1980-01-01"
                    },
                    "gender": {
                      "type": "string",
                      "description": "Gender of the individual.",
                      "example": "male"
                    },
                    "nationality": {
                      "type": "string",
                      "description": "Nationality of the individual, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "ssn": {
                      "type": "string",
                      "description": "Social Security Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "tin": {
                      "type": "string",
                      "description": "Tax Identification Number of the individual. May be required depending on your account configuration.",
                      "example": "000000000"
                    },
                    "income_source": {
                      "type": "string",
                      "description": "Primary source of income. May be required. One of employment, self_employment, investments, retirement, or other.",
                      "example": "employment"
                    },
                    "employment_status": {
                      "type": "string",
                      "description": "Current employment status of the individual (for example, employed or self_employed).",
                      "example": "employed"
                    },
                    "citizenship": {
                      "type": "string",
                      "description": "Country of citizenship, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": "US"
                    },
                    "identification_type": {
                      "type": "string",
                      "description": "Type of government-issued ID. May be required. One of drivers_license, passport, or state_id.",
                      "example": "passport"
                    },
                    "identification_number": {
                      "type": "string",
                      "description": "Document number of the government-issued ID. May be required depending on your account configuration.",
                      "example": "P1234567"
                    },
                    "identification_country": {
                      "type": "string",
                      "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                      "example": "US"
                    },
                    "identification_expiry": {
                      "type": "string",
                      "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                      "example": "2030-01-01"
                    },
                    "address": {
                      "type": "object",
                      "properties": {
                        "street_line_1": {
                          "type": "string",
                          "description": "Street address, PO box, company name, c/o",
                          "example": "123 Main St"
                        },
                        "street_line_2": {
                          "type": "string",
                          "description": "Apartment, suite, unit, building, floor, etc.",
                          "example": "Apt 4B"
                        },
                        "city": {
                          "type": "string",
                          "description": "City",
                          "example": "San Francisco"
                        },
                        "state": {
                          "type": "string",
                          "description": "State, province, county",
                          "example": "CA"
                        },
                        "postal_code": {
                          "type": "string",
                          "description": "ZIP or postal code",
                          "example": "94105"
                        },
                        "country": {
                          "type": "string",
                          "description": "Country (ISO 3166-1 alpha-2)",
                          "example": "US"
                        }
                      },
                      "required": [
                        "street_line_1",
                        "city",
                        "state",
                        "postal_code",
                        "country"
                      ]
                    },
                    "id_document_front": {
                      "type": "string",
                      "description": "Front of the government-issued ID, as a Base64 data URI. May be required depending on your account configuration.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "id_document_back": {
                      "type": "string",
                      "description": "Back of the government-issued ID, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "proof_of_address_document": {
                      "type": "string",
                      "description": "Proof of address document, as a Base64 data URI.",
                      "example": "data:application/pdf;base64,..."
                    },
                    "source_of_wealth": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of the individual's wealth. May be required depending on your account configuration.",
                      "example": [
                        "SALARY"
                      ]
                    },
                    "source_of_wealth_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of wealth when not covered by the standard options.",
                      "example": "Salary from tech job"
                    },
                    "account_purposes": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Purposes for opening the account. May be required depending on your account configuration.",
                      "example": [
                        "PERSONAL_BANKING"
                      ]
                    },
                    "account_purposes_other_description": {
                      "type": "string",
                      "description": "Free-text description of account purposes when not covered by the standard options.",
                      "example": "Personal savings"
                    },
                    "source_of_funds_list": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Sources of funds for the account. May be required depending on your account configuration.",
                      "example": [
                        "INCOME"
                      ]
                    },
                    "source_of_funds_other_description": {
                      "type": "string",
                      "description": "Free-text description of the source of funds when not covered by the standard options.",
                      "example": "Income"
                    },
                    "expected_counterparty_countries": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Countries where the individual expects to transact, in ISO 3166-1 alpha-2 format. May be required depending on your account configuration.",
                      "example": [
                        "US",
                        "GB"
                      ]
                    },
                    "expected_fiat_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of fiat transactions. May be required depending on your account configuration.",
                      "example": "10000_TO_50000"
                    },
                    "expected_crypto_monthly_volume": {
                      "type": "string",
                      "description": "Expected monthly volume of crypto transactions.",
                      "example": "10000_TO_50000"
                    }
                  }
                },
                "associated_persons": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "description": "Standardized associated person (UBO, control person, etc.)",
                    "properties": {
                      "first_name": {
                        "type": "string",
                        "description": "First name of the associated person.",
                        "example": "Jane"
                      },
                      "last_name": {
                        "type": "string",
                        "description": "Last name of the associated person.",
                        "example": "Smith"
                      },
                      "middle_name": {
                        "type": "string",
                        "description": "Middle name of the associated person.",
                        "example": "Anne"
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "description": "Email address of the associated person.",
                        "example": "jane@acme.corp"
                      },
                      "phone": {
                        "type": "string",
                        "description": "Phone number of the associated person, in E.164 format.",
                        "example": "+14155552672"
                      },
                      "date_of_birth": {
                        "type": "string",
                        "format": "date",
                        "description": "Date of birth of the associated person, in YYYY-MM-DD format.",
                        "example": "1985-06-15"
                      },
                      "citizenship": {
                        "type": "string",
                        "description": "Country of citizenship, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "ssn": {
                        "type": "string",
                        "description": "Social Security Number of the associated person.",
                        "example": "000000000"
                      },
                      "title": {
                        "type": "string",
                        "description": "Job title of the associated person (for example, CEO or CFO).",
                        "example": "CEO"
                      },
                      "role": {
                        "type": "string",
                        "description": "Role of the associated person in the business (for example, director or officer).",
                        "example": "director"
                      },
                      "has_ownership": {
                        "type": "boolean",
                        "description": "Indicates whether the person holds an ownership stake in the business.",
                        "example": true
                      },
                      "has_control": {
                        "type": "boolean",
                        "description": "Indicates whether the person has control over the business.",
                        "example": true
                      },
                      "is_signer": {
                        "type": "boolean",
                        "description": "Indicates whether the person is an authorized signer on the account.",
                        "example": true
                      },
                      "is_director": {
                        "type": "boolean",
                        "description": "Indicates whether the person is a director of the business.",
                        "example": true
                      },
                      "ownership_percentage": {
                        "type": "integer",
                        "description": "Percentage of the business owned by this person.",
                        "example": 100
                      },
                      "address": {
                        "type": "object",
                        "properties": {
                          "street_line_1": {
                            "type": "string",
                            "description": "Street address, PO box, company name, c/o",
                            "example": "123 Main St"
                          },
                          "street_line_2": {
                            "type": "string",
                            "description": "Apartment, suite, unit, building, floor, etc.",
                            "example": "Apt 4B"
                          },
                          "city": {
                            "type": "string",
                            "description": "City",
                            "example": "San Francisco"
                          },
                          "state": {
                            "type": "string",
                            "description": "State, province, county",
                            "example": "CA"
                          },
                          "postal_code": {
                            "type": "string",
                            "description": "ZIP or postal code",
                            "example": "94105"
                          },
                          "country": {
                            "type": "string",
                            "description": "Country (ISO 3166-1 alpha-2)",
                            "example": "US"
                          }
                        },
                        "required": [
                          "street_line_1",
                          "city",
                          "state",
                          "postal_code",
                          "country"
                        ]
                      },
                      "identification_type": {
                        "type": "string",
                        "description": "Type of government-issued ID (for example, passport or drivers_license).",
                        "example": "passport"
                      },
                      "identification_number": {
                        "type": "string",
                        "description": "Document number of the government-issued ID.",
                        "example": "P7654321"
                      },
                      "identification_country": {
                        "type": "string",
                        "description": "Country that issued the identification document, in ISO 3166-1 alpha-2 format.",
                        "example": "US"
                      },
                      "identification_expiry": {
                        "type": "string",
                        "description": "Expiry date of the identification document, in YYYY-MM-DD format.",
                        "example": "2030-01-01"
                      },
                      "id_document_front": {
                        "type": "string",
                        "description": "Front of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "id_document_back": {
                        "type": "string",
                        "description": "Back of the government-issued ID, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      },
                      "proof_of_address_document": {
                        "type": "string",
                        "description": "Proof of address document, as a Base64 data URI.",
                        "example": "data:application/pdf;base64,..."
                      }
                    }
                  },
                  "description": "Provide at least one associated person."
                },
                "has_material_intermediary_ownership": {
                  "type": "boolean",
                  "description": "Indicates whether the business has ownership held through a material intermediary.",
                  "example": false
                },
                "formation_document": {
                  "type": "string",
                  "description": "Business formation document, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "ownership_document": {
                  "type": "string",
                  "description": "Document showing the ownership structure of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_address_document": {
                  "type": "string",
                  "description": "Proof of business address, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "proof_of_nature_of_business": {
                  "type": "string",
                  "description": "Document that verifies the nature of the business, as a Base64 data URI.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_dao": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a decentralized autonomous organization (DAO).",
                  "example": false
                },
                "account_purpose": {
                  "type": "string",
                  "description": "Primary purpose for opening the account (for example, operations or payroll).",
                  "example": "operations"
                },
                "source_of_funds": {
                  "type": "string",
                  "description": "Primary source of business funds (for example, revenue or investment).",
                  "example": "revenue"
                },
                "industry_financial_services_subtype": {
                  "type": "string",
                  "description": "Subtype of financial services industry, if applicable.",
                  "example": "none"
                },
                "industry_crypto_subtype": {
                  "type": "string",
                  "description": "Subtype of crypto industry, if applicable.",
                  "example": "none"
                },
                "industry_other_description": {
                  "type": "string",
                  "description": "Description of the industry when it does not fit a standard category.",
                  "example": "Software dev"
                },
                "expected_counterparty_countries": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Countries where the business expects to transact, in ISO 3166-1 alpha-2 format.",
                  "example": [
                    "US",
                    "GB"
                  ]
                },
                "source_of_funds_list": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Sources of funds for the account. May be required depending on your account configuration.",
                  "example": [
                    "REVENUE"
                  ]
                },
                "source_of_funds_other_description": {
                  "type": "string",
                  "description": "Free-text description of the source of funds when not covered by the standard options.",
                  "example": "Sales revenue"
                },
                "tin_verification_document": {
                  "type": "string",
                  "description": "Document verifying the business TIN, as a Base64 data URI. May be required depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "authorization_document": {
                  "type": "string",
                  "description": "Authorization document for the account, as a Base64 data URI. May be used depending on your account configuration.",
                  "example": "data:application/pdf;base64,..."
                },
                "is_msb": {
                  "type": "boolean",
                  "description": "Indicates whether the business is a money services business (MSB).",
                  "example": false
                },
                "account_purposes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Purposes for opening the account. May be required depending on your account configuration.",
                  "example": [
                    "BUSINESS_OPERATIONS"
                  ]
                },
                "account_purposes_other_description": {
                  "type": "string",
                  "description": "Free-text description of account purposes when not covered by the standard options.",
                  "example": "Operations"
                },
                "primary_target_market": {
                  "type": "string",
                  "description": "Primary geographic market the business targets.",
                  "example": "US"
                },
                "primary_target_market_other_description": {
                  "type": "string",
                  "description": "Free-text description of the primary target market when not covered by the standard options.",
                  "example": "US market"
                },
                "expected_fiat_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of fiat transactions.",
                  "example": "10000_TO_50000"
                },
                "expected_crypto_monthly_volume": {
                  "type": "string",
                  "description": "Expected monthly volume of crypto transactions.",
                  "example": "10000_TO_50000"
                }
              }
            },
            "account_type": {
              "type": "string",
              "enum": [
                "regular",
                "savings",
                "card",
                "auto_sweep",
                "collection"
              ],
              "description": "Kind of account to open. This is the account type, not the customer type; use `application_type` for individual or business. A customer can have one `card` account.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Network of the account's wallet, in lower case. Required by every bank that issues a wallet, which is most of them. Use `polygon` for sandbox testing.",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Address of an existing wallet of yours on `blockchain_network`. Send it together with `wallet_id`, or send neither.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of an existing wallet of yours. Send it together with `wallet_address`, or send neither.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the signed terms of service agreement. Set it while the application is `draft` or `rejected`, or use the terms of service route while it is `draft`.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "Set by Gravv on create when the end customer must accept the bank's terms of service. Show it to them before you submit.",
              "example": "https://example.com/tos"
            },
            "metadata": {
              "type": "object",
              "additionalProperties": true,
              "description": "Arbitrary key-value pairs for storing additional information about the application.",
              "example": {
                "source": "web"
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
        "application_type",
        "data"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "application_type",
      "data"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsConfirm": false,
    "needsIdempotency": true,
    "sandboxOnly": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "verifyExternalAccount",
    "toolset": "external-accounts",
    "method": "post",
    "path": "/v1/external-accounts/verify",
    "description": "Verify an external account — Checks account details before you add the external account, and returns the holder's name when the bank can look it up. Send `account_number` with `institution_id`; only that pair reaches the bank. `verified: true` with `verification_source: local` means only the format was checked. Trust the name only when `verification_source` is `provider`. An IBAN, phone or CLABE alone is checked locally. This route needs no Idempotency-Key.",
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
    "description": "Withdraw from a card — Moves money from an `active` card back to its card account. Some cards, including every new sandbox card, answer `this card withdraws by transfer`; for those, send a `POST /v1/transfer` from the card to its card account. Retry a failed call with the same Idempotency-Key. The result is also sent as the `cards.transaction.withdraw` webhook.\n\nMOVES MONEY: requires confirm: true. Works for cards on the live card programme and for older sandbox cards. New sandbox cards and some live cards refuse with 'this card withdraws by transfer'. The card must be `active`, and the amount (USD, at most 2 decimals) must not exceed the balance from getCardBalance. Funds go to the card's own account wallet.",
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
