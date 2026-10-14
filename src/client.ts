/**
 * HTTP client for the Gravv API.
 *
 * Everything here encodes behaviour verified against the gateway source rather than
 * assumed: the auth header, the idempotency contract, the response envelope, and the
 * rate limiter. Where the gateway and the public docs disagree, the discrepancy is
 * called out at the point it matters.
 */
import { randomUUID } from "node:crypto";
import type { GeneratedTool } from "./generated/tools.ts";
import { OUTCOME_LOOKUPS } from "./curation.ts";

export const DEFAULT_BASE_URL = "https://api.gravv.xyz";

export type Environment = "sandbox" | "live" | "unknown";

/**
 * Sandbox and live share one base URL — the API key alone decides which database a
 * request reaches, via its `grvSec_sandbox_` / `grvSec_live_` prefix.
 *
 * The prefixes are matched exactly and case-sensitively, as the gateway matches them: it
 * sends every key that does not start `grvSec_sandbox_` to live. A looser test (a
 * "sandbox" substring, or ignoring case) could call a live key sandbox and lift the
 * live-write gate.
 *
 * Returning "unknown" rather than guessing matters: the safety layer treats unknown as
 * potentially-live, so an unrecognised key format fails closed.
 */
export function detectEnvironment(apiKey: string): Environment {
  if (/^grvSec_live_/.test(apiKey)) return "live";
  if (/^grvSec_sandbox_/.test(apiKey)) return "sandbox";
  return "unknown";
}

/** Publishable keys (`grvPub_`) are for client-side use and cannot call the API. */
export function isPublishableKey(apiKey: string): boolean {
  return /^grvPub_/.test(apiKey);
}

export const PUBLISHABLE_KEY_MESSAGE =
  "This is a publishable key (grvPub_). Publishable keys cannot call the Gravv API. " +
  "Set GRAVV_API_KEY to a secret key starting grvSec_sandbox_ or grvSec_live_.";

export interface GravvApiErrorDetails {
  /** The Idempotency-Key the failed call sent, so it can be traced or resent. */
  idempotencyKey?: string;
  /** The gateway answered with a stored response instead of running the request. */
  replayed?: boolean;
  /** The call may or may not have taken effect: look the result up before resending. */
  outcomeUnknown?: boolean;
}

export class GravvApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly hint: string | undefined;
  readonly idempotencyKey: string | undefined;
  readonly replayed: boolean;
  readonly outcomeUnknown: boolean;

  constructor(message: string, status: number, body: unknown, hint?: string, details: GravvApiErrorDetails = {}) {
    super(message);
    this.name = "GravvApiError";
    this.status = status;
    this.body = body;
    this.hint = hint;
    this.idempotencyKey = details.idempotencyKey;
    this.replayed = details.replayed ?? false;
    this.outcomeUnknown = details.outcomeUnknown ?? false;
  }
}

/**
 * Token bucket so we queue locally instead of generating 429s.
 *
 * The gateway allows 600 requests a minute, burst 50, per tenant: every key and every
 * process of one business shares that bucket, and a 429 carries no Retry-After. The
 * default here is a courtesy 60/min, burst 15, well below it, so one agent leaves room
 * for the merchant's own traffic. GRAVV_RATE_PER_MINUTE changes the ceiling.
 */
export class RateLimiter {
  private tokens: number;
  private last = Date.now();
  private readonly perMinute: number;
  private readonly burst: number;

  constructor(perMinute: number, burst: number) {
    this.perMinute = perMinute;
    this.burst = burst;
    this.tokens = burst;
  }

  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 60_000) * this.perMinute);
      this.last = now;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil(((1 - this.tokens) / this.perMinute) * 60_000);
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 30_000)));
    }
  }
}

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  ratePerMinute?: number;
  rateBurst?: number;
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** How the client waits before a retry. Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface CallResult {
  data: unknown;
  /**
   * Present on POSTs: the key that was sent. It is the caller's when one was passed,
   * otherwise a new one made for this call.
   */
  idempotencyKey?: string;
  /** True when the gateway replayed a stored response rather than re-executing. */
  replayed: boolean;
  /**
   * True when the gateway's rate limiter refused an earlier attempt and this server
   * retried under a new key. The refused attempts did not run.
   */
  retriedWithNewKey: boolean;
  status: number;
}

export class GravvClient {
  readonly environment: Environment;
  private readonly opts: ClientOptions;
  private readonly baseUrl: string;
  private readonly limiter: RateLimiter;
  private readonly timeoutMs: number;
  private readonly doFetch: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: ClientOptions) {
    this.opts = opts;
    this.environment = detectEnvironment(opts.apiKey ?? "");
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.limiter = new RateLimiter(opts.ratePerMinute ?? 60, opts.rateBurst ?? 15);
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.doFetch = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /**
   * Split a flat argument object into path substitutions, query string, and body,
   * according to how the generator classified each argument.
   */
  buildRequest(tool: GeneratedTool, args: Record<string, unknown>) {
    let path = tool.path;
    for (const p of tool.pathParams) {
      const v = args[p];
      if (v === undefined || v === null || v === "") {
        throw new GravvApiError(`Missing required path parameter "${p}" for ${tool.name}`, 400, null);
      }
      path = path.replace(`{${p}}`, encodeURIComponent(String(v)));
    }

    const query = new URLSearchParams();
    for (const q of tool.queryParams) {
      const v = args[q];
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) for (const item of v) query.append(q, String(item));
      else query.append(q, String(v));
    }

    let body: unknown;
    if (tool.bodyMode === "wrapped") {
      body = args.body;
    } else if (tool.bodyMode === "inline") {
      const b: Record<string, unknown> = {};
      for (const k of tool.bodyProps) if (args[k] !== undefined) b[k] = args[k];
      // Fields the spec did not enumerate but the API accepts.
      // confirm and idempotency_key are MCP arguments; the key travels as a header.
      const known = new Set([
        ...tool.pathParams,
        ...tool.queryParams,
        ...tool.bodyProps,
        "confirm",
        "idempotency_key",
      ]);
      for (const [k, v] of Object.entries(args)) if (!known.has(k) && v !== undefined) b[k] = v;
      // Identifiers the API wants in both the path and the body.
      for (const k of tool.alsoInBody) if (args[k] !== undefined) b[k] = args[k];
      body = b;
    }

    const qs = query.toString();
    return { url: `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`, body };
  }

  async call(
    tool: GeneratedTool,
    args: Record<string, unknown>,
    opts: { idempotencyKey?: string } = {},
  ): Promise<CallResult> {
    const { url, body } = this.buildRequest(tool, args);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "gravv-mcp",
    };

    if (this.opts.apiKey) headers["Api-Key"] = this.opts.apiKey;

    // The API rejects any POST without an Idempotency-Key with a 400, so every such call
    // sends one: the caller's, to resend a call whose outcome is unknown, or else a new
    // one. Exemptions are in curation.ts.
    let idempotencyKey: string | undefined;
    if (tool.needsIdempotency) {
      if (opts.idempotencyKey !== undefined && !isValidIdempotencyKey(opts.idempotencyKey)) {
        // The gateway refuses it too, but only after a round trip.
        throw new GravvApiError(
          "idempotency_key must be 1-255 printable ASCII characters",
          400,
          null,
          "Pass the idempotency_key exactly as an earlier result returned it, or leave it out and a new key is made.",
        );
      }
      idempotencyKey = opts.idempotencyKey ?? randomUUID();
      headers["Idempotency-Key"] = idempotencyKey;
    }
    // A key the caller passed may still guard a first call whose outcome is unknown, so
    // it is never swapped for another.
    const keySupplied = idempotencyKey !== undefined && opts.idempotencyKey !== undefined;
    let retriedWithNewKey = false;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    // Retries happen only where a resend cannot run the call twice: a 409 that says the
    // first request is still running, and a 429 (below). There is no automatic retry
    // after a timeout, a network error or a 5xx. The outcome is unknown, and a 5xx is not
    // stored under its key, so a blind resend can run a money call twice. Those go back
    // to the caller with a hint to look the result up first.
    const maxAttempts = 3;
    let lastError: GravvApiError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.limiter.take();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let res: Response;
      try {
        res = await this.doFetch(url, {
          method: tool.method.toUpperCase(),
          headers,
          body: body === undefined ? undefined : canonicalJson(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        // The status stays 408 or 0, as before; the hint and the outcome flag say what
        // the model must do about it.
        const timedOut = (err as Error)?.name === "AbortError";
        const status = timedOut ? 408 : 0;
        const message = timedOut
          ? `Request to ${tool.name} timed out after ${this.timeoutMs}ms`
          : `Network error calling ${tool.name}: ${(err as Error).message}`;
        const hint = hintFor(status, tool, message, null, { keySupplied, idempotencyKey });
        throw new GravvApiError(message, status, null, hint, {
          idempotencyKey,
          outcomeUnknown: isOutcomeUnknown(status, tool, message),
        });
      }
      clearTimeout(timer);

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      const replayed = res.headers.get("Idempotency-Replayed") === "true";

      if (res.ok) {
        // Every gateway response is wrapped as { data, error }.
        const data = parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
        return { data, idempotencyKey, replayed, retriedWithNewKey, status: res.status };
      }

      const apiMessage = extractErrorMessage(parsed, res.statusText);

      // Only these two 409s mean "still running"; both send Retry-After: 1, and a resend
      // under the same key gets the first request's answer. Every other 409 is final,
      // such as a client_reference already used for a different transfer.
      if (res.status === 409 && attempt < maxAttempts && IN_FLIGHT_CODES.has(errorCode(parsed) ?? "")) {
        await this.sleep(retryAfterMs(res.headers.get("Retry-After"), 1));
        lastError = new GravvApiError(apiMessage, 409, parsed, undefined, { idempotencyKey });
        continue;
      }

      // The idempotency middleware runs before the rate limiter, so the limiter's 429 is
      // stored under its key for 24 hours and a same-key retry only gets it back. That 429
      // also proves the request never ran, so a key this server made is swapped for a new
      // one. A caller's key is not: it may guard a first call whose outcome is unknown. A
      // 429 that a service sent after the request reached it proves nothing, so a keyed
      // call is not retried then.
      const rateLimited = res.status === 429 && attempt < maxAttempts;
      if (rateLimited && (idempotencyKey === undefined || (!keySupplied && isGatewayRateLimit(apiMessage)))) {
        await this.sleep(retryAfterMs(res.headers.get("Retry-After"), 6));
        lastError = new GravvApiError(String(apiMessage), 429, parsed, undefined, { idempotencyKey });
        if (idempotencyKey !== undefined) {
          idempotencyKey = randomUUID();
          headers["Idempotency-Key"] = idempotencyKey;
          retriedWithNewKey = true;
        }
        continue;
      }

      let hint = hintFor(res.status, tool, apiMessage, parsed, { keySupplied, idempotencyKey, replayed });
      if (res.status === 401 && isPublishableKey(this.opts.apiKey ?? "")) {
        hint = `${PUBLISHABLE_KEY_MESSAGE} ${hint ?? ""}`.trim();
      }
      throw new GravvApiError(apiMessage, res.status, parsed, hint, {
        idempotencyKey,
        replayed,
        outcomeUnknown: isOutcomeUnknown(res.status, tool, apiMessage),
      });
    }

    throw lastError ?? new GravvApiError(`${tool.name} failed after ${maxAttempts} attempts`, 500, null);
  }
}

/** 409 codes that mean the first request is still running, so a same-key retry is safe. */
const IN_FLIGHT_CODES = new Set(["idempotency_in_flight", "ERROR_CODE_TRANSFER_IN_PROGRESS"]);

/** The longest wait the gateway's own limiter asks for. */
const MAX_RETRY_WAIT_MS = 30_000;

/**
 * How long a Retry-After header asks the client to wait, in ms.
 *
 * The header is either delta-seconds or an HTTP-date. A date read as a number is NaN,
 * which skipped the wait altogether. Anything unreadable falls back to the default, and
 * the result is kept within 0-30 s.
 */
export function retryAfterMs(header: string | null, fallbackSeconds: number, now = Date.now()): number {
  let ms = fallbackSeconds * 1000;
  const value = header?.trim() ?? "";
  if (/^\d+(\.\d+)?$/.test(value)) {
    ms = Number(value) * 1000;
  } else if (value) {
    const at = Date.parse(value);
    if (!Number.isNaN(at)) ms = at - now;
  }
  return Math.min(Math.max(ms, 0), MAX_RETRY_WAIT_MS);
}

/**
 * JSON with every object's keys sorted, recursively; arrays keep their order.
 *
 * The gateway's idempotency check hashes the raw body bytes, and a model resending "the
 * same arguments" does not reliably keep their order. Without this, a resend under the
 * first call's key gets 422 idempotency_key_reused exactly when the key matters. The API
 * decodes JSON without regard to key order, so it reads the same request.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v === null || typeof v !== "object" || Array.isArray(v)) return v;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
    return sorted;
  });
}

/** The gateway's rule for an Idempotency-Key: 1-255 printable ASCII characters. */
export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === "string" && /^[\x20-\x7E]{1,255}$/.test(key);
}

/**
 * Normalise the gateway's error field into a readable string.
 *
 * The shape is not consistent across statuses — verified against sandbox:
 *   400 -> {"data":null,"error":"missing idempotency key in request headers"}
 *   422 -> {"data":null,"error":{"code":"idempotency_key_reused","message":"..."}}
 *   403 -> {"data":null,"error":{"reason":"forbidden","required_any":["transfer:initiate"]}}
 *   503 -> {"error":"service_unavailable","message":"failed to read request body"}
 *
 * Naively stringifying the object forms yields "[object Object]", which tells the model
 * nothing and sends it guessing. Reading only `error` from the last form kept the code
 * and lost the text. An HTML error page inside a message is cut off: it says nothing the
 * first line does not, and it is not for the model.
 */
export function extractErrorMessage(parsed: unknown, fallback: string): string {
  if (parsed == null) return fallback;
  if (typeof parsed === "string") return withoutHtml(parsed) || fallback;
  if (typeof parsed !== "object") return String(parsed);

  const top = parsed as Record<string, unknown>;
  const err = top.error ?? top.message;

  if (typeof err === "string" && err) {
    // Family F: a bare code in `error` and the text in `message`.
    if (typeof top.message === "string" && top.message && top.message !== err && /^[a-z0-9_]+$/i.test(err)) {
      return `${withoutHtml(top.message)} (${err})`;
    }
    return withoutHtml(err);
  }

  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (Array.isArray(e.required_any) && e.required_any.length > 0) {
      return `${typeof e.reason === "string" ? e.reason : "forbidden"}: this key needs one of ${e.required_any.join(", ")}`;
    }
    const message = typeof e.message === "string" ? withoutHtml(e.message) : undefined;
    const code = typeof e.code === "string" ? e.code : undefined;
    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return code;
    return JSON.stringify(err);
  }

  return fallback;
}

const HTML_START = /<html|<!doctype html/i;

/**
 * Text with any HTML error page cut off: what comes before the page, up to the first
 * line break, plus a note. The 502 that comes back as a 400 carries the web server's page.
 */
export function withoutHtml(text: string): string {
  const at = text.search(HTML_START);
  if (at < 0) return text;
  const newline = text.indexOf("\n");
  let head = text.slice(0, newline >= 0 && newline < at ? newline : at).trim();
  if (!head) head = text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  return `${head || "Server error"} (HTML error page omitted)`;
}

/**
 * An error body with any HTML page cut out of its text, for the `details` the model sees.
 * Everything else in the body is kept as it came.
 */
export function bodyWithoutHtml(body: unknown): unknown {
  if (typeof body === "string") return withoutHtml(body);
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const out: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const k of ["error", "message"]) {
    if (typeof out[k] === "string") out[k] = withoutHtml(out[k] as string);
  }
  return out;
}

/** Fields of an error body worth reading, at the top level or inside `error` (C.6 B, C, E). */
const ERROR_FIELDS = [
  "details",
  "transfer_status",
  "window",
  "required_any",
  "reason_detail",
  "feature",
  "access_status",
  "request_access_url",
  "documentation_url",
  "request_id",
  "reapply_after",
  "limit",
] as const;

/**
 * Whichever of the error's fields the body carries: its code, and the fields a hint or
 * a model needs, such as a limit's window or a transfer's status. A field inside `error`
 * wins over the same name at the top level.
 */
export function errorFields(body: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return out;
  const top = body as Record<string, unknown>;
  const inner = top.error && typeof top.error === "object" ? (top.error as Record<string, unknown>) : {};
  const code = errorCode(body);
  if (code) out.code = code;
  for (const k of ERROR_FIELDS) {
    const v = inner[k] ?? top[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/**
 * The machine-readable code of an error body, wherever the gateway put it: inside the
 * error object (`{"error":{"code":"idempotency_key_reused",…}}`) or at the top level
 * beside a string error (`{"error":"…","code":"ERROR_CODE_DAILY_LIMIT_EXCEEDED"}`).
 */
function errorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const inner = b.error && typeof b.error === "object" ? (b.error as Record<string, unknown>).code : undefined;
  if (typeof inner === "string" && inner) return inner;
  return typeof b.code === "string" && b.code ? b.code : undefined;
}

/**
 * The gateway rate limiter's own 429 (`{"data":null,"error":"Too many request"}`). It
 * answers before the request reaches any service. A service can also answer 429, after
 * the request reached it.
 */
function isGatewayRateLimit(message: string): boolean {
  return /too many request/i.test(message);
}

/**
 * Where to look to learn whether a call took effect, for hints that say "look it up
 * first". The per-tool text lives in curation.ts.
 */
function lookupFor(tool: GeneratedTool): string {
  const entry = OUTCOME_LOOKUPS[tool.name];
  return entry && "lookup" in entry ? entry.lookup : "the matching get or list tool";
}

/** The sentence for a call that cannot have changed anything, or undefined for a write. */
function safeToRepeat(tool: GeneratedTool): string | undefined {
  if (tool.method.toLowerCase() === "get") return "Nothing was changed by this read; it is safe to call again.";
  const entry = OUTCOME_LOOKUPS[tool.name];
  if (entry && "readOnly" in entry) return "This call changes nothing; it is safe to call again.";
  return undefined;
}

/**
 * A server fault that the gateway answered as a 400. It is stored under its key for 24
 * hours like any 400, and replayed, so a same-key resend only gets the fault back.
 */
const SERVER_FAULT_400 =
  /unexpected HTTP status code received from server: 5\d\d|<html|HTML error page omitted|circuit breaker|internal server error|please try again shortly|retry shortly|^failed to /i;

function isServerFault400(message: string): boolean {
  return SERVER_FAULT_400.test(message);
}

/**
 * Whether a failed call may still have taken effect: a timeout or network error (0 or
 * 408), a 5xx other than 501, or a server fault sent as a 400. Never for a call that
 * changes nothing.
 */
export function isOutcomeUnknown(status: number, tool: GeneratedTool, message = ""): boolean {
  if (safeToRepeat(tool)) return false;
  if (status === 0 || status === 408) return true;
  if (status === 400) return isServerFault400(message);
  return status >= 500 && status !== 501;
}

/** Extra facts about the call that change what a hint should say. */
export interface HintContext {
  /** The caller passed the idempotency key; this server did not make it. */
  keySupplied?: boolean;
  /** The key the call sent, quoted in a resend instruction. */
  idempotencyKey?: string;
  /** The gateway replayed a stored answer (Idempotency-Replayed: true). */
  replayed?: boolean;
}

const REPLAYED_STORED =
  "This is the stored answer to an earlier call with the same idempotency key (kept 24 hours); the request did not run again.";
const REPLAYED = `${REPLAYED_STORED} Fix the request if needed, then call again without idempotency_key.`;

/** After a timeout or a network error. */
function hintNoAnswer(tool: GeneratedTool, ctx: HintContext): string {
  const safe = safeToRepeat(tool);
  if (safe) return safe;
  if (!tool.needsIdempotency) {
    return "The outcome is unknown: the change may have been applied. Read the resource again before calling again.";
  }
  const key = ctx.idempotencyKey ? ` "${ctx.idempotencyKey}"` : " from this result";
  return `The outcome is unknown: the call may have taken effect. Look it up first: ${lookupFor(tool)}. If it is not there, call ${tool.name} again with exactly the same arguments plus idempotency_key${key}. The gateway then returns the first call's answer if it landed in the meantime, instead of running it twice.`;
}

/** A 5xx: not stored by the gateway, so the same key runs the call again. */
function hint5xx(tool: GeneratedTool): string {
  const safe = safeToRepeat(tool);
  if (safe) return "A temporary fault. Try again shortly.";
  if (!tool.needsIdempotency) {
    return "The outcome is unknown: the change may have been applied. Read the resource again before calling again.";
  }
  return `The outcome is unknown: the call may have taken effect. The gateway does not keep 5xx answers, so calling again with the same idempotency_key runs the call again. Look the result up first: ${lookupFor(tool)}. If nothing landed, call again.`;
}

/** A server fault answered as a 400, and so stored for 24 hours under its key. */
function hintServerFault400(tool: GeneratedTool): string {
  const safe = safeToRepeat(tool);
  if (safe) return `This is a server-side fault, not a bad request. ${safe}`;
  if (!tool.needsIdempotency) {
    return "This is a server-side fault, not a bad request, and the change may have been applied. Read the resource again before calling again.";
  }
  const reference = "client_reference" in ((tool.inputSchema.properties as Record<string, unknown>) ?? {});
  return `This is a server-side fault, not a bad request, but it was answered as a 400, and a 400 is kept for 24 hours under its key. Look the result up first: ${lookupFor(tool)}. If nothing landed, call again without idempotency_key (a new key)${reference ? " and the same client_reference" : ""}.`;
}

const RATE_LIMITED =
  "Rate limited by the gateway (600 requests a minute, burst 50, per tenant). This server already throttles itself to 60 a minute by default, so repeated 429s usually mean another process uses the same Gravv account. Wait and try again.";

function hint429(tool: GeneratedTool, message: string, ctx: HintContext): string {
  if (!tool.needsIdempotency) return RATE_LIMITED;
  const lookUp = safeToRepeat(tool)
    ? "This call changes nothing; call again without idempotency_key."
    : `Look the result up first (${lookupFor(tool)}); if nothing landed, call again without idempotency_key.`;
  if (!isGatewayRateLimit(message)) {
    return `The service refused this call with a 429 after it reached it, and that answer is kept for 24 hours under its key. ${lookUp}`;
  }
  if (ctx.keySupplied) {
    return `${RATE_LIMITED} The earlier call under this idempotency_key left no stored answer, so the key no longer protects against a double send, and this 429 is now kept under it. ${lookUp}`;
  }
  return `${RATE_LIMITED} This server already retried with a new key.`;
}

/** A 409 is not one thing: only two of them mean "still running". */
function hint409(code: string | undefined): string | undefined {
  switch (code) {
    case "idempotency_in_flight":
      return "The first call with this key is still running (the gateway holds it for up to 60 s). Wait, then call again with the same arguments and idempotency_key to get its answer.";
    case "ERROR_CODE_TRANSFER_IN_PROGRESS":
      return "A transfer with this client_reference is still being processed. Wait a few seconds, then call again with the same arguments and idempotency_key; if it is the same transfer, the API returns its result.";
    default:
      return undefined;
  }
}

/** Transfer limit codes. All are 422, and none is fixed by a new idempotency key. */
const LIMIT_CODES = new Set([
  "ERROR_CODE_LIMIT_EXCEEDED",
  "ERROR_CODE_DAILY_LIMIT_EXCEEDED",
  "ERROR_CODE_PER_TRANSFER_LIMIT_EXCEEDED",
  "ERROR_CODE_MONTHLY_LIMIT_EXCEEDED",
  "ERROR_CODE_ANNUAL_LIMIT_EXCEEDED",
]);

/** A 422 is not one thing: idempotency, limits, blocks and missing information all use it. */
function hint422(code: string | undefined): string {
  if (code === "idempotency_key_reused") {
    return "The same idempotency_key was sent before with a different body. If this is a resend, send exactly the same arguments as the first call. If it is a new request, leave idempotency_key out and a fresh key is made.";
  }
  if (code && LIMIT_CODES.has(code)) {
    return "Not an idempotency problem. The transfer is over a sender limit (see window and details). Reduce the amount or wait for the window to reset. Retrying the same call will not help.";
  }
  switch (code) {
    case "ERROR_CODE_SUBJECT_BLOCKED":
      return "Transfers are not permitted for this sender. Contact Gravv compliance; do not retry.";
    case "ERROR_CODE_REMITTER_INFORMATION_REQUIRED":
      return "More sender information is needed. Add the remitter details in additional_information and call again.";
    case "ERROR_CODE_SUPPORTING_DOCUMENT_REQUIRED":
      return "This transfer needs a supporting document. Upload one and pass its id in supporting_document_ids. Search the docs for 'transfer supporting documents'.";
    default:
      return "The API could not process the request. Read the error and its code; this is not an idempotency problem.";
  }
}

/**
 * Turn the statuses merchants actually hit into something actionable.
 *
 * `message` and the body's error code are consulted so the hint does not contradict the
 * API. A 400 saying "missing field `client_reference`" needs no speculation about
 * idempotency headers — guessing there sends the model chasing the wrong thing.
 */
export function hintFor(
  status: number,
  tool: GeneratedTool,
  message = "",
  body: unknown = null,
  ctx: HintContext = {},
): string | undefined {
  const hint = statusHint(status, tool, message, body, ctx);
  // A stored 4xx looked like a fresh failure, so a model kept resending under the key.
  if (!ctx.replayed) return hint;
  // A stored server fault may still have taken effect, so its own hint, which looks the
  // result up before any resend, must not be preceded by "call again".
  const prefix = hint && isOutcomeUnknown(status, tool, message) ? REPLAYED_STORED : REPLAYED;
  return hint ? `${prefix} ${hint}` : prefix;
}

function statusHint(
  status: number,
  tool: GeneratedTool,
  message: string,
  body: unknown,
  ctx: HintContext,
): string | undefined {
  const mentionsIdempotency = /idempotenc/i.test(message);

  // Not every 400 is a malformed request. Several are business preconditions — the
  // customer is unverified, the account is empty, the recipient has not gone active.
  // Those are not fixed by editing the payload, so saying "check the schema" sends the
  // model editing fields that were already correct.
  const isStatePrecondition =
    /kyc|kyb|not verified|unverified|insufficient|balance|inactive|not active|pending|frozen|not allowed|limit/i.test(
      message,
    );

  switch (status) {
    case 0:
    case 408:
      return hintNoAnswer(tool, ctx);
    case 400:
      // A server fault dressed as a 400 first: it can mention a limit or a pending state,
      // and it is no precondition and no bad field.
      if (isServerFault400(message)) return hintServerFault400(tool);
      if (isStatePrecondition) {
        return "This is a state precondition, not a malformed request — the payload may be perfectly valid. Something must happen first: the customer may need KYC (getCustomer: the basic kyc status must be `completed`), the account may need funding (getAccount), or a recipient may still be pending rather than active (getExternalAccount). Search the docs for the flow if the ordering is unclear.";
      }
      // The API names the offending field in most 400s. When it has, repeating that is
      // more useful than a generic theory about what else might be wrong.
      if (/missing field|required|invalid|not valid|must be|expected/i.test(message)) {
        return "The API rejected the request body. Fix the field it names, checking the tool's input schema for the expected shape — searchGravvDocs has worked examples if the shape is unclear.";
      }
      if (mentionsIdempotency) {
        return "The Idempotency-Key was missing or malformed. The client generates one automatically, so this suggests the request did not go through the normal path.";
      }
      return "Check the request against the tool's input schema — a required field is likely missing or malformed.";
    case 401:
      return "The API key was rejected. Confirm GRAVV_API_KEY is set to a current key for the environment you intend.";
    case 403:
      return "Forbidden. Some endpoints are dashboard-only and reject API-key callers — approvals in particular must be done in the Gravv dashboard.";
    case 404:
      return "Not found. Confirm the id exists in THIS environment — sandbox and live hold separate data.";
    case 409:
      return hint409(errorCode(body));
    case 422:
      return hint422(errorCode(body));
    case 429:
      return hint429(tool, message, ctx);
    default:
      return status >= 500 && status !== 501 ? hint5xx(tool) : undefined;
  }
}
