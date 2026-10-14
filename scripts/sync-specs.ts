/**
 * Refresh the vendored OpenAPI specifications in ./specs, and the docs redirects in
 * src/docs-redirects.ts.
 *
 * The specifications are maintained alongside the published documentation. We vendor a
 * copy here so the package builds standalone, and so a specification change shows up as
 * a visible diff in this repository's history rather than as invisible upstream drift.
 *
 * The docs redirects come from the same repository: syntext.json `redirects`, then
 * docs/_redirects.json. The doc index is built from llms.txt, which lists pages only, so
 * a page that moved is found through this copy (see DocsIndex.getPage).
 *
 * Set GRAVV_OPENAPI_DIR to the openapi/ directory of a local checkout of the specification
 * source. The redirects are read from the directory above it, or from GRAVV_DOCS_DIR.
 *
 *   npm run sync-specs           copy, delete specs removed upstream, and report changes
 *   npm run sync-specs -- --check   exit non-zero if vendored specs or redirects are stale (CI)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dest = join(root, "specs");
/** Where the vendored redirects live, relative to the repository root. */
export const REDIRECTS_FILE = "src/docs-redirects.ts";

export type Redirect = readonly [from: string, to: string];

/**
 * The docs site's redirects, in the order the site applies them: syntext.json first, then
 * docs/_redirects.json. Throws when a file is missing or an entry is not a path pair.
 */
export function readDocsRedirects(docsDir: string): Redirect[] {
  const sources: Array<{ file: string; list: (raw: unknown) => unknown }> = [
    { file: "syntext.json", list: (raw) => (raw as { redirects?: unknown }).redirects ?? [] },
    { file: join("docs", "_redirects.json"), list: (raw) => raw },
  ];
  const out: Redirect[] = [];
  for (const { file, list } of sources) {
    const path = join(docsDir, file);
    if (!existsSync(path)) throw new Error(`${path} does not exist`);
    const entries = list(JSON.parse(readFileSync(path, "utf8")));
    if (!Array.isArray(entries)) throw new Error(`${path}: the redirects are not a list`);
    entries.forEach((entry: unknown, i) => {
      const { from, to } = (entry ?? {}) as { from?: unknown; to?: unknown };
      if (typeof from !== "string" || typeof to !== "string" || !from.startsWith("/") || !to.startsWith("/")) {
        throw new Error(`${path}[${i}]: a redirect needs "from" and "to" paths that start with /`);
      }
      out.push([from, to]);
    });
  }
  return out;
}

/** src/docs-redirects.ts for these redirects. */
export function renderDocsRedirects(redirects: readonly Redirect[]): string {
  const rows = redirects.map(([from, to]) => `  [${JSON.stringify(from)}, ${JSON.stringify(to)}],`);
  return [
    "/**",
    " * The docs site's redirects, copied from client-docs: syntext.json `redirects`, then",
    " * docs/_redirects.json, in the order the site applies them. getGravvDocPage follows them,",
    " * so a slug for a page that moved still finds its page.",
    " *",
    " * Written by `npm run sync-specs`; `npm run sync-specs -- --check` fails when it is stale.",
    " * Do not edit by hand.",
    " */",
    "export const DOCS_REDIRECTS: ReadonlyArray<readonly [from: string, to: string]> = [",
    ...rows,
    "];",
    "",
  ].join("\n");
}

function main(): void {
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
    if (checkOnly) {
      console.error(`STALE: specs/${f} no longer exists upstream`);
    } else {
      rmSync(join(dest, f));
      console.log(`  removed specs/${f} (no longer in the specification source)`);
    }
  }

  // The redirects sit beside openapi/ in the same checkout.
  const docsDir = process.env.GRAVV_DOCS_DIR || dirname(resolve(source));
  let redirects: Redirect[];
  try {
    redirects = readDocsRedirects(docsDir);
  } catch (err) {
    console.error(`error: could not read the docs redirects: ${(err as Error).message}`);
    console.error("Set GRAVV_DOCS_DIR to the client-docs checkout when openapi/ is not inside it.");
    process.exit(1);
  }
  const redirectsPath = join(root, REDIRECTS_FILE);
  const rendered = renderDocsRedirects(redirects);
  const currentRedirects = existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : null;
  if (currentRedirects !== rendered) {
    changed++;
    if (checkOnly) {
      console.error(`STALE: ${REDIRECTS_FILE} differs from the docs redirects (${redirects.length} upstream)`);
    } else {
      writeFileSync(redirectsPath, rendered);
      console.log(`  updated ${REDIRECTS_FILE} (${redirects.length} redirects)`);
    }
  }

  if (checkOnly) {
    if (changed > 0) {
      console.error(`\n${changed} file(s) out of sync. Run: npm run sync-specs`);
      process.exit(1);
    }
    console.log(
      `specs and docs redirects are in sync with the specification source (${files.length} specs, ${redirects.length} redirects)`,
    );
  } else {
    console.log(
      changed === 0
        ? `specs and docs redirects already current (${files.length} specs, ${redirects.length} redirects)`
        : `synced ${changed} file(s)`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
