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
import { PUBLISHABLE_KEY_MESSAGE, isPublishableKey } from "../client.ts";
import { DEFAULT_TOOLSETS, TOOLSETS, UnknownToolsetError, parseToolsets, type Toolset } from "../curation.ts";

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
  --help

ENVIRONMENT
  GRAVV_API_KEY              Sandbox or live key; the key selects the environment.
  GRAVV_ALLOW_LIVE_WRITES    Set to "true" to permit money movement on a live key.
  GRAVV_RATE_PER_MINUTE      Client-side rate limit. Default 60 (burst 15). The gateway
                             allows 600/min, burst 50, per tenant.
  GRAVV_BASE_URL             Same as --base-url.

NOTES
  Sandbox and live share one base URL — the key decides which. Money-moving tools
  always require an explicit confirm: true, and on a live key additionally require
  GRAVV_ALLOW_LIVE_WRITES=true.
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

  const rate = Number(process.env.GRAVV_RATE_PER_MINUTE ?? "");

  const { server, environment, tools } = createServer({
    apiKey,
    baseUrl: arg("base-url") ?? process.env.GRAVV_BASE_URL,
    toolsets,
    readOnly: process.argv.includes("--read-only"),
    allowLiveWrites: process.env.GRAVV_ALLOW_LIVE_WRITES === "true",
    ratePerMinute: Number.isFinite(rate) && rate > 0 ? rate : undefined,
  });

  // Startup banner on stderr so the operator can see which environment they attached to
  // without corrupting the protocol stream.
  process.stderr.write(
    apiKey
      ? `gravv-mcp: ${tools.length} API tools + 2 docs tools | environment=${environment}` +
          (environment !== "sandbox" && process.env.GRAVV_ALLOW_LIVE_WRITES === "true"
            ? " | LIVE WRITES ENABLED"
            : "") +
          "\n"
      : "gravv-mcp: docs-only (GRAVV_API_KEY not set) — searchGravvDocs and getGravvDocPage available\n",
  );

  if (apiKey && isPublishableKey(apiKey)) process.stderr.write(`warning: ${PUBLISHABLE_KEY_MESSAGE}\n`);

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(`gravv-mcp failed to start: ${err?.message ?? err}\n`);
  process.exit(1);
});
