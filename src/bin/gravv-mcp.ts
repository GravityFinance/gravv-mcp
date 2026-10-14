#!/usr/bin/env node
/**
 * stdio entry point.
 *
 *   GRAVV_API_KEY=grvSec_sandbox_... npx @gravv-infra/mcp
 *   npx @gravv-infra/mcp --toolsets=customers,accounts,transfers
 *   npx @gravv-infra/mcp --read-only
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server.ts";
import { PUBLISHABLE_KEY_MESSAGE, baseUrlWarning, isPublishableKey } from "../client.ts";
import { DEFAULT_DOCS_ORIGIN, InvalidDocsOriginError, parseDocsOrigin } from "../docs.ts";
import { DEFAULT_TOOLSETS, TOOLSETS, UnknownToolsetError, parseToolsets, type Toolset } from "../curation.ts";
import { defaultDownloadDir } from "../files.ts";

const VALID_TOOLSETS: readonly Toolset[] = TOOLSETS;

function usage(): string {
  return `gravv-mcp — MCP server for the Gravv payments API

USAGE
  GRAVV_API_KEY=<key> gravv-mcp [options]

OPTIONS
  --toolsets=<list>   Comma-separated, or "all". Default: ${DEFAULT_TOOLSETS.join(",")}
                      Available: ${VALID_TOOLSETS.join(", ")}
  --read-only         Disable every non-GET tool.
  --base-url=<url>    Override the API base URL. Default: https://api.gravv.xyz
  --docs-origin=<url> Where the documentation tools read the docs.
                      Default: ${DEFAULT_DOCS_ORIGIN}
  --download-dir=<dir> Where downloaded files (KYC document images) are saved.
                      Default: ${defaultDownloadDir()}
  --help

ENVIRONMENT
  GRAVV_API_KEY              Sandbox or live key; the key selects the environment.
  GRAVV_ALLOW_LIVE_WRITES    Set to "true" to permit money movement on a live key.
  GRAVV_RATE_PER_MINUTE      Client-side rate limit. Default 60 (burst 15). The gateway
                             allows 600/min, burst 50, per tenant.
  GRAVV_BASE_URL             Same as --base-url.
  GRAVV_DOCS_ORIGIN          Same as --docs-origin.
  GRAVV_DOWNLOAD_DIR         Same as --download-dir.

NOTES
  Sandbox and live share one base URL — the key decides which. Money-moving tools
  always require an explicit confirm: true, and on a live key additionally require
  GRAVV_ALLOW_LIVE_WRITES=true. Deletes and feature activation require confirm: true.
  Upload tools take a local file_path; the server reads the file, never the model.
`;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(usage());
    return;
  }

  // No key is not fatal: the documentation tools are public and useful on their own,
  // so an agent can learn the API during evaluation before credentials exist.
  const apiKey = process.env.GRAVV_API_KEY || undefined;

  let toolsets: Toolset[] | "all";
  try {
    toolsets = parseToolsets(arg("toolsets") ?? process.env.GRAVV_TOOLSETS, (message) =>
      process.stderr.write(`warning: ${message}\n`),
    );
  } catch (err) {
    if (!(err instanceof UnknownToolsetError)) throw err;
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
  }

  // The docs site serves /llms.txt and /llms-full.txt. Its address is configurable so a
  // move of the docs needs no release; a value that is not a URL stops the server here
  // rather than leaving the documentation tools to fail on every call.
  let docsOrigin = DEFAULT_DOCS_ORIGIN;
  const rawDocsOrigin = arg("docs-origin") ?? (process.env.GRAVV_DOCS_ORIGIN || undefined);
  if (rawDocsOrigin !== undefined) {
    try {
      docsOrigin = parseDocsOrigin(rawDocsOrigin);
    } catch (err) {
      if (!(err instanceof InvalidDocsOriginError)) throw err;
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(1);
    }
  }

  const rate = Number(process.env.GRAVV_RATE_PER_MINUTE ?? "");

  const baseUrl = arg("base-url") ?? (process.env.GRAVV_BASE_URL || undefined);
  const urlWarning = baseUrlWarning(baseUrl);
  if (urlWarning) process.stderr.write(`warning: ${urlWarning}\n`);

  const { server, environment, tools } = createServer({
    apiKey,
    baseUrl,
    toolsets,
    readOnly: process.argv.includes("--read-only"),
    allowLiveWrites: process.env.GRAVV_ALLOW_LIVE_WRITES === "true",
    ratePerMinute: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    docsOrigin,
    downloadDir: arg("download-dir") ?? (process.env.GRAVV_DOWNLOAD_DIR || undefined),
  });

  // Startup banner on stderr so the operator can see which environment they attached to
  // without corrupting the protocol stream.
  const docsNote = docsOrigin === DEFAULT_DOCS_ORIGIN ? "" : ` | docs=${docsOrigin}`;
  process.stderr.write(
    apiKey
      ? `gravv-mcp: ${tools.length} API tools + 2 docs tools | environment=${environment}` +
          (environment !== "sandbox" && process.env.GRAVV_ALLOW_LIVE_WRITES === "true"
            ? " | LIVE WRITES ENABLED"
            : "") +
          docsNote +
          "\n"
      : `gravv-mcp: docs-only (GRAVV_API_KEY not set) — searchGravvDocs and getGravvDocPage available${docsNote}\n`,
  );

  if (apiKey && isPublishableKey(apiKey)) process.stderr.write(`warning: ${PUBLISHABLE_KEY_MESSAGE}\n`);

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(`gravv-mcp failed to start: ${err?.message ?? err}\n`);
  process.exit(1);
});
