/**
 * Replay a fixed set of calls against the Gravv sandbox, through the real server.
 *
 * The unit tests run against stubs, so they cannot see the API change under the tools. This
 * runs a short list of steps through createServer, as an agent would meet them (gates,
 * argument handling, idempotency keys), and compares each answer's HTTP status and `data`
 * keys with what the sandbox answered on 2026-10-13.
 *
 *   GRAVV_SANDBOX_KEY=grvSec_sandbox_... npm run sandbox-replay
 *   GRAVV_SANDBOX_KEY=grvSec_sandbox_... npm run sandbox-replay -- --money --out report.json
 *
 * Run by hand before a release, or from the manual sandbox-replay workflow. The rules the
 * steps keep (checked by stepProblems, and by a test over STEPS):
 *   - a sandbox key only: the key must start grvSec_sandbox_, and it is never printed;
 *   - only reads, and creates under the two verified sandbox customers;
 *   - no PUT, PATCH or DELETE, nothing under /kyc or /v1/risk/, so the customers are never edited;
 *   - steps that move money run only with --money;
 *   - everything created carries the run's mcp-replay- label, and is listed for cleanup.
 *
 * A step whose route has no tool yet is skipped, not failed, so a new tool is picked up by the
 * replay without editing it. Exit 1 when any step that ran differs from what was expected.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.ts";
import { detectEnvironment } from "../src/client.ts";
import { buildArguments, findTool } from "./scenarios.ts";

/** The two verified sandbox customers the replay may add resources to. */
export const VERIFIED_CUSTOMERS = [
  "fe8c41ea-c60f-41aa-8954-12884f79b623",
  "0bd2b84c-0a6d-4dba-8b26-3b31155ee76f",
] as const;

export interface ReplayStep {
  id: string;
  /** What the step shows, in a few words. */
  what: string;
  kind: "read" | "create" | "money";
  method: "GET" | "POST";
  /** Concrete path, with its query. */
  path: string;
  /** Request body; `{run}` in any string is replaced by the run label. */
  body?: Record<string, unknown>;
  expect: { status: number; dataKeys: string[] };
  /** Where `expect` was seen: a sandbox run log line. */
  seen: string;
  /** For a create or money step: the `data` field holding what it made. */
  createdId?: string;
}

const [BUYER, BUSINESS] = VERIFIED_CUSTOMERS;
const CUSTOMER_KEYS = [
  "address", "date_added", "date_of_birth", "email", "first_name", "gender", "id", "kyc", "last_name",
  "middle_name", "phone", "status", "type",
];
const PAGE_KEYS = ["items", "items_per_page", "page", "total_items", "total_pages"];

export const STEPS: ReplayStep[] = [
  {
    id: "R1",
    what: "read the individual customer",
    kind: "read",
    method: "GET",
    path: `/v1/customers/${BUYER}`,
    expect: { status: 200, dataKeys: CUSTOMER_KEYS },
    seen: "bank-payouts.jsonl:129",
  },
  {
    id: "R2",
    what: "read the business customer",
    kind: "read",
    method: "GET",
    path: `/v1/customers/${BUSINESS}`,
    expect: { status: 200, dataKeys: CUSTOMER_KEYS },
    seen: "cards.jsonl:394",
  },
  {
    id: "R3",
    what: "list the business's accounts",
    kind: "read",
    method: "GET",
    path: `/v1/accounts?customer_id=${BUSINESS}`,
    expect: { status: 200, dataKeys: PAGE_KEYS },
    seen: "cards.jsonl:1",
  },
  {
    id: "R4",
    what: "list the individual's transactions",
    kind: "read",
    method: "GET",
    path: `/v1/transactions?customer_id=${BUYER}&items_per_page=50`,
    expect: { status: 200, dataKeys: PAGE_KEYS },
    seen: "cards.jsonl:403",
  },
  {
    id: "R5",
    what: "account capabilities for NGN",
    kind: "read",
    method: "GET",
    path: `/v1/accounts/capabilities?customer_id=${BUSINESS}&currency=NGN`,
    expect: { status: 200, dataKeys: ["country", "options", "subdivision"] },
    seen: "remittance.jsonl:284",
  },
  {
    id: "R6",
    what: "list the individual's v2 accounts",
    kind: "read",
    method: "GET",
    path: `/v2/accounts?customer_id=${BUYER}`,
    expect: { status: 200, dataKeys: PAGE_KEYS },
    seen: "bank-payouts.jsonl:133",
  },
  {
    id: "C1",
    what: "open a v1 USD account for the individual",
    kind: "create",
    method: "POST",
    path: "/v1/accounts",
    body: { customer_id: BUYER, type: "regular", currency: "USD", label: "{run} USD", blockchain_network: "polygon" },
    expect: {
      status: 200,
      dataKeys: [
        "blockchain_network", "capabilities", "category", "currency", "customer_id", "date_created", "id",
        "inflow_behavior", "label", "status", "type",
      ],
    },
    seen: "bank-payouts.jsonl:205",
    createdId: "id",
  },
  {
    id: "M1",
    what: "book transfer of 1 NGN between the business's own accounts",
    kind: "money",
    method: "POST",
    path: "/v1/transfer",
    body: {
      customer_id: BUSINESS,
      source: { source_type: "internal_account", id: "ff560281-8e0f-4af4-93d0-92d4780cc961" },
      destination: { destination_type: "internal_account", id: "9d20a87e-cffa-43b3-a60b-8b612fe5b88e" },
      amount: "1",
      description: "{run} book transfer",
      client_reference: "{run}-book",
    },
    expect: {
      status: 200,
      dataKeys: [
        "amount", "amount_currency", "date_created", "fee", "fee_currency", "local_amount", "local_currency",
        "reference", "requires_approval", "transaction_id", "transfer_status",
      ],
    },
    seen: "bank-payouts.jsonl:250",
    createdId: "transaction_id",
  },
];

const VERIFIED = new Set<string>(VERIFIED_CUSTOMERS);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Every rule a step breaks. Empty means it may run. */
export function stepProblems(step: ReplayStep): string[] {
  const problems: string[] = [];
  const [path = ""] = step.path.split("?");
  if (step.method !== "GET" && step.method !== "POST") problems.push(`${step.id}: only GET and POST may run`);
  if (/\/kyc(\/|$)/.test(path) || path.startsWith("/v1/risk/")) problems.push(`${step.id}: no KYC or risk route`);
  if (step.method === "GET" && step.body !== undefined) problems.push(`${step.id}: a GET has no body`);
  if (step.method === "POST" && step.kind === "read") problems.push(`${step.id}: a POST is a create or money step`);
  if (step.kind !== "read") {
    const customer = step.body?.customer_id;
    if (typeof customer !== "string" || !VERIFIED.has(customer)) {
      problems.push(`${step.id}: creates only under a verified customer`);
    }
    if (!JSON.stringify(step.body).includes("{run}")) problems.push(`${step.id}: what it makes must carry the run label`);
    if (!step.createdId) problems.push(`${step.id}: must say which field holds what it makes`);
  }
  for (const id of step.path.match(UUID) ?? []) {
    if (!VERIFIED.has(id)) problems.push(`${step.id}: path names ${id}, which is not a verified customer`);
  }
  return problems;
}

export type StepOutcome = "pass" | "differs" | "skipped";

export interface StepReport {
  id: string;
  what: string;
  tool?: string;
  outcome: StepOutcome;
  status?: number;
  /** Expected `data` keys the answer lacked. */
  missingKeys?: string[];
  /** `data` keys the answer had that were not expected (reported, not a failure). */
  newKeys?: string[];
  note?: string;
  created?: string;
}

export interface ReplayReport {
  run: string;
  money: boolean;
  steps: StepReport[];
  cleanup: { step: string; what: string; id: string }[];
}

/** A label unique to one run, e.g. mcp-replay-20261014T101500-a1b2. */
export function runLabel(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
  return `mcp-replay-${stamp}-${randomBytes(2).toString("hex")}`;
}

function withRun(value: unknown, run: string): unknown {
  if (typeof value === "string") return value.replaceAll("{run}", run);
  if (Array.isArray(value)) return value.map((v) => withRun(v, run));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withRun(v, run)]));
  }
  return value;
}

export class ReplayRefused extends Error {}

export interface ReplayOptions {
  apiKey: string | undefined;
  money?: boolean;
  run?: string;
  steps?: ReplayStep[];
  fetchImpl?: typeof fetch;
}

/** Run the steps. Refuses, before any request, without a sandbox key or with a step that breaks a rule. */
export async function runReplay(opts: ReplayOptions): Promise<ReplayReport> {
  const apiKey = opts.apiKey ?? "";
  if (!apiKey.startsWith("grvSec_sandbox_") || detectEnvironment(apiKey) !== "sandbox") {
    throw new ReplayRefused("GRAVV_SANDBOX_KEY must be set to a sandbox secret key (it starts grvSec_sandbox_).");
  }
  const steps = opts.steps ?? STEPS;
  const broken = steps.flatMap(stepProblems);
  if (broken.length > 0) throw new ReplayRefused(`refusing to run: ${broken.join("; ")}`);

  const run = opts.run ?? runLabel();
  const money = opts.money === true;
  const baseFetch = opts.fetchImpl ?? fetch;
  let last: { status: number; data: unknown } | undefined;
  const recording = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const res = await baseFetch(input, init);
    let data: unknown;
    try {
      data = ((await res.clone().json()) as { data?: unknown }).data;
    } catch {
      data = undefined;
    }
    last = { status: res.status, data };
    return res;
  }) as typeof fetch;

  const { server } = createServer({
    apiKey,
    toolsets: "all",
    readOnly: false,
    allowLiveWrites: false,
    fetchImpl: recording,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "sandbox-replay", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);

  const report: ReplayReport = { run, money, steps: [], cleanup: [] };
  try {
    for (const step of steps) {
      const [path = "", qs = ""] = step.path.split("?", 2);
      const found = findTool(step.method, path);
      if (!found) {
        report.steps.push({ id: step.id, what: step.what, outcome: "skipped", note: "no tool serves this route yet" });
        continue;
      }
      if (step.kind === "money" && !money) {
        report.steps.push({ id: step.id, what: step.what, tool: found.tool.name, outcome: "skipped", note: "moves money; run with --money" });
        continue;
      }
      const built = buildArguments(found.tool, found.params, new URLSearchParams(qs), withRun(step.body, run));
      if ("problem" in built) {
        report.steps.push({ id: step.id, what: step.what, tool: found.tool.name, outcome: "differs", note: built.problem });
        continue;
      }
      last = undefined;
      const result = (await client.callTool({ name: found.tool.name, arguments: built.args })) as {
        content?: { text?: string }[];
      };
      const entry: StepReport = { id: step.id, what: step.what, tool: found.tool.name, outcome: "pass" };
      if (!last) {
        entry.outcome = "differs";
        entry.note = `no request was sent: ${(result.content?.[0]?.text ?? "").split("\n")[0]!.slice(0, 200)}`;
        report.steps.push(entry);
        continue;
      }
      const answer: { status: number; data: unknown } = last;
      entry.status = answer.status;
      const keys = answer.data && typeof answer.data === "object" && !Array.isArray(answer.data) ? Object.keys(answer.data) : [];
      const missing = step.expect.dataKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !step.expect.dataKeys.includes(k)).sort();
      if (missing.length > 0) entry.missingKeys = missing;
      if (extra.length > 0) entry.newKeys = extra;
      if (answer.status !== step.expect.status || missing.length > 0) {
        entry.outcome = "differs";
        entry.note = `expected ${step.expect.status} as in ${step.seen}`;
      }
      if (step.createdId && answer.data && typeof answer.data === "object") {
        const made = (answer.data as Record<string, unknown>)[step.createdId];
        if (typeof made === "string") {
          entry.created = made;
          report.cleanup.push({ step: step.id, what: step.what, id: made });
        }
      }
      report.steps.push(entry);
    }
  } finally {
    await client.close();
  }
  return report;
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  let report: ReplayReport;
  try {
    report = await runReplay({ apiKey: process.env.GRAVV_SANDBOX_KEY, money: process.argv.includes("--money") });
  } catch (err) {
    if (err instanceof ReplayRefused) {
      console.error(`error: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
  console.log(`run ${report.run}${report.money ? " (with money steps)" : ""}`);
  for (const s of report.steps) {
    const extra = [
      s.status !== undefined ? `status ${s.status}` : "",
      s.missingKeys ? `missing ${s.missingKeys.join(", ")}` : "",
      s.newKeys ? `new ${s.newKeys.join(", ")}` : "",
      s.note ?? "",
    ].filter(Boolean);
    console.log(`${s.outcome.padEnd(8)} ${s.id} ${s.tool ?? "-"}: ${s.what}${extra.length ? ` (${extra.join("; ")})` : ""}`);
  }
  console.log(report.cleanup.length === 0 ? "Nothing to clean up." : "Clean up:");
  for (const c of report.cleanup) console.log(`  ${c.step} ${c.what}: ${c.id}`);

  const out = argValue("--out");
  if (out) writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  if (report.steps.some((s) => s.outcome === "differs")) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
