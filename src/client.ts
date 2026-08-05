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
 * request reaches. `grvSec_sandbox_` / `grvSec_live_` prefixes are read by the gateway
 * at api-gateway/src/internal/utils/grpc-services.go:41.
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
 * NOTE: the ceiling is genuinely ambiguous upstream. throttler.go:15 configures
 * rate.Limit(15/60) with burst 30; its own comment says 5/min; the published docs say
 * 10/min. We default to the published figure — the one merchants are told to expect —
 * and allow an override. Revisit once the real number is settled.
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
  apiKey: string;
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
    this.environment = detectEnvironment(opts.apiKey);
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.limiter = new RateLimiter(opts.ratePerMinute ?? 10, opts.rateBurst ?? 10);
    this.timeoutMs = opts.timeoutMs ?? 30_000;
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
      "Api-Key": this.opts.apiKey,
      Accept: "application/json",
      "User-Agent": "gravv-mcp",
    };

    // The gateway rejects any POST without an Idempotency-Key with a 400
    // (middleware/idempotency.go:587), so we always generate one rather than relying
    // on the caller. Exemptions are encoded in curation.ts.
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

      const apiMessage =
        (parsed && typeof parsed === "object" && (parsed.error ?? parsed.message)) || res.statusText;

      if (res.status === 409 && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 1);
        await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
        lastError = new GravvApiError(String(apiMessage), 409, parsed);
        continue;
      }

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 6);
        await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
        lastError = new GravvApiError(String(apiMessage), 429, parsed);
        continue;
      }

      throw new GravvApiError(String(apiMessage), res.status, parsed, hintFor(res.status, tool));
    }

    throw lastError ?? new GravvApiError(`${tool.name} failed after ${maxAttempts} attempts`, 500, null);
  }
}

/** Turn the statuses merchants actually hit into something actionable. */
function hintFor(status: number, tool: GeneratedTool): string | undefined {
  switch (status) {
    case 400:
      return tool.needsIdempotency
        ? "A 400 on a POST often means a missing or malformed Idempotency-Key. The client generates one automatically, so check the request body against the tool schema."
        : "Check the request against the tool's input schema — a required field is likely missing.";
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
