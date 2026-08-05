/**
 * MCP server assembly: pick the tool set, register handlers, enforce safety.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { GravvClient, GravvApiError, detectEnvironment, type Environment } from "./client.ts";
import { SafetyGate, SafetyError, redact } from "./safety.ts";
import { BLOCKED_TOOL_NAMES, type Toolset } from "./curation.ts";
import { TOOLS, TOOLS_BY_NAME, type GeneratedTool } from "./generated/tools.ts";
import { DocsIndex } from "./docs.ts";

/**
 * Documentation tools, always present regardless of --toolsets.
 *
 * These are the half that teaches. The API tools can execute a call but cannot explain
 * what has to happen before it, which corridor fields apply, or why a transfer failed.
 * They need no API key — the docs are public — so they also work during evaluation,
 * before a merchant has credentials.
 */
const DOC_TOOLS = [
  {
    name: "searchGravvDocs",
    description:
      "Search the Gravv documentation — integration guides, recipes, and API reference (177 pages). " +
      "Use this BEFORE implementing any Gravv integration, and whenever a call fails in a way the error " +
      "does not fully explain. The guides carry the ordering, prerequisites, and corridor rules that the " +
      "API tool schemas do not. Returns ranked pages with excerpts; follow up with getGravvDocPage for full text.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What you want to know, in natural language. e.g. 'create a wallet on polygon', 'why is my transfer pending', 'idempotency key rules'.",
        },
        limit: { type: "number", description: "Maximum results. Default 6.", default: 6 },
        section: {
          type: "string",
          description:
            "Optional filter. 'Get Started' and 'Recipes' hold end-to-end flows; 'Developer Platform' holds per-feature guides; 'API Reference' holds per-endpoint detail.",
          enum: ["Get Started", "Developer Platform", "Recipes", "API Reference", "Home"],
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "getGravvDocPage",
    description:
      "Fetch the full text of one Gravv documentation page by slug, as returned by searchGravvDocs. " +
      "Use when an excerpt is not enough — for worked examples, complete request/response bodies, or a full flow diagram.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "Page slug without the .md suffix, e.g. 'platform/wallets/create-a-wallet' or 'recipes/remit-funds-to-a-recipient'.",
        },
      },
      required: ["slug"],
      additionalProperties: false,
    },
  },
] as const;

export interface ServerConfig {
  /** Omit to run docs-only: the documentation tools work without credentials. */
  apiKey?: string;
  baseUrl?: string;
  toolsets: Toolset[] | "all";
  readOnly: boolean;
  allowLiveWrites: boolean;
  ratePerMinute?: number;
  docsOrigin?: string;
  fetchImpl?: typeof fetch;
}

export function selectTools(toolsets: Toolset[] | "all", gate: SafetyGate): GeneratedTool[] {
  const wanted = toolsets === "all" ? null : new Set(toolsets);
  return TOOLS.filter((t) => (wanted === null || wanted.has(t.toolset)) && gate.isToolAvailable(t));
}

function instructions(
  environment: Environment,
  gate: SafetyGate,
  tools: GeneratedTool[],
  hasApiKey: boolean,
): string {
  const sets = [...new Set(tools.map((t) => t.toolset))].sort();

  const lines = [
    "Gravv — payments infrastructure for global money movement.",
    "",
    hasApiKey
      ? `ENVIRONMENT: ${gate.describeEnvironment()}`
      : "ENVIRONMENT: no API key configured. Documentation tools work; API tools are unavailable until GRAVV_API_KEY is set.",
    "",
    "START WITH THE DOCS. Call searchGravvDocs before implementing anything. The API tool",
    "schemas describe individual calls; they do not describe how the flows fit together.",
    "The guides do — ordering, prerequisites, corridor rules, and worked examples.",
    "",
  ];

  if (hasApiKey) {
    lines.push(
      `${tools.length} API tools loaded across: ${sets.join(", ")}.`,
      "",
      "Working with this API:",
      "- Read each tool's description before calling it. Several operations have prerequisites that are not obvious from their names — an account needs a KYC-verified customer, an external account must reach status `active` before you can transfer to it, and server-to-server KYC requires documents uploaded first.",
      "- Operations that move money return a preview instead of executing. Show the preview to the user, get agreement, then call again with confirm: true.",
      "- Idempotency keys are generated automatically for POSTs. The key used is returned with each result, so a deliberate retry can reuse it.",
      "- Sandbox and live hold entirely separate data. An id from one environment will 404 in the other.",
      "- When a call fails in a way the error does not fully explain, search the docs rather than guessing at the payload.",
    );
  } else {
    lines.push(
      "Only searchGravvDocs and getGravvDocPage are available. To execute API calls, set",
      "GRAVV_API_KEY to a sandbox key and restart.",
    );
  }

  return lines.join("\n");
}

export function createServer(config: ServerConfig) {
  const hasApiKey = Boolean(config.apiKey);
  const environment = detectEnvironment(config.apiKey ?? "");

  const gate = new SafetyGate({
    environment,
    allowLiveWrites: config.allowLiveWrites,
    readOnly: config.readOnly,
  });

  const client = hasApiKey
    ? new GravvClient({
        apiKey: config.apiKey!,
        baseUrl: config.baseUrl,
        ratePerMinute: config.ratePerMinute,
        fetchImpl: config.fetchImpl,
      })
    : null;

  const docs = new DocsIndex({ origin: config.docsOrigin, fetchImpl: config.fetchImpl });

  // Docs tools are unconditional; API tools require credentials.
  const active = hasApiKey ? selectTools(config.toolsets, gate) : [];
  const activeByName = new Map(active.map((t) => [t.name, t]));

  const server = new Server(
    { name: "gravv", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions: instructions(environment, gate, active, hasApiKey),
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...DOC_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      ...active.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    // ---- documentation tools -------------------------------------------------
    if (name === "searchGravvDocs") {
      try {
        const hits = await docs.search(
          String(args.query ?? ""),
          typeof args.limit === "number" ? args.limit : 6,
          typeof args.section === "string" ? args.section : undefined,
        );
        if (hits.length === 0) {
          return okResult(
            JSON.stringify(
              {
                results: [],
                hint: `No documentation matched "${args.query}". Try fewer or more general terms, or drop the section filter.`,
              },
              null,
              2,
            ),
          );
        }
        return okResult(
          JSON.stringify(
            {
              results: hits,
              next: "Call getGravvDocPage with a slug from these results for the full page.",
            },
            null,
            2,
          ),
        );
      } catch (err) {
        return errorResult(`Documentation search failed: ${(err as Error).message}`);
      }
    }

    if (name === "getGravvDocPage") {
      try {
        const page = await docs.getPage(String(args.slug ?? ""));
        if (!page) {
          return errorResult(
            `No documentation page with slug "${args.slug}". Use searchGravvDocs to find the correct slug.`,
          );
        }
        return okResult(
          `# ${page.title}\nSection: ${page.section}\nURL: ${page.url}\n\n${page.content}`,
        );
      } catch (err) {
        return errorResult(`Could not fetch documentation page: ${(err as Error).message}`);
      }
    }

    // ---- API tools -----------------------------------------------------------
    if (!hasApiKey) {
      return errorResult(
        `${name} needs an API key. Set GRAVV_API_KEY to a sandbox key and restart. ` +
          `The documentation tools (searchGravvDocs, getGravvDocPage) work without one.`,
      );
    }

    const tool = activeByName.get(name);
    if (!tool) {
      // Three distinct reasons a name can miss, and the model should stop retrying for
      // different reasons in each case.
      const blocked = BLOCKED_TOOL_NAMES[name];
      if (blocked) return errorResult(`${name}: ${blocked}`);

      const known = TOOLS_BY_NAME.get(name);
      if (known) {
        return errorResult(
          `${name} exists but its toolset is not loaded in this session. Enabled: ${[
            ...new Set(active.map((t) => t.toolset)),
          ].join(", ")}. Restart the server with --toolsets=${known.toolset} (or --toolsets=all).`,
        );
      }

      return errorResult(
        `Unknown tool "${name}". Loaded tools: ${active.map((t) => t.name).sort().join(", ")}`,
      );
    }

    try {
      const preview = client!.buildRequest(tool, args);
      const gateResult = gate.check(tool, args, {
        method: tool.method.toUpperCase(),
        path: tool.path,
        body: preview.body,
      });

      if (gateResult) {
        return { content: [{ type: "text" as const, text: JSON.stringify(gateResult, null, 2) }] };
      }

      const result = await client!.call(tool, args);

      const payload: Record<string, unknown> = {
        environment,
        data: redact(result.data),
      };
      if (result.idempotencyKey) payload.idempotency_key = result.idempotencyKey;
      if (result.replayed) {
        payload.note =
          "This response was replayed from a previous identical request rather than re-executed. No new operation was performed.";
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    } catch (err) {
      if (err instanceof SafetyError) return errorResult(err.message);
      if (err instanceof GravvApiError) {
        return errorResult(
          JSON.stringify(
            { error: err.message, status: err.status, hint: err.hint, details: redact(err.body) },
            null,
            2,
          ),
        );
      }
      return errorResult(`Unexpected error calling ${name}: ${(err as Error).message}`);
    }
  });

  return { server, environment, tools: active, gate };
}

function okResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}
