import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  checkAll,
  checkRequest,
  findTool,
  findBlocked,
  isPlaceholder,
  loadExpected,
  loadRequests,
} from "../scripts/scenarios.ts";
import type { GeneratedTool } from "../src/generated/tools.ts";

const requests = loadRequests();

describe("scenario fixtures", () => {
  test("cover all 90 scenarios, with unique ids that name their scenario", () => {
    const ids = new Set<string>();
    for (const r of requests) {
      assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
      ids.add(r.id);
      assert.ok(r.id.startsWith(`${r.scenario}.`), `${r.id} is not numbered under ${r.scenario}`);
      assert.match(r.method, /^(GET|POST|PUT|PATCH|DELETE)$/);
      assert.match(r.path, /^\/v[12]\//);
      if (r.method === "GET") assert.equal(r.body, undefined, `${r.id} is a GET with a body`);
    }
    assert.equal(new Set(requests.map((r) => r.scenario)).size, 90);
  });

  test("no request lists by client_reference, which no list route filters on", () => {
    const offenders = requests.filter((r) => r.method === "GET" && /[?&]client_reference=/.test(r.path));
    assert.deepEqual(offenders.map((r) => r.id), []);
  });
});

describe("scenario outcomes", () => {
  test("every outcome matches its pin in expected.json (npm run scenarios -- --write to update)", () => {
    const actual = checkAll(requests);
    const expected = loadExpected();
    const unpinned = Object.keys(actual).filter((id) => !(id in expected));
    const stale = Object.keys(expected).filter((id) => !(id in actual));
    assert.deepEqual(unpinned, [], "requests with no pinned outcome");
    assert.deepEqual(stale, [], "pinned outcomes with no request");
    for (const [id, result] of Object.entries(actual)) {
      assert.deepEqual(result, expected[id], `${id} changed`);
    }
  });
});

describe("route matching", () => {
  const tool = (name: string, method: string, path: string, pathParams: string[] = []): GeneratedTool => ({
    name,
    toolset: "accounts",
    method,
    path,
    description: "",
    inputSchema: { type: "object", properties: {} },
    pathParams,
    queryParams: [],
    bodyMode: "none",
    bodyProps: [],
    alsoInBody: [],
    movesMoney: false,
    needsConfirm: false,
    needsIdempotency: false,
    sandboxOnly: false,
    spec: "test.yaml",
  });
  const tools = [
    tool("getAccount", "get", "/v1/accounts/{account_id}", ["account_id"]),
    tool("getApplication", "get", "/v1/accounts/applications/{id}", ["id"]),
  ];

  test("a literal segment beats a parameter", () => {
    const found = findTool("GET", "/v1/accounts/applications/2b4d6f8a-1c3e-4a5b-9d7f-0e2a4c6e8b1d", tools);
    assert.equal(found?.tool.name, "getApplication");
    assert.deepEqual(found?.params, { id: "2b4d6f8a-1c3e-4a5b-9d7f-0e2a4c6e8b1d" });
  });

  test("a word segment is a route of its own, not an id", () => {
    assert.equal(findTool("GET", "/v1/accounts/capabilities", tools), undefined);
    assert.equal(findTool("GET", "/v1/accounts/{account_id}", tools)?.tool.name, "getAccount");
    assert.equal(findTool("GET", "/v1/accounts/<id>", tools)?.tool.name, "getAccount");
  });

  test("blocked routes are found by template", () => {
    assert.match(findBlocked("POST", "/v1/transfer/ref-123/approve") ?? "", /Dashboard only/);
    assert.equal(findBlocked("POST", "/v1/transfer"), undefined);
  });

  test("stand-in values", () => {
    for (const v of ["<customer_id>", "{card_id}", "…", "acct_..."]) assert.ok(isPlaceholder(v), v);
    for (const v of ["7c9e6679-7425-40de-944b-e07fc1f90ae7", "<b>x</b>", 1]) assert.ok(!isPlaceholder(v), String(v));
  });

  test("an undeclared GET filter is a mismatch, since the client drops it", () => {
    const list = {
      ...tool("listThings", "get", "/v1/things"),
      inputSchema: {
        type: "object",
        properties: { limit: { type: "integer" }, active: { type: "boolean" } },
        additionalProperties: false,
      },
      queryParams: ["limit", "active"],
    };
    const base = { id: "S-T-01.1", scenario: "S-T-01", method: "GET" };
    assert.deepEqual(checkRequest({ ...base, path: "/v1/things?limit=10&active=true" }, [list]), {
      outcome: "ok",
      tool: "listThings",
    });
    assert.deepEqual(checkRequest({ ...base, path: "/v1/things?client_reference=abc" }, [list]), {
      outcome: "mismatch",
      tool: "listThings",
      problems: ["client_reference: is not allowed"],
    });
    assert.deepEqual(checkRequest({ ...base, path: "/v1/elsewhere" }, [list]), { outcome: "no-tool" });
  });
});
