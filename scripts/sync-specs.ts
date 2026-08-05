/**
 * Copy the OpenAPI specs from apps/client-docs into ./specs.
 *
 * client-docs is the source of truth for API shapes — it is what builds the public
 * docs site. We vendor a copy so the package builds without the sibling repo checked
 * out, and so a spec change is a visible diff in this repo's history rather than an
 * invisible upstream drift.
 *
 *   npm run sync-specs           copy and report changes
 *   npm run sync-specs -- --check   exit non-zero if vendored specs are stale (CI)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dest = join(root, "specs");

// Default location relative to the monorepo layout; override for other checkouts.
const source = process.env.GRAVV_OPENAPI_DIR ?? join(root, "..", "client-docs", "openapi");
const checkOnly = process.argv.includes("--check");

if (!existsSync(source)) {
  console.error(`error: spec source not found: ${source}`);
  console.error("Set GRAVV_OPENAPI_DIR to the client-docs openapi/ directory.");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

const files = readdirSync(source).filter((f) => f.endsWith(".yaml"));
let changed = 0;

for (const f of files) {
  const incoming = readFileSync(join(source, f), "utf8");
  const target = join(dest, f);
  const current = existsSync(target) ? readFileSync(target, "utf8") : null;

  if (current === incoming) continue;

  changed++;
  if (checkOnly) {
    console.error(`STALE: specs/${f} differs from ${source}/${f}`);
  } else {
    writeFileSync(target, incoming);
    console.log(`  updated specs/${f}`);
  }
}

// A spec deleted upstream must not linger here — it would keep generating a tool for
// an endpoint that no longer exists.
for (const f of readdirSync(dest).filter((f) => f.endsWith(".yaml"))) {
  if (files.includes(f)) continue;
  changed++;
  if (checkOnly) console.error(`STALE: specs/${f} no longer exists upstream`);
  else console.log(`  (remove specs/${f} — no longer in client-docs)`);
}

if (checkOnly) {
  if (changed > 0) {
    console.error(`\n${changed} spec(s) out of sync. Run: npm run sync-specs`);
    process.exit(1);
  }
  console.log(`specs are in sync with client-docs (${files.length} files)`);
} else {
  console.log(changed === 0 ? `specs already current (${files.length} files)` : `synced ${changed} spec(s)`);
}
