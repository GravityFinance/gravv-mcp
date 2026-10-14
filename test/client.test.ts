import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GravvClient,
  GravvApiError,
  RateLimiter,
  bodyWithoutHtml,
  canonicalJson,
  errorFields,
  extractErrorMessage,
  hintFor,
  isOutcomeUnknown,
  retryAfterMs,
} from "../src/client.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

/** Records what the client sent and replays canned responses. */
function stub(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: any; raw?: string }> =
    [];
  let i = 0;
  const fetchImpl = (async (url: any, init: any) => {
    calls.push({
      url: String(url),
      method: init.method,
      headers: { ...init.headers }, // a copy: the client may change a header between attempts
      body: init.body ? JSON.parse(init.body) : undefined,
      raw: init.body,
    });
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), {
      status: r.status,
      headers: r.headers ?? {},
    });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

/** Every retry wait the clients below asked for, in ms. No test waits for real. */
let waits: number[] = [];

/** A fetch that records the headers it was given, then fails the way `err` says. */
function failing(err: Error) {
  const calls: Array<{ headers: Record<string, string> }> = [];
  const fetchImpl = (async (_url: any, init: any) => {
    calls.push({ headers: { ...init.headers } });
    throw err;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const abortError = () => Object.assign(new Error("This operation was aborted"), { name: "AbortError" });

const client = (fetchImpl: typeof fetch, apiKey = "grvSec_sandbox_test") =>
  new GravvClient({
    apiKey,
    fetchImpl,
    ratePerMinute: 100_000,
    rateBurst: 100_000,
    sleep: async (ms) => {
      waits.push(ms);
    },
  });

const createCustomer = TOOLS_BY_NAME.get("createCustomer")!;
const getAccount = TOOLS_BY_NAME.get("getAccount")!;
const listTransactions = TOOLS_BY_NAME.get("listTransactions")!;
const updateCustomer = TOOLS_BY_NAME.get("updateCustomer")!;

describe("request building", () => {
  test("substitutes path parameters", () => {
    const { fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    const { url } = client(fetchImpl).buildRequest(getAccount, { account_id: "acc_123" });
    assert.equal(url, "https://api.gravv.xyz/v1/accounts/acc_123");
  });

  test("url-encodes path values", () => {
    const { fetchImpl } = stub([{ status: 200 }]);
    const { url } = client(fetchImpl).buildRequest(getAccount, { account_id: "a/b c" });
    assert.ok(url.endsWith("/v1/accounts/a%2Fb%20c"), url);
  });

  test("throws a clear error when a path parameter is missing", () => {
    const { fetchImpl } = stub([{ status: 200 }]);
    assert.throws(
      () => client(fetchImpl).buildRequest(getAccount, {}),
      (e: Error) => e instanceof GravvApiError && /account_id/.test(e.message),
    );
  });

  test("appends query parameters and omits empty ones", () => {
    const { fetchImpl } = stub([{ status: 200 }]);
    const { url } = client(fetchImpl).buildRequest(listTransactions, { page: 2, status: "" });
    assert.match(url, /[?&]page=2/);
    assert.doesNotMatch(url, /status=/);
  });

  test("writes an identifier declared in both path and body to both places", () => {
    // PUT /v1/customers/{customer_id} declares customer_id in the path AND requires it
    // in the body; the gateway uses the path value. One argument, two homes.
    const { fetchImpl } = stub([{ status: 200 }]);
    const { url, body } = client(fetchImpl).buildRequest(updateCustomer, {
      customer_id: "cus_1",
      first_name: "Jane",
    });
    assert.ok(url.endsWith("/v1/customers/cus_1"), url);
    assert.equal((body as any).customer_id, "cus_1");
    assert.equal((body as any).first_name, "Jane");
  });

  test("keeps the confirm flag out of the request body", () => {
    const { fetchImpl } = stub([{ status: 200 }]);
    const { body } = client(fetchImpl).buildRequest(TOOLS_BY_NAME.get("createTransfer")!, {
      amount: 5,
      confirm: true,
    });
    assert.equal("confirm" in (body as object), false, "confirm is an MCP concern, not an API field");
  });

  test("a new settlement instruction's currency is sent in upper case; the list filter is not", () => {
    const { fetchImpl } = stub([{ status: 200 }]);
    const c = client(fetchImpl);
    const args = { instruction_type: "bank_account", account_name: "Acme", currency: "usd" };
    const { body } = c.buildRequest(TOOLS_BY_NAME.get("createSettlementInstruction")!, args);
    assert.equal((body as any).currency, "USD");
    assert.equal(args.currency, "usd", "the caller's arguments are not changed");
    const { url } = c.buildRequest(TOOLS_BY_NAME.get("listSettlementInstructions")!, { currency: "usd" });
    assert.match(url, /currency=usd/);
  });
});

describe("auth and idempotency", () => {
  test("sends the Api-Key header", async () => {
    const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    await client(fetchImpl).call(getAccount, { account_id: "a" });
    assert.equal(calls[0]!.headers["Api-Key"], "grvSec_sandbox_test");
  });

  test("generates an Idempotency-Key for POSTs", async () => {
    const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    const res = await client(fetchImpl).call(createCustomer, { body: { email: "a@b.c" } });
    const sent = calls[0]!.headers["Idempotency-Key"];
    assert.ok(sent, "POST must carry an Idempotency-Key — the gateway 400s without one");
    assert.equal(res.idempotencyKey, sent, "the key used is returned for tracing");
  });

  test("does not send an Idempotency-Key on GETs", async () => {
    const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    await client(fetchImpl).call(getAccount, { account_id: "a" });
    assert.equal(calls[0]!.headers["Idempotency-Key"], undefined);
  });

  test("reuses a caller-supplied key instead of generating one", async () => {
    const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    await client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey: "fixed-key" });
    assert.equal(calls[0]!.headers["Idempotency-Key"], "fixed-key");
  });

  test("a caller's idempotency_key goes in the header, never in the body", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["createTransfer", { amount: 5, source: { id: "acc_1" }, idempotency_key: "k-inline" }],
      ["createCustomer", { body: { email: "a@b.c" }, idempotency_key: "k-wrapped" }],
      ["submitAccountApplication", { id: "app_1", idempotency_key: "k-none" }],
    ];
    for (const [name, args] of cases) {
      const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
      const key = args.idempotency_key as string;
      const res = await client(fetchImpl).call(TOOLS_BY_NAME.get(name)!, args, { idempotencyKey: key });
      assert.equal(calls[0]!.headers["Idempotency-Key"], key, name);
      assert.equal(res.idempotencyKey, key, name);
      assert.equal(JSON.stringify(calls[0]!.body ?? {}).includes("idempotency_key"), false, `${name} body`);
    }
  });

  test("a key the gateway would refuse is refused before any request", async () => {
    for (const bad of ["x".repeat(256), "line\nbreak", ""]) {
      const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
      await assert.rejects(
        client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey: bad }),
        (e: GravvApiError) => e.status === 400 && /printable ASCII/.test(e.message),
      );
      assert.equal(calls.length, 0, `no request for ${JSON.stringify(bad).slice(0, 20)}`);
    }
  });

  test("verifyExternalAccount is exempt from idempotency", async () => {
    const { calls, fetchImpl } = stub([{ status: 200, body: { data: {} } }]);
    await client(fetchImpl).call(TOOLS_BY_NAME.get("verifyExternalAccount")!, { body: {} });
    assert.equal(calls[0]!.headers["Idempotency-Key"], undefined);
  });

  test("surfaces a replayed response as such", async () => {
    const { fetchImpl } = stub([
      { status: 200, body: { data: { id: "cus_1" } }, headers: { "Idempotency-Replayed": "true" } },
    ]);
    const res = await client(fetchImpl).call(createCustomer, { body: {} });
    assert.equal(res.replayed, true, "a replay must be distinguishable from a fresh execution");
  });
});

describe("request bodies are serialised the same way every time", () => {
  test("the same arguments in another order give the same bytes", async () => {
    const transfer = TOOLS_BY_NAME.get("createTransfer")!;
    const a = {
      amount: 5,
      client_reference: "inv-114",
      source: { id: "acc_1", currency: "USD" },
      destination: { type: "external_account", id: "ext_1" },
      meta: [{ b: 1, a: 2 }],
    };
    const b = {
      meta: [{ a: 2, b: 1 }],
      destination: { id: "ext_1", type: "external_account" },
      source: { currency: "USD", id: "acc_1" },
      client_reference: "inv-114",
      amount: 5,
    };
    const first = stub([{ status: 200, body: { data: {} } }]);
    const second = stub([{ status: 200, body: { data: {} } }]);
    await client(first.fetchImpl).call(transfer, a, { idempotencyKey: "same" });
    await client(second.fetchImpl).call(transfer, b, { idempotencyKey: "same" });
    assert.equal(first.calls[0]!.raw, second.calls[0]!.raw);
  });

  test("canonicalJson sorts keys at every depth and keeps array order", () => {
    assert.equal(
      canonicalJson({ b: [3, 1, { d: 1, c: 2 }], a: { z: null, y: "x" } }),
      '{"a":{"y":"x","z":null},"b":[3,1,{"c":2,"d":1}]}',
    );
    assert.equal(canonicalJson({ a: undefined, b: 1 }), '{"b":1}');
  });
});

describe("response handling", () => {
  test("unwraps the { data, error } envelope", async () => {
    const { fetchImpl } = stub([{ status: 200, body: { data: { id: "acc_1" }, error: null } }]);
    const res = await client(fetchImpl).call(getAccount, { account_id: "a" });
    assert.deepEqual(res.data, { id: "acc_1" });
  });

  test("raises the envelope's error string on failure", async () => {
    const { fetchImpl } = stub([{ status: 400, body: { data: null, error: "invalid request payload" } }]);
    await assert.rejects(
      client(fetchImpl).call(getAccount, { account_id: "a" }),
      (e: GravvApiError) => e.status === 400 && e.message === "invalid request payload",
    );
  });

  test("attaches an actionable hint for 422 idempotency conflicts", async () => {
    const { fetchImpl } = stub([
      {
        status: 422,
        body: { data: null, error: { code: "idempotency_key_reused", message: "Key reused with a different payload" } },
      },
    ]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) =>
        /different body/.test(e.hint ?? "") &&
        /exactly the same arguments/.test(e.hint ?? "") &&
        /leave idempotency_key out/.test(e.hint ?? ""),
    );
  });

  test("a 422 limit breach is not blamed on idempotency", async () => {
    const { fetchImpl } = stub([
      {
        status: 422,
        body: { data: null, error: "daily limit exceeded", code: "ERROR_CODE_DAILY_LIMIT_EXCEEDED", window: "daily" },
      },
    ]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => /sender limit/.test(e.hint ?? "") && !/idempotency key/i.test(e.hint ?? ""),
    );
  });

  test("a Dashboard-only 403 names the Dashboard", async () => {
    const { fetchImpl } = stub([{ status: 403, body: { error: "forbidden" } }]);
    await assert.rejects(
      client(fetchImpl).call(getAccount, { account_id: "a" }),
      (e: GravvApiError) => /Gravv Dashboard/.test(e.hint ?? "") && !/approvals/.test(e.hint ?? ""),
    );
  });
});

describe("errors keep the idempotency key", () => {
  const transfer = TOOLS_BY_NAME.get("createTransfer")!;

  test("a timeout returns the key that was sent", async () => {
    const { calls, fetchImpl } = failing(abortError());
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.equal(e.status, 408);
      assert.ok(e.idempotencyKey);
      assert.equal(e.idempotencyKey, calls[0]!.headers["Idempotency-Key"]);
      return true;
    });
  });

  test("a network error returns the key that was sent", async () => {
    const { calls, fetchImpl } = failing(new TypeError("fetch failed"));
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.equal(e.status, 0);
      assert.equal(e.idempotencyKey, calls[0]!.headers["Idempotency-Key"]);
      return true;
    });
  });

  test("an API error returns the key that was sent", async () => {
    const { calls, fetchImpl } = stub([{ status: 400, body: { data: null, error: "bad" } }]);
    await assert.rejects(
      client(fetchImpl).call(transfer, { amount: 5 }, { idempotencyKey: "trace-me" }),
      (e: GravvApiError) => e.idempotencyKey === "trace-me" && calls[0]!.headers["Idempotency-Key"] === "trace-me",
    );
  });

  test("a GET error has no key", async () => {
    const { fetchImpl } = failing(abortError());
    await assert.rejects(
      client(fetchImpl).call(getAccount, { account_id: "a" }),
      (e: GravvApiError) => e.status === 408 && e.idempotencyKey === undefined,
    );
  });
});

describe("an unknown outcome says so and names the lookup", () => {
  const transfer = TOOLS_BY_NAME.get("createTransfer")!;
  const s2 =
    'unexpected HTTP status code received from server: 502 (Bad Gateway); transport: received unexpected content-type "text/html"\ndata: "<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body>\r\n<center><h1>502 Bad Gateway</h1></center>\r\n</body>\r\n</html>\r\n"';

  test("a timeout on a transfer", async () => {
    const { calls, fetchImpl } = failing(abortError());
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.equal(e.status, 408);
      assert.equal(e.outcomeUnknown, true);
      assert.equal(e.idempotencyKey, calls[0]!.headers["Idempotency-Key"]);
      assert.match(e.hint ?? "", /listTransactions/);
      assert.match(e.hint ?? "", /same arguments/);
      assert.ok((e.hint ?? "").includes(e.idempotencyKey!), "the hint quotes the key to resend under");
      assert.doesNotMatch(e.hint ?? "", /filtered by client_reference/);
      return true;
    });
    assert.equal(calls.length, 1, "a timeout is never retried automatically");
  });

  test("a network error on a transfer", async () => {
    const { fetchImpl } = failing(new TypeError("fetch failed"));
    await assert.rejects(
      client(fetchImpl).call(transfer, { amount: 5 }),
      (e: GravvApiError) => e.status === 0 && e.outcomeUnknown && /listTransactions/.test(e.hint ?? ""),
    );
  });

  test("a timeout on a read is safe to repeat", async () => {
    for (const [tool, args] of [
      [getAccount, { account_id: "a" }],
      [TOOLS_BY_NAME.get("getFxQuote")!, { pair: "USDC/NGN" }],
    ] as const) {
      const { fetchImpl } = failing(abortError());
      await assert.rejects(
        client(fetchImpl).call(tool, args),
        (e: GravvApiError) => !e.outcomeUnknown && /safe to call again/.test(e.hint ?? ""),
        tool.name,
      );
    }
  });

  test("a 5xx on a POST is not retried and says the answer is not kept", async () => {
    for (const status of [500, 502, 504]) {
      const { calls, fetchImpl } = stub([{ status, body: { data: null, error: "internal error" } }]);
      await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
        assert.equal(e.outcomeUnknown, true, String(status));
        assert.match(e.hint ?? "", /does not keep 5xx answers/);
        assert.match(e.hint ?? "", /listTransactions/);
        return true;
      });
      assert.equal(calls.length, 1, `${status} must not be resent blindly`);
    }
  });

  test("a 5xx on a read is a temporary fault", () => {
    assert.match(hintFor(503, getAccount, "unavailable") ?? "", /temporary fault/i);
  });

  test("a server fault answered as a 400 says to look it up and use a new key", async () => {
    const { fetchImpl } = stub([{ status: 400, body: { data: null, error: s2 } }]);
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.equal(e.outcomeUnknown, true);
      assert.match(e.hint ?? "", /server-side fault/);
      assert.match(e.hint ?? "", /kept for 24 hours/);
      assert.match(e.hint ?? "", /new key/);
      assert.match(e.hint ?? "", /same client_reference/);
      assert.doesNotMatch(e.hint ?? "", /state precondition/);
      return true;
    });
  });

  test("each server-fault wording is caught, and an ordinary 400 is not", () => {
    for (const msg of [
      "circuit breaker is open",
      "Internal Server Error",
      "service busy, please try again shortly",
      "failed to create payee",
    ]) {
      assert.equal(isOutcomeUnknown(400, transfer, msg), true, msg);
      assert.match(hintFor(400, transfer, msg) ?? "", /server-side fault/, msg);
    }
    assert.equal(isOutcomeUnknown(400, transfer, "missing field `amount`"), false);
    assert.equal(isOutcomeUnknown(422, transfer, "unprocessable"), false);
  });
});

describe("error fields", () => {
  test("lifts code, window and transfer_status from a transfer error", () => {
    assert.deepEqual(
      errorFields({
        data: null,
        error: "daily limit exceeded",
        code: "ERROR_CODE_DAILY_LIMIT_EXCEEDED",
        window: "daily",
        transfer_status: "paused",
        details: [{ field: "amount" }],
      }),
      {
        code: "ERROR_CODE_DAILY_LIMIT_EXCEEDED",
        window: "daily",
        transfer_status: "paused",
        details: [{ field: "amount" }],
      },
    );
  });

  test("reads fields from inside the error object", () => {
    assert.deepEqual(errorFields({ data: null, error: { reason: "forbidden", required_any: ["account:create"] } }), {
      required_any: ["account:create"],
    });
    assert.deepEqual(
      errorFields({ data: null, error: { code: "request_body_too_large", message: "too big", limit: 13997400 } }),
      { code: "request_body_too_large", limit: 13997400 },
    );
  });

  test("an empty or odd body has no fields", () => {
    for (const body of [null, "text", {}, { error: "bad" }]) assert.deepEqual(errorFields(body), {});
  });
});

describe("a replayed error is flagged", () => {
  for (const [status, body] of [
    [400, { data: null, error: "missing field `client_reference`" }],
    [422, { data: null, error: { code: "idempotency_key_reused", message: "reused" } }],
  ] as const) {
    test(`a stored ${status}`, async () => {
      const { fetchImpl } = stub([{ status, body, headers: { "Idempotency-Replayed": "true" } }]);
      await assert.rejects(
        client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey: "old" }),
        (e: GravvApiError) => e.replayed && /^This is the stored answer/.test(e.hint ?? ""),
      );
    });
  }

  test("a stored server fault still says to look the result up before any resend", async () => {
    const { fetchImpl } = stub([
      {
        status: 400,
        body: { data: null, error: "unexpected HTTP status code received from server: 502 (Bad Gateway)" },
        headers: { "Idempotency-Replayed": "true" },
      },
    ]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey: "old" }),
      (e: GravvApiError) =>
        e.replayed &&
        e.outcomeUnknown &&
        /^This is the stored answer/.test(e.hint ?? "") &&
        !/Fix the request/.test(e.hint ?? "") &&
        /Look the result up first/.test(e.hint ?? ""),
    );
  });

  test("a fresh error is not", async () => {
    const { fetchImpl } = stub([{ status: 400, body: { data: null, error: "bad" } }]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => !e.replayed && !/stored answer/.test(e.hint ?? ""),
    );
  });
});

describe("error message extraction", () => {
  // The gateway's `error` field is not one shape. Both of these are real sandbox
  // responses; stringifying the second naively produced "[object Object]", which told
  // the model nothing and sent it guessing at the payload.
  test("handles the string form (observed on 400)", () => {
    assert.equal(
      extractErrorMessage({ data: null, error: "missing idempotency key in request headers" }, "fallback"),
      "missing idempotency key in request headers",
    );
  });

  test("handles the object form (observed on 422)", () => {
    assert.equal(
      extractErrorMessage(
        {
          data: null,
          error: {
            code: "idempotency_key_reused",
            message: "Idempotency-Key was previously used with a different request payload",
          },
        },
        "fallback",
      ),
      "Idempotency-Key was previously used with a different request payload (idempotency_key_reused)",
    );
  });

  test("never yields [object Object] for an unexpected error shape", () => {
    for (const shape of [{ error: { detail: "odd" } }, { error: {} }, { error: 42 }, {}, null]) {
      const msg = extractErrorMessage(shape, "fallback");
      assert.doesNotMatch(msg, /\[object Object\]/, `leaked for ${JSON.stringify(shape)}`);
      assert.ok(msg.length > 0);
    }
  });

  test("keeps the text of a service_unavailable answer", () => {
    assert.equal(
      extractErrorMessage({ error: "service_unavailable", message: "failed to read request body" }, "fallback"),
      "failed to read request body (service_unavailable)",
    );
  });

  test("names the permission a scoped key lacks", () => {
    assert.equal(
      extractErrorMessage(
        { data: null, error: { reason: "forbidden", required_any: ["transfer:initiate", "transfer:admin"] } },
        "Forbidden",
      ),
      "forbidden: this key needs one of transfer:initiate, transfer:admin",
    );
  });

  test("cuts an HTML error page out of the message and the details", () => {
    const raw =
      'unexpected HTTP status code received from server: 502 (Bad Gateway); transport: received unexpected content-type "text/html"\ndata: "<html>\r\n<head><title>502 Bad Gateway</title></head></html>"';
    const msg = extractErrorMessage({ data: null, error: raw }, "fallback");
    assert.doesNotMatch(msg, /<html/i);
    assert.match(msg, /^unexpected HTTP status code received from server: 502/);
    assert.match(msg, /HTML error page omitted/);
    assert.doesNotMatch(JSON.stringify(bodyWithoutHtml({ data: null, error: raw })), /<html/i);
    assert.equal(
      extractErrorMessage("<html><head><title>504 Gateway Time-out</title></head></html>", "x"),
      "504 Gateway Time-out (HTML error page omitted)",
    );
  });

  test("falls back to the HTTP status text when there is no error field", () => {
    assert.equal(extractErrorMessage({ data: {} }, "Bad Gateway"), "Bad Gateway");
  });

  test("surfaces the object form through a real call", async () => {
    const { fetchImpl } = stub([
      {
        status: 422,
        body: { data: null, error: { code: "idempotency_key_reused", message: "Key reused with a different payload" } },
      },
    ]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => e.message === "Key reused with a different payload (idempotency_key_reused)",
    );
  });
});

const inFlightBody = {
  data: null,
  error: {
    code: "idempotency_in_flight",
    message: "A request with the same Idempotency-Key is currently being processed",
  },
};

describe("retries", () => {
  test("retries a 409 in-flight conflict with the same key, then succeeds", async () => {
    waits = [];
    const { calls, fetchImpl } = stub([
      { status: 409, body: inFlightBody, headers: { "Retry-After": "1" } },
      { status: 200, body: { data: { ok: true } } },
    ]);
    const res = await client(fetchImpl).call(createCustomer, { body: {} });
    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.headers["Idempotency-Key"], calls[1]!.headers["Idempotency-Key"]);
    assert.deepEqual(res.data, { ok: true });
    assert.deepEqual(waits, [1000], "the wait goes through the injected sleep");
  });

  test("retries a transfer still in progress with the same key", async () => {
    const { calls, fetchImpl } = stub([
      {
        status: 409,
        body: {
          data: null,
          error: "a transfer with this client_reference is still being processed; retry shortly",
          code: "ERROR_CODE_TRANSFER_IN_PROGRESS",
        },
        headers: { "Retry-After": "1" },
      },
      { status: 200, body: { data: { transfer_id: "trf_1" } } },
    ]);
    await client(fetchImpl).call(TOOLS_BY_NAME.get("createTransfer")!, { amount: 5 });
    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.headers["Idempotency-Key"], calls[1]!.headers["Idempotency-Key"]);
  });

  test("gives up after repeated in-flight 409s rather than looping", async () => {
    const { calls, fetchImpl } = stub([{ status: 409, body: inFlightBody }]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => /still running/.test(e.hint ?? "") && /same arguments and idempotency_key/.test(e.hint ?? ""),
    );
    assert.equal(calls.length, 3);
  });

  test("a stored 409 is final at once", async () => {
    for (const body of [
      {
        data: null,
        error: "client_reference has already been used for a different transfer",
        code: "ERROR_CODE_DUPLICATE_TRANSACTION",
      },
      { data: null, error: "already exists" },
    ]) {
      const { calls, fetchImpl } = stub([{ status: 409, body }]);
      await assert.rejects(client(fetchImpl).call(TOOLS_BY_NAME.get("createTransfer")!, { amount: 5 }));
      assert.equal(calls.length, 1, JSON.stringify(body));
    }
  });

  test("a rate-limited POST is retried under a new key", async () => {
    waits = [];
    const { calls, fetchImpl } = stub([
      { status: 429, body: { data: null, error: "Too many request" } },
      { status: 200, body: { data: { ok: true } } },
    ]);
    const res = await client(fetchImpl).call(createCustomer, { body: {} });
    assert.equal(calls.length, 2);
    const [first, second] = calls.map((c) => c.headers["Idempotency-Key"]);
    assert.ok(first && second);
    assert.notEqual(first, second, "the 429 is stored under the first key, so a same-key retry gets it back");
    assert.equal(res.idempotencyKey, second, "the result names the key that ran");
    assert.equal(res.retriedWithNewKey, true);
    assert.deepEqual(waits, [6000], "the limiter sends no Retry-After, so the default wait applies");
  });

  test("a caller's key that gets a 429 is not swapped or retried", async () => {
    const { calls, fetchImpl } = stub([{ status: 429, body: { data: null, error: "Too many request" } }]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey: "mine" }),
      (e: GravvApiError) =>
        e.status === 429 && /Look the result up first/.test(e.hint ?? "") && /without idempotency_key/.test(e.hint ?? ""),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.headers["Idempotency-Key"], "mine");
  });

  test("a 429 a service sent is not retried on a keyed POST", async () => {
    for (const idempotencyKey of [undefined, "mine"]) {
      const { calls, fetchImpl } = stub([{ status: 429, body: { data: null, error: "quota exhausted" } }]);
      await assert.rejects(
        client(fetchImpl).call(createCustomer, { body: {} }, { idempotencyKey }),
        (e: GravvApiError) =>
          e.status === 429 &&
          /after it reached it/.test(e.hint ?? "") &&
          /Look the result up first/.test(e.hint ?? "") &&
          !/Rate limited by the gateway/.test(e.hint ?? ""),
      );
      assert.equal(calls.length, 1);
    }
  });

  test("a POST that stays rate limited says it already retried with a new key", async () => {
    const { calls, fetchImpl } = stub([{ status: 429, body: { data: null, error: "Too many request" } }]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => /already retried with a new key/.test(e.hint ?? ""),
    );
    assert.equal(calls.length, 3);
    assert.equal(new Set(calls.map((c) => c.headers["Idempotency-Key"])).size, 3);
  });

  test("a rate-limited GET is retried, with no key", async () => {
    const { calls, fetchImpl } = stub([
      { status: 429, body: { data: null, error: "Too many request" } },
      { status: 200, body: { data: {} } },
    ]);
    const res = await client(fetchImpl).call(getAccount, { account_id: "a" });
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.headers["Idempotency-Key"], undefined);
    assert.equal(res.retriedWithNewKey, false);
  });

  test("does not retry a 400 — the request is wrong, not unlucky", async () => {
    const { calls, fetchImpl } = stub([{ status: 400, body: { error: "bad" } }]);
    await assert.rejects(client(fetchImpl).call(createCustomer, { body: {} }));
    assert.equal(calls.length, 1);
  });
});

describe("Retry-After", () => {
  test("reads delta-seconds", () => {
    assert.equal(retryAfterMs("2", 1), 2000);
  });

  test("reads an HTTP-date", () => {
    const now = Date.parse("2026-10-14T12:00:00Z");
    assert.equal(retryAfterMs(new Date(now + 3000).toUTCString(), 1, now), 3000);
  });

  test("falls back to the default when unreadable or absent", () => {
    assert.equal(retryAfterMs("soon", 6), 6000);
    assert.equal(retryAfterMs(null, 1), 1000);
  });

  test("is capped at 30 s and never negative", () => {
    assert.equal(retryAfterMs("999", 1), 30_000);
    assert.equal(retryAfterMs(new Date(Date.now() - 60_000).toUTCString(), 1), 0);
  });

  test("the client waits what the header asks", async () => {
    waits = [];
    const { fetchImpl } = stub([
      { status: 409, body: inFlightBody, headers: { "Retry-After": "2" } },
      { status: 200, body: { data: {} } },
    ]);
    await client(fetchImpl).call(createCustomer, { body: {} });
    assert.deepEqual(waits, [2000]);
  });
});

describe("rate limiter", () => {
  test("hands out the burst immediately then throttles", async () => {
    const limiter = new RateLimiter(60, 2);
    const started = Date.now();
    await limiter.take();
    await limiter.take();
    assert.ok(Date.now() - started < 50, "burst should not block");

    await limiter.take(); // third must wait ~1s at 60/min
    assert.ok(Date.now() - started >= 900, `expected throttling, waited ${Date.now() - started}ms`);
  });
});

describe("hints distinguish malformed requests from state preconditions", () => {
  // Measured against sandbox: a crypto transfer to an unverified customer returns
  // 400 "Customer has no KYC". Telling the model to check its schema there sends it
  // editing fields that were already correct.
  const hintFor = async (status: number, error: string) => {
    const { fetchImpl } = stub([{ status, body: { data: null, error } }]);
    try {
      await client(fetchImpl).call(createCustomer, { body: {} });
      return "";
    } catch (e) {
      return (e as GravvApiError).hint ?? "";
    }
  };

  test("a business precondition is named as such", async () => {
    for (const msg of ["Customer has no KYC", "insufficient balance", "account is inactive"]) {
      const h = await hintFor(400, msg);
      assert.match(h, /state precondition/i, `wrong hint for "${msg}"`);
      assert.match(h, /getCustomer\b/, `the KYC pointer must be getCustomer for "${msg}"`);
      assert.doesNotMatch(h, /getCustomerKycStatus/);
      assert.doesNotMatch(h, /Idempotency-Key/, `must not blame idempotency for "${msg}"`);
    }
  });

  test("a malformed body points at the named field", async () => {
    const h = await hintFor(400, "missing field `client_reference` at line 1 column 290");
    assert.match(h, /rejected the request body/i);
    assert.doesNotMatch(h, /state precondition/i);
  });

  test("an idempotency 400 still blames idempotency", async () => {
    assert.match(await hintFor(400, "missing idempotency key in request headers"), /Idempotency-Key/);
  });
});

describe("422 hints follow the error code", () => {
  const transfer = TOOLS_BY_NAME.get("createTransfer")!;
  const hint = (body: unknown) => hintFor(422, transfer, "", body) ?? "";

  test("each transfer code gets its own next step", () => {
    assert.match(hint({ error: "blocked", code: "ERROR_CODE_SUBJECT_BLOCKED" }), /not permitted for this sender/);
    assert.match(hint({ error: "info", code: "ERROR_CODE_REMITTER_INFORMATION_REQUIRED" }), /additional_information/);
    assert.match(
      hint({ error: "doc", code: "ERROR_CODE_SUPPORTING_DOCUMENT_REQUIRED" }),
      /supporting_document_ids/,
    );
    for (const code of ["ERROR_CODE_LIMIT_EXCEEDED", "ERROR_CODE_ANNUAL_LIMIT_EXCEEDED"]) {
      assert.match(hint({ error: "limit", code }), /sender limit/);
    }
  });

  test("a 422 with no known code is not blamed on idempotency", () => {
    const h = hint({ error: "unprocessable" });
    assert.match(h, /not an idempotency problem/);
  });
});

describe("hints by status", () => {
  const transfer = TOOLS_BY_NAME.get("createTransfer")!;
  const card = TOOLS_BY_NAME.get("createCard")!;

  test("a scoped key's 403 names the permission", () => {
    const h = hintFor(403, transfer, "", {
      data: null,
      error: { reason: "forbidden", required_any: ["transfer:initiate"] },
    });
    assert.match(h ?? "", /scoped/);
    assert.match(h ?? "", /transfer:initiate/);
  });

  test("a route that takes no API key says so", () => {
    const body = {
      data: null,
      error: { reason: "forbidden", required_any: ["admin"], reason_detail: "api_key_not_accepted_on_admin_routes" },
    };
    assert.match(hintFor(403, transfer, "", body) ?? "", /does not accept API keys/);
  });

  test("a feature gate names the feature, where to ask and the request id", () => {
    const h = hintFor(403, card, "", {
      error: {
        code: "feature_access_required",
        message: "Your business does not have access to card_issuing.",
        feature: "card_issuing",
        access_status: "none",
        request_access_url: "/v1/feature-access/requests",
        request_id: "req_9",
      },
    });
    assert.match(h ?? "", /card_issuing/);
    assert.match(h ?? "", /\/v1\/feature-access\/requests/);
    assert.match(h ?? "", /req_9/);
    for (const [code, re] of [
      ["feature_access_pending", /under review/],
      ["feature_access_action_required", /more information/],
      ["feature_access_rejected", /apply again after 2026-11-01/],
      ["feature_access_suspended", /suspended/],
    ] as const) {
      assert.match(hintFor(403, card, "", { error: { code, reapply_after: "2026-11-01" } }) ?? "", re, code);
    }
  });

  test("any other 403 says retrying will not help", () => {
    assert.match(hintFor(403, transfer, "", { error: "nope" }) ?? "", /retrying will not help/);
  });

  test("a duplicate client_reference is told not to resend", () => {
    const h = hintFor(409, transfer, "", {
      error: "client_reference has already been used for a different transfer",
      code: "ERROR_CODE_DUPLICATE_TRANSACTION",
    });
    assert.match(h ?? "", /client_reference/);
    assert.match(h ?? "", /different transfer/);
    assert.match(h ?? "", /Do not send again/);
    assert.match(h ?? "", /listTransactions/);
    assert.doesNotMatch(h ?? "", /use the existing transfer/i);
  });

  test("a conflict says to read again, and any other 409 to look it up", () => {
    assert.match(hintFor(409, transfer, "", { error: "x", code: "ERROR_CODE_CONFLICT" }) ?? "", /Read it again/);
    assert.match(hintFor(409, card, "", { error: "exists" }) ?? "", /Already exists/);
  });

  test("an ended pause says to start a new transfer", () => {
    for (const code of ["ERROR_CODE_TRANSFER_PAUSE_EXPIRED", "ERROR_CODE_TRANSFER_PAUSE_CANCELLED"]) {
      assert.match(hintFor(410, transfer, "", { error: "ended", code }) ?? "", /new client_reference/, code);
    }
  });

  test("both 413 shapes get the real size limit", () => {
    const upload = TOOLS_BY_NAME.get("uploadCustomerKycDocument")!;
    for (const body of [
      {
        error: {
          code: "request_body_too_large",
          message: "Request body exceeds the maximum allowed size",
          limit: 13997400,
        },
      },
      { data: null, error: "the uploaded file is too large — the maximum is 10MB" },
    ]) {
      assert.match(hintFor(413, upload, "", body) ?? "", /under 500 KB/);
    }
  });

  test("a 501 says not to retry", async () => {
    const { fetchImpl } = stub([{ status: 501, body: { data: null, error: "not implemented" } }]);
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.match(e.hint ?? "", /not available in this environment/);
      assert.equal(e.outcomeUnknown, false);
      return true;
    });
  });

  test("a 503 limits outage says the transfer was not created", async () => {
    const { fetchImpl } = stub([
      {
        status: 503,
        body: {
          data: null,
          error: "transfer limits are temporarily unavailable, please retry",
          code: "ERROR_CODE_LIMITS_UNAVAILABLE",
        },
      },
    ]);
    await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
      assert.match(e.hint ?? "", /transfer was not created/);
      assert.equal(e.outcomeUnknown, false);
      return true;
    });
  });

  test("a 503 or 504 from before the request ran says so", async () => {
    for (const [status, body] of [
      [503, { error: "service_unavailable", message: "failed to read request body" }],
      [503, { data: null, error: "auth service unavailable" }],
      [504, { data: null, error: "auth validation timed out" }],
    ] as const) {
      const { fetchImpl } = stub([{ status, body }]);
      await assert.rejects(client(fetchImpl).call(transfer, { amount: 5 }), (e: GravvApiError) => {
        assert.match(e.hint ?? "", /refused before it ran/, JSON.stringify(body));
        assert.equal(e.outcomeUnknown, false);
        return true;
      });
    }
  });

  test("any other 504 on a write is an unknown outcome", async () => {
    const { fetchImpl } = stub([{ status: 504, body: { data: null, error: "deadline exceeded" } }]);
    await assert.rejects(
      client(fetchImpl).call(transfer, { amount: 5 }),
      (e: GravvApiError) => e.outcomeUnknown && /does not keep 5xx answers/.test(e.hint ?? ""),
    );
  });
});

describe("429 hint", () => {
  test("states the gateway limit instead of blaming the local ceiling", () => {
    const h = hintFor(429, TOOLS_BY_NAME.get("listTransactions")!, "Too many request") ?? "";
    assert.match(h, /600 requests a minute/);
    assert.doesNotMatch(h, /lower GRAVV_RATE_PER_MINUTE/);
  });
});
