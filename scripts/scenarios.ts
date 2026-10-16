/**
 * Check the requests in the integration scenarios against the tool schemas.
 *
 *   test/fixtures/scenarios/<area>.json  ->  one outcome per request
 *   test/fixtures/scenarios/expected.json   the pinned outcome of each
 *
 * The scenarios are worked examples of how a caller gets a job done, checked against the
 * service code. Each request in them names a route and its arguments. This script finds the
 * tool for that route, builds the flat arguments the model would pass, and checks them
 * against the tool's input schema in strict mode, so a field the tool does not declare is a
 * problem too (on a GET the client drops it; in a body the model never sees it).
 *
 * Every request ends in one outcome:
 *   ok        the tool exists and the arguments fit its schema
 *   mismatch  the tool exists, but the arguments do not fit (the problems say why)
 *   no-tool   no tool serves the route yet
 *   blocked   the route is blocked on purpose (src/curation.ts BLOCKED)
 *
 * The outcomes are pinned in expected.json. A spec sync, a curation change or a new tool
 * that changes any outcome fails test/scenarios.test.ts until the pin is updated with
 *
 *   npm run scenarios -- --write
 *
 * so the change is seen in review rather than found by a caller.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOLS, type GeneratedTool } from "../src/generated/tools.ts";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";
import { BLOCKED } from "../src/curation.ts";
import { checkSchema } from "./schema-check.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = join(here, "..", "test", "fixtures", "scenarios");
export const EXPECTED_FILE = join(FIXTURE_DIR, "expected.json");

export interface ScenarioRequest {
  /** Scenario id plus the request's place in it, e.g. S-PAY-01.4. */
  id: string;
  scenario: string;
  method: string;
  /** Concrete path, with a query string on a GET. */
  path: string;
  body?: unknown;
}

export type Outcome = "ok" | "mismatch" | "no-tool" | "blocked";

export interface ScenarioResult {
  outcome: Outcome;
  /** The tool that serves the route, when there is one. */
  tool?: string;
  /** Why the outcome is not ok. */
  problems?: string[];
}

/**
 * A value the scenarios write as a stand-in rather than a real value: `<customer_id>`,
 * `{card_id}`, `…` or `...`. It still counts as sent, so an undeclared stand-in field is
 * reported, but its own value is not checked against a format or pattern.
 */
export function isPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^<[^<>]*>$/.test(value) || /^\{[^{}]*\}$/.test(value) || value.includes("…") || value.includes("...");
}

function segments(path: string): string[] {
  return path.replace(/\/+$/, "").split("/").slice(1);
}

function isTemplate(segment: string): boolean {
  return /^\{[^}]+\}$/.test(segment);
}

/** Match a concrete path against a template; the params it binds, or undefined. */
function bind(template: string, path: string): { params: Record<string, string>; literals: number } | undefined {
  const t = segments(template);
  const p = segments(path);
  if (t.length !== p.length) return undefined;
  const params: Record<string, string> = {};
  let literals = 0;
  for (let i = 0; i < t.length; i++) {
    const ts = t[i]!;
    const ps = p[i]!;
    if (isTemplate(ts)) {
      const value = decodeURIComponent(ps);
      // Every path parameter in the API is an id. A segment with no digit in it, such as
      // `capabilities` in /v1/accounts/capabilities, is a route of its own, not an id.
      if (!isPlaceholder(value) && !/\d/.test(value)) return undefined;
      params[ts.slice(1, -1)] = value;
    } else if (ts === ps) {
      literals++;
    } else {
      return undefined;
    }
  }
  return { params, literals };
}

/**
 * The tool for a route. A literal segment beats a parameter, so
 * `/v2/accounts/requirements` finds the requirements tool, not `/v2/accounts/{id}`.
 */
export function findTool(
  method: string,
  path: string,
  tools: readonly GeneratedTool[] = [...TOOLS, ...MANUAL_TOOLS],
): { tool: GeneratedTool; params: Record<string, string> } | undefined {
  let best: { tool: GeneratedTool; params: Record<string, string>; literals: number } | undefined;
  for (const tool of tools) {
    if (tool.method.toUpperCase() !== method.toUpperCase()) continue;
    const bound = bind(tool.path, path);
    if (bound && (!best || bound.literals > best.literals)) best = { tool, ...bound };
  }
  return best && { tool: best.tool, params: best.params };
}

/** The reason a route is blocked, when it is. */
export function findBlocked(method: string, path: string): string | undefined {
  for (const [key, reason] of Object.entries(BLOCKED)) {
    const [m, template] = key.split(" ");
    if (m === method.toUpperCase() && template && bind(template, path)) return reason;
  }
  return undefined;
}

function schemaOf(tool: GeneratedTool, name: string): Record<string, unknown> | undefined {
  const props = tool.inputSchema.properties as Record<string, Record<string, unknown>> | undefined;
  return props?.[name];
}

/** A query string value as the type the schema declares, the way a model would pass it. */
function queryValue(schema: Record<string, unknown> | undefined, raw: string[]): unknown {
  const type = schema?.type;
  const one = (v: string): unknown => {
    const itemType = type === "array" ? (schema?.items as Record<string, unknown> | undefined)?.type : type;
    if ((itemType === "integer" || itemType === "number") && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (itemType === "boolean" && (v === "true" || v === "false")) return v === "true";
    return v;
  };
  if (type === "array") return raw.map(one);
  return raw.length === 1 ? one(raw[0]!) : raw.map(one);
}

/** The flat arguments the model would pass for a request, or a problem. */
export function buildArguments(
  tool: GeneratedTool,
  params: Record<string, string>,
  query: URLSearchParams,
  body: unknown,
): { args: Record<string, unknown> } | { problem: string } {
  const args: Record<string, unknown> = {};
  for (const name of new Set(query.keys())) args[name] = queryValue(schemaOf(tool, name), query.getAll(name));

  if (body !== undefined) {
    if (tool.bodyMode === "none") return { problem: "the scenario sends a body, but the tool takes none" };
    if (tool.bodyMode === "wrapped") {
      args.body = body;
    } else {
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return { problem: "the scenario's body is not a JSON object" };
      }
      Object.assign(args, body);
    }
  }
  // The path wins over a copy of the same id in the body, as it does in the client.
  Object.assign(args, params);
  if (tool.needsConfirm) args.confirm = true;
  return { args };
}

/** The outcome of one scenario request. */
export function checkRequest(
  request: ScenarioRequest,
  tools: readonly GeneratedTool[] = [...TOOLS, ...MANUAL_TOOLS],
): ScenarioResult {
  const [path = "", qs = ""] = request.path.split("?", 2);
  const blocked = findBlocked(request.method, path);
  if (blocked) return { outcome: "blocked", problems: [blocked] };

  const found = findTool(request.method, path, tools);
  if (!found) return { outcome: "no-tool" };
  const { tool, params } = found;
  const base: ScenarioResult = { outcome: "ok", tool: tool.name };

  const built = buildArguments(tool, params, new URLSearchParams(qs), request.body);
  const problems =
    "problem" in built ? [built.problem] : checkSchema(tool.inputSchema, built.args, { strict: true, isPlaceholder });
  return problems.length === 0 ? base : { ...base, outcome: "mismatch", problems };
}

interface FixtureFile {
  about: string;
  requests: ScenarioRequest[];
}

/** Every scenario request, in file then document order. */
export function loadRequests(dir = FIXTURE_DIR): ScenarioRequest[] {
  const out: ScenarioRequest[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "expected.json").sort()) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as FixtureFile;
    out.push(...parsed.requests);
  }
  return out;
}

export function loadExpected(file = EXPECTED_FILE): Record<string, ScenarioResult> {
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, ScenarioResult>;
}

/** Every outcome, keyed by request id. */
export function checkAll(requests = loadRequests()): Record<string, ScenarioResult> {
  const out: Record<string, ScenarioResult> = {};
  for (const r of requests) {
    if (out[r.id]) throw new Error(`duplicate scenario request id ${r.id}`);
    out[r.id] = checkRequest(r);
  }
  return out;
}

function main(): void {
  const results = checkAll();
  const counts: Record<string, number> = {};
  for (const r of Object.values(results)) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;

  if (process.argv.includes("--write")) {
    writeFileSync(EXPECTED_FILE, JSON.stringify(results, null, 2) + "\n");
    console.log(`Wrote ${Object.keys(results).length} outcomes to ${EXPECTED_FILE}`);
  }

  const verbose = process.argv.includes("--verbose");
  for (const [id, r] of Object.entries(results)) {
    if (r.outcome === "ok" && !verbose) continue;
    const detail = r.problems ? `: ${r.problems.join("; ")}` : "";
    console.log(`${r.outcome.padEnd(8)} ${id} ${r.tool ?? ""}${detail}`);
  }
  console.log(
    Object.entries(counts)
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(", "),
  );

  const expected = loadExpected();
  if (JSON.stringify(expected) !== JSON.stringify(results)) {
    console.error("The outcomes differ from expected.json. Review the change, then run: npm run scenarios -- --write");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
