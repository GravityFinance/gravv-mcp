/**
 * Guardrails around money movement and sensitive data.
 *
 * This is the layer that justifies a bespoke server over a generic OpenAPI-to-MCP
 * bridge. Three concerns:
 *
 *   1. Environment. Sandbox and live share https://api.gravv.xyz — only the key differs.
 *      Nothing in a URL signals danger, so the server has to signal it.
 *   2. Confirmation. Value-moving calls need an explicit second step, and on a live key
 *      a second independent signal.
 *   3. Redaction. Cardholder data must not reach a model's context even if a schema
 *      changes underneath us.
 */
import type { Environment } from "./client.ts";
import type { GeneratedTool } from "./generated/tools.ts";

export interface SafetyConfig {
  environment: Environment;
  /** GRAVV_ALLOW_LIVE_WRITES=true — required for money movement on a live key. */
  allowLiveWrites: boolean;
  /** --read-only — disables every non-GET tool. */
  readOnly: boolean;
}

export class SafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafetyError";
  }
}

/** Returned instead of executing, when a money-moving tool is called without confirm. */
export interface ConfirmationRequired {
  status: "confirmation_required";
  tool: string;
  environment: Environment;
  willDo: string;
  request: { method: string; path: string; body: unknown };
  next: string;
  warning?: string;
}

/**
 * Field names that must never be returned to the model. The corresponding endpoints are
 * blocked outright in curation.ts; this is defence in depth for the case where a
 * permitted endpoint starts returning one of these after a spec change.
 */
const SENSITIVE_KEYS = new Set([
  "card_number",
  "cardnumber",
  "pan",
  "cvv",
  "cvc",
  "cvv2",
  "pin",
  "encrypted_pin",
  "card_pin",
  "security_code",
  "expiry_month",
  "expiry_year",
  "full_card_number",
]);

const REDACTED = "[redacted by gravv-mcp: cardholder data is not returned to models]";

/** Recursively replace sensitive values. Structure is preserved so the shape stays legible. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 30 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase().replace(/[-\s]/g, "_")) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

/**
 * Card-family methods removed from createCollection's schema.
 *
 * `additionalProperties: true` means a model can still send `methods: ["card"]` even
 * though the enum no longer lists it, and the API would accept it — producing a card
 * collection through the weaker path with no error to learn from. Checked here so the
 * redirect is explicit rather than silent.
 */
const CARD_METHODS = new Set(["card", "apple_pay", "google_pay"]);

/** Returns a redirect message when a collection request smuggles a card method through. */
export function checkCollectionMethods(toolName: string, body: unknown): string | null {
  if (toolName !== "createCollection") return null;

  const methods = (body as { source?: { methods?: unknown } })?.source?.methods;
  if (!Array.isArray(methods)) return null;

  const card = methods.filter((m) => typeof m === "string" && CARD_METHODS.has(m));
  if (card.length === 0) return null;

  return (
    `createCollection does not handle card payments (received: ${card.join(", ")}). ` +
    `Use createCardPaymentIntent instead — it returns the same hosted payment link, plus ` +
    `an intent id and the card token needed for recurring charges. ` +
    `createCollection covers pix, mobile_money and bank_transfer.`
  );
}

export class SafetyGate {
  // Explicit field rather than a TS parameter property: Node's --experimental-strip-types
  // erases annotations without emitting code, so parameter properties never initialise.
  private readonly config: SafetyConfig;

  constructor(config: SafetyConfig) {
    this.config = config;
  }

  /** Human-readable environment banner, included in the server instructions. */
  describeEnvironment(): string {
    switch (this.config.environment) {
      case "sandbox":
        return "SANDBOX — test data only. No real money moves.";
      case "live":
        return this.config.allowLiveWrites
          ? "LIVE — real money. GRAVV_ALLOW_LIVE_WRITES is set, so confirmed money-moving calls WILL execute against production."
          : "LIVE — real money. Money-moving tools are BLOCKED because GRAVV_ALLOW_LIVE_WRITES is not set. Reads work normally.";
      default:
        return "UNKNOWN environment — the API key prefix was not recognised. Treated as live: money-moving tools are blocked unless GRAVV_ALLOW_LIVE_WRITES is set.";
    }
  }

  /** Filter the tool list before it is advertised. */
  isToolAvailable(tool: GeneratedTool): boolean {
    if (this.config.readOnly && tool.method.toLowerCase() !== "get") return false;
    return true;
  }

  /**
   * Decide whether a call may proceed.
   *
   * Returns a ConfirmationRequired object to hand back to the model, or null to allow
   * execution. Throws when the call must not happen at all.
   */
  check(
    tool: GeneratedTool,
    args: Record<string, unknown>,
    preview: { method: string; path: string; body: unknown },
  ): ConfirmationRequired | null {
    if (this.config.readOnly && tool.method.toLowerCase() !== "get") {
      throw new SafetyError(
        `${tool.name} is not available: the server is running in --read-only mode, which disables all non-GET tools.`,
      );
    }

    if (!tool.movesMoney) return null;

    // "unknown" fails closed — an unrecognised key is treated as live.
    const isLive = this.config.environment !== "sandbox";

    if (isLive && !this.config.allowLiveWrites) {
      throw new SafetyError(
        `${tool.name} moves money and this is a ${this.config.environment.toUpperCase()} key. ` +
          `Refusing to execute. If this is genuinely intended, restart the server with ` +
          `GRAVV_ALLOW_LIVE_WRITES=true — two independent signals are required before real value moves.`,
      );
    }

    if (args.confirm === true) return null;

    return {
      status: "confirmation_required",
      tool: tool.name,
      environment: this.config.environment,
      willDo: summarise(tool, preview.body, args),
      request: preview,
      next: `Show this to the user and get their agreement. Then call ${tool.name} again with the identical arguments plus confirm: true.`,
      warning: isLive
        ? "THIS IS A LIVE KEY. Confirming will move real money."
        : undefined,
    };
  }
}

/** A value fit to print in a sentence: strings and numbers only, never "[object Object]". */
function text(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

/** An FX pair as the schema sends it (`{ base, quote }`) or as a pair code (`USD_EUR`). */
function pairText(pair: unknown): string | undefined {
  if (pair && typeof pair === "object") {
    const { base, quote } = pair as Record<string, unknown>;
    const parts = [text(base), text(quote)].filter(Boolean);
    return parts.length === 2 ? parts.join("/") : undefined;
  }
  return text(pair);
}

/** Plain-language summary of what a money-moving call will do, for the confirmation step. */
function summarise(tool: GeneratedTool, body: unknown, args: Record<string, unknown>): string {
  const b = (body ?? {}) as Record<string, any>;
  const amount = text(b.amount ?? b.value ?? b.source_amount);
  // The currency lives in a different field per route, so each case names its own.
  const money = (currency: unknown) => {
    if (amount === undefined) return "an unspecified amount";
    const c = text(currency);
    return c ? `${amount} ${c}` : amount;
  };

  switch (tool.name) {
    case "createTransfer": {
      const from = text(b.source?.id) ?? "the source account";
      const to = text(b.destination?.id) ?? "the destination";
      const kind = text(b.destination?.destination_type) ?? "account";
      // The API debits in the source account's own currency; source.currency is only checked.
      const sent = text(b.source?.currency)
        ? money(b.source.currency)
        : `${money(undefined)} in the source account's currency`;
      return `Transfer ${sent} from ${from} to ${kind} ${to}. Once submitted this cannot be reversed from the API.`;
    }
    case "withdrawFromCard":
      return `Withdraw ${money(b.currency)} from card ${text(b.card_id) ?? "(unspecified)"}.`;
    case "createFxOrder": {
      const pair = pairText(b.pair ?? b.currency_pair);
      const what = text(b.quote_id) ? `for quote ${b.quote_id}` : `for ${money(undefined)}`;
      return (
        `Place an FX order ${what}${pair ? ` on ${pair}` : ""}. Over an API key the order runs at once ` +
        `and the source is debited when it is placed; there is no approval step.`
      );
    }
    case "createCollection": {
      const methods = Array.isArray(b.source?.methods)
        ? b.source.methods.map(text).filter(Boolean).join(", ")
        : "";
      return `Initiate a ${methods ? `${methods} ` : ""}collection of ${money(b.currency)} from the payer.`;
    }
    case "chargeSavedCard":
      return (
        `Charge saved card token ${text(b.card_token) ?? "(unspecified)"} for payment intent ` +
        `${text(b.payment_intent_id) ?? "(unspecified)"}. The amount is the one set on the payment intent.`
      );
    case "createCardPaymentIntent":
      return text(b.card_token)
        ? `Charge ${money(b.currency)} to saved card token ${b.card_token} now. A decline still returns HTTP 200: check data.status.`
        : `Create a hosted payment link for ${money(b.currency)}. No money moves until the payer pays.`;
    case "cancelFxOrder":
      return `Cancel FX order ${text(args.order_id) ?? "(unspecified)"}. Cancelling does not return funds already debited.`;
    default:
      return `Execute ${tool.method.toUpperCase()} ${tool.path} with ${money(b.currency ?? b.source_currency ?? b.from_currency)}.`;
  }
}
