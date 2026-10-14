import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MAX_RESULT_CHARS, ToolNameCollisionError, capResult, selectTools } from "../src/server.ts";
import { SafetyGate } from "../src/safety.ts";
import { TOOLS, TOOLS_BY_NAME } from "../src/generated/tools.ts";

const gate = new SafetyGate({ environment: "sandbox", allowLiveWrites: false, readOnly: false });

describe("result size", () => {
  test("a small answer is returned whole", () => {
    const payload = { environment: "sandbox", data: { id: "acc_1" } };
    assert.equal(capResult(payload), JSON.stringify(payload, null, 2));
  });

  test("a long list keeps its first items, stays JSON, and says how many were left out", () => {
    const items = Array.from({ length: 2000 }, (_, i) => ({ id: `row_${i}`, memo: "x".repeat(100) }));
    const text = capResult({ environment: "sandbox", data: { items, page: 1 } });
    assert.ok(text.length <= MAX_RESULT_CHARS, `${text.length}`);
    const parsed = JSON.parse(text);
    assert.equal(parsed.data.items[0].id, "row_0");
    assert.ok(parsed.data.items.length < 2000);
    assert.equal(parsed.data.page, 1);
    assert.match(parsed.truncated, new RegExp(`Showing ${parsed.data.items.length} of 2000 items`));
  });

  test("anything else is cut as text, with a note", () => {
    const text = capResult({ data: { blob: "y".repeat(MAX_RESULT_CHARS * 2) } });
    assert.equal(text.length, MAX_RESULT_CHARS);
    assert.match(text, /\[truncated by gravv-mcp: the answer is \d+ characters/);
  });
});

describe("tool selection", () => {
  test("a manual tool that takes a generated name stops the server", () => {
    const clash = { ...TOOLS_BY_NAME.get("listAccounts")! };
    assert.throws(() => selectTools("all", gate, [clash]), ToolNameCollisionError);
  });

  test("manual tools with their own names are added", () => {
    const own = { ...TOOLS_BY_NAME.get("listAccounts")!, name: "listSomethingElse" };
    const names = selectTools("all", gate, [own]).map((t) => t.name);
    assert.equal(names.length, TOOLS.length + 1);
    assert.ok(names.includes("listSomethingElse"));
  });
});
