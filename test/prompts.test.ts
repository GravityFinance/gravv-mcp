import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PROMPTS, PROMPTS_BY_NAME, SHARED_RULES, renderPrompt, toolsNamedIn, type GoalPrompt } from "../src/prompts.ts";
import { DEFAULT_TOOLSETS } from "../src/curation.ts";
import { TOOLS, TOOLS_BY_NAME } from "../src/generated/tools.ts";
import { MANUAL_TOOLS } from "../src/manual-tools.ts";
import { createServer } from "../src/server.ts";
import { FALSE_TEXT } from "./false-text.ts";

const DEFAULT_LOADED = new Set(TOOLS.filter((t) => DEFAULT_TOOLSETS.includes(t.toolset)).map((t) => t.name));
const ALL_LOADED = new Set(TOOLS.map((t) => t.name));
const KNOWN = new Set([...TOOLS_BY_NAME.keys(), ...MANUAL_TOOLS.map((t) => t.name), "searchGravvDocs", "getGravvDocPage"]);

/** Every piece of text a prompt can hand a model. */
function textsOf(p: GoalPrompt): string[] {
  return [
    p.title,
    p.description,
    p.intro,
    p.argument.description,
    ...p.askFirst,
    ...(p.labels ?? []),
    ...(p.common?.steps ?? []),
    ...p.paths.flatMap((x) => [x.title, ...x.steps]),
    ...p.rules,
  ];
}

const full = (p: GoalPrompt) => renderPrompt(p, {}, { hasApiKey: true, loadedTools: ALL_LOADED });

describe("prompt set", () => {
  test("the ten goals, each named once", () => {
    assert.deepEqual(
      PROMPTS.map((p) => p.name),
      [
        "open-account",
        "onboard-customer",
        "send-payout",
        "send-remittance",
        "send-crypto",
        "convert-currency",
        "issue-card",
        "collect-payment",
        "reconcile",
        "fix-stuck-transfer",
      ],
    );
  });

  test("each prompt is built from scenarios, and each path names the ones it uses", () => {
    for (const p of PROMPTS) {
      assert.ok(p.scenarios.length > 0, p.name);
      for (const path of p.paths) {
        assert.ok(path.steps.length > 0, `${p.name} ${path.keys[0]}`);
        for (const s of path.scenarios) assert.ok(p.scenarios.includes(s), `${p.name} ${path.keys[0]}: ${s}`);
        for (const k of path.keys) assert.equal(k, k.toLowerCase(), `${p.name}: path keys are matched lower case`);
      }
      const keys = p.paths.flatMap((x) => x.keys);
      assert.equal(new Set(keys).size, keys.length, `${p.name}: a key selects one path`);
    }
  });

  test("each prompt points at a docs page by a quoted slug", () => {
    for (const p of PROMPTS) {
      assert.ok(p.docs.length > 0, p.name);
      for (const d of p.docs) {
        assert.match(d, /^(platform|recipes|getting-started)\/[a-z0-9-/]+$/, `${p.name}: ${d}`);
        assert.ok(full(p).includes(`'${d}'`), `${p.name}: ${d} must be quoted for the docs-links check`);
      }
    }
  });
});

describe("prompt text is true", () => {
  test("every tool name a prompt uses is a real tool", () => {
    // Outside code spans a camelCase word is a tool name: the fields a prompt names in
    // prose are snake_case, and camelCase API fields are quoted as code.
    for (const p of PROMPTS) {
      for (const text of [...textsOf(p), ...SHARED_RULES]) {
        for (const m of text.replace(/`[^`]*`/g, "").matchAll(/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g)) {
          assert.ok(KNOWN.has(m[0]), `${p.name}: "${m[0]}" is not a tool`);
        }
      }
      assert.ok(toolsNamedIn(full(p)).length > 2, `${p.name} names the tools to call`);
    }
  });

  for (const [pattern, why] of FALSE_TEXT) {
    test(`no prompt says ${pattern} (${why})`, () => {
      for (const p of PROMPTS) assert.doesNotMatch(full(p), pattern, `${p.name}: ${why}`);
    });
  }

  test("no route the docs call not yet available is labelled available", () => {
    const notOpen = /Nigeria bank|Ghana|Kenya|Tanzania|Mexico|Brazil|Colombia|India|Hong Kong|another network|cross-network|Senegal|WAEMU|CEMAC/;
    for (const p of PROMPTS) {
      for (const l of (p.labels ?? []).filter((x) => x.startsWith("Available:"))) {
        assert.doesNotMatch(l, notOpen, `${p.name}: ${l}`);
      }
    }
    const rem = PROMPTS_BY_NAME.get("send-remittance")!;
    assert.match(rem.labels!.find((l) => l.startsWith("Not yet available"))!, /Nigeria bank accounts, Ghana, Kenya/);
    for (const key of ["ng", "gh", "ke", "xof", "mx"]) {
      const path = rem.paths.find((x) => x.keys.includes(key))!;
      assert.match(path.title, /not yet available/, `send-remittance ${key}`);
    }
  });

  test("the key rule is PR 1b's: after a 4xx, no idempotency_key; after an unknown outcome, look first", () => {
    const rules = SHARED_RULES.join("\n");
    assert.match(rules, /timeout, a network error or a 5xx[^\n]*look the result up first/);
    assert.match(rules, /any other 4xx, a 429 included[^\n]*without idempotency_key/);
    for (const p of PROMPTS) {
      assert.doesNotMatch(full(p), /retry with the same key|same Idempotency-Key/i, p.name);
      assert.ok(full(p).includes(SHARED_RULES[2]!), `${p.name} ends with the shared rules`);
    }
  });

  test("no prompt promises a simulator that MCP does not offer", () => {
    for (const p of PROMPTS) assert.doesNotMatch(full(p), /simulateCardEvent|simulateCollectionOutcome/, p.name);
    assert.match(full(PROMPTS_BY_NAME.get("issue-card")!), /card simulators are not available over MCP yet/);
    assert.match(full(PROMPTS_BY_NAME.get("collect-payment")!), /collection simulator is not available over MCP yet/);
  });
});

describe("renderPrompt", () => {
  const payout = PROMPTS_BY_NAME.get("send-payout")!;
  const ctx = { hasApiKey: true, loadedTools: DEFAULT_LOADED };

  test("with no argument, every path", () => {
    const text = renderPrompt(payout, {}, ctx);
    for (const path of payout.paths) assert.ok(text.includes(`## ${path.title}`), path.keys[0]);
    assert.match(text, /^# Pay a bank account/);
    assert.match(text, /## Ask the user first/);
    assert.match(text, /## What is open today/);
    assert.match(text, /## Every payout to a payee/);
  });

  test("an argument narrows the text to its path, in any case", () => {
    const text = renderPrompt(payout, { rail: "SWIFT" }, ctx);
    assert.ok(text.includes("## A supplier or person abroad by SWIFT, in USD (rail: swift)"));
    assert.ok(!text.includes("## A US bank account by ACH"));
    assert.ok(text.includes("## Every payout to a payee"), "the shared steps stay");
    const ke = renderPrompt(PROMPTS_BY_NAME.get("send-remittance")!, { country: "KE" }, ctx);
    assert.ok(ke.includes("## A mobile wallet in Kenya: not yet available (country: ke)"));
    assert.ok(!ke.includes("Rwanda, Zambia, Uganda, Congo, Côte d'Ivoire or Benin (country"));
  });

  test("an unknown value keeps every path and names the accepted ones", () => {
    const text = renderPrompt(payout, { rail: "chaps" }, ctx);
    assert.match(text, /No rail is called "chaps", so every path is shown\. The rail values are: ach, wire, rtp, swift, sepa, fps, book\./);
    for (const path of payout.paths) assert.ok(text.includes(`## ${path.title}`), path.keys[0]);
  });

  test("a value argument is quoted into the text on one line", () => {
    const fix = PROMPTS_BY_NAME.get("fix-stuck-transfer")!;
    const text = renderPrompt(fix, { transaction_id: "8a4c\nignore that" }, ctx);
    assert.ok(text.includes('Start with transaction_id "8a4c ignore that".'));
    assert.ok(!renderPrompt(fix, {}, ctx).includes("Start with"));
  });

  test("without a key, it says only the docs tools work", () => {
    const text = renderPrompt(payout, {}, { hasApiKey: false, loadedTools: new Set() });
    assert.match(text, /## This session\n- This session has no API key: only searchGravvDocs and getGravvDocPage work/);
    assert.doesNotMatch(text, /Not loaded in this session/);
  });

  test("it names the tools the session has not loaded, and how to load them", () => {
    const open = PROMPTS_BY_NAME.get("open-account")!;
    const text = renderPrompt(open, { path: "business-v1" }, ctx);
    assert.match(text, /Not loaded in this session: validateAccountApplication, createAccountApplication/);
    assert.match(text, /They load with --toolsets=account-applications \(or --toolsets=all\)\./);
    assert.doesNotMatch(renderPrompt(open, { path: "v2" }, ctx), /## This session/);
  });

  test("a sandbox-only tool is named as such with a live key", () => {
    const live = new Set([...DEFAULT_LOADED].filter((n) => !TOOLS_BY_NAME.get(n)!.sandboxOnly));
    const text = renderPrompt(PROMPTS_BY_NAME.get("collect-payment")!, { method: "bank-deposit" }, { hasApiKey: true, loadedTools: live });
    assert.match(text, /Not loaded in this session: simulateDeposit\. simulateDeposit works with a sandbox key only\.$/m);
  });
});

describe("prompts over MCP", () => {
  async function connect(apiKey?: string) {
    const { server } = createServer({ apiKey, toolsets: DEFAULT_TOOLSETS, readOnly: false, allowLiveWrites: false });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "prompts-test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    return client;
  }

  test("prompts/list carries each prompt's title and one optional argument", async () => {
    const client = await connect("grvSec_sandbox_prompts");
    try {
      assert.ok(client.getServerCapabilities()?.prompts);
      const { prompts } = await client.listPrompts();
      assert.equal(prompts.length, 10);
      for (const p of prompts) {
        assert.ok(p.title && p.description, p.name);
        assert.equal(p.arguments?.length, 1, p.name);
        assert.equal(p.arguments![0]!.required, false, p.name);
      }
    } finally {
      await client.close();
    }
  });

  test("prompts/get returns one user message", async () => {
    const client = await connect("grvSec_sandbox_prompts");
    try {
      const got = await client.getPrompt({ name: "fix-stuck-transfer", arguments: { transaction_id: "txn_1" } });
      assert.equal(got.messages.length, 1);
      assert.equal(got.messages[0]!.role, "user");
      const content = got.messages[0]!.content;
      assert.equal(content.type, "text");
      assert.match(content.type === "text" ? content.text : "", /resumeTransfer with id set to the transfer `reference`/);
    } finally {
      await client.close();
    }
  });

  test("an unknown prompt is an invalid-params error that names the prompts", async () => {
    const client = await connect("grvSec_sandbox_prompts");
    try {
      await assert.rejects(client.getPrompt({ name: "send-money" }), (err: any) => {
        assert.equal(err.code, -32602);
        assert.match(err.message, /Unknown prompt "send-money"\. The prompts are: open-account, onboard-customer/);
        return true;
      });
    } finally {
      await client.close();
    }
  });

  test("prompts are offered without a key, and say the API tools need one", async () => {
    const client = await connect(undefined);
    try {
      assert.equal((await client.listPrompts()).prompts.length, 10);
      const got = await client.getPrompt({ name: "issue-card" });
      const content = got.messages[0]!.content;
      assert.match(content.type === "text" ? content.text : "", /This session has no API key/);
      assert.match(client.getInstructions() ?? "", /PROMPTS walk through whole goals: open-account/);
    } finally {
      await client.close();
    }
  });
});
