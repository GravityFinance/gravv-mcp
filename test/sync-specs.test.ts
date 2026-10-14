import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REDIRECTS_FILE, readDocsRedirects, renderDocsRedirects } from "../scripts/sync-specs.ts";
import { DOCS_REDIRECTS } from "../src/docs-redirects.ts";

function docsDir(syntext: unknown, redirects: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "sync-specs-"));
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "syntext.json"), JSON.stringify(syntext));
  writeFileSync(join(dir, "docs", "_redirects.json"), JSON.stringify(redirects));
  return dir;
}

describe("docs redirects", () => {
  test("are read from syntext.json, then docs/_redirects.json", () => {
    const dir = docsDir(
      { name: "Gravv", redirects: [{ from: "/a", to: "/platform/a" }] },
      [
        { from: "/a", to: "/later/loses" },
        { from: "/b/*", to: "/platform/b/:splat" },
      ],
    );
    try {
      assert.deepEqual(readDocsRedirects(dir), [
        ["/a", "/platform/a"],
        ["/a", "/later/loses"],
        ["/b/*", "/platform/b/:splat"],
      ]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("refuse a missing file or an entry that is not a path pair", () => {
    const dir = docsDir({ redirects: [{ from: "a", to: "/b" }] }, []);
    try {
      assert.throws(() => readDocsRedirects(dir), /syntext\.json\[0\]: a redirect needs "from" and "to" paths/);
      rmSync(join(dir, "docs", "_redirects.json"));
      writeFileSync(join(dir, "syntext.json"), "{}");
      assert.throws(() => readDocsRedirects(dir), /_redirects\.json does not exist/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("the vendored file is exactly what sync-specs writes for its own entries", () => {
    const vendored = readFileSync(new URL(`../${REDIRECTS_FILE}`, import.meta.url), "utf8");
    assert.equal(renderDocsRedirects(DOCS_REDIRECTS), vendored);
  });
});
