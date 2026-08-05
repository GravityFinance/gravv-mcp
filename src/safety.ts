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
      willDo: summarise(tool, preview.body),
      request: preview,
      next: `Show this to the user and get their agreement. Then call ${tool.name} again with the identical arguments plus confirm: true.`,
      warning: isLive
        ? "THIS IS A LIVE KEY. Confirming will move real money."
        : undefined,
    };
  }
}

/** Plain-language summary of what a money-moving call will do, for the confirmation step. */
function summarise(tool: GeneratedTool, body: unknown): string {
  const b = (body ?? {}) as Record<string, any>;
  const amount = b.amount ?? b.value ?? b.source_amount;
  const currency = b.currency ?? b.source_currency ?? b.from_currency ?? "";
  const money = amount !== undefined ? `${amount}${currency ? ` ${currency}` : ""}` : "an unspecified amount";

  switch (tool.name) {
    case "createTransfer": {
      const from = b.source?.id ?? "the source account";
      const to = b.destination?.id ?? "the destination";
      const kind = b.destination?.destination_type ?? "account";
      return `Transfer ${money} from ${from} to ${kind} ${to}. Once submitted this cannot be reversed from the API.`;
    }
    case "withdrawFromCard":
      return `Withdraw ${money} from card ${b.card_id ?? "(unspecified)"}.`;
    case "createFxOrder":
      return `Place an FX ${b.side ?? ""} order for ${money}${b.pair ? ` on ${b.pair}` : ""}. It will sit in waiting_approval until a second user approves it in the dashboard.`;
    case "createCollection":
      return `Initiate a collection of ${money} from the payer via ${b.collection_method ?? "the specified method"}.`;
    case "chargeSavedCard":
      return `Charge ${money} to saved card ${b.card_id ?? b.card_token ?? "(unspecified)"}.`;
    default:
      return `Execute ${tool.method.toUpperCase()} ${tool.path} with ${money}.`;
  }
}
