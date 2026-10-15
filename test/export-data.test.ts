import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPORT_FILE, buildExport, renderExport } from "../scripts/export-data.ts";

describe("shared data export", () => {
  test("data/gravv-shared.json is up to date (run `npm run export-data`)", () => {
    assert.equal(readFileSync(EXPORT_FILE, "utf8"), renderExport());
  });

  test("every fix names routes, not tool names", () => {
    for (const fix of buildExport().error_fixes) {
      for (const op of fix.ops) assert.match(op, /^(GET|POST|PUT|PATCH|DELETE) \/v[12]\//, `${fix.id}: ${op}`);
    }
  });

  test("every message pattern survives the trip through JSON", () => {
    for (const fix of buildExport().error_fixes) {
      for (const m of fix.messages) assert.doesNotThrow(() => new RegExp(m.source, m.flags), fix.id);
    }
  });
});
