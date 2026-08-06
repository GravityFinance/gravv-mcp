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

export const DEFAULT_BASE_URL = "https://api.gravv.xyz";

export type Environment = "sandbox" | "live" | "unknown";

/**
 * Sandbox and live share one base URL — the API key alone decides which database a
 * request reaches, via its `grvSec_sandbox_` / `grvSec_live_` prefix.
 *
 * Returning "unknown" rather than guessing matters: the safety layer treats unknown as
 * potentially-live, so an unrecognised key format fails closed.
 */
export function detectEnvironment(apiKey: string): Environment {
  if (/^grvSec_sandbox_/i.test(apiKey) || /sandbox/i.test(apiKey.slice(0, 20))) return "sandbox";
  if (/^grvSec_live_/i.test(apiKey) || /(^|_)live_/i.test(apiKey.slice(0, 20))) return "live";
  return "unknown";
}

export class GravvApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly hint: string | undefined;

  constructor(message: string, status: number, body: unknown, hint?: string) {
    super(message);
    this.name = "GravvApiError";
    this.status = status;
    this.body = body;
    this.hint = hint;
  }
}

/**
 * Token bucket matching the server-side limiter so we queue locally instead of
 * generating 429s.
 *
 * NOTE: the enforced ceiling is not clearly documented. The published limit is 10/min,
 * but 40 consecutive sandbox requests measured zero 429s, so throttling that hard would
 * make the server feel broken for no reason. The default is a courtesy 60/min; if a
 * given environment is stricter the 429 handler backs off, and GRAVV_RATE_PER_MINUTE
 * lowers the ceiling.
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
}

export interface CallResult {
  data: unknown;
  /** Present on POSTs; echoed back so a retry can reuse the same key deliberately. */
  idempotencyKey?: string;
  /** True when the gateway replayed a stored response rather than re-executing. */
  replayed: boolean;
  status: number;
}

export class GravvClient {
  readonly environment: Environment;
  private readonly opts: ClientOptions;
  private readonly baseUrl: string;
  private readonly limiter: RateLimiter;
  private readonly timeoutMs: number;
  private readonly doFetch: typeof fetch;

  constructor(opts: ClientOptions) {
    this.opts = opts;
    this.environment = detectEnvironment(opts.apiKey ?? "");
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.limiter = new RateLimiter(opts.ratePerMinute ?? 60, opts.rateBurst ?? 15);
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.doFetch = opts.fetchImpl ?? fetch;
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
      const known = new Set([...tool.pathParams, ...tool.queryParams, ...tool.bodyProps, "confirm"]);
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

    // The API rejects any POST without an Idempotency-Key with a 400, so we always
    // generate one rather than relying on the caller. Exemptions are in curation.ts.
    let idempotencyKey: string | undefined;
    if (tool.needsIdempotency) {
      idempotencyKey = opts.idempotencyKey ?? randomUUID();
      headers["Idempotency-Key"] = idempotencyKey;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";

    // 409 means an identical request is still in flight; the gateway asks for a 1s
    // pause. Anything else is returned to the caller for interpretation.
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
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if ((err as Error)?.name === "AbortError") {
          throw new GravvApiError(`Request to ${tool.name} timed out after ${this.timeoutMs}ms`, 408, null);
        }
        throw new GravvApiError(`Network error calling ${tool.name}: ${(err as Error).message}`, 0, null);
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
        return { data, idempotencyKey, replayed, status: res.status };
      }

      const apiMessage = extractErrorMessage(parsed, res.statusText);

      if (res.status === 409 && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 1);
        await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
        lastError = new GravvApiError(apiMessage, 409, parsed);
        continue;
      }

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 6);
        await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
        lastError = new GravvApiError(String(apiMessage), 429, parsed);
        continue;
      }

      throw new GravvApiError(apiMessage, res.status, parsed, hintFor(res.status, tool, apiMessage));
    }

    throw lastError ?? new GravvApiError(`${tool.name} failed after ${maxAttempts} attempts`, 500, null);
  }
}

/**
 * Normalise the gateway's error field into a readable string.
 *
 * The shape is not consistent across statuses — verified against sandbox:
 *   400 -> {"data":null,"error":"missing idempotency key in request headers"}
 *   422 -> {"data":null,"error":{"code":"idempotency_key_reused","message":"..."}}
 *
 *
 * Naively stringifying the second form yields "[object Object]", which tells the model
 * nothing and sends it guessing.
 */
export function extractErrorMessage(parsed: unknown, fallback: string): string {
  if (parsed == null) return fallback;
  if (typeof parsed === "string") return parsed || fallback;
  if (typeof parsed !== "object") return String(parsed);

  const err = (parsed as Record<string, unknown>).error ?? (parsed as Record<string, unknown>).message;

  if (typeof err === "string" && err) return err;

  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const message = typeof e.message === "string" ? e.message : undefined;
    const code = typeof e.code === "string" ? e.code : undefined;
    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return code;
    return JSON.stringify(err);
  }

  return fallback;
}

/**
 * Turn the statuses merchants actually hit into something actionable.
 *
 * `message` is consulted so the hint does not contradict the API. A 400 saying
 * "missing field `client_reference`" needs no speculation about idempotency headers —
 * guessing there sends the model chasing the wrong thing.
 */
function hintFor(status: number, tool: GeneratedTool, message = ""): string | undefined {
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
    case 400:
      if (isStatePrecondition) {
        return "This is a state precondition, not a malformed request — the payload may be perfectly valid. Something must happen first: the customer may need KYC (getCustomerKycStatus), the account may need funding (getAccount), or a recipient may still be pending rather than active (getExternalAccount). Search the docs for the flow if the ordering is unclear.";
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
    case 422:
      return "This idempotency key was already used with a different payload. Retrying the same operation must reuse the key with an identical body; a genuinely new operation needs a new key.";
    case 429:
      return "Rate limited. The client throttles locally, so repeated 429s suggest the configured ceiling is above the real one — lower GRAVV_RATE_PER_MINUTE.";
    default:
      return undefined;
  }
}
