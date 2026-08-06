import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GravvClient, GravvApiError, RateLimiter, extractErrorMessage } from "../src/client.ts";
import { TOOLS_BY_NAME } from "../src/generated/tools.ts";

/** Records what the client sent and replays canned responses. */
function stub(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: any }> = [];
  let i = 0;
  const fetchImpl = (async (url: any, init: any) => {
    calls.push({
      url: String(url),
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), {
      status: r.status,
      headers: r.headers ?? {},
    });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const client = (fetchImpl: typeof fetch, apiKey = "grvSec_sandbox_test") =>
  new GravvClient({ apiKey, fetchImpl, ratePerMinute: 100_000, rateBurst: 100_000 });

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
    // in the body; the docs note the path value is cosmetic. One argument, two homes.
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
    assert.equal(res.idempotencyKey, sent, "the key used must be returned so a retry can reuse it");
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
    const { fetchImpl } = stub([{ status: 422, body: { error: "idempotency key reused" } }]);
    await assert.rejects(
      client(fetchImpl).call(createCustomer, { body: {} }),
      (e: GravvApiError) => /different payload/.test(e.hint ?? ""),
    );
  });

  test("explains that 403 may mean a dashboard-only endpoint", async () => {
    const { fetchImpl } = stub([{ status: 403, body: { error: "forbidden" } }]);
    await assert.rejects(
      client(fetchImpl).call(getAccount, { account_id: "a" }),
      (e: GravvApiError) => /dashboard/.test(e.hint ?? ""),
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

describe("retries", () => {
  test("retries a 409 in-flight conflict then succeeds", async () => {
    const { calls, fetchImpl } = stub([
      { status: 409, body: { error: "in flight" }, headers: { "Retry-After": "1" } },
      { status: 200, body: { data: { ok: true } } },
    ]);
    const res = await client(fetchImpl).call(createCustomer, { body: {} });
    assert.equal(calls.length, 2);
    assert.deepEqual(res.data, { ok: true });
  });

  test("gives up after repeated 409s rather than looping", async () => {
    const { calls, fetchImpl } = stub([{ status: 409, body: { error: "still running" } }]);
    await assert.rejects(client(fetchImpl).call(createCustomer, { body: {} }));
    assert.equal(calls.length, 3);
  });

  test("does not retry a 400 — the request is wrong, not unlucky", async () => {
    const { calls, fetchImpl } = stub([{ status: 400, body: { error: "bad" } }]);
    await assert.rejects(client(fetchImpl).call(createCustomer, { body: {} }));
    assert.equal(calls.length, 1);
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
