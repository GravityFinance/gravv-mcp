/**
 * Refresh the vendored OpenAPI specifications in ./specs.
 *
 * The specifications are maintained alongside the published documentation. We vendor a
 * copy here so the package builds standalone, and so a specification change shows up as
 * a visible diff in this repository's history rather than as invisible upstream drift.
 *
 * Set GRAVV_OPENAPI_DIR to a local checkout of the specification source.
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

const source = process.env.GRAVV_OPENAPI_DIR;
const checkOnly = process.argv.includes("--check");

if (!source) {
  console.error("error: GRAVV_OPENAPI_DIR is not set.");
  console.error("Point it at a local directory holding the Gravv OpenAPI specifications:");
  console.error("  GRAVV_OPENAPI_DIR=/path/to/openapi npm run sync-specs");
  process.exit(1);
}

if (!existsSync(source)) {
  console.error(`error: GRAVV_OPENAPI_DIR does not exist: ${source}`);
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
    console.error(`STALE: specs/${f} differs from the specification source`);
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
  else console.log(`  (remove specs/${f} — no longer in the specification source)`);
}

if (checkOnly) {
  if (changed > 0) {
    console.error(`\n${changed} spec(s) out of sync. Run: npm run sync-specs`);
    process.exit(1);
  }
  console.log(`specs are in sync with the specification source (${files.length} files)`);
} else {
  console.log(changed === 0 ? `specs already current (${files.length} files)` : `synced ${changed} spec(s)`);
}
