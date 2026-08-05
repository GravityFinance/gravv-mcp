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
  /** Requires confirm: true, and GRAVV_ALLOW_LIVE_WRITES on a live key. */
  movesMoney: boolean;
  /** Client must attach a generated Idempotency-Key. */
  needsIdempotency: boolean;
  /** Source spec filename, for traceability. */
  spec: string;
}

export const TOOLS: GeneratedTool[] = [
  {
    "name": "activateFeature",
    "toolset": "features",
    "method": "post",
    "path": "/v1/risk/features/activate",
    "description": "Activate a feature — Activate a specific feature for a customer. You must provide the feature_id and any required provider_data as specified in the feature's requirements.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer activating the feature",
          "example": "302dabcb-d4fd-4a00-a80b-afad70982614"
        },
        "feature_id": {
          "type": "string",
          "description": "ID of the feature to activate",
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
        "provider_data": {
          "type": "object",
          "description": "Additional data required by the feature provider",
          "additionalProperties": true
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
      "provider_data"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "features.yaml"
  },
  {
    "name": "cancelFxOrder",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/orders/{order_id}/cancel",
    "description": "Cancel order — Cancels an order that hasn't executed yet. Orders that are already in a final state, or in a state that doesn't allow cancellation, can't be cancelled. The `Idempotency-Key` header is required; requests without it are rejected.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "The order reference returned when the order was created."
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
    "needsIdempotency": true,
    "spec": "fx.yaml"
  },
  {
    "name": "chargeSavedCard",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections/cards/payment-intents/charge",
    "description": "Charge card — Charges a saved card token. Use this for server-to-server charges when you already hold a card token — for example, for recurring or merchant-initiated transactions. Billing fields are optional. Any field you omit falls back to the customer record on file. Fields you provide take precedence and are saved to the resulting charge record.\n\nMOVES MONEY: charges a stored card token, for recurring or merchant-initiated payments. Requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
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
          "description": "Accepts YYYY-MM-DD",
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
          "example": "94105"
        },
        "billing_country": {
          "type": "string",
          "description": "ISO 3166-1 alpha-2",
          "example": "US"
        },
        "payment_intent_id": {
          "type": "string",
          "example": "pi_429f578b-..."
        },
        "card_token": {
          "type": "string",
          "example": "tokn_80aebb6ea2594a74bc215a64"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
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
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "date_of_birth",
      "billing_address1",
      "billing_city",
      "billing_state",
      "billing_zip",
      "billing_country",
      "payment_intent_id",
      "card_token"
    ],
    "alsoInBody": [],
    "movesMoney": true,
    "needsIdempotency": true,
    "spec": "collections.yaml"
  },
  {
    "name": "checkFeatureEligibility",
    "toolset": "features",
    "method": "post",
    "path": "/v1/risk/features/eligibility",
    "description": "Check feature eligibility — Check if a customer is eligible for a specific feature and get the list of requirements",
    "inputSchema": {
      "type": "object",
      "properties": {
        "feature_id": {
          "type": "string",
          "description": "The unique identifier of the feature to check eligibility for",
          "example": "virtual_cards",
          "enum": [
            "crypto_wallet",
            "virtual_cards",
            "eur_account",
            "usd_account",
            "gbp_account",
            "international_transfers"
          ]
        },
        "customer_id": {
          "type": "string",
          "description": "The customer ID to check eligibility for",
          "example": "5793f1ea-91f0-4892-9705-d37e0592dd3a"
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
    "needsIdempotency": true,
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
    "needsIdempotency": true,
    "spec": "accounts.yaml"
  },
  {
    "name": "createAccount",
    "toolset": "accounts",
    "method": "post",
    "path": "/v1/accounts",
    "description": "Create an account — Create a new internal account for a customer. For sandbox and testing integrations, we recommend using `polygon` as the `blockchain_network`.\n\nPREREQUISITE: the customer must exist and have completed KYC. Check getCustomerKycStatus first — an account cannot be opened for an unverified customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "currency": {
          "type": "string",
          "description": "Currency code for the account",
          "example": "USD",
          "enum": [
            "USD",
            "EUR",
            "MXN",
            "NGN"
          ]
        },
        "type": {
          "type": "string",
          "description": "Type of account",
          "example": "regular",
          "enum": [
            "regular",
            "savings"
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
          "description": "Blockchain network for the account",
          "example": "polygon",
          "enum": [
            "polygon",
            "stellar",
            "ethereum",
            "solana",
            "avalanche"
          ]
        },
        "wallet_address": {
          "type": "string",
          "description": "Blockchain wallet address to associate with the account.",
          "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
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
      "wallet_address"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
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
          "required": [
            "account_type",
            "currency",
            "blockchain_network"
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
                "savings"
              ],
              "description": "Kind of account to open (for example, regular or savings). This is the account type, not the customer type. Use the top-level application_type field for individual vs business.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Blockchain network to back the account (for example, polygon or stellar).",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Blockchain wallet address to associate with the account.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "UUID of an existing Gravv wallet to link to the account.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the provider agreement associated with this application.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "URL to the terms of service the applicant must accept.",
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
          },
          "description": "Application data including KYC information and account configuration."
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
    "needsIdempotency": true,
    "spec": "accounts.yaml"
  },
  {
    "name": "createCard",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards",
    "description": "Create card — Create a new card for a customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to create a card for",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "card_limit": {
          "type": "number",
          "description": "Maximum spending limit on the card",
          "example": 50
        },
        "name_on_card": {
          "type": "string",
          "description": "Name to be printed on the card",
          "example": "Jane Doe"
        },
        "card_type": {
          "type": "string",
          "description": "Type of card to create",
          "enum": [
            "virtual",
            "physical"
          ],
          "example": "virtual"
        },
        "shipping_address": {
          "type": "object",
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
              "example": "1800 N Pole St"
            },
            "address_line2": {
              "type": "string",
              "example": "Suite 202"
            },
            "city": {
              "type": "string",
              "example": "New York"
            },
            "state": {
              "type": "string",
              "example": "US-NY"
            },
            "postal_code": {
              "type": "string",
              "example": "100983"
            },
            "country_code": {
              "type": "string",
              "example": "US"
            },
            "phone_number": {
              "type": "string",
              "example": "12125550123"
            },
            "method": {
              "type": "string",
              "description": "Shipping method",
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
          },
          "description": "The shipping address for delivering a physical card.\nProvide this field only when the card type is physical.\n"
        }
      },
      "required": [
        "customer_id",
        "card_limit",
        "name_on_card",
        "card_type"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "card_limit",
      "name_on_card",
      "card_type",
      "shipping_address"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "cards.yaml"
  },
  {
    "name": "createCardApplication",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards/applications/new",
    "description": "Create card application — Initiate a new card application request for a customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer creating the card application",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the account to link the card application to",
          "example": "2d52eb6d-4fac-44db-a225-d0e6aa13b0e3"
        },
        "annual_remuneration": {
          "type": "number",
          "description": "Customer's annual income or renumeration",
          "example": 120000
        },
        "estimated_monthly_limit": {
          "type": "number",
          "description": "Estimated monthly limit the customer expects to use",
          "example": 200
        },
        "ip_address": {
          "type": "string",
          "format": "ipv4",
          "description": "IP address of the request origin",
          "example": "12.23.31.23"
        }
      },
      "required": [
        "customer_id",
        "annual_remuneration",
        "estimated_monthly_limit",
        "ip_address",
        "account_id"
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
      "ip_address"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "cards.yaml"
  },
  {
    "name": "createCardPaymentIntent",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections/cards/payment-intents",
    "description": "Create payment intent — Creates a card payment intent and returns a payment link for the hosted checkout UI. _**If you provide a `card_token`, the service automatically initiates a charge after creating the intent.**_",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "example": "f827e428-c497-4b21-8855-99d978909c28"
        },
        "client_customer_id": {
          "type": "string",
          "example": "merchant-user-123"
        },
        "amount": {
          "type": "string",
          "example": "3.50"
        },
        "currency": {
          "type": "string",
          "example": "USD"
        },
        "client_reference": {
          "type": "string",
          "example": "order-abc-123"
        },
        "destination": {
          "type": "object",
          "required": [
            "destination_type",
            "id"
          ],
          "properties": {
            "destination_type": {
              "type": "string",
              "enum": [
                "internal_crypto_wallet",
                "internal_account",
                "external_crypto_wallet"
              ],
              "example": "internal_crypto_wallet"
            },
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "Account ID or wallet ID, depending on destination_type",
              "example": "b628ff35-429b-48f7-bcf0-6a49df106fc6"
            },
            "wallet_address": {
              "type": "string",
              "description": "Required when destination_type is external_crypto_wallet",
              "example": "0x445906a6766927c5da8b2fca0e0db5d7b5565ef8"
            },
            "network": {
              "type": "string",
              "description": "Required when destination_type is external_crypto_wallet",
              "enum": [
                "polygon",
                "stellar",
                "ethereum",
                "solana",
                "avalanche"
              ],
              "example": "polygon"
            }
          }
        },
        "source": {
          "type": "object",
          "required": [
            "source_type",
            "id",
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
            "id": {
              "type": "string",
              "description": "Source identifier required by the provider",
              "example": "src_80aebb6ea2594a74bc215a64"
            },
            "methods": {
              "type": "array",
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
        "card_token": {
          "type": "string",
          "description": "To auto-charge a customer, use the token you got from the webhook response in your first call of this endpoint.",
          "example": "tokn_80aebb6ea2594a74bc215a64"
        },
        "metadata": {
          "type": "object",
          "additionalProperties": true,
          "example": {
            "order_id": "ord_123"
          }
        }
      },
      "required": [
        "customer_id",
        "client_customer_id",
        "amount",
        "currency",
        "client_reference",
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
      "client_reference",
      "destination",
      "source",
      "card_token",
      "metadata"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "collections.yaml"
  },
  {
    "name": "createCollection",
    "toolset": "collections",
    "method": "post",
    "path": "/v1/collections",
    "description": "Initiate a collection — Initiates a collection request using a specified collection method (card, bank transfer, and mobile money). If the collection method is card, a payment link will be generated for the customer to complete the payment. For mobile money and bank transfer methods, payment instructions will be provided.\n\nMOVES MONEY: initiates a collection from a payer. Requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "amount": {
          "type": "string",
          "description": "Amount to collect",
          "example": "50"
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3,
          "pattern": "^[A-Z]{3}$",
          "description": "Three-letter uppercase ISO 4217 currency code",
          "example": "USD"
        },
        "country": {
          "type": "string",
          "description": "Alpha-2 country code",
          "example": "ET"
        },
        "customer_id": {
          "type": "string",
          "description": "Unique customer identifier",
          "format": "uuid",
          "example": "04dfb2e5-1274-4214-b5fd-3415fde7dc17"
        },
        "client_customer_id": {
          "type": "string",
          "description": "A unique identifier assigned by the client to reference the customer when storing payment details",
          "example": "checkers_user"
        },
        "client_reference": {
          "type": "string",
          "description": "Client unique reference",
          "example": "9d8184a1-4a19-b74d-4797-9896aed01332"
        },
        "metadata": {
          "type": "object",
          "description": "Custom JSON data that will be returned in webhook notifications for this transaction",
          "additionalProperties": true,
          "example": {
            "order_id": "12345",
            "customer_notes": "Express delivery requested"
          }
        },
        "source": {
          "oneOf": [
            {
              "title": "Card",
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
                  "items": {
                    "type": "string",
                    "enum": [
                      "card",
                      "apple_pay",
                      "google_pay",
                      "pix",
                      "mobile_money",
                      "bank_transfer"
                    ]
                  },
                  "example": [
                    "card",
                    "apple_pay",
                    "google_pay",
                    "pix"
                  ]
                }
              }
            }
          ]
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
                  "example": "internal_account"
                },
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Provide an account ID if destination_type is internal_account, or a wallet ID if destination_type is internal_crypto_wallet",
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
                  "description": "Wallet address for the external crypto wallet",
                  "example": 3.901967180566737e+47
                },
                "network": {
                  "type": "string",
                  "description": "Blockchain network for the crypto wallet",
                  "enum": [
                    "polygon",
                    "stellar",
                    "ethereum",
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
        }
      },
      "required": [
        "amount",
        "currency",
        "country",
        "customer_id",
        "client_customer_id",
        "client_reference",
        "source",
        "destination"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "amount",
      "currency",
      "country",
      "customer_id",
      "client_customer_id",
      "client_reference",
      "metadata",
      "source",
      "destination"
    ],
    "alsoInBody": [],
    "movesMoney": true,
    "needsIdempotency": true,
    "spec": "collections.yaml"
  },
  {
    "name": "createCustomer",
    "toolset": "customers",
    "method": "post",
    "path": "/v1/customers",
    "description": "Add a customer — Create a new customer record.",
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
                  "example": "john"
                },
                "middle_name": {
                  "type": "string"
                },
                "last_name": {
                  "type": "string",
                  "example": "doe"
                },
                "email": {
                  "type": "string",
                  "format": "email",
                  "example": "john.doe@example.com"
                },
                "phone": {
                  "type": "string",
                  "example": "+15555550101"
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
                  "example": "male"
                },
                "type": {
                  "type": "string",
                  "enum": [
                    "individual"
                  ],
                  "example": "individual"
                },
                "external_id": {
                  "type": "string",
                  "description": "Optional custom identifier for the customer provided by the business",
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
                      "example": "1800 N Pole St"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "example": "Orlando"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "32801"
                    },
                    "state": {
                      "type": "string",
                      "example": "US-FL"
                    },
                    "country": {
                      "type": "string",
                      "example": "US"
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
                  "description": "Business contact email",
                  "example": "contact@acmecorp.com"
                },
                "type": {
                  "type": "string",
                  "enum": [
                    "business"
                  ],
                  "example": "business"
                },
                "business_name": {
                  "type": "string",
                  "description": "Registered business name",
                  "example": "Acme Corporation"
                },
                "phone": {
                  "type": "string",
                  "example": "+15555550101"
                },
                "business_description": {
                  "type": "string",
                  "description": "Short description of the business operations",
                  "example": "Technology and software development"
                },
                "business_type": {
                  "type": "string",
                  "description": "Type of business entity",
                  "example": "private_limited"
                },
                "business_industry": {
                  "type": "string",
                  "description": "The industry category that best describes your business",
                  "example": "Technology"
                },
                "registration_number": {
                  "type": "string",
                  "description": "Business registration number",
                  "example": "RC-987654"
                },
                "external_id": {
                  "type": "string",
                  "description": "Optional custom identifier for the customer provided by the business",
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
                      "example": "1800 N Pole St"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "example": "Orlando"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "32801"
                    },
                    "state": {
                      "type": "string",
                      "example": "US-FL"
                    },
                    "country": {
                      "type": "string",
                      "example": "US"
                    }
                  }
                },
                "associated_persons": {
                  "type": "array",
                  "description": "List of persons associated with the business (e.g. directors, owners)",
                  "items": {
                    "type": "object",
                    "required": [
                      "first_name",
                      "last_name",
                      "email",
                      "date_of_birth",
                      "gender",
                      "phone",
                      "address"
                    ],
                    "properties": {
                      "first_name": {
                        "type": "string",
                        "example": "Jane"
                      },
                      "middle_name": {
                        "type": "string",
                        "example": "A."
                      },
                      "last_name": {
                        "type": "string",
                        "example": "Doe"
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "example": "jane.doe@example.com"
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
                        "example": "+15555550102"
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
                            "example": "1800 N Pole St"
                          },
                          "address_line2": {
                            "type": "string",
                            "example": "Suite 202"
                          },
                          "city": {
                            "type": "string",
                            "example": "Orlando"
                          },
                          "postal_code": {
                            "type": "string",
                            "example": "32801"
                          },
                          "state": {
                            "type": "string",
                            "example": "US-FL"
                          },
                          "country": {
                            "type": "string",
                            "example": "US"
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
    "needsIdempotency": true,
    "spec": "customers.yaml"
  },
  {
    "name": "createExternalAccount",
    "toolset": "external-accounts",
    "method": "post",
    "path": "/v1/external-accounts",
    "description": "Add an external account — Adds a new external account for transfers to accounts that are not created with Gravv. ## Async setup contract Registering an external account with our payment partners runs asynchronously. The response status code tells you the outcome: - **`200 OK`:** The external account is fully registered with at least one partner. The `status` field is `active`. You can initiate transfers immediately. - **`202 Accepted`:** the external account record is created and a background worker calls our partners. The `status` field is `pending`. To learn when it changes to `active`, either check the status by calling `GET /v1/external-accounts/{external_account_id}` until it is `active`, or subscribe to the `payee.setup.*` webhook events. - **`400 Bad Request`:** Input validation failed. Fix the input and retry. A duplicate POST with the same `account_number` (or `iban`), `currency`, and `payee_type` for the same customer is idempotent and returns the existing record.\n\nRETURNS 202: the recipient is not immediately usable. This returns status `pending` while the payment rail sets the recipient up. Poll getExternalAccount until status is `active` before calling createTransfer — transferring to a `pending` recipient fails. Terminal states are `active` and `failed`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "body": {
          "type": "object",
          "properties": {
            "account_name": {
              "type": "string",
              "description": "Name of the account holder.",
              "maxLength": 100,
              "example": "Amina Bello"
            },
            "customer_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID of the customer who owns the external account.",
              "example": "373556ec-74e5-4cde-909c-b94d864915db"
            },
            "payment_rail": {
              "type": [
                "string",
                "null"
              ],
              "description": "Optional. US payment rail to use when `payee_type` is `ach_wire`. Accepted values: `ach` (ACH transfer) or `wire` (domestic wire). Defaults to `wire` when omitted.",
              "enum": [
                "ach",
                "wire"
              ],
              "example": "ach"
            }
          },
          "required": [
            "account_name",
            "customer_id"
          ],
          "oneOf": [
            {
              "type": "object",
              "title": "US Bank Account Recipient",
              "required": [
                "payee_type",
                "account_number",
                "routing_number",
                "account_owner_type",
                "account_type",
                "currency",
                "address"
              ],
              "properties": {
                "payee_type": {
                  "type": "string",
                  "description": "Type of payee",
                  "enum": [
                    "ach_wire"
                  ],
                  "example": "ach_wire"
                },
                "account_number": {
                  "type": "string",
                  "description": "Bank account number",
                  "example": "4401682860",
                  "maxLength": 50
                },
                "bank_name": {
                  "type": "string",
                  "description": "Name of the bank",
                  "example": "Example Community Bank",
                  "maxLength": 100
                },
                "routing_number": {
                  "type": "string",
                  "description": "9-digit ABA routing number",
                  "example": "101019644",
                  "maxLength": 20
                },
                "account_owner_type": {
                  "type": "string",
                  "description": "Type of account owner",
                  "enum": [
                    "individual",
                    "business"
                  ],
                  "example": "individual"
                },
                "account_type": {
                  "type": "string",
                  "description": "Type of bank account",
                  "enum": [
                    "savings",
                    "checking"
                  ],
                  "example": "savings"
                },
                "currency": {
                  "type": "string",
                  "description": "Currency code",
                  "enum": [
                    "USD"
                  ],
                  "example": "USD"
                },
                "address": {
                  "type": "object",
                  "required": [
                    "address_line1",
                    "city",
                    "postal_code",
                    "country"
                  ],
                  "properties": {
                    "address_line1": {
                      "type": "string",
                      "example": "1800 N Pole St"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "example": "Orlando"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "32801"
                    },
                    "state": {
                      "type": "string",
                      "example": "US-FL"
                    },
                    "country": {
                      "type": "string",
                      "example": "US"
                    }
                  }
                }
              }
            },
            {
              "type": "object",
              "title": "Sepa Recipient",
              "description": "Sepa recipient",
              "required": [
                "payee_type",
                "account_owner_type",
                "iban",
                "account_name",
                "currency",
                "customer_id",
                "address"
              ],
              "properties": {
                "payee_type": {
                  "type": "string",
                  "description": "Type of payee",
                  "enum": [
                    "sepa"
                  ],
                  "example": "sepa"
                },
                "account_owner_type": {
                  "type": "string",
                  "description": "Type of account owner",
                  "enum": [
                    "individual",
                    "business"
                  ],
                  "example": "individual"
                },
                "iban": {
                  "type": "string",
                  "description": "International Bank Account Number",
                  "example": "DE89370400440532013000",
                  "maxLength": 50
                },
                "account_name": {
                  "type": "string",
                  "description": "Name of the account holder",
                  "example": "Amina Bello",
                  "maxLength": 100
                },
                "bank_name": {
                  "type": "string",
                  "description": "Bank name",
                  "example": "Deutsche Bank"
                },
                "currency": {
                  "type": "string",
                  "description": "Currency code for the account",
                  "example": "EUR",
                  "enum": [
                    "EUR"
                  ]
                },
                "customer_id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "ID of the customer who owns this recipient",
                  "example": "373556ec-74e5-4cde-909c-b94d864915db"
                },
                "address": {
                  "type": "object",
                  "required": [
                    "address_line1",
                    "city",
                    "postal_code",
                    "country"
                  ],
                  "properties": {
                    "address_line1": {
                      "type": "string",
                      "example": "1800 N Pole St"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "example": "Orlando"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "32801"
                    },
                    "state": {
                      "type": "string",
                      "example": "US-FL"
                    },
                    "country": {
                      "type": "string",
                      "example": "US"
                    }
                  }
                }
              }
            },
            {
              "type": "object",
              "properties": {
                "payee_type": {
                  "type": "string",
                  "description": "Type of payee",
                  "enum": [
                    "swift"
                  ],
                  "example": "swift"
                },
                "account_owner_type": {
                  "type": "string",
                  "enum": [
                    "individual",
                    "business"
                  ]
                },
                "bank_name": {
                  "type": "string",
                  "example": "Guaranty Trust Bank (GTBank)"
                },
                "account_number": {
                  "type": "string",
                  "description": "Bank account number",
                  "example": "1245909283"
                },
                "iban": {
                  "type": "string",
                  "description": "International Bank Account Number",
                  "example": "GB33BUKB20201555555555",
                  "maxLength": 34
                },
                "bic": {
                  "type": "string",
                  "example": "NG2893A"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USD"
                  ]
                },
                "address": {
                  "type": "object",
                  "required": [
                    "address_line1",
                    "city",
                    "postal_code",
                    "country"
                  ],
                  "properties": {
                    "address_line1": {
                      "type": "string",
                      "example": "1800 N Pole St"
                    },
                    "house_building_number": {
                      "type": "string",
                      "example": "1B"
                    },
                    "address_line2": {
                      "type": "string",
                      "example": "Suite 202"
                    },
                    "city": {
                      "type": "string",
                      "example": "Orlando"
                    },
                    "postal_code": {
                      "type": "string",
                      "example": "32801"
                    },
                    "state": {
                      "type": "string",
                      "example": "US-FL"
                    },
                    "country": {
                      "type": "string",
                      "example": "US"
                    }
                  }
                }
              },
              "required": [
                "payee_type",
                "account_owner_type",
                "bic",
                "currency",
                "address"
              ],
              "oneOf": [
                {
                  "title": "With account number",
                  "required": [
                    "account_number"
                  ]
                },
                {
                  "title": "With IBAN",
                  "required": [
                    "iban"
                  ]
                }
              ],
              "title": "Swift Recipient"
            },
            {
              "type": "object",
              "title": "Global Bank Recipient",
              "required": [
                "payee_type",
                "currency",
                "institution_id"
              ],
              "properties": {
                "payee_type": {
                  "type": "string",
                  "description": "Type of payee",
                  "enum": [
                    "bank_account"
                  ],
                  "example": "bank_account"
                },
                "account_number": {
                  "type": "string",
                  "description": "Account number or phone number",
                  "example": "4401682860",
                  "maxLength": 50
                },
                "bank_name": {
                  "type": "string",
                  "description": "Name of the bank",
                  "example": "Access Bank",
                  "maxLength": 100
                },
                "iban": {
                  "type": "string",
                  "description": "International Bank Account Number",
                  "example": "GB33BUKB20201555555555"
                },
                "institution_id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Institution ID",
                  "example": "4b595668-98dc-4cbc-9ac6-1343b6127a58"
                },
                "currency": {
                  "type": "string",
                  "description": "Currency code for the account",
                  "example": "NGN",
                  "enum": [
                    "NGN",
                    "GHS",
                    "KES",
                    "UGX",
                    "ZMW",
                    "XOF",
                    "BWP",
                    "CDF",
                    "XAF",
                    "MWK",
                    "RWF",
                    "ZAR",
                    "TZS",
                    "BDT",
                    "BIF",
                    "CNY",
                    "COP",
                    "DOP",
                    "EGP",
                    "ETB",
                    "GMD",
                    "GTQ",
                    "GNF",
                    "INR",
                    "ILS",
                    "JOD",
                    "LRD",
                    "MRU",
                    "MXN",
                    "MAD",
                    "MZN",
                    "PKR",
                    "PHP",
                    "PLN",
                    "AED",
                    "SOS",
                    "SLL",
                    "TND",
                    "TRY",
                    "USD",
                    "ZWL"
                  ]
                }
              }
            },
            {
              "type": "object",
              "title": "Global Mobile Money Recipient",
              "required": [
                "payee_type",
                "phone_number",
                "currency",
                "institution_id"
              ],
              "properties": {
                "payee_type": {
                  "type": "string",
                  "description": "Type of payee",
                  "enum": [
                    "mobile_money"
                  ],
                  "example": "mobile_money"
                },
                "phone_number": {
                  "type": "string",
                  "description": "Mobile money account number or phone number",
                  "example": "+233241234567"
                },
                "institution_id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Institution ID",
                  "example": "4b595668-98dc-4cbc-9ac6-1343b6127a58"
                },
                "currency": {
                  "type": "string",
                  "description": "Currency code for the account",
                  "example": "NGN",
                  "enum": [
                    "NGN",
                    "GHS",
                    "KES",
                    "UGX",
                    "ZMW",
                    "XOF",
                    "BWP",
                    "CDF",
                    "XAF",
                    "MWK",
                    "RWF",
                    "ZAR",
                    "TZS",
                    "BDT",
                    "BIF",
                    "CNY",
                    "COP",
                    "DOP",
                    "EGP",
                    "ETB",
                    "GMD",
                    "GTQ",
                    "GNF",
                    "INR",
                    "ILS",
                    "JOD",
                    "LRD",
                    "MRU",
                    "MXN",
                    "MAD",
                    "MZN",
                    "PKR",
                    "PHP",
                    "PLN",
                    "AED",
                    "SOS",
                    "SLL",
                    "TND",
                    "TRY",
                    "USD",
                    "ZWL"
                  ]
                }
              }
            }
          ],
          "description": "Request body. Choose exactly one shape: US Bank Account Recipient | Sepa Recipient | Swift Recipient | Global Bank Recipient | Global Mobile Money Recipient. "
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
    "needsIdempotency": true,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "createFxOrder",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/orders",
    "description": "Create order — Creates an OTC order. The order is created in `waiting_approval` and doesn't execute until a second user approves it. A `market` order executes at the current rate once approved. A `limit` order waits until the rate reaches `target_rate`, then executes once approved. Set `destination_type` to control where the converted funds settle: an internal `account`, a crypto `wallet`, or a saved settlement instruction (`ssi`). The `Idempotency-Key` header is required; requests without it are rejected.\n\nOrders are created in `waiting_approval` and do NOT execute until a second user approves them in the dashboard. Approval is not available over the API — API-key callers are blocked from the approve/reject endpoints. MOVES MONEY: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer the order is created for.",
          "example": "85034797-3ea1-4ad8-a952-becd67d74acc"
        },
        "order_type": {
          "type": "string",
          "description": "A `market` order executes at the current rate once approved. A `limit` order waits until the rate reaches `target_rate`, then executes once approved.",
          "enum": [
            "market",
            "limit"
          ],
          "example": "market"
        },
        "pair": {
          "type": "object",
          "required": [
            "base",
            "quote"
          ],
          "properties": {
            "base": {
              "type": "string",
              "description": "Base currency code (ISO 4217 or crypto ticker).",
              "example": "USD"
            },
            "quote": {
              "type": "string",
              "description": "Quote currency code (ISO 4217 or crypto ticker).",
              "example": "ZAR"
            }
          }
        },
        "amount": {
          "type": "string",
          "description": "Amount of the base currency to exchange. Must be greater than zero.",
          "example": "1000"
        },
        "target_rate": {
          "type": "string",
          "description": "Required for `limit` orders. The rate at which the order should execute.",
          "example": "17.50"
        },
        "side": {
          "type": "string",
          "description": "Side of the order. Defaults to `sell`.",
          "enum": [
            "buy",
            "sell"
          ],
          "default": "sell",
          "example": "sell"
        },
        "source_type": {
          "type": "string",
          "description": "Where the funds come from. Fiat base currencies are funded from an `account`; crypto base currencies from a `wallet`.",
          "enum": [
            "account",
            "wallet"
          ],
          "example": "account"
        },
        "source_id": {
          "type": "string",
          "description": "ID of the source account or wallet.",
          "example": "74653c7b-ae84-45ab-8085-2d2493f86d81"
        },
        "destination_type": {
          "type": "string",
          "description": "Where the proceeds settle. Use `ssi` to settle to a saved settlement instruction.",
          "enum": [
            "account",
            "wallet",
            "ssi"
          ],
          "example": "ssi"
        },
        "destination_id": {
          "type": "string",
          "description": "ID of the destination account, wallet, or settlement instruction.",
          "example": "b23ffd0e-d0fc-432e-acc9-c396194121b3"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        }
      },
      "required": [
        "customer_id",
        "order_type",
        "pair",
        "amount"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "customer_id",
      "order_type",
      "pair",
      "amount",
      "target_rate",
      "side",
      "source_type",
      "source_id",
      "destination_type",
      "destination_id"
    ],
    "alsoInBody": [],
    "movesMoney": true,
    "needsIdempotency": true,
    "spec": "fx.yaml"
  },
  {
    "name": "createPaymentLink",
    "toolset": "payment-links",
    "method": "post",
    "path": "/v1/payment-links",
    "description": "Create a payment link — Creates a new payment link that can be shared with a payer to collect a crypto payment. On success, the API returns a shareable `link_url` along with wallet addresses for each network specified in `supported_networks`. The payer visits the link and completes the payment on their preferred network. ## Supported networks Pass one or more of the following values in `supported_networks`: - stellar - ethereum - polygon - avalanche - solana A wallet address is automatically provisioned for each requested network and returned in the `wallet_addresses` field of the response.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "payer_name": {
          "type": "string",
          "description": "Name of the person who will make the payment.",
          "example": "payer2"
        },
        "payer_email": {
          "type": [
            "string",
            "null"
          ],
          "format": "email",
          "description": "Email address of the person who will make the payment.",
          "example": "payer@example.com"
        },
        "settlement_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the account where settled funds will be deposited after a successful payment.",
          "example": "b3e3c9fd-77ed-4d14-9c45-68db60d17d3a"
        },
        "supported_networks": {
          "type": "array",
          "description": "List of blockchain networks to accept payments on. Wallet addresses for each specified network are automatically provisioned and included in the response.",
          "items": {
            "type": "string",
            "enum": [
              "stellar",
              "ethereum",
              "polygon",
              "avalanche",
              "solana"
            ]
          },
          "minItems": 1,
          "example": [
            "stellar",
            "ethereum"
          ]
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer this payment link is created for.",
          "example": "5e713759-3416-44f5-b797-efd0299aefc1"
        }
      },
      "required": [
        "payer_name",
        "settlement_account_id",
        "supported_networks",
        "customer_id"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "payer_name",
      "payer_email",
      "settlement_account_id",
      "supported_networks",
      "customer_id"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "payment-links.yaml"
  },
  {
    "name": "createTransfer",
    "toolset": "transfers",
    "method": "post",
    "path": "/v1/transfer",
    "description": "Transfer — Initiate a transfer between internal accounts, external accounts, or crypto wallets.\n\nPREREQUISITES: (1) the source account must be funded — check getAccount for available balance; (2) if the destination is an external account, it must be `active`, not `pending` — verify with getExternalAccount; (3) for cross-border transfers, `additional_information` requires the remitter's KYC block (full name, country, document number and dates, date of birth, address, nationality). If you locked a rate with getFxQuote, pass its quote_id. MOVES MONEY: requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": "object",
          "description": "Source of the transfer",
          "required": [
            "source_type",
            "id"
          ],
          "properties": {
            "source_type": {
              "type": "string",
              "enum": [
                "internal_account",
                "internal_crypto_wallet"
              ],
              "description": "source can be `internal_account` or `internal_crypto_wallet`"
            },
            "crypto_asset": {
              "type": "string",
              "description": "Optional crypto asset type",
              "example": "USDC"
            },
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "Use internal account ID or wallet ID"
            }
          }
        },
        "destination": {
          "oneOf": [
            {
              "title": "External Account Destination",
              "type": "object",
              "required": [
                "id",
                "destination_type"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "External account ID"
                },
                "destination_type": {
                  "type": "string",
                  "description": "The transfer destination type",
                  "enum": [
                    "external_account"
                  ],
                  "example": "external_account"
                },
                "rail": {
                  "type": "string",
                  "description": "The transfer rail type",
                  "enum": [
                    "ach",
                    "wire",
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
              "title": "Internal Account Destination",
              "type": "object",
              "required": [
                "id",
                "destination_type"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Internal account ID"
                },
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "internal_account"
                  ],
                  "example": "internal_account"
                }
              }
            },
            {
              "title": "Crypto Wallet Destination",
              "type": "object",
              "required": [
                "blockchain_network",
                "wallet_address",
                "destination_type"
              ],
              "properties": {
                "blockchain_network": {
                  "type": "string",
                  "description": "Blockchain network (e.g., polygon, ethereum)",
                  "enum": [
                    "polygon",
                    "ethereum",
                    "avalanche",
                    "stellar",
                    "solana",
                    "sui",
                    "tron"
                  ],
                  "example": "polygon"
                },
                "wallet_address": {
                  "type": "string",
                  "description": "Crypto wallet address",
                  "example": "0x25a4c9853e761753ae18d6871731e305b8b0b2a4"
                },
                "destination_type": {
                  "type": "string",
                  "enum": [
                    "crypto_wallet"
                  ],
                  "example": "crypto_wallet"
                },
                "blockchain_memo": {
                  "type": "string",
                  "description": "Required for only stellar network",
                  "example": "x1we2e2348r3r34r3"
                }
              }
            },
            {
              "title": "Card Destination",
              "type": "object",
              "required": [
                "id",
                "destination_type"
              ],
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid",
                  "description": "Recipient card ID"
                },
                "destination_type": {
                  "type": "string",
                  "description": "The transfer destination type",
                  "enum": [
                    "card"
                  ],
                  "example": "card"
                }
              }
            }
          ]
        },
        "amount": {
          "type": "number",
          "description": "Transfer amount",
          "example": 100.5
        },
        "additional_information": {
          "type": "object",
          "description": "Additional remitter information required for external bank account and mobile money beneficiaries",
          "properties": {
            "remitter_full_name": {
              "type": "string",
              "description": "Full name of the person sending the transfer",
              "example": "John Doe"
            },
            "remitter_country": {
              "type": "string",
              "description": "Country code of the remitter (ISO 3166-1 alpha-2)",
              "example": "US"
            },
            "remitter_document_number": {
              "type": "string",
              "description": "Document/ID number of the remitter",
              "example": "A123456789"
            },
            "remitter_document_issue_date": {
              "type": "string",
              "format": "date",
              "description": "Date when the remitter's document was issued",
              "example": "2020-01-15"
            },
            "remitter_document_expiry_date": {
              "type": "string",
              "format": "date",
              "description": "Date when the remitter's document expires",
              "example": "2030-01-15"
            },
            "remitter_date_of_birth": {
              "type": "string",
              "format": "date",
              "description": "Date of birth of the remitter",
              "example": "1990-06-25"
            },
            "remitter_address": {
              "type": "object",
              "description": "Physical address of the remitter",
              "properties": {
                "address_line1": {
                  "type": "string",
                  "description": "Primary address line",
                  "example": "123 Main Street"
                },
                "city": {
                  "type": "string",
                  "description": "City name",
                  "example": "New York"
                },
                "state": {
                  "type": "string",
                  "description": "State or province code",
                  "example": "NY"
                },
                "postal_code": {
                  "type": "string",
                  "description": "Postal or ZIP code",
                  "example": "10001"
                },
                "country": {
                  "type": "string",
                  "description": "Country code (ISO 3166-1 alpha-2)",
                  "example": "US"
                }
              }
            },
            "remitter_nationality": {
              "type": "string",
              "description": "Nationality of the remitter (ISO 3166-1 alpha-2 country code)",
              "example": "US"
            }
          }
        },
        "description": {
          "type": "string",
          "description": "Transfer description",
          "example": "Transfer Testing"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Customer initiating the transfer"
        },
        "client_reference": {
          "type": "string",
          "description": "Optional client reference for reconciliation"
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
        }
      },
      "required": [
        "source",
        "destination",
        "amount",
        "customer_id",
        "description",
        "client_reference"
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
      "additional_information",
      "description",
      "customer_id",
      "client_reference"
    ],
    "alsoInBody": [],
    "movesMoney": true,
    "needsIdempotency": true,
    "spec": "transfer.yaml"
  },
  {
    "name": "createWallet",
    "toolset": "wallets",
    "method": "post",
    "path": "/v1/wallets",
    "description": "Create a wallet — Create a new blockchain wallet for a customer on the specified network.\n\nASYNC: wallet provisioning happens through the custody provider and may not be complete when this returns. Poll getWallet until the wallet reports an address.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the customer to create a wallet for",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "name": {
          "type": "string",
          "description": "Optional custom name for the wallet",
          "example": "my wallet"
        },
        "network": {
          "type": "string",
          "description": "Blockchain network for the wallet",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "base",
            "solana",
            "avalanche",
            "sui",
            "tron"
          ],
          "example": "stellar"
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
      "network"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
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
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "deletePaymentLink",
    "toolset": "payment-links",
    "method": "delete",
    "path": "/v1/payment-links/{id}",
    "description": "Delete a payment link — Permanently deletes a payment link.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier of the payment link."
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
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "deleteSavedCard",
    "toolset": "collections",
    "method": "delete",
    "path": "/v1/collections/cards/{card_id}",
    "description": "Delete saved card — This operation is idempotent. It returns success even if the card doesn't exist.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "Saved card ID"
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
    "needsIdempotency": false,
    "spec": "collections.yaml"
  },
  {
    "name": "exportTransactions",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/export",
    "description": "Export transactions — Exports matching transactions as a downloadable file. Supports CSV and JSON formats. Maximum 50,000 records per export.\n\nCapped at 50,000 records per export. Narrow the filters for larger ranges.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by customer ID"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by account ID"
        },
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by card ID"
        },
        "tx_hash": {
          "type": "string",
          "description": "Filter by blockchain transaction hash"
        },
        "channel": {
          "type": "string",
          "enum": [
            "avalanche",
            "ethereum",
            "solana",
            "stellar",
            "polygon",
            "ach",
            "wire",
            "swift",
            "bank_transfer",
            "mobile_money",
            "internal",
            "swap",
            "sepa",
            "base",
            "sui",
            "tron",
            "card",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "savings",
            "savings_withdrawal",
            "savings_interest"
          ],
          "description": "Filter by transaction channel"
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ],
          "description": "Filter by transaction direction"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "completed",
            "failed",
            "waiting_approval"
          ],
          "description": "Filter by transaction status"
        },
        "transaction_type": {
          "type": "string",
          "enum": [
            "internal_transfer",
            "crypto_transfer",
            "crypto_funding",
            "global_remittance",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "account_funding",
            "credit",
            "debit",
            "fee_charge",
            "subscription_fee",
            "invoice_payment"
          ],
          "description": "Filter by transaction type"
        },
        "start_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter transactions created on or after this timestamp"
        },
        "end_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter transactions created on or before this timestamp"
        },
        "export_format": {
          "type": "string",
          "enum": [
            "csv",
            "json"
          ],
          "default": "csv",
          "description": "File format for the export"
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
    "needsIdempotency": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getAccount",
    "toolset": "accounts",
    "method": "get",
    "path": "/v1/accounts/{account_id}",
    "description": "Get a single account — Retrieve details of a specific internal account by `account_id`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string"
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
    "needsIdempotency": false,
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
    "needsIdempotency": false,
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
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "getCard",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/{card_id}",
    "description": "Get card — Retrieve card details for a customer. To retrieve sensitive card details, such as `cvv` and `card_number` use the View card sensitive details endpoint.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "The ID of the card to retrieve."
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCardApplication",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/applications/{application_id}",
    "description": "Get card application — Retrieve the card application associated with a customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "application_id": {
          "type": "string",
          "format": "uuid",
          "description": "The ID of the card application (UUID)."
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCardBalance",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/{card_id}/balance",
    "description": "Get card balance — Retrieve the current balance available on a card. The balance represents the total funds available for card transactions in USD.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "description": "The ID of the card to retrieve balance for"
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "getCollection",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/{id}",
    "description": "Get transaction by ID — Returns the status and details of an onramp transaction. This endpoint is public — no API key is required.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Onramp transaction ID"
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
    "needsIdempotency": false,
    "spec": "collections.yaml"
  },
  {
    "name": "getCustomer",
    "toolset": "customers",
    "method": "get",
    "path": "/v1/customers/{customer_id}",
    "description": "Get a single customer — Retrieve details of a specific customer by `customer_id`.",
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
    "needsIdempotency": false,
    "spec": "customers.yaml"
  },
  {
    "name": "getCustomerKycDocuments",
    "toolset": "kyc",
    "method": "get",
    "path": "/v1/customers/{customer_id}/kyc/documents",
    "description": "Get KYC document data — Returns the list of documents a customer has uploaded, with metadata for each one.",
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
    "needsIdempotency": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "getCustomerKycStatus",
    "toolset": "kyc",
    "method": "get",
    "path": "/v1/customers/{customer_id}/kyc/status",
    "description": "Get applicant verification status — Retrieves the current KYC review status for a customer from the verification provider. Use this endpoint to check a customer's verification outcome after you initiate KYC. While a review is in progress, `reviewStatus` is `pending` and `reviewResult` is omitted. Once the review finishes, `reviewStatus` is `completed` and `reviewResult` contains the decision.",
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
    "needsIdempotency": false,
    "spec": "kyc.yaml"
  },
  {
    "name": "getExternalAccount",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/{external_account_id}",
    "description": "Get a single external account — Retrieve details of a specific external account. Use this endpoint to check the `status` after a `202 Accepted` from `POST /v1/external-accounts`, calling it until the status changes to `active`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "external_account_id": {
          "type": "string"
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
    "needsIdempotency": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "getFxOrder",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders/{order_id}",
    "description": "Get order — Retrieves a single order by its `order_id`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "The order reference returned when the order was created."
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
    "needsIdempotency": false,
    "spec": "fx.yaml"
  },
  {
    "name": "getFxQuote",
    "toolset": "fx",
    "method": "post",
    "path": "/v1/fx/quote",
    "description": "Create an FX quote — Returns a foreign exchange rate quote for a given currency pair and amount. The quote includes a `quote_id` and an expiry time. Use the `quote_id` when submitting a transfer to lock in the quoted rate. The `Idempotency-Key` header is required; requests without it are rejected.\n\nQuotes expire. The response carries a quote_id and an expiry — pass quote_id to createTransfer to lock the rate. Re-quote if it has expired rather than transferring at an unlocked rate.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from_currency": {
          "type": "string",
          "description": "Source currency code (ISO 4217).",
          "example": "USD"
        },
        "to_currency": {
          "type": "string",
          "description": "Target currency code (ISO 4217).",
          "example": "ZAR"
        },
        "amount": {
          "type": "number",
          "description": "Amount in the source currency to convert. Must be greater than zero.",
          "example": 10
        },
        "direction": {
          "type": "string",
          "description": "Direction of the trade.",
          "enum": [
            "BUY",
            "SELL"
          ],
          "example": "BUY"
        }
      },
      "required": [
        "from_currency",
        "to_currency",
        "amount",
        "direction"
      ],
      "additionalProperties": true
    },
    "pathParams": [],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "from_currency",
      "to_currency",
      "amount",
      "direction"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": true,
    "spec": "fx.yaml"
  },
  {
    "name": "getPaymentLink",
    "toolset": "payment-links",
    "method": "get",
    "path": "/v1/payment-links/{id}",
    "description": "Get a payment link — Retrieves a single payment link by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier of the payment link."
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
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "getPublicPaymentLink",
    "toolset": "payment-links",
    "method": "get",
    "path": "/v1/payment-links/public/{id}",
    "description": "Get a payment link (public) — Retrieves a payment link by its ID without requiring authentication. This endpoint is intended for the payer-facing checkout experience. Only active payment links are returned.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier of the payment link."
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
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "getSavedCard",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/cards/{card_id}",
    "description": "Get saved card — Returns a single saved card by ID. Returns 404 if the card does not exist or is inactive, and 403 if the card belongs to a different tenant.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "Saved card ID"
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
    "needsIdempotency": false,
    "spec": "collections.yaml"
  },
  {
    "name": "getTransaction",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/{transaction_id}",
    "description": "Get a single transaction — Retrieve details of a specific transaction by transaction ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "transaction_id": {
          "type": "string",
          "format": "uuid",
          "description": "The ID of the transaction to retrieve"
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
    "needsIdempotency": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getTransactionsVolume",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions/volume",
    "description": "Get transactions volume — Returns the total summed volume of transactions matching the supplied filters. Useful for dashboard metrics and reporting.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "sending_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by sending account ID"
        },
        "receiving_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by receiving account ID"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter by customer ID"
        },
        "channel": {
          "type": "string",
          "enum": [
            "avalanche",
            "ethereum",
            "solana",
            "stellar",
            "polygon",
            "ach",
            "wire",
            "swift",
            "bank_transfer",
            "mobile_money",
            "internal",
            "swap",
            "sepa",
            "base",
            "sui",
            "tron",
            "card",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "savings",
            "savings_withdrawal",
            "savings_interest"
          ],
          "description": "Filter by transaction channel"
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ],
          "description": "Filter by transaction direction"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "completed",
            "failed",
            "waiting_approval"
          ],
          "description": "Filter by transaction status"
        },
        "transaction_type": {
          "type": "string",
          "enum": [
            "internal_transfer",
            "crypto_transfer",
            "crypto_funding",
            "global_remittance",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "account_funding",
            "credit",
            "debit",
            "fee_charge",
            "subscription_fee",
            "invoice_payment"
          ],
          "description": "Filter by transaction type"
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
    "needsIdempotency": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "getTransferRates",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/rates",
    "description": "Get rates — Retrieve current exchange rates for transfers between different currencies.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of transactions per page"
        },
        "country_iso_code": {
          "type": "string",
          "minLength": 2,
          "maxLength": 2,
          "description": "Use two-letter ISO country code to filter transfer rates"
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3,
          "description": "Use three-letter ISO currency code to filter transfer rates"
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
      "currency"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "getWallet",
    "toolset": "wallets",
    "method": "get",
    "path": "/v1/wallets/{wallet_id}",
    "description": "Get a single wallet — Retrieve details of a specific wallet by wallet ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "wallet_id": {
          "type": "string",
          "format": "uuid",
          "description": "Wallet ID to retrieve"
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
    "needsIdempotency": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "getWebhookCallHistory",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/calls/{id}",
    "description": "Get call history for a webhook event — Get the per-attempt delivery call history for a specific webhook event, including request/response details for each attempt.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the webhook event"
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
    "needsIdempotency": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "getWebhookEventDetail",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/event/{id}",
    "description": "Get webhook event details — Get detailed information about a specific webhook event including request/response headers, payload, and delivery attempts.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the webhook event"
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
    "needsIdempotency": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "getWebhookHistory",
    "toolset": "webhooks",
    "method": "get",
    "path": "/v1/webhooks/history",
    "description": "Get paginated webhook event history — Get a paginated list of webhook events for a specific business. Supports filtering by event type, status, and date range.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "transaction_id": {
          "type": "string",
          "description": "Filter by the transaction identifier associated with the event"
        },
        "event_type": {
          "type": "string",
          "description": "Filter by event type (full string, e.g. transfer.status.completed)"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "processing",
            "sent",
            "failed",
            "retrying"
          ],
          "description": "Filter by webhook status"
        },
        "start_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter events created on or after this date (inclusive). Must be in RFC3339 format. If both start_date and end_date are provided, start_date must not be after end_date."
        },
        "end_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter events created on or before this date (inclusive). Must be in RFC3339 format. If both start_date and end_date are provided, start_date must not be after end_date."
        },
        "limit": {
          "type": "integer",
          "format": "int32",
          "minimum": 1,
          "maximum": 100,
          "default": 50,
          "description": "Maximum number of results per page (max 100, default 50)"
        },
        "page": {
          "type": "integer",
          "format": "int32",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination (1-based)"
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
    "needsIdempotency": false,
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
          "type": "string"
        },
        "application_type": {
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
      "customer_id",
      "status",
      "application_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "listAccounts",
    "toolset": "accounts",
    "method": "get",
    "path": "/v1/accounts",
    "description": "Get accounts — Retrieve a list of internal accounts with optional filters and pagination.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "items_per_page": {
          "type": "string",
          "description": "Number of items per page (pagination limit)"
        },
        "page": {
          "type": "string",
          "description": "Page number for pagination"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter accounts by customer ID"
        },
        "blockchain_network": {
          "type": "string",
          "enum": [
            "polygon",
            "stellar",
            "ethereum",
            "solana",
            "avalanche"
          ],
          "description": "Filter accounts by blockchain network"
        },
        "label": {
          "type": "string",
          "description": "Filter accounts by their label"
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
      "blockchain_network",
      "label"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "listCardApplications",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards/applications",
    "description": "Get card applications — Retrieve a paginated list of card applications with optional filtering.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of applications per page"
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "listCards",
    "toolset": "cards",
    "method": "get",
    "path": "/v1/cards",
    "description": "Get cards — Retrieve a paginated list of cards with optional filtering.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of cards per page"
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "listCustomers",
    "toolset": "customers",
    "method": "get",
    "path": "/v1/customers",
    "description": "Get customers — Retrieve a paginated list of customers with optional filters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "description": "Page number (1-based)"
        },
        "items_per_page": {
          "type": "integer",
          "description": "Number of items per page"
        },
        "email": {
          "type": "string",
          "description": "Filter by exact email address"
        },
        "sort": {
          "type": "string",
          "description": "Sort order (e.g. `created_at ASC` or `created_at DESC`)"
        },
        "status": {
          "type": "string",
          "description": "Filter by customer status (e.g. `active`)"
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
          "description": "Full-text search across first name, last name, email, and customer ID"
        },
        "kyc_status": {
          "type": "string",
          "description": "Filter by KYC status of the customer's basic KYC record"
        },
        "from": {
          "type": "integer",
          "description": "Offset — number of records to skip before the current page"
        },
        "to": {
          "type": "integer",
          "description": "Upper record offset bound"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "items_per_page",
      "email",
      "sort",
      "status",
      "type",
      "keyword",
      "kyc_status",
      "from",
      "to"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "customers.yaml"
  },
  {
    "name": "listExternalAccountInstitutions",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts/institutions",
    "description": "Get external account institutions — Retrieve a list of supported financial institutions for external accounts.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "Number of institutions per page"
        },
        "country_iso_code": {
          "type": "string",
          "description": "country ISO 2 code"
        },
        "institution_type": {
          "type": "string",
          "enum": [
            "bank",
            "mobile_money"
          ],
          "description": "Filters institutions by type."
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
      "institution_type"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "listExternalAccounts",
    "toolset": "external-accounts",
    "method": "get",
    "path": "/v1/external-accounts",
    "description": "Get multiple external accounts — Retrieve a list of external accounts with optional pagination.",
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
    "needsIdempotency": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "listFeatures",
    "toolset": "features",
    "method": "get",
    "path": "/v1/risk/features",
    "description": "List available features — Retrieve features based on the provided parameters. If you omit customer_id from the request, the endpoint returns all available features and their requirements. If you include customer_id, the endpoint returns the customer’s features and their activation status.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Optional customer ID. When provided, the response includes features specific to that customer along with their activation status. When omitted, or if the customer ID isn’t found, the response returns the global list of available features."
        },
        "country": {
          "type": "string",
          "minLength": 2,
          "maxLength": 2,
          "description": "ISO 3166-1 alpha-2 country code. When provided, the response is filtered to features available in that country. Can be combined with `customer_id` to get country-specific features for a customer."
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "inactive",
            "all"
          ],
          "default": "all",
          "description": "Filter features by activation status"
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
    "needsIdempotency": false,
    "spec": "features.yaml"
  },
  {
    "name": "listFxCurrencyPairs",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/supported-currencies",
    "description": "List currency pairs — Retrieves all supported currency pairs from all enabled providers. By default, only fiat currency pairs are returned. Set `include_crypto=true` to include crypto pairs alongside fiat pairs. This endpoint is cached for 1 hour.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "include_crypto": {
          "type": "boolean",
          "default": false,
          "description": "When `true`, returns both fiat and crypto supported currency pairs. When omitted or `false`, only fiat pairs are returned."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "include_crypto"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxOrders",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders",
    "description": "List orders — Lists your OTC orders, most recent first. Filter with `status`, `order_type`, `side`, `search`, `start_date`, and `end_date`, and page with `page` and `items_per_page`. Filter values that match no orders (including unknown `status` values) don't error; they return a `200` with an empty `items` array.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "description": "Filter by order status: `waiting_approval`, `pending`, `rejected`, `cancelled`, or `expired`."
        },
        "order_type": {
          "type": "string",
          "enum": [
            "market",
            "limit"
          ],
          "description": "Filter by order type."
        },
        "side": {
          "type": "string",
          "enum": [
            "buy",
            "sell"
          ],
          "description": "Filter by order side."
        },
        "search": {
          "type": "string",
          "description": "Free-text search filter (for example, an order reference)."
        },
        "start_date": {
          "type": "string",
          "format": "date",
          "description": "Only return orders created on or after this date (ISO 8601)."
        },
        "end_date": {
          "type": "string",
          "format": "date",
          "description": "Only return orders created on or before this date (ISO 8601)."
        },
        "page": {
          "type": "integer",
          "default": 1,
          "minimum": 1,
          "description": "Page number to return."
        },
        "items_per_page": {
          "type": "integer",
          "default": 20,
          "maximum": 100,
          "description": "Number of orders per page."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "status",
      "order_type",
      "side",
      "search",
      "start_date",
      "end_date",
      "page",
      "items_per_page"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxPendingApprovals",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/orders/pending-approvals",
    "description": "List pending approvals — Lists the orders in `waiting_approval` that are waiting on an approve or reject decision.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "default": 1,
          "minimum": 1,
          "description": "Page number to return."
        },
        "items_per_page": {
          "type": "integer",
          "default": 20,
          "maximum": 100,
          "description": "Number of orders per page."
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
    "needsIdempotency": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listFxRates",
    "toolset": "fx",
    "method": "get",
    "path": "/v1/fx/rates",
    "description": "List live exchange rates — Fetches exchange rates for multiple currency pairs from all enabled providers. Filters that match no supported pair (for example an unknown currency code) don't error; they return a `200` with an empty `data` array. Use [Get supported currencies](/reference/get_v1-fx-supported-currencies) to confirm a pair is supported.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "include_crypto": {
          "type": "boolean",
          "default": false,
          "description": "When `true`, crypto pairs are included in the rates data alongside fiat pairs. Defaults to `false`."
        },
        "from_currency": {
          "type": "string",
          "description": "Filter by source currency (3-letter ISO 4217 code)"
        },
        "to_currency": {
          "type": "string",
          "description": "Filter by target currency (3-letter ISO 4217 code)"
        },
        "currency_pairs": {
          "type": "string",
          "description": "Comma-separated list of specific currency pairs to retrieve, each in `FROM/TO` format."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "include_crypto",
      "from_currency",
      "to_currency",
      "currency_pairs"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "fx.yaml"
  },
  {
    "name": "listPaymentLinks",
    "toolset": "payment-links",
    "method": "get",
    "path": "/v1/payment-links",
    "description": "List payment links — Returns a paginated list of all payment links created under your tenant. Use the `page` and `per_page` query parameters to navigate through results. Optionally filter by `status`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for paginated results."
        },
        "per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 20,
          "description": "Number of items to return per page."
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "paused"
          ],
          "description": "Filter payment links by status."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "page",
      "per_page",
      "status"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "listPendingAccountApplications",
    "toolset": "account-applications",
    "method": "get",
    "path": "/v1/accounts/applications/pending",
    "description": "Get pending applications — Retrieve a list of pending applications.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "integer",
          "default": 10,
          "description": "Maximum number of pending applications to return."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "limit"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "listSavedCards",
    "toolset": "collections",
    "method": "get",
    "path": "/v1/collections/cards",
    "description": "Get saved cards — Returns all active saved cards for the customer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter saved cards by customer ID."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "collections.yaml"
  },
  {
    "name": "listTransactions",
    "toolset": "transactions",
    "method": "get",
    "path": "/v1/transactions",
    "description": "Get transactions — Retrieve a list of transactions with optional filtering and pagination.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of transactions per page"
        },
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter transactions by customer ID"
        },
        "account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter transactions by account ID"
        },
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter transactions by card ID"
        },
        "payment_link_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter transactions by payment link ID"
        },
        "tx_hash": {
          "type": "string",
          "description": "Filter by blockchain transaction hash"
        },
        "channel": {
          "type": "string",
          "enum": [
            "avalanche",
            "ethereum",
            "solana",
            "stellar",
            "polygon",
            "ach",
            "wire",
            "swift",
            "bank_transfer",
            "mobile_money",
            "internal",
            "swap",
            "sepa",
            "base",
            "sui",
            "tron",
            "card",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "savings",
            "savings_withdrawal",
            "savings_interest"
          ],
          "description": "Filter by transaction channel"
        },
        "direction": {
          "type": "string",
          "enum": [
            "in",
            "out"
          ],
          "description": "Filter by transaction direction"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "completed",
            "failed",
            "waiting_approval"
          ],
          "description": "Filter by transaction status"
        },
        "transaction_type": {
          "type": "string",
          "enum": [
            "internal_transfer",
            "crypto_transfer",
            "crypto_funding",
            "global_remittance",
            "card_funding",
            "card_withdrawal",
            "card_payment",
            "account_funding",
            "credit",
            "debit",
            "fee_charge",
            "subscription_fee",
            "invoice_payment"
          ],
          "description": "Filter by transaction type"
        },
        "start_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter transactions created on or after this timestamp"
        },
        "end_date": {
          "type": "string",
          "format": "date-time",
          "description": "Filter transactions created on or before this timestamp"
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
      "payment_link_id",
      "tx_hash",
      "channel",
      "direction",
      "status",
      "transaction_type",
      "start_date",
      "end_date"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "transactions.yaml"
  },
  {
    "name": "listTransferSupportedCountries",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-countries",
    "description": "Get supported countries — Retrieve the list of countries supported for transfers. Each country includes its two-letter and three-letter ISO codes and its local currency code where available.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "iso_code": {
          "type": "string",
          "description": "Filter by two-letter ISO 3166-1 alpha-2 country code (case-insensitive)."
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
    "needsIdempotency": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listTransferSupportedCountriesForAddress",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-countries-for-address",
    "description": "Get supported countries for address — Retrieve the list of countries supported for recipient addresses in international transfers. Countries with administrative divisions include a `states` array; countries without return an empty array.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "iso_code": {
          "type": "string",
          "description": "Filter by two-letter ISO 3166-1 alpha-2 country code (case-insensitive)."
        },
        "name": {
          "type": "string",
          "description": "Filter by country name (case-insensitive partial match)."
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
    "needsIdempotency": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listTransferSupportedCurrencies",
    "toolset": "transfers",
    "method": "get",
    "path": "/v1/transfer/supported-currencies",
    "description": "Get supported currencies — Retrieve the list of fiat currencies supported for transfers.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "description": "Filter by three-letter ISO 4217 currency code (case-insensitive)."
        },
        "name": {
          "type": "string",
          "description": "Filter by currency name (case-insensitive partial match)."
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "code",
      "name"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "transfer.yaml"
  },
  {
    "name": "listWallets",
    "toolset": "wallets",
    "method": "get",
    "path": "/v1/wallets",
    "description": "Get wallets — Retrieve a paginated list of wallets, with optional filtering by customer and blockchain network.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Filter wallets by customer ID"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "Page number for pagination"
        },
        "items_per_page": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10,
          "description": "Number of wallets per page"
        },
        "network": {
          "type": "string",
          "enum": [
            "stellar",
            "polygon",
            "ethereum",
            "base",
            "solana",
            "avalanche",
            "sui",
            "tron"
          ],
          "description": "Filter wallets by blockchain network"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "pathParams": [],
    "queryParams": [
      "customer_id",
      "page",
      "items_per_page",
      "network"
    ],
    "bodyMode": "none",
    "bodyProps": [],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "wallets.yaml"
  },
  {
    "name": "processAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/process",
    "description": "Process account application — Process the submitted application with the relevant provider.\n\nASYNC: processing may be handed to a background worker rather than completing inline. Do not assume the response is terminal — poll getAccountApplication until status is APPROVED or REJECTED.",
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
    "needsIdempotency": true,
    "spec": "accounts.yaml"
  },
  {
    "name": "retryWebhookEvent",
    "toolset": "webhooks",
    "method": "post",
    "path": "/v1/webhooks/event/send/{id}",
    "description": "Manually retry a webhook event — Trigger an immediate manual delivery attempt for a specific webhook event. Requires the `webhook:create` permission.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the webhook event"
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
    "needsIdempotency": false,
    "spec": "webhooks.yaml"
  },
  {
    "name": "startCustomerKyc",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/start",
    "description": "Start KYC verification — Initiates KYC verification for a customer. For business customers, complete KYC verification for every associated person before starting the business's verification.\n\nFor business customers, complete KYC for every associated person BEFORE starting the business's own verification. Poll getCustomerKycStatus for the outcome — verification is asynchronous and driven by the provider.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Customer ID to start KYC for"
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
    "needsIdempotency": true,
    "spec": "kyc.yaml"
  },
  {
    "name": "startCustomerKycS2S",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/start-s2s",
    "description": "Initiate server-to-server KYC verification — Initiates server-to-server (S2S) KYC verification for a customer who has already uploaded the required documents using the `/v1/customers/kyc/upload-document` endpoint. This is step 2 of the S2S verification process. Before calling this endpoint, upload all required documents. For business customers, complete KYC verification for every associated person before starting the business's verification. On success, verification is initiated and the review outcome is delivered later by webhook. Business customers must upload a registration certificate first, or the request fails with a 400.\n\nSTEP 2 of the server-to-server KYC flow. All required documents must already be uploaded via uploadCustomerKycDocument.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Customer ID to initiate KYC verification for. Documents must be uploaded for this customer before calling this endpoint.",
          "example": "aabe0a33-6716-42e2-bbca-7abf1a8bd91c"
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
    "needsIdempotency": true,
    "spec": "kyc.yaml"
  },
  {
    "name": "submitAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/submit",
    "description": "Submit account application — Mark the application as submitted for provider processing.\n\nORDERING: applications flow DRAFT -> SUBMITTED -> PROCESSING -> CREATING_ACCOUNT -> APPROVED or REJECTED. Submitting only advances to SUBMITTED; call processAccountApplication next, or use submitAndProcessAccountApplication to do both.",
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
    "needsIdempotency": true,
    "spec": "accounts.yaml"
  },
  {
    "name": "submitAndProcessAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/{id}/submit-and-process",
    "description": "Submit and process application — Combine submission and processing into a single call.\n\nASYNC: combines submit and process. May still complete in the background — poll getAccountApplication until status is APPROVED or REJECTED.",
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
    "needsIdempotency": true,
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
          "required": [
            "account_type",
            "currency",
            "blockchain_network"
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
                "savings"
              ],
              "description": "Kind of account to open (for example, regular or savings). This is the account type, not the customer type. Use the top-level application_type field for individual vs business.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Blockchain network to back the account (for example, polygon or stellar).",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Blockchain wallet address to associate with the account.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "UUID of an existing Gravv wallet to link to the account.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the provider agreement associated with this application.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "URL to the terms of service the applicant must accept.",
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
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "updateAccountStatus",
    "toolset": "accounts",
    "method": "patch",
    "path": "/v1/accounts/{account_id}/status",
    "description": "Update account status — Change an account's status. Set `frozen` to suspend an account, `active` to reactivate it, or `deleted` to close it. Deleting requires the account's wallet balance to be zero. A deleted account can't be changed again, and system-managed accounts can't have their status updated.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "frozen",
            "deleted"
          ],
          "description": "The new account status."
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
    "needsIdempotency": false,
    "spec": "accounts.yaml"
  },
  {
    "name": "updateCardStatus",
    "toolset": "cards",
    "method": "patch",
    "path": "/v1/cards/{card_id}/update",
    "description": "Update card status — Update the status of a card. You can freeze a card temporarily or block it permanently. **Status Options:** - `active`: Card is active, and you can use it for transactions - `freeze`: Card is temporarily frozen, and you can't use it until you reactivate it by updating the status to active - `blocked`: Card is permanently blocked, and you can't reactivate it",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "The ID of the card to update"
        },
        "status": {
          "type": "string",
          "description": "New status for the card",
          "enum": [
            "active",
            "freeze",
            "blocked"
          ],
          "example": "freeze"
        },
        "limit": {
          "type": "integer",
          "description": "Optional spending limit for the card",
          "example": 1000
        }
      },
      "required": [
        "card_id",
        "status"
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
    "needsIdempotency": false,
    "spec": "cards.yaml"
  },
  {
    "name": "updateCustomer",
    "toolset": "customers",
    "method": "put",
    "path": "/v1/customers/{customer_id}",
    "description": "Update a customer — Update details of a specific customer. The path `customer_id` parameter is cosmetic — the service reads `customer_id` from the request body (marked required there). Only provided fields are updated.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "customer_id": {
          "type": "string",
          "format": "uuid",
          "description": "Cosmetic path parameter — the service resolves the customer from `customer_id` in the request body, not this value."
        },
        "first_name": {
          "type": "string",
          "example": "Jane"
        },
        "middle_name": {
          "type": "string",
          "example": "A."
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
        "phone": {
          "type": "string",
          "example": "+15555550101"
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
              "example": "1800 N Pole St"
            },
            "address_line2": {
              "type": "string",
              "example": "Suite 202"
            },
            "city": {
              "type": "string",
              "example": "Orlando"
            },
            "postal_code": {
              "type": "string",
              "example": "32801"
            },
            "state": {
              "type": "string",
              "example": "US-FL"
            },
            "country": {
              "type": "string",
              "example": "US"
            }
          }
        },
        "business_name": {
          "type": "string",
          "example": "Acme Corporation"
        },
        "business_description": {
          "type": "string",
          "example": "Technology and software development"
        },
        "business_type": {
          "type": "string",
          "example": "private_limited"
        },
        "business_industry": {
          "type": "string",
          "example": "Technology"
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
          "description": "List of associated persons to update or add. If `id` is provided the existing record is updated; if omitted a new person is created (all required fields must then be present).",
          "items": {
            "type": "object",
            "description": "An associated person entry for an update request. Provide `id` to update an existing person; omit it to add a new one (in which case `first_name`, `last_name`, `email`, `gender`, `date_of_birth`, `phone`, and `address` are all required).",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid",
                "description": "UUID of an existing associated person. Omit to add a new person.",
                "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              },
              "first_name": {
                "type": "string",
                "example": "Jane"
              },
              "middle_name": {
                "type": "string",
                "example": "A."
              },
              "last_name": {
                "type": "string",
                "example": "Doe"
              },
              "email": {
                "type": "string",
                "format": "email",
                "example": "jane.doe@example.com"
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
                "example": "+15555550102"
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
                    "example": "1800 N Pole St"
                  },
                  "address_line2": {
                    "type": "string",
                    "example": "Suite 202"
                  },
                  "city": {
                    "type": "string",
                    "example": "Orlando"
                  },
                  "postal_code": {
                    "type": "string",
                    "example": "32801"
                  },
                  "state": {
                    "type": "string",
                    "example": "US-FL"
                  },
                  "country": {
                    "type": "string",
                    "example": "US"
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
    "needsIdempotency": false,
    "spec": "customers.yaml"
  },
  {
    "name": "updatePaymentLink",
    "toolset": "payment-links",
    "method": "put",
    "path": "/v1/payment-links/{id}",
    "description": "Update a payment link — Updates an existing payment link. All fields are optional — only supplied fields are updated.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier of the payment link."
        },
        "payee_name": {
          "type": "string",
          "description": "Updated name of the person or business receiving the payment.",
          "example": "Rose"
        },
        "payer_name": {
          "type": "string",
          "description": "Updated name of the person making the payment.",
          "example": "payer2"
        },
        "payer_email": {
          "type": [
            "string",
            "null"
          ],
          "format": "email",
          "description": "Updated email address of the person making the payment.",
          "example": "payer@example.com"
        },
        "settlement_account_id": {
          "type": "string",
          "format": "uuid",
          "description": "Updated ID of the account where settled funds will be deposited.",
          "example": "b3e3c9fd-77ed-4d14-9c45-68db60d17d3a"
        },
        "supported_networks": {
          "type": "array",
          "description": "Updated list of blockchain networks to accept payments on.",
          "items": {
            "type": "string",
            "enum": [
              "stellar",
              "ethereum",
              "polygon",
              "avalanche",
              "solana"
            ]
          },
          "minItems": 1,
          "example": [
            "stellar",
            "ethereum"
          ]
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
      "payee_name",
      "payer_name",
      "payer_email",
      "settlement_account_id",
      "supported_networks"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "updatePaymentLinkStatus",
    "toolset": "payment-links",
    "method": "patch",
    "path": "/v1/payment-links/{id}/status",
    "description": "Toggle payment link status — Sets the status of a payment link to `active` or `paused`. A paused link cannot be used by payers to complete payments.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier of the payment link."
        },
        "status": {
          "type": "string",
          "description": "The desired status to set on the payment link.",
          "enum": [
            "active",
            "paused"
          ],
          "example": "paused"
        }
      },
      "required": [
        "id",
        "status"
      ],
      "additionalProperties": true
    },
    "pathParams": [
      "id"
    ],
    "queryParams": [],
    "bodyMode": "inline",
    "bodyProps": [
      "status"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "payment-links.yaml"
  },
  {
    "name": "uploadCustomerKycDocument",
    "toolset": "kyc",
    "method": "post",
    "path": "/v1/customers/kyc/upload-document",
    "description": "Upload document — Upload a KYC document for individual and business customers. This is the first step of the server-to-server verification flow. Documents are uploaded as base64-encoded strings along with metadata about the document type, customer information, and document details. The document is validated and stored in preparation for verification. ## Supported document types Individual customers must upload a `SELFIE` and one identification document: `PASSPORT`, `ID_CARD`, or `DRIVERS`. Business customers upload a single REGISTRATION_CERTIFICATE, which may be a formation document or an ownership document. The `idDocType` value is always `REGISTRATION_CERTIFICATE`. All `idDocType` values are uppercase. Selfie documents must be an image (JPEG or PNG); PDF selfies are rejected. ## Document subtypes Identification documents use `idDocSubType` to indicate which side is uploaded (case-sensitive, uppercase): - **FRONT_SIDE:** Front side of document - **BACK_SIDE:** Back side of document (if applicable) Omit `idDocSubType` for SELFIE uploads. ## File format The `filename` extension and the decoded `content` MIME type must agree and must be one of: `image/jpeg`, `image/png`, `application/pdf`. ## Size limits The maximum decoded document size is 10 MB. ## Idempotency The `Idempotency-Key` header is required on this endpoint. If you send the same key again with an identical request body, the API returns the original response instead of uploading the document a second time. If you send the same key with a different request body, then the API rejects the request with a 422. After uploading all required documents, call the Initiate KYC S2S endpoint to start the verification process.\n\nSTEP 1 of the server-to-server KYC flow. Upload all required documents first, then call startCustomerKycS2S. Calling startCustomerKycS2S before the documents are uploaded fails.",
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
              "description": "Type of document being uploaded. Individual customers upload a `SELFIE` plus one identification document: `PASSPORT`, `ID_CARD`, or `DRIVERS`. Business customers upload `REGISTRATION_CERTIFICATE` only.\n",
              "enum": [
                "PASSPORT",
                "ID_CARD",
                "DRIVERS",
                "SELFIE",
                "REGISTRATION_CERTIFICATE"
              ],
              "example": "PASSPORT"
            },
            "idDocSubType": {
              "type": "string",
              "description": "Subtype indicating which side of the document. Must be uppercase;\nlowercase values are passed through to the upstream verifier and may be\nsilently rejected.\n",
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
              "description": "Document issuing country (ISO 3166-1 alpha-3 code, uppercase)",
              "example": "NGA"
            },
            "firstName": {
              "type": "string",
              "description": "First name as shown on document",
              "example": "John",
              "maxLength": 100
            },
            "middleName": {
              "type": "string",
              "description": "Middle name as shown on document (optional)",
              "example": "Michael",
              "maxLength": 100
            },
            "lastName": {
              "type": "string",
              "description": "Last name as shown on document",
              "example": "Doe",
              "maxLength": 100
            },
            "issuedDate": {
              "type": "string",
              "format": "date",
              "description": "Document issue date (YYYY-MM-DD)",
              "example": "2020-01-15"
            },
            "validUntil": {
              "type": "string",
              "format": "date",
              "description": "Document expiration date (YYYY-MM-DD)",
              "example": "2030-01-15"
            },
            "number": {
              "type": "string",
              "description": "Document identification number",
              "example": "A12345678",
              "maxLength": 50
            },
            "dob": {
              "type": "string",
              "format": "date",
              "description": "Date of birth (YYYY-MM-DD)",
              "example": "1990-05-20"
            },
            "placeOfBirth": {
              "type": "string",
              "description": "Place of birth as shown on document",
              "example": "New York, NY",
              "maxLength": 100
            }
          }
        },
        "content": {
          "type": "string",
          "format": "byte",
          "description": "Base64-encoded document content. The decoded bytes must be a JPEG, PNG,\nor PDF; the service sniffs the leading bytes and rejects other MIME\ntypes. Maximum decoded size is 10 MB.\n",
          "example": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        "filename": {
          "type": "string",
          "description": "Original filename of the document. Extension must be one of\n`.jpg`, `.jpeg`, `.png`, `.pdf` (case-insensitive); the file extension\nis validated before the content MIME sniff.\n",
          "example": "passport_front.jpg",
          "maxLength": 255,
          "pattern": "(?i)\\.(jpe?g|png|pdf)$"
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
    "needsIdempotency": true,
    "spec": "kyc.yaml"
  },
  {
    "name": "validateAccountApplication",
    "toolset": "account-applications",
    "method": "post",
    "path": "/v1/accounts/applications/validate",
    "description": "Validate application data — Validates an application payload against provider specific rules without saving.",
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
          "required": [
            "account_type",
            "currency",
            "blockchain_network"
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
                "savings"
              ],
              "description": "Kind of account to open (for example, regular or savings). This is the account type, not the customer type. Use the top-level application_type field for individual vs business.",
              "example": "regular"
            },
            "currency": {
              "type": "string",
              "description": "Currency for the account, in ISO 4217 format.",
              "example": "USD"
            },
            "blockchain_network": {
              "type": "string",
              "description": "Blockchain network to back the account (for example, polygon or stellar).",
              "example": "polygon"
            },
            "wallet_address": {
              "type": "string",
              "description": "Blockchain wallet address to associate with the account.",
              "example": "0xf73bdd069dc31aa8f334b177b175936ba98237a2"
            },
            "wallet_id": {
              "type": "string",
              "format": "uuid",
              "description": "UUID of an existing Gravv wallet to link to the account.",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            "label": {
              "type": "string",
              "description": "Human-readable label for the account.",
              "example": "ops"
            },
            "agreement_id": {
              "type": "string",
              "description": "ID of the provider agreement associated with this application.",
              "example": "agr_123"
            },
            "tos_link": {
              "type": "string",
              "description": "URL to the terms of service the applicant must accept.",
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
          },
          "description": "Application data to validate. Not persisted."
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
    "needsIdempotency": true,
    "spec": "accounts.yaml"
  },
  {
    "name": "verifyExternalAccount",
    "toolset": "external-accounts",
    "method": "post",
    "path": "/v1/external-accounts/verify",
    "description": "Verify an external account — Resolves and verifies a recipient's account with the destination institution before you add them as an external account. Use it to confirm the account holder's name and that the account is reachable, so you can show the resolved name and avoid failed transfers. Pass at least one identifier: `account_number`, `iban`, `phone`, or `clabe`. The service detects the account type, validates its format, then resolves the name with the institution. - **`is_verified: true`** — the account resolved. `account_name` holds the confirmed holder name. - **`is_verified: false`** — the account could not be resolved. Any institutions that matched the identifier are returned in `institutions` so the user can pick one and retry. Verification is supported for bank accounts and mobile money today. Other types (IBAN, SWIFT) return `is_verified: false`.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "account_number": {
          "type": "string",
          "nullable": true,
          "description": "Bank account number.",
          "example": "1776218486"
        },
        "institution_id": {
          "type": "string",
          "format": "uuid",
          "nullable": true,
          "description": "Institution UUID from GET /v1/external-accounts/institutions. Speeds up and disambiguates resolution.",
          "example": "c0cb83fa-8116-4744-8bc8-0c1cba405400"
        },
        "phone": {
          "type": "string",
          "nullable": true,
          "description": "Mobile money number in international format.",
          "example": "+233241234567"
        },
        "iban": {
          "type": "string",
          "nullable": true
        },
        "bic": {
          "type": "string",
          "nullable": true
        },
        "clabe": {
          "type": "string",
          "nullable": true,
          "description": "Mexican CLABE account number."
        },
        "routing_number": {
          "type": "string",
          "nullable": true
        },
        "country_code": {
          "type": "string",
          "nullable": true,
          "description": "ISO 3166-1 alpha-2 country code.",
          "example": "NG"
        },
        "account_owner_type": {
          "type": "string",
          "nullable": true,
          "enum": [
            "individual",
            "business"
          ],
          "description": "Beneficiary owner type. Lets the institution pick the right flow for business versus individual recipients."
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
      "phone",
      "iban",
      "bic",
      "clabe",
      "routing_number",
      "country_code",
      "account_owner_type"
    ],
    "alsoInBody": [],
    "movesMoney": false,
    "needsIdempotency": false,
    "spec": "external-accounts.yaml"
  },
  {
    "name": "withdrawFromCard",
    "toolset": "cards",
    "method": "post",
    "path": "/v1/cards/withdraw",
    "description": "Withdraw from card — Withdraw funds from a customer's card balance.\n\nMOVES MONEY: moves funds off a card balance. Requires confirm: true.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "card_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the card to withdraw from",
          "example": "9e3cccad-e9ae-47a0-81ee-063af0159310"
        },
        "amount": {
          "type": "number",
          "description": "Amount to withdraw from the card",
          "example": 1
        },
        "confirm": {
          "type": "boolean",
          "description": "Must be true to execute. Call once without it to receive a preview of exactly what will happen, show that to the user, and only then call again with confirm: true."
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
    "needsIdempotency": true,
    "spec": "cards.yaml"
  }
];

export const TOOLS_BY_NAME: ReadonlyMap<string, GeneratedTool> = new Map(
  TOOLS.map((t) => [t.name, t]),
);
