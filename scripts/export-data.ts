/**
 * Write the data the Gravv CLI shares with this server.
 *
 *   data/gravv-shared.json
 *
 * The CLI (GravityFinance/gravv-cli) embeds this file so both tools give the same answer:
 * the same fix for a known error, the same list of calls that move money, the same goals
 * and worked requests. The file is plain JSON, so regexes are written as `{source, flags}`.
 *
 * The committed file is checked by test/export-data.test.ts. Any change to the fixes, the
 * money list, the prompts or the scenarios fails that test until the file is written again:
 *
 *   npm run export-data
 *
 * and the gravv-cli CI fails until the CLI copies the new file (`make sync-shared`).
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NAMES, MONEY_OPS, CONFIRM_OPS, SANDBOX_ONLY } from "../src/curation.ts";
import { ERROR_FIXES } from "../src/fix-hints.ts";
import { PROMPTS, SHARED_RULES } from "../src/prompts.ts";
import { loadRequests } from "./scenarios.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const EXPORT_FILE = join(here, "..", "data", "gravv-shared.json");

const sorted = (s: Iterable<string>) => [...s].sort();

const pattern = (r: RegExp) => ({ source: r.source, flags: r.flags });

export function buildExport() {
  const ops: Record<string, string> = {};
  for (const [op, { name }] of Object.entries(NAMES)) ops[name] = op;

  return {
    about:
      "Data the Gravv CLI shares with the Gravv MCP server. Written by `npm run export-data` in gravv-mcp; do not edit by hand.",
    ops: Object.fromEntries(Object.entries(ops).sort(([a], [b]) => a.localeCompare(b))),
    money_ops: sorted(MONEY_OPS),
    confirm_ops: sorted(CONFIRM_OPS),
    sandbox_only: sorted(SANDBOX_ONLY),
    error_fixes: ERROR_FIXES.map((f) => ({
      id: f.id,
      scenarios: f.scenarios,
      ops: f.tools.map((t) => ops[t] ?? t),
      tools: f.tools,
      codes: f.codes ?? [],
      messages: (f.messages ?? []).map(pattern),
      outcome_known: f.outcomeKnown ?? true,
      hint: f.hint,
    })),
    shared_rules: SHARED_RULES,
    goals: PROMPTS.map((p) => ({
      name: p.name,
      title: p.title,
      description: p.description,
      scenarios: p.scenarios,
      intro: p.intro,
      ask_first: p.askFirst,
      labels: p.labels ?? [],
      common: p.common ?? null,
      paths: p.paths.map((path) => ({ keys: path.keys, title: path.title, scenarios: path.scenarios, steps: path.steps })),
      rules: p.rules,
      docs: p.docs,
    })),
    scenarios: loadRequests(),
  };
}

export function renderExport(): string {
  return JSON.stringify(buildExport(), null, 2) + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(EXPORT_FILE, renderExport());
  console.log(`wrote ${EXPORT_FILE}`);
}
