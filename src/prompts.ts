/**
 * Goal prompts: one per thing a merchant comes to do, from opening an account to
 * unsticking a transfer.
 *
 * The tool descriptions say what one call does. They cannot say which call comes first,
 * what to ask the user before any of them, which routes are open, or what a 200 that is
 * not done looks like. The integration scenarios say all of that, and these prompts carry
 * it: what to ask, each path's tool order, the confirm steps, and how to recover.
 *
 * A prompt is chosen by the user in their client (MCP prompts are user-controlled). It is
 * kept here as data, not prose, so a test can check every tool name and every rule in it.
 * Route availability follows the docs' labels (Available, Not yet available, Not
 * supported), not the scenarios', so a prompt never promises a route that is not open.
 */
import { TOOLS_BY_NAME } from "./generated/tools.ts";
import { MANUAL_TOOLS } from "./manual-tools.ts";
import { uploadLimit } from "./curation.ts";

export interface PromptPath {
  /** Argument values that select this path, lower case. */
  keys: string[];
  title: string;
  /** Scenario ids this path is built from (kept for review; not shown to the model). */
  scenarios: string[];
  steps: string[];
}

export interface PromptArgument {
  name: string;
  description: string;
  /** `path` narrows the text to the matching paths; `value` is quoted into the first step. */
  kind: "path" | "value";
}

export interface GoalPrompt {
  name: string;
  title: string;
  description: string;
  /** Every scenario the prompt covers. */
  scenarios: string[];
  argument: PromptArgument;
  intro: string;
  askFirst: string[];
  /** Route availability, in the docs' words. */
  labels?: string[];
  /** Steps shared by every path, shown before them. */
  common?: { title: string; steps: string[] };
  paths: PromptPath[];
  rules: string[];
  /** Docs slugs for getGravvDocPage. */
  docs: string[];
}

const SUPPORT = "ask support to confirm it is switched on for your business";

/** Appended to every prompt. */
export const SHARED_RULES = [
  "Never invent a value the user did not give you: names, numbers, dates of birth, tax ids, addresses and documents all come from the user or from an API answer.",
  "Tools that move money or cannot be undone return a preview first. Show it to the user, and call again with confirm: true only after they say yes.",
  "After a timeout, a network error or a 5xx, the outcome is unknown: look the result up first (the hint names the tool). If it did not land, call again with the same arguments and the idempotency_key from that result.",
  "After any other 4xx, a 429 included, fix what the error names and call again without idempotency_key: a 4xx answer is kept for 24 hours under its key.",
  "Read `next_step` on a result and `hint` on an error before you decide what to do. An HTTP 200 is not always done: read the status field.",
  "Sandbox and live hold separate data: an id from one environment is not found in the other.",
];

export const PROMPTS: GoalPrompt[] = [
  // ---------------------------------------------------------------------------
  {
    name: "open-account",
    title: "Open an account for a customer",
    description:
      "Choose and open a bank account or the business's card account, unblock an application, or give out deposit details.",
    scenarios: [
      "S-ACC2-01", "S-ACC2-02", "S-ACC2-03", "S-ACC2-04", "S-ACC2-05", "S-ACC2-06", "S-ACC2-07", "S-ACC2-08", "S-ACC2-09", "S-ACC2-10", "S-ACC2-11", "S-ACC2-12",
      "S-ACC1-01", "S-ACC1-07",
    ],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: v2 (a new bank account), card-account or manage. Leave it out for every path.",
    },
    intro:
      "Open the account the customer needs, in the order below. An account needs a customer whose KYC is completed.",
    askFirst: [
      "Which customer (customer_id), and whether it is a person or a business.",
      "The currency, and whether deposits should arrive as USDC in a wallet (wallet-backed) or stay in the currency (fiat-only). For wallet-backed, which network.",
      "The customer's citizenship or incorporation country.",
      "Every required field the requirements list and the customer record does not prefill, and each document as a local file.",
    ],
    paths: [
      {
        keys: ["v2"],
        title: "A bank account for a person or a business, with the v2 tools",
        scenarios: ["S-ACC1-01", "S-ACC2-01", "S-ACC2-02", "S-ACC2-03", "S-ACC2-04", "S-ACC2-05", "S-ACC2-06", "S-ACC2-07", "S-ACC2-08", "S-ACC2-09", "S-ACC2-10"],
        steps: [
          "getCustomer: the `kyc` entry with type `basic` must be `completed`. If it is not, onboard the customer first.",
          "getAccountCapabilities with customer_id: choose `bank_code`, currency and network (from `token_wallets`). listAccountsV2 with customer_id shows what the customer holds; warn when the count already equals the option's limit.",
          "getAccountRequirements with the same customer_type, currency and bank_code: ask for every required field and document it lists, all at once. For EUR or GBP, check `has_existing_ref`. For a business, ask about each owner, director and signer, and each owner's percentage.",
          "Show the user a summary (currency, backing, network), then createAccountV2. Never send `network` for a fiat-only account.",
          "Poll getAccountV2 until `active`. When `requires_user_action` is true, getAccountApplicationV2 says what the bank needs: send the `required_documents` and `required_fields` in one updateAccountApplicationV2 call; for `tos_pending` or `kyc_pending`, give the user `required_action_url` instead. updateAccountApplicationV2 has no idempotency: after a timeout, read the application again before sending again.",
          "A 409 at the account limit: quote it to the user and offer an existing account, another option, or support. Do not resend the same body.",
        ],
      },
      {
        keys: ["card-account"],
        title: "The business's card account (needed before issuing cards)",
        scenarios: ["S-ACC1-07"],
        steps: [
          "listAccounts with account_type `card`: a business has one card account, and every card application uses it.",
          "If there is none, open it in the Dashboard, or with createAccount: type `card`, currency USD, bank `lead_bank` or `cross_river_bank`, and the business's own customer id (the customer_id on its account whose category is `main`). An end customer's id is refused. createAccount is only for this one account.",
          "It starts `pending` and is ready at `account.activated`, when getAccount shows `active`.",
        ],
      },
      {
        keys: ["manage"],
        title: "Give out deposit details, or test a deposit",
        scenarios: ["S-ACC2-11", "S-ACC2-12"],
        steps: [
          "getAccountV2 gives the payer details: show one block per currency, and for a wallet-backed account say \"send only USDC on <network>\". `ledger_balance` is not in major units.",
          "No tool freezes, unfreezes or closes an account.",
          "In sandbox, simulateDeposit makes a test deposit. Each call makes a new one, so ask before repeating it.",
        ],
      },
    ],
    rules: [
      "Do not call createAccountV2 while basic KYC is not `completed`: the call fails with `CUSTOMER_KYC_INCOMPLETE`.",
      "Open every account with createAccountV2, except the business's one card account, which createAccount opens.",
      "Opening an account moves no money, but an account is long-lived: show the summary and ask before creating.",
    ],
    docs: ["platform/accounts/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "onboard-customer",
    title: "Onboard and verify a customer",
    description:
      "Create a person or a business and verify them, on a hosted page or server to server; resubmit a rejection; read their KYC documents.",
    scenarios: ["S-CUS-01", "S-CUS-02", "S-CUS-03", "S-CUS-04", "S-CUS-05", "S-CUS-06", "S-CUS-07", "S-SBX-05"],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: person-hosted, person-s2s, business, resubmit or documents. Leave it out for every path.",
    },
    intro: "Create the customer and verify them, in the order below. Accounts, payouts and cards all need a verified customer.",
    askFirst: [
      "Person or business.",
      "For a person: the full legal name as on the ID, email, phone with country code, date of birth, gender, and the home address with city, postal code, state and country.",
      "For a business: the company email domain, the registration number, every director and every owner with 25% or more (names, emails, dates of birth, addresses), and the company documents.",
    ],
    paths: [
      {
        keys: ["person-hosted"],
        title: "A person, verified on a hosted page",
        scenarios: ["S-CUS-01"],
        steps: [
          "listCustomers with keyword set to the email: reuse a customer who exists. \"email already exists\" means one does.",
          "createCustomer.",
          "startCustomerKyc gives the person a hosted link. If the link expires, call it again.",
          "Wait for the KYC webhook, or poll getCustomer until the `kyc` entry with type `basic` is `completed` or `failed`. getCustomerKycStatus is not the completion signal.",
        ],
      },
      {
        keys: ["person-s2s"],
        title: "A person, verified server to server (you hold their ID and selfie)",
        scenarios: ["S-CUS-02"],
        steps: [
          "getCustomer: if basic KYC is already `completed`, stop.",
          "Ask for the document type, its number, the issue and expiry dates, the issuing country, and whether it is two-sided.",
          `uploadCustomerKycDocument for each item (front, back of a two-sided ID, selfie). Pass file_path for a local file rather than pasting base64. Each file: ${uploadLimit("uploadCustomerKycDocument")}.`,
          "startCustomerKycS2S, then wait for the webhook or poll getCustomer.",
          "A \"missing required documents\" error lists what to upload: upload exactly those, then call again.",
          "Server-to-server KYC records no liveness: a card for this person will ask for a liveness step later.",
        ],
      },
      {
        keys: ["business"],
        title: "A business with its owners and directors",
        scenarios: ["S-CUS-03"],
        steps: [
          "createCustomer for the business.",
          "Verify each director and owner first, on a hosted page or server to server; getCustomer until every person is `completed`.",
          "uploadCustomerKycDocument for each company document (`COMPANY_DOC` with its sub-type). Never use `REGISTRATION_CERTIFICATE`.",
          "startCustomerKycS2S for the business. A persons-first error names the person to verify; a missing-documents error names the sub-types to upload.",
        ],
      },
      {
        keys: ["resubmit"],
        title: "Resubmit after a rejection",
        scenarios: ["S-CUS-04"],
        steps: [
          "getCustomer (read `remark`) and getCustomerKycStatus (read `rejectLabels` and `reviewRejectType`).",
          "`reviewRejectType` `FINAL`: stop and tell the user; it cannot be resubmitted.",
          "Otherwise ask which item to retake, from the labels, and confirm before starting again: startCustomerKyc, or uploadCustomerKycDocument with the same type and sub-type, then startCustomerKycS2S.",
        ],
      },
      {
        keys: ["documents"],
        title: "Read a customer's KYC documents for a compliance review",
        scenarios: ["S-CUS-05"],
        steps: [
          "Confirm the user is entitled to see identity documents, and ask which document and which side.",
          "getCustomerKycDocuments lists them; hide `IDNumber` when you show the list.",
          "downloadCustomerKycDocument saves the file to disk. Do not read the image into the conversation.",
        ],
      },
    ],
    rules: [
      "Each KYC start is billed to the business: never call startCustomerKyc or startCustomerKycS2S again in a loop.",
      "In sandbox, KYC can stay `pending`: stop polling after a few minutes and tell the user. A sandbox result is no evidence for a live customer.",
      "A customer who will send payouts needs a date of birth and an address on the record, or a payout can pause for sender details. getCustomerLimits shows what they can send.",
    ],
    docs: ["getting-started/onboard-your-first-customer"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "send-payout",
    title: "Pay a bank account",
    description:
      "Pay a US bank account by ACH, wire or RTP, a supplier or person abroad by SWIFT, a euro or UK account by SEPA or Faster Payments, or move money between a customer's own accounts.",
    scenarios: ["S-PAY-01", "S-PAY-02", "S-PAY-03", "S-PAY-04", "S-PAY-05", "S-PAY-06", "S-PAY-07", "S-PAY-08", "S-PAY-09", "S-PAY-10", "S-PAY-12", "S-SBX-04"],
    argument: {
      name: "rail",
      kind: "path",
      description: "Optional: ach, wire, rtp, swift, sepa, fps or book (between own accounts). Leave it out for every rail.",
    },
    intro: "Pay a bank account from a customer's account, in the order below.",
    askFirst: [
      "Which customer, and which source account. getAccountV2 shows whether it is bank-held or wallet-backed, and its balance.",
      "The recipient's full name as on the account, person or business, and address.",
      "The account details for the rail (below), and the amount.",
    ],
    labels: [
      "Available: ACH and wire from bank-held and wallet-backed accounts; RTP from bank-held accounts; SWIFT in USD to Nigeria from bank-held accounts; SEPA and Faster Payments from wallet-backed accounts where the business is enabled.",
      `Not yet available (${SUPPORT}): SWIFT to other countries, and SWIFT from wallet-backed accounts.`,
      "Not supported: RTP from wallet-backed accounts; SWIFT in a currency other than USD; SEPA or Faster Payments from bank-held USD accounts; CHAPS, FedNow and BACS.",
    ],
    common: {
      title: "Every payout to a payee",
      steps: [
        "listExternalAccounts with customer_id and search (the account number): tell the user what exists, and reuse a payee on the right rail. The duplicate check can miss one.",
        "createExternalAccount, then getExternalAccount until `active`. `pending` is still being set up. `setup_failed`: show `error_message`, ask which detail is wrong, and fix it with updateExternalAccount, sending only the changed fields and never `\"\"`.",
        "Before a large payout, getCustomerLimits shows what the customer has left.",
        "createTransfer with destination `destination_type: external_account`, the payee id and `rail` inside destination; the amount as a string with at most 2 decimals; a description and a client_reference. Show amount, fee if known, source, payee and rail, and send confirm: true only after the user says yes.",
        "getTransaction until final. `paused` is not a failure: read `requirements` (the fix-stuck-transfer prompt walks through it).",
      ],
    },
    paths: [
      {
        keys: ["ach"],
        title: "A US bank account by ACH",
        scenarios: ["S-PAY-01"],
        steps: [
          "Ask for the account number, routing number, checking or savings, bank name, and the note (at most 10 letters, digits or spaces).",
          "The payee is payee_type `ach_wire` with payment_rail `ach`.",
        ],
      },
      {
        keys: ["wire"],
        title: "A same-day US domestic wire",
        scenarios: ["S-PAY-02"],
        steps: [
          "Ask \"is this the bank's wire routing number?\" and for the wire message (35 characters).",
          "The payee is payee_type `ach_wire` with payment_rail `wire`; `wire` is not an international wire.",
          "`ERROR_CODE_INVALID_WIRE_ROUTING_NUMBER`: ask for the wire routing number. Do not switch to ACH without asking.",
        ],
      },
      {
        keys: ["rtp"],
        title: "A US bank account instantly by RTP",
        scenarios: ["S-PAY-03"],
        steps: [
          "Check with getAccountV2 that the source is bank-held. From a wallet-backed account RTP is not possible: offer ACH or wire.",
          "The payee is payee_type `ach_wire` with payment_rail `rtp`; there is no reference to ask for.",
        ],
      },
      {
        keys: ["swift"],
        title: "A supplier or person abroad by SWIFT, in USD",
        scenarios: ["S-PAY-05", "S-PAY-06"],
        steps: [
          "The source must be a bank-held USD account with the funds.",
          "Ask for the country (outside Nigeria, ask support first), company or person, legal name, account number or IBAN, BIC, the beneficiary's and the bank's address, an intermediary bank only if their bank gave one (all its fields), the purpose of payment (it goes in description), and the invoice file.",
          "listExternalAccountInstitutions with swift_code checks the BIC; listTransferSupportedCountriesForAddress checks the address country.",
          `uploadTransferDocument first (PDF, PNG or JPEG of ${uploadLimit("uploadTransferDocument")}) and pass its id in supporting_document_ids.`,
          "Confirm the amount in USD, the beneficiary and the country, and say banks along the route may deduct charges.",
        ],
      },
      {
        keys: ["sepa"],
        title: "A euro account by SEPA",
        scenarios: ["S-PAY-07"],
        steps: [
          "The source is a wallet-backed account. Ask for the IBAN, name, address, person or company, and the amount in the source currency.",
          "verifyExternalAccount checks the format only: say so.",
          "getTransferRates with currency EUR gives the indicative amount. Show it and say the final amount is set when the transfer is sent.",
        ],
      },
      {
        keys: ["fps"],
        title: "A UK account by Faster Payments",
        scenarios: ["S-PAY-08"],
        steps: [
          "As SEPA, in GBP. Ask for the sort code and the 8-digit account number separately, and strip spaces and dashes.",
        ],
      },
      {
        keys: ["book"],
        title: "Between a customer's own accounts",
        scenarios: ["S-PAY-10"],
        steps: [
          "listAccountsV2 or getAccountV2 for both accounts. No payee is needed.",
          "createTransfer with destination `destination_type: internal_account`; confirm source, destination and amount first.",
        ],
      },
    ],
    rules: [
      "A payee holds one rail. To pay the same account another way, ask \"create a wire payee for this account?\"; never create one without saying so. Before reusing `data.payee_id` from a duplicate answer, confirm its rail with the user.",
      "Payee errors name the fields: fix them all at once before calling again.",
      "`insufficient balance`: tell the user; do not retry.",
      "A webhook with `transfer_status: manual_processing_required` means held for review: the money is not lost and the outcome is not final. Never send the transfer again, and never offer to cancel a transfer.",
      "Only a `failed` transfer may be sent again, with a new client_reference, after the user agrees. A failed transfer is refunded to the source.",
    ],
    docs: ["recipes/bank-payouts/overview", "platform/transfers/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "send-remittance",
    title: "Send money to a bank account or mobile wallet abroad",
    description:
      "Pay a bank account or mobile money wallet in Africa, or collect a payee's details for Mexico, Brazil, Colombia, India or Hong Kong, with the routes that are open today.",
    scenarios: ["S-REM-01", "S-REM-02", "S-REM-03", "S-REM-04", "S-REM-05", "S-REM-06", "S-REM-10"],
    argument: {
      name: "country",
      kind: "path",
      description:
        "Optional: the recipient's country code, NG, GH, KE, RW, ZM, UG, CG, CI, BJ, MX, BR, CO, IN or HK; xof for another CFA franc country. Leave it out for every country.",
    },
    intro: "Pay a recipient abroad from a customer's USD account, in the order below.",
    askFirst: [
      "The sender (customer), the source account, and the amount in USD.",
      "The recipient's country (ask it outright when the user says CFA or XOF: eight countries share XOF), bank account or mobile wallet, the bank or operator, and the recipient's name.",
      "The sender's date of birth, home address and country, if the customer record lacks them, before sending, so the transfer does not pause for sender details.",
    ],
    labels: [
      "Available: mobile wallets named `MTN MoMo <country>` in Rwanda, Zambia, Uganda, Congo, Côte d'Ivoire and Benin.",
      `Not yet available (${SUPPORT}): Nigeria bank accounts, Ghana, Kenya, Tanzania, the other XOF operators and other mobile money operators; banks in Mexico, Brazil, Colombia, India and Hong Kong; Morocco, WAEMU and CEMAC bank accounts.`,
      "A country in listTransferSupportedCountries is not proof the route is open. An unopened route answers \"transfers to XX/CCC are not available at this time\" and nothing is debited.",
    ],
    common: {
      title: "Every remittance",
      steps: [
        "listExternalAccountInstitutions with country_iso_code and institution_type (`bank` or `mobile_money`): the payee must carry an `institution_id` from this list, or the transfer is refused.",
        "listExternalAccounts with customer_id and search, then createExternalAccount. Read the phone or account number back to the user, and show the holder or wallet name the answer returns. A phone number cannot be changed later: a wrong one needs a new payee.",
        "getTransferRates with the currency gives the indicative local amount. There is no rate lock: the rate is taken when the transfer is sent, and `local_amount` in its answer is what the recipient is due.",
        "createTransfer with the sender in `additional_information`, `rail` left out, and the amount as a string. Show amount, recipient, institution and the indicative local amount, and send confirm: true only after the user says yes.",
        "getTransaction until final.",
      ],
    },
    paths: [
      {
        keys: ["rw", "zm", "ug", "cg", "ci", "bj"],
        title: "A mobile wallet in Rwanda, Zambia, Uganda, Congo, Côte d'Ivoire or Benin",
        scenarios: ["S-REM-04", "S-REM-05"],
        steps: [
          "Choose the institution named `MTN MoMo <country>`.",
          "Ask for the phone number with its country code and check its shape before creating the payee.",
        ],
      },
      {
        keys: ["ng"],
        title: "A bank account in Nigeria: not yet available",
        scenarios: ["S-REM-01"],
        steps: [
          "Ask support first. Then ask for the bank and the 10-digit account number.",
          "verifyExternalAccount shows the holder name: ask the user to confirm it is the right person before creating the payee.",
        ],
      },
      {
        keys: ["gh"],
        title: "A mobile wallet or bank account in Ghana: not yet available",
        scenarios: ["S-REM-02"],
        steps: [
          "Ask support first. Then: wallet or bank, the operator or bank name, and the phone number in `+233…` form or the 10-16 digit account number.",
        ],
      },
      {
        keys: ["ke"],
        title: "A mobile wallet in Kenya: not yet available",
        scenarios: ["S-REM-03"],
        steps: [
          "Ask support first. Then ask which wallet (`M-Pesa` or `Airtel Money`) and the number: 254, then 7 or 1, then 8 digits. Read it back.",
        ],
      },
      {
        keys: ["xof", "sn", "bf", "ml", "tg"],
        title: "A mobile wallet in another CFA franc country: not yet available",
        scenarios: ["S-REM-05"],
        steps: [
          "Only `MTN MoMo` wallets in Côte d'Ivoire and Benin are open. For Senegal, Burkina Faso, Mali or Togo, tell the user the route is not yet available before calling createTransfer.",
        ],
      },
      {
        keys: ["mx", "br", "co", "in", "hk"],
        title: "A bank in Mexico, Brazil, Colombia, India or Hong Kong: not yet available",
        scenarios: ["S-REM-06"],
        steps: [
          "Tell the user plainly that local payouts there are not yet available and support can switch them on. A USD payout by SWIFT is the send-payout prompt.",
          "Collect the payee now with createExternalAccount, completed with updateExternalAccount; call createTransfer only after support confirms.",
          "Never invent a CURP, CPF or IFSC. A Mexican CLABE paid in MXN needs payee_type `bank_account`.",
        ],
      },
    ],
    rules: [
      "Never send `rail: wire` for these payouts: that is a US wire. Do not pass a quote: it does not lock a payout rate.",
      "On `paused`, read `requirements` and ask only for those (the fix-stuck-transfer prompt walks through resumeTransfer). For `customer_email`, updateCustomer first.",
      "A webhook says failed while the transaction says pending: the transfer is held for manual review. Stop, explain, and escalate; never send it again.",
      "A duplicate payee answer carries `data.payee_id`: reuse it. \"not yet set up for transfers\": create the payee again with an `institution_id`.",
    ],
    docs: ["recipes/remittance-and-crypto/overview", "platform/transfers/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "send-crypto",
    title: "Send USDC or USDT to a wallet, or convert between them",
    description:
      "Send stablecoins to an outside wallet on the same network, ask about another network, or convert USDT to USDC between one customer's wallets.",
    scenarios: ["S-REM-07", "S-REM-08", "S-REM-09", "S-SBX-06"],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: same-network, cross-network or convert. Leave it out for every path.",
    },
    intro: "Send stablecoins from a customer's wallet, in the order below. On-chain sends cannot be reversed.",
    askFirst: [
      "Which customer and which wallet sends (listWallets with include_balances), and the asset.",
      "The destination address and its network, and a memo or tag if the receiver is an exchange (\"does the exchange show a memo or tag?\").",
      "The amount.",
    ],
    labels: [
      "Available: USDC and USDT to a wallet on the same network; USDT to USDC, or back, between one customer's own wallets (preview first).",
      `Not yet available (${SUPPORT}): USDC to a wallet on another network.`,
      "Not supported: USDT across networks; sending from avalanche; anything on tron.",
    ],
    paths: [
      {
        keys: ["same-network"],
        title: "To an outside wallet on the same network",
        scenarios: ["S-REM-07", "S-SBX-06"],
        steps: [
          "listWallets with include_balances, then getWallet for the sending wallet.",
          "createTransfer with destination `destination_type: crypto_wallet`, wallet_address, blockchain_network and blockchain_memo if there is one. Read back address, network, memo and amount, warn that it cannot be reversed, and send confirm: true only after the user says yes.",
          "getTransaction, or listTransactions with tx_hash.",
          "Failed after about 30 minutes: check the address (and, on Stellar, that the receiver holds USDC), then send again with a new client_reference after the user agrees.",
        ],
      },
      {
        keys: ["cross-network"],
        title: "USDC to a wallet on another network: not yet available",
        scenarios: ["S-REM-08"],
        steps: [
          "Ask support first. It is USDC only: for USDT, offer to convert to USDC first (path convert).",
          "For a Stellar receiver, ask \"has the receiver enabled USDC?\".",
          "Same tools and confirm step as the same-network path.",
        ],
      },
      {
        keys: ["convert"],
        title: "USDT to USDC, or back, between one customer's wallets",
        scenarios: ["S-REM-09"],
        steps: [
          "listWallets for the customer's wallets: both must be theirs.",
          "getTransferRates with source_wallet_id, destination_wallet_id, send_asset, receive_asset and amount: show \"you send X, you receive about Y, fee Z\".",
          "createTransfer with destination `destination_type: internal_crypto_wallet` and `crypto_asset`; confirm first. If the answer's receive amount is lower than the preview, show it again.",
          "Never set `crypto_asset` on a send to someone else.",
        ],
      },
    ],
    rules: [
      "Never tell the user to send again when coins reached the wrong network or address, and never promise recovery.",
      "Sandbox cannot simulate an on-chain failure; never add test-only fields to a transfer.",
    ],
    docs: ["platform/transfers/crypto-transfers", "recipes/remittance-and-crypto/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "convert-currency",
    title: "Convert currency with an FX order",
    description:
      "Quote and place an FX order, pay the proceeds to a settlement instruction, and follow or cancel orders.",
    scenarios: ["S-FX-01", "S-FX-02", "S-FX-03", "S-FX-04", "S-FX-05", "S-FX-06"],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: quote-and-order, settlement-instruction or manage. Leave it out for every path.",
    },
    intro: "Convert currency for a customer or the business, in the order below. An FX order runs at once: there is no second approver.",
    askFirst: [
      "Which customer, and which account or wallet to sell from (if there are several).",
      "Where the bought amount goes: an account, a wallet, or a bank account of the business (a settlement instruction).",
      "The currency pair and the amount to sell.",
    ],
    paths: [
      {
        keys: ["quote-and-order"],
        title: "Quote and place an order",
        scenarios: ["S-FX-01", "S-FX-03", "S-FX-04"],
        steps: [
          "getAccountV2 for the source account, getWallet for a wallet.",
          "listFxCurrencyPairs and listFxRates are for display only: they are not the price the user gets. getFxQuote with the amount is the real price and the check that a pair is enabled. A pair that is not enabled is switched on by support; do not try other spellings.",
          "Show \"sell X, receive Y at R, quote expires T\". createFxOrder with quote_id, source, destination and a client_reference, and confirm: true only after the user agrees.",
          "getFxOrder until final, then listTransactions.",
          "\"quote is invalid or expired\": nothing was ordered. Get a new quote, show the new price, and ask again.",
          "\"order source could not be charged\": an order may still exist. listFxOrders and match `client_reference`, the pair and the amount in the rows before anything else.",
        ],
      },
      {
        keys: ["settlement-instruction"],
        title: "Pay the proceeds to the business's bank account",
        scenarios: ["S-FX-02", "S-FX-05"],
        steps: [
          "listSettlementInstructions for the TO currency: reuse an active one.",
          "Only if there is none, createSettlementInstruction. Read back the bank or wallet details first: they are not checked, and this is where the money is paid. Ask whether it should be the default; for Stellar, the network and memo.",
          "createFxOrder with destination `type: external_account` and the settlement instruction's id. A payee is never a destination, and a settlement instruction is never a payee.",
          "\"invalid order destination\": use an active settlement instruction in the TO currency.",
          "deleteSettlementInstruction cannot be undone: ask first.",
        ],
      },
      {
        keys: ["manage"],
        title: "Follow, list or cancel orders",
        scenarios: ["S-FX-06"],
        steps: [
          "listFxOrders (with a status filter) and getFxOrder.",
          "cancelFxOrder only for an order in `waiting_approval`, after the user agrees. For `pending`, refuse and point the user to support.",
          "Approving and rejecting orders is Dashboard-only.",
        ],
      },
    ],
    rules: [
      "Never reuse a quote after `expires_at`, and get the user's agreement to every new price.",
      "A 403 on feature access: stop; the business must ask for FX access.",
      "A balance error: tell the user the shortfall; do not retry.",
    ],
    docs: ["platform/foreign-exchange/overview", "platform/settlement-instructions/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "issue-card",
    title: "Issue and manage a card",
    description:
      "Verify a cardholder and issue a USD card, fund it, set its limit, freeze or block it, close it, or give the same person another card.",
    scenarios: ["S-CRD-01", "S-CRD-02", "S-CRD-03", "S-CRD-04", "S-CRD-05", "S-CRD-06", "S-CRD-07", "S-CRD-08", "S-CRD-09", "S-CRD-10", "S-CRD-11", "S-SBX-02"],
    argument: {
      name: "path",
      kind: "path",
      description:
        "Optional: hosted-kyc, own-kyc, fund, limit, freeze-or-block, close or another-card. Leave it out for every path.",
    },
    intro: "Issue or manage a card, in the order below.",
    askFirst: [
      "The cardholder's legal name, email, phone with country code, date of birth and address.",
      "Their annual income in USD, the daily limit they want, virtual or physical, and a shared or own balance.",
    ],
    common: {
      title: "Before any card",
      steps: [
        "listAccounts with account_type `card` and status `active`: the business's card account. Send its id as account_id on every card application and activation. If there is none, open it first (the open-account prompt, path card-account).",
      ],
    },
    paths: [
      {
        keys: ["hosted-kyc"],
        title: "A new cardholder, verified on a hosted page",
        scenarios: ["S-CRD-01", "S-CRD-03"],
        steps: [
          "createCustomer if the person is new, then getCustomer.",
          "checkFeatureEligibility.",
          "startCardholderKyc only if basic KYC is `not_started` or `failed`; then wait.",
          "activateFeature with provider_data: account_id (the card account), annual_remuneration and estimated_monthly_limit as numbers, and the funding mode. Confirm first, showing the customer's name, the daily limit and the card type. If activation already exists, go to listCards.",
          "listCards with customer_id. In live: listCardApplications, getCardApplication for `application_link`, then createCard.",
        ],
      },
      {
        keys: ["own-kyc"],
        title: "A cardholder verified with your own ID capture",
        scenarios: ["S-CRD-02"],
        steps: [
          "uploadCardholderKycDocument for each item: the document type, its 3-letter country, which side, and the file. An upload worked only when `data.status` is `success`.",
          "startCardholderKycS2S: read `data.status` and `data.code`, not the HTTP status.",
          "activateFeature (confirm first). When it answers `pending_liveness`, give the cardholder `websdk_url`, then call activateFeature again.",
          "listCards.",
        ],
      },
      {
        keys: ["fund"],
        title: "Top up a card",
        scenarios: ["S-CRD-05", "S-CRD-03"],
        steps: [
          "getCard or listCards for status and network; getAccountV2 or getWallet for the source's network and balance.",
          "createTransfer to the card. Repeat the amount, the source and the card's last 4 digits, and confirm first. A source on another network, or a bank-held account, cannot fund the card: offer one that can.",
          "getTransaction until final, then getCardBalance.",
        ],
      },
      {
        keys: ["limit"],
        title: "Set a daily limit, or find out why a payment was declined",
        scenarios: ["S-CRD-06", "S-CRD-08"],
        steps: [
          "getCard for the current status and limit.",
          "updateCardStatus with both `status` (the current one) and `limit` in whole dollars: leaving `limit` out zeroes the daily limit. Show the old and new limit and ask first.",
          "A declined payment: getCard and getCardBalance, then say what is most likely and why. Never claim a reason the API did not return.",
        ],
      },
      {
        keys: ["freeze-or-block"],
        title: "Freeze, unfreeze or block a lost card",
        scenarios: ["S-CRD-07"],
        steps: [
          "getCard. Ask: freeze (reversible) or block (permanent)?",
          "updateCardStatus with the status and the current limit. A block cannot be undone: say so and ask first. If the card holds money, withdraw it first (path close). Offer a replacement with createCard.",
        ],
      },
      {
        keys: ["close"],
        title: "Close a card and get the money back",
        scenarios: ["S-CRD-10"],
        steps: [
          "getCard and getCardBalance. If `shared` is true, other cards lose that money: say so.",
          "withdrawFromCard (confirm first). If it answers that the card withdraws by transfer, createTransfer from the card to the card account (confirm first).",
          "Then updateCardStatus `blocked` with the limit (ask first). Withdraw before you block.",
          "After an internal server error, read the balance and wait for `cards.transaction.withdraw` before trying again.",
        ],
      },
      {
        keys: ["another-card"],
        title: "A second card, a physical card, or a business card",
        scenarios: ["S-CRD-11", "S-CRD-04"],
        steps: [
          "listCards for the count. At the 10-card cap, ask which card to block.",
          "createCard with `funding` (ask first). A physical card needs the full shipping address and method, and is not yet usable through the API.",
          "A business card printed with the company name (createCardApplication with type business) is sandbox only today: in live, tell the user it is not yet available.",
        ],
      },
    ],
    rules: [
      "Card numbers, CVV and PIN never reach the agent: they show only in the cardholder's own app. Never ask a user to paste a card number or PIN.",
      "createCard and updateCardStatus have no preview step: ask the user before calling them.",
      "The card simulators are not available over MCP yet: test funding and spend with real flows in sandbox, or not at all.",
    ],
    docs: ["platform/cards/overview", "platform/cards/card-kyc/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "collect-payment",
    title: "Collect a payment",
    description:
      "Receive stablecoins at a wallet address, a bank deposit into an account, a local bank transfer, a card payment through a hosted checkout, or a charge to a saved card.",
    scenarios: ["S-WAL-01", "S-WAL-02", "S-WAL-03", "S-WAL-04", "S-COL-01", "S-COL-02", "S-COL-03", "S-COL-04", "S-COL-05", "S-COL-06", "S-SBX-01", "S-SBX-03"],
    argument: {
      name: "method",
      kind: "path",
      description:
        "Optional: stablecoin, bank-deposit, bank-transfer, card or saved-card. Leave it out for every method.",
    },
    intro: "Collect money for a customer, in the order below.",
    askFirst: [
      "Which customer pays or receives.",
      "For a payment request, the amount in US dollars; and where the money lands: which wallet or account.",
    ],
    paths: [
      {
        keys: ["stablecoin"],
        title: "Stablecoins to a wallet address",
        scenarios: ["S-WAL-01", "S-WAL-02", "S-WAL-03", "S-WAL-04"],
        steps: [
          "Ask which network the sender will use and which coin. Stellar and Solana take USDC only.",
          "getCustomer, then createWallet. Each call makes a new wallet: never call it twice for one request, and after a timeout look with listWallets for the customer before calling again. The address comes back at once; do not poll for it.",
          "Give the address with its network, every time. On Stellar no memo is needed; suggest a small test amount first.",
          "listWallets with include_balances, or getWallet. A coin missing from the list is not a zero balance.",
          "\"The coins never arrived\": ask for the tx hash, the network, the coin and the wallet; listTransactions with tx_hash, getWebhookHistory with event_type `inflow`, and getWallet to compare address and network. Never tell the user to send again and never promise recovery. Ask them to paste what the block explorer shows.",
        ],
      },
      {
        keys: ["bank-deposit"],
        title: "A bank deposit into a customer's account",
        scenarios: ["S-COL-01", "S-SBX-01"],
        steps: [
          "getAccountV2 for the deposit details.",
          "Wait for the `transfer.inflow.*` webhooks, or listTransactions with account_id.",
          "Explain fees by rail without quoting prices: they come from the business's plan.",
          "In sandbox, simulateDeposit makes a test deposit. Each call makes a new one, so ask before repeating it.",
        ],
      },
      {
        keys: ["bank-transfer"],
        title: "A local bank transfer from a payer",
        scenarios: ["S-COL-02"],
        steps: [
          "getCustomer for the payer's phone, date of birth and address country; updateCustomer if one is missing.",
          "createCollection with source methods `bank_transfer` (the only method this tool takes), currency set to the payer's local currency, the amount in US dollars (the payer sends `converted_amount` in the local currency), and the destination. Confirm first: \"Create a bank-transfer collection of X USD, paid in <local currency>, from <payer> into <wallet> on <network>?\"",
          "getCollection, or getWebhookHistory with event_type `collection`. Read `new_onramp_status` when present, else `onramp_status`.",
          "\"unable to process payment for this request\": tell the user; do not retry blindly.",
        ],
      },
      {
        keys: ["card"],
        title: "A card payment through a hosted checkout",
        scenarios: ["S-COL-03"],
        steps: [
          "Ask for the amount in USD, the destination wallet, whether to save the card, the client_customer_id for this payer, and a redirect URL.",
          "getCustomer, then createCardPaymentIntent without card_token: no money moves yet. Give the payer `payment_link`, and never paste it into a shared channel: it carries a secret.",
          "Follow with getCollection and the collection webhooks.",
        ],
      },
      {
        keys: ["saved-card"],
        title: "Charge or remove a saved card",
        scenarios: ["S-COL-04", "S-COL-05"],
        steps: [
          "listSavedCards with customer_id; ask which card (brand and last 4).",
          "createCardPaymentIntent without card_token, then chargeSavedCard with its payment_intent_id and the card_token. Confirm first: \"Charge X USD to <name>'s <brand> ending <last4> now?\" A createCardPaymentIntent with a card_token charges at once: confirm that too.",
          "A decline: tell the payer and ask before a retry; an intent takes at most 5 attempts within 24 hours. `requires_action`: give the payer `next_action_url`.",
          "To remove a card, confirm which one, then deleteSavedCard with customer_id and card_token.",
        ],
      },
    ],
    rules: [
      "client_reference must be unique across collections and payment intents.",
      "Refunds and disputes go through Gravv support: read getCollection, and never claim a refund was started.",
      "The collection simulator is not available over MCP yet.",
    ],
    docs: ["platform/collections/collections-overview", "platform/wallets/overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "set-up-savings",
    title: "Set up savings for a customer",
    description:
      "Open a savings account, save into it, withdraw from it, read interest and statements, and test it all in sandbox.",
    scenarios: ["S-SAV-01"],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: open, move, read or test. Leave it out for every path.",
    },
    intro:
      "Give a customer savings that earn a daily rate, in the order below. Savings is a USD account; money on it is available, and the customer moves it into savings and back with transfers.",
    askFirst: [
      "Which customer (customer_id). Their KYC must be completed.",
      "For a save or a withdrawal, the amount in US dollars, with at most 2 decimal places.",
    ],
    labels: [
      "Available: savings in sandbox.",
      "Not yet available: savings with a live key (the savings tools answer 501 until savings opens in live).",
    ],
    paths: [
      {
        keys: ["open"],
        title: "Open a savings account",
        scenarios: ["S-SAV-01"],
        steps: [
          "getCustomer: the `kyc` entry with type `basic` must be `completed`.",
          "listAccountsV2 with customer_id: a customer holds one savings account (category `savings`). If one exists, use it.",
          "createAccountV2 with customer_id, currency USD and category `savings`. Leave out wallet_id; leave out network and account_type, or send `avalanche_c_chain` and `regular`. Show the summary and ask first.",
          "Poll getAccountV2 until `active`. Its id is the savings id for every later step.",
        ],
      },
      {
        keys: ["move"],
        title: "Save and withdraw",
        scenarios: ["S-SAV-01"],
        steps: [
          "getSavingsRate for today's rate, to show the user.",
          "To save: createTransfer with source {source_type: internal_account, id: <savings id>}, destination {destination_type: savings, id: <the same id>}, amount, customer_id and a client_reference. Confirm first: \"Save X USD into <name>'s savings?\"",
          "To withdraw: the same, with source_type `savings` and destination_type `internal_account`. A withdrawal cannot be more than getSavings `saved_balance`.",
          "The answer is `pending`. Wait for `transfer.status.completed`, then getSavings. `transfer.savings.awaiting_liquidity` on a withdrawal is not a failure: the money is safe and the withdrawal completes later.",
        ],
      },
      {
        keys: ["read"],
        title: "Read the savings, interest and a statement",
        scenarios: ["S-SAV-01"],
        steps: [
          "getSavings with the savings account id: `available_balance` is not saved yet, `saved_balance` earns, `earned_total` is all interest so far. Round to 2 places for the user.",
          "Interest is added once a night in live, at about 01:30 UTC, with a `savings.interest.credited` webhook.",
          "getSavingsStatement with from and to (YYYY-MM-DD, UTC, at most 92 days) for one row per day; format csv gives a file.",
        ],
      },
      {
        keys: ["test"],
        title: "Test it all in sandbox",
        scenarios: ["S-SAV-01"],
        steps: [
          "simulateDeposit on the savings account funds it. Each call makes a new deposit, so ask before repeating it.",
          "Save, then simulateSavingsInterest with account_id and an amount such as \"0.25\" once the save is completed. It sends `savings.interest.credited`.",
          "The cents choose a sandbox outcome: a save ending .13 fails, a withdrawal ending .13 waits about 2 minutes and then completes, a withdrawal ending .14 fails and the money stays saved.",
        ],
      },
    ],
    rules: [
      "Saving and withdrawing use the same savings account id on both sides of createTransfer.",
      "Saves and withdrawals have no fee, no limits and no approval step. In live the smallest save is 1 USD.",
      "A savings account cannot have a settlement wallet and cannot be closed yet.",
    ],
    docs: ["platform/savings/overview", "recipes/sandbox/test-savings-end-to-end"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "reconcile",
    title: "Reconcile money movements",
    description:
      "Match transactions against the books, trace one transfer through its webhooks, total the fees, and catch up on missed webhook events.",
    scenarios: ["S-TXN-01", "S-TXN-02", "S-TXN-03", "S-TXN-04", "S-COL-07", "S-PAY-12"],
    argument: {
      name: "path",
      kind: "path",
      description: "Optional: transactions, trace, fees or webhooks. Leave it out for every path.",
    },
    intro: "Read the records, in the order below. Everything here is read-only except retryWebhookEvent.",
    askFirst: [
      "Which account or customer, and which day or month (UTC).",
      "Final rows only, or every row.",
    ],
    paths: [
      {
        keys: ["transactions"],
        title: "Transactions against the books",
        scenarios: ["S-TXN-01", "S-TXN-03"],
        steps: [
          "listTransactions with account_id or customer_id, and status or transaction_type, page by page. There is no date filter: rows come newest first, so stop at the `date_created` you need. There is no client_reference filter either: match it in the rows.",
          "getTransaction for one row.",
          "exportTransactions returns the 10 newest rows only: never call it a full statement. getTransactionsVolume is all-time.",
        ],
      },
      {
        keys: ["trace"],
        title: "One transfer from start to finish",
        scenarios: ["S-TXN-02", "S-PAY-12"],
        steps: [
          "getTransaction with the transaction id. The row's `reference` is the transfer reference.",
          "getWebhookHistory with transaction_id and event_type `transfer`, getWebhookEventDetail for a payload, and getWebhookCallHistory for each delivery.",
        ],
      },
      {
        keys: ["fees"],
        title: "Fees paid in a month",
        scenarios: ["S-TXN-04"],
        steps: [
          "listTransactions with transaction_type `fee_charge`, then getTransaction for a row.",
          "The amounts come from the business's own pricing: do not quote prices.",
        ],
      },
      {
        keys: ["webhooks"],
        title: "Missed webhook events",
        scenarios: ["S-COL-07"],
        steps: [
          "Webhook URLs are registered in the Dashboard: the agent cannot register one.",
          "getWebhookHistory with a category in event_type (`transfer`, `inflow`, `account`, `applications.accounts`, `external_account`, `cards`, `collection` or `customer`; a full event name matches nothing) and status `failed`, then getWebhookEventDetail for the payload.",
          "retryWebhookEvent only after the user confirms their endpoint accepts it: the resend is unsigned, and a failed resend goes back into automatic retry.",
          "Deduplicate on the body's `event_id`.",
        ],
      },
    ],
    rules: [
      "A pending row whose latest event is `transfer.status.failed` with `transfer_status: manual_processing_required` is held for manual review, not failed.",
    ],
    docs: ["platform/webhooks/webhooks-overview"],
  },

  // ---------------------------------------------------------------------------
  {
    name: "fix-stuck-transfer",
    title: "Fix a stuck or paused transfer",
    description:
      "Tell pending, paused, under review, waiting for approval and failed apart, and answer a pause for documents, sender details or a limit.",
    scenarios: ["S-TXN-05", "S-TXN-06", "S-PAY-06", "S-PAY-11", "S-PAY-12", "S-REM-10", "S-CUS-06", "S-CUS-07"],
    argument: {
      name: "transaction_id",
      kind: "value",
      description: "Optional: the transaction id of the transfer. Leave it out to ask the user for it.",
    },
    intro: "Find out where the transfer is before doing anything, then follow the steps for its status.",
    askFirst: ["The transaction id or the transfer reference, and the environment it was sent in."],
    paths: [
      {
        keys: ["read"],
        title: "Read where it is",
        scenarios: ["S-TXN-05", "S-PAY-12", "S-REM-10"],
        steps: [
          "getTransaction, then getWebhookHistory with transaction_id and event_type `transfer`, and getWebhookEventDetail for the latest event.",
          "`pending`: still working. If the latest event is `transfer.status.failed` with `transfer_status: manual_processing_required`, it is held for manual review: the money is not lost and the outcome is not final. Stop, explain, and escalate to support.",
          "`paused`: it needs something from the user (below).",
          "`waiting_approval`: it waits for approval in the Dashboard; there is nothing to send.",
          "`failed`: the amount and fee are refunded to the source (a `transfer_refund` row). Only now may it be sent again, with a new client_reference, after the user agrees.",
        ],
      },
      {
        keys: ["paused"],
        title: "Answer a pause",
        scenarios: ["S-PAY-06", "S-PAY-11", "S-CUS-06", "S-CUS-07", "S-TXN-06"],
        steps: [
          "The `requirements` are in the createTransfer answer or the `transfer.requires_information` event. Read them to the user in plain words; `pause_reason` says which kind.",
          `\`supporting_document_required\`: uploadTransferDocument (PDF, PNG or JPEG of ${uploadLimit("uploadTransferDocument")}), then pass its id in supporting_document_ids.`,
          "`sender_details_required`: ask for exactly the listed values and send them in additional_information. For `customer_email`, updateCustomer first.",
          "A limit window (`per_transfer`, `daily`, `weekly`, `monthly`, `annual`): getCustomerLimits or getRemitterLimits shows what is left. Send real verification details only; never invent `remitter_verification`. `annual_requires_approval` and `screening` are reviewed by Gravv: there is nothing to send.",
          "resumeTransfer with id set to the transfer `reference` (not the transaction id), before `expires_at`. It releases the payout: send confirm: true only after the user says yes, and leave idempotency_key out on each new attempt.",
          "`resumed: false` lists new requirements: answer those. A 410 means the pause expired or was cancelled: offer a new transfer. \"this transfer is not paused\": read getTransaction again; do not resend.",
        ],
      },
    ],
    rules: [
      "Never call createTransfer again for a transfer that is `pending`, `paused` or `waiting_approval`.",
      "Never call a paused transfer failed, and never offer to cancel a transfer.",
      "Never suggest splitting a payment to stay under a cap. Call caps \"your business's limits policy\".",
    ],
    docs: ["platform/transfers/paused-transfers", "platform/webhooks/webhooks-overview"],
  },
];

export const PROMPTS_BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));

/** Every tool a model could be told to call: the API tools and the two docs tools. */
const KNOWN_TOOLS = new Set<string>([
  ...TOOLS_BY_NAME.keys(),
  ...MANUAL_TOOLS.map((t) => t.name),
  "searchGravvDocs",
  "getGravvDocPage",
]);

/** The tool names a text mentions, in order of first mention. */
export function toolsNamedIn(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(/\b[a-z][A-Za-z0-9]+\b/g)) if (KNOWN_TOOLS.has(m[0])) seen.add(m[0]);
  return [...seen];
}

export interface PromptContext {
  hasApiKey: boolean;
  /** API tools this session advertises. */
  loadedTools: ReadonlySet<string>;
}

/** The paths an argument value selects, and a note when it selects none. */
function selectPaths(prompt: GoalPrompt, value: string | undefined): { paths: PromptPath[]; note?: string } {
  if (prompt.argument.kind !== "path" || !value) return { paths: prompt.paths };
  const wanted = value.trim().toLowerCase();
  const picked = prompt.paths.filter((p) => p.keys.includes(wanted));
  if (picked.length > 0) return { paths: picked };
  const accepted = prompt.paths.flatMap((p) => p.keys);
  return {
    paths: prompt.paths,
    note: `No ${prompt.argument.name} is called "${value}", so every path is shown. The ${prompt.argument.name} values are: ${accepted.join(", ")}.`,
  };
}

/** One line on the tools this prompt names that this session cannot call, or null. */
function unloadedNote(names: string[], ctx: PromptContext): string | null {
  if (!ctx.hasApiKey) return null;
  const missing = names.filter((n) => TOOLS_BY_NAME.has(n) && !ctx.loadedTools.has(n));
  if (missing.length === 0) return null;
  const sandboxOnly = missing.filter((n) => TOOLS_BY_NAME.get(n)!.sandboxOnly);
  const unselected = missing.filter((n) => !TOOLS_BY_NAME.get(n)!.sandboxOnly);
  const sets = [...new Set(unselected.map((n) => TOOLS_BY_NAME.get(n)!.toolset))].sort();
  const parts = [`Not loaded in this session: ${missing.join(", ")}.`];
  if (sandboxOnly.length > 0) {
    parts.push(`${sandboxOnly.join(", ")} ${sandboxOnly.length === 1 ? "works" : "work"} with a sandbox key only.`);
  }
  if (unselected.length > 0) {
    const which = sandboxOnly.length > 0 ? "The others load" : "They load";
    parts.push(`${which} with --toolsets=${sets.join(",")} (or --toolsets=all).`);
  }
  return parts.join(" ");
}

/** Characters kept from a value argument, which is quoted into the text. */
const MAX_VALUE = 100;

/** The prompt's text for this session. */
export function renderPrompt(prompt: GoalPrompt, args: Record<string, string | undefined>, ctx: PromptContext): string {
  const raw = args[prompt.argument.name];
  const value = typeof raw === "string" ? raw.replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_VALUE) : "";
  const { paths, note } = selectPaths(prompt, value || undefined);

  const out: string[] = [`# ${prompt.title}`, "", prompt.intro];
  if (prompt.argument.kind === "value" && value) {
    out.push("", `Start with ${prompt.argument.name} "${value}".`);
  }
  if (note) out.push("", note);

  out.push("", "## Ask the user first", ...prompt.askFirst.map((q) => `- ${q}`));
  if (prompt.labels) out.push("", "## What is open today", ...prompt.labels.map((l) => `- ${l}`));
  if (prompt.common) {
    out.push("", `## ${prompt.common.title}`, ...prompt.common.steps.map((s, i) => `${i + 1}. ${s}`));
  }
  for (const p of paths) {
    // A path argument's values are shown beside each path; a value argument selects none.
    const keys = prompt.argument.kind === "path" ? ` (${prompt.argument.name}: ${p.keys.join(", ")})` : "";
    out.push("", `## ${p.title}${keys}`, ...p.steps.map((s, i) => `${i + 1}. ${s}`));
  }
  out.push("", "## Rules for this goal", ...prompt.rules.map((r) => `- ${r}`));
  out.push("", "## Rules for every Gravv task", ...SHARED_RULES.map((r) => `- ${r}`));
  out.push("", `## Docs`, `Read with getGravvDocPage: ${prompt.docs.map((d) => `'${d}'`).join(", ")}.`);

  const session: string[] = [];
  if (!ctx.hasApiKey) {
    session.push("This session has no API key: only searchGravvDocs and getGravvDocPage work until GRAVV_API_KEY is set.");
  }
  const unloaded = unloadedNote(toolsNamedIn(out.join("\n")), ctx);
  if (unloaded) session.push(unloaded);
  if (session.length > 0) out.push("", "## This session", ...session.map((s) => `- ${s}`));

  return out.join("\n");
}
