#!/usr/bin/env node
/**
 * stdio entry point.
 *
 *   GRAVV_API_KEY=grvSec_sandbox_... npx @gravv/mcp
 *   npx @gravv/mcp --toolsets=customers,accounts,transfers
 *   npx @gravv/mcp --read-only
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server.ts";
import { DEFAULT_TOOLSETS, type Toolset } from "../curation.ts";

const VALID_TOOLSETS: Toolset[] = [
  "customers",
  "accounts",
  "transfers",
  "transactions",
  "external-accounts",
  "cards",
  "wallets",
  "fx",
  "collections",
  "payment-links",
  "kyc",
  "features",
  "webhooks",
];

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
  GRAVV_API_KEY              Required. Sandbox or live key; the key selects the environment.
  GRAVV_ALLOW_LIVE_WRITES    Set to "true" to permit money movement on a live key.
  GRAVV_RATE_PER_MINUTE      Client-side rate limit. Default 10.
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

  const apiKey = process.env.GRAVV_API_KEY;
  if (!apiKey) {
    // stderr, not stdout — stdout is the MCP transport.
    process.stderr.write("error: GRAVV_API_KEY is not set.\n\n" + usage());
    process.exit(1);
  }

  const raw = arg("toolsets") ?? process.env.GRAVV_TOOLSETS;
  let toolsets: Toolset[] | "all";
  if (!raw) {
    toolsets = DEFAULT_TOOLSETS;
  } else if (raw === "all") {
    toolsets = "all";
  } else {
    const requested = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const bad = requested.filter((t) => !VALID_TOOLSETS.includes(t as Toolset));
    if (bad.length) {
      process.stderr.write(
        `error: unknown toolset(s): ${bad.join(", ")}\nAvailable: ${VALID_TOOLSETS.join(", ")}\n`,
      );
      process.exit(1);
    }
    toolsets = requested as Toolset[];
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
    `gravv-mcp: ${tools.length} tools | environment=${environment}` +
      (environment !== "sandbox" && process.env.GRAVV_ALLOW_LIVE_WRITES === "true"
        ? " | LIVE WRITES ENABLED"
        : "") +
      "\n",
  );

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(`gravv-mcp failed to start: ${err?.message ?? err}\n`);
  process.exit(1);
});
