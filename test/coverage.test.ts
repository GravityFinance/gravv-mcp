/**
 * Every in-scope endpoint has a tool, or a written reason it has none.
 *
 * The in-scope list is the docs' own (client-docs tests/data/api_operations.json, vendored
 * as test/fixtures/in-scope-endpoints.json). A route the docs publish and the server does
 * not serve, or a spec route the docs do not list, fails here.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { BLOCKED, BLOCKED_TOOL_NAMES, opKey } from "../src/curation.ts";
import { TOOLS } from "../src/generated/tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SPECS = join(here, "..", "specs");
const inScope: string[] = JSON.parse(readFileSync(join(here, "fixtures", "in-scope-endpoints.json"), "utf8")).operations;

const METHODS = ["get", "post", "put", "patch", "delete"];
const specOps = readdirSync(SPECS)
  .filter((f) => f.endsWith(".yaml"))
  .flatMap((f) => {
    const paths = (parse(readFileSync(join(SPECS, f), "utf8")).paths ?? {}) as Record<string, Record<string, unknown>>;
    return Object.entries(paths).flatMap(([path, item]) =>
      METHODS.filter((m) => item?.[m]).map((m) => opKey(m, path)),
    );
  })
  .sort();

const toolFor = new Map(TOOLS.map((t) => [opKey(t.method, t.path), t.name]));

describe("endpoint coverage", () => {
  test("the specs carry exactly the in-scope endpoints", () => {
    assert.deepEqual(specOps, [...inScope].sort());
  });

  test("every in-scope endpoint has a tool or a BLOCKED reason", () => {
    const missing = inScope.filter((op) => !toolFor.has(op) && !BLOCKED[op]);
    assert.deepEqual(missing, []);
  });

  test("the counts are pinned: 92 endpoints, 89 tools, 3 blocked", () => {
    assert.equal(inScope.length, 92);
    assert.equal(inScope.filter((op) => toolFor.has(op)).length, 89);
    assert.deepEqual(inScope.filter((op) => BLOCKED[op]).sort(), [
      "GET /v1/cards/{card_id}/pin",
      "GET /v1/cards/{card_id}/sensitive-details",
      "PUT /v1/cards/{card_id}/pin",
    ]);
  });

  test("routes left out of scope have a reason, and their likely names explain themselves", () => {
    for (const route of [
      "POST /v1/cards/{id}/simulate",
      "POST /v1/collections/simulate/webhook",
      "POST /v2/accounts/{id}/settlement/enable",
      "POST /v2/accounts/{id}/settlement/disable",
    ]) {
      assert.ok(BLOCKED[route], route);
      assert.equal(inScope.includes(route), false, `${route} is in scope now: give it a tool`);
    }
    for (const name of ["simulateCardEvent", "simulateCollectionOutcome"]) assert.ok(BLOCKED_TOOL_NAMES[name], name);
  });
});
