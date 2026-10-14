/**
 * MCP server assembly: pick the tool set, register handlers, enforce safety.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  GravvClient,
  GravvApiError,
  PUBLISHABLE_KEY_MESSAGE,
  bodyWithoutHtml,
  errorFields,
  detectEnvironment,
  isPublishableKey,
  isValidIdempotencyKey,
  type Environment,
} from "./client.ts";
import { SafetyGate, SafetyError, redact, checkCollectionMethods } from "./safety.ts";
import { BLOCKED_TOOL_NAMES, type Toolset } from "./curation.ts";
import { TOOLS, TOOLS_BY_NAME, type GeneratedTool } from "./generated/tools.ts";
import { DEFAULT_DOCS_ORIGIN, DocsIndex } from "./docs.ts";
import { MANUAL_TOOLS } from "./manual-tools.ts";
import { FileArgumentError, defaultDownloadDir, resolveUploads, saveDownload } from "./files.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Read the version from package.json rather than hardcoding it. A literal here had
 * already drifted — the server reported 0.1.0 while the package was 0.2.0, so clients
 * were told the wrong version.
 */
function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const rel of ["../package.json", "../../package.json"]) {
      try {
        return JSON.parse(readFileSync(join(here, rel), "utf8")).version;
      } catch {
        /* try the next candidate */
      }
    }
  } catch {
    /* fall through */
  }
  return "0.0.0";
}

const VERSION = packageVersion();

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
      "Search the Gravv documentation — integration guides, recipes, and API reference, every page the docs site lists. " +
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
            "Optional filter: one docs section, as the section field of a result names it. The names come from the docs site's index, so there is no fixed list; an unknown name returns the sections there are.",
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
            "Page slug without the .md suffix, e.g. 'platform/wallets/create-a-wallet' or 'recipes/remit-funds-to-a-recipient'. The page's full docs URL also works.",
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
  /** Clock for the docs cache; tests replace it, as they replace fetch. */
  now?: () => number;
  /** Where downloaded files are saved. Defaults to a gravv-mcp-downloads folder in the OS temp dir. */
  downloadDir?: string;
}

export function selectTools(toolsets: Toolset[] | "all", gate: SafetyGate): GeneratedTool[] {
  const wanted = toolsets === "all" ? null : new Set(toolsets);
  // Tools for routes no OpenAPI specification covers are hand-authored and merged in
  // here rather than generated.
  const candidates: GeneratedTool[] = [...TOOLS, ...MANUAL_TOOLS];
  return candidates.filter((t) => (wanted === null || wanted.has(t.toolset)) && gate.isToolAvailable(t));
}

export function instructions(
  environment: Environment,
  gate: SafetyGate,
  tools: GeneratedTool[],
  hasApiKey: boolean,
  publishableKey: boolean,
): string {
  const sets = [...new Set(tools.map((t) => t.toolset))].sort();

  const lines = [
    "Gravv — payments infrastructure for global money movement.",
    "",
    hasApiKey
      ? `ENVIRONMENT: ${gate.describeEnvironment()}`
      : "ENVIRONMENT: no API key configured. Documentation tools work; API tools are unavailable until GRAVV_API_KEY is set.",
    ...(publishableKey ? [`WARNING: ${PUBLISHABLE_KEY_MESSAGE}`] : []),
    "",
    "START WITH THE DOCS. Call searchGravvDocs before implementing anything. The API tool",
    "schemas describe individual calls; they do not describe how the flows fit together.",
    "The guides do — ordering, prerequisites, corridor rules, and worked examples.",
    "",
  ];

  if (hasApiKey) {
    lines.push(
      tools.length > 0
        ? `${tools.length} API tools loaded across: ${sets.join(", ")}.`
        : "No API tools loaded: the --toolsets selection matched none. Restart with --toolsets=all, or name the toolsets you need.",
      "",
      "Working with this API:",
      "- Read each tool's description before calling it. Several operations have prerequisites that are not obvious from their names — an account needs a KYC-verified customer, an external account must reach status `active` before you can transfer to it, and server-to-server KYC requires documents uploaded first.",
      "- Operations that move money, and those that cannot be undone (deletes, feature activation), return a preview instead of executing. Show the preview to the user, get agreement, then call again with confirm: true.",
      "- Idempotency keys are made automatically for POSTs, a new one for every call, and returned with every result.",
      "- After a timeout, a network error or a 5xx, the outcome is unknown: look the result up first (the error's hint names the tool). If nothing landed, call again with the same arguments plus the idempotency_key from that result. A 5xx is not kept, so the same key runs the call again.",
      "- After any other 4xx, or a 429, leave idempotency_key out when you call again: a 4xx answer is kept for 24 hours under its key. Read the hint first: when the call may still have landed, it says to look the result up before calling again. The one exception is a 409 whose hint says the first call is still running: resend that with the same key.",
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
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        ratePerMinute: config.ratePerMinute,
        fetchImpl: config.fetchImpl,
      })
    : null;

  const docs = new DocsIndex({ origin: config.docsOrigin, fetchImpl: config.fetchImpl, now: config.now });

  // Docs tools are unconditional; API tools require credentials.
  const active = hasApiKey ? selectTools(config.toolsets, gate) : [];
  const activeByName = new Map(active.map((t) => [t.name, t]));

  const server = new Server(
    { name: "gravv", version: VERSION },
    {
      capabilities: { tools: {} },
      instructions: instructions(environment, gate, active, hasApiKey, isPublishableKey(config.apiKey ?? "")),
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
        // Section names are the site's, and change as the docs are regrouped, so the
        // argument has no enum. Check it against the index instead, and name the real ones.
        if (typeof args.section === "string" && args.section.trim() !== "") {
          const sections = await docs.listSections();
          const wanted = args.section.trim().toLowerCase();
          if (!sections.some((s) => s.toLowerCase() === wanted)) {
            return errorResult(
              `No docs section is called "${args.section}". The sections are: ${sections.join(", ")}. ` +
                "Use one of them, or leave section out to search every page.",
            );
          }
        }
        const hits = await docs.search(
          String(args.query ?? ""),
          typeof args.limit === "number" ? args.limit : 6,
          typeof args.section === "string" ? args.section : undefined,
        );
        const note = staleDocsNote(docs);
        if (hits.length === 0) {
          return okResult(
            JSON.stringify(
              {
                results: [],
                hint: `No documentation matched "${args.query}". Try fewer or more general terms, or drop the section filter.`,
                ...(note ? { note } : {}),
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
              ...(note ? { note } : {}),
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
        const note = staleDocsNote(docs);
        return okResult(
          `${note ? `Note: ${note}\n\n` : ""}# ${page.title}\nSection: ${page.section}\nURL: ${page.url}\n\n${page.content}`,
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
      // Docs links follow GRAVV_DOCS_ORIGIN, as the doc search does.
      if (blocked) return errorResult(`${name}: ${blocked.replaceAll(DEFAULT_DOCS_ORIGIN, docs.origin)}`);

      const known = TOOLS_BY_NAME.get(name);
      const off = known ? gate.unavailableReason(known) : null;
      if (off) return errorResult(off);
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
      // A local file_path becomes the file's base64 here, so the model never carries it.
      let callArgs: Record<string, unknown>;
      try {
        callArgs = resolveUploads(tool.name, args);
      } catch (err) {
        if (err instanceof FileArgumentError) return errorResult(`${tool.name}: ${err.message}. Nothing was sent.`);
        throw err;
      }

      // A key the model passes back resends a call whose outcome is unknown. A value that
      // is not a valid key cannot be one an earlier result returned, so refuse it before
      // the preview rather than quietly making a new key and running the call twice.
      const suppliedKey = tool.needsIdempotency ? args.idempotency_key : undefined;
      if (suppliedKey != null && !isValidIdempotencyKey(suppliedKey)) {
        return errorResult(
          "idempotency_key must be 1-255 printable ASCII characters. Pass it exactly as an earlier result " +
            "returned it, or leave it out and a new key is made.",
        );
      }

      const preview = client!.buildRequest(tool, callArgs);

      // Redirect a card method smuggled past the schema, before it reaches the API and
      // silently succeeds through the weaker path.
      const wrongTool = checkCollectionMethods(tool.name, preview.body);
      if (wrongTool) return errorResult(wrongTool);

      const gateResult = gate.check(tool, args, {
        method: tool.method.toUpperCase(),
        path: tool.path,
        body: preview.body,
      });

      if (gateResult) {
        return { content: [{ type: "text" as const, text: JSON.stringify(gateResult, null, 2) }] };
      }

      const result = await client!.call(tool, callArgs, { idempotencyKey: suppliedKey ?? undefined });

      const payload: Record<string, unknown> = {
        environment,
        data: redact(saveDownload(tool.name, callArgs, result.data, config.downloadDir ?? defaultDownloadDir())),
      };
      if (result.idempotencyKey) payload.idempotency_key = result.idempotencyKey;
      if (result.replayed) {
        payload.note =
          "This response was replayed from a previous identical request rather than re-executed. No new operation was performed.";
      } else if (result.retriedWithNewKey) {
        payload.note = "Rate limited first; retried with a new key. The earlier attempts did not run.";
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    } catch (err) {
      if (err instanceof SafetyError) return errorResult(err.message);
      if (err instanceof GravvApiError) {
        // The key and environment come back on every error, as on success: after a
        // timeout the key is what lets the model resend safely. The fields a model acts
        // on are lifted beside the hint; details stays the raw body, less any HTML page.
        const payload: Record<string, unknown> = { error: err.message, status: err.status };
        const fields = errorFields(err.body);
        for (const k of ["code", "transfer_status", "window"]) {
          if (fields[k] !== undefined) payload[k] = redact(fields[k]);
        }
        if (err.outcomeUnknown) payload.outcome_unknown = true;
        if (err.replayed) payload.replayed = true;
        payload.environment = environment;
        if (err.idempotencyKey) payload.idempotency_key = err.idempotencyKey;
        payload.hint = err.hint;
        payload.details = redact(bodyWithoutHtml(err.body));
        return errorResult(JSON.stringify(payload, null, 2));
      }
      return errorResult(`Unexpected error calling ${name}: ${(err as Error).message}`);
    }
  });

  return { server, environment, tools: active, gate };
}

/** Said with doc results while a refresh has failed and the last good index is served. */
function staleDocsNote(docs: DocsIndex): string | null {
  const f = docs.freshness();
  if (!f.stale) return null;
  const reason = /[.!?]$/.test(f.error ?? "") ? f.error : `${f.error}.`;
  return (
    `The documentation index could not be refreshed: ${reason} This comes from the copy loaded at ` +
    `${f.loadedAt}, which may miss recent changes.`
  );
}

function okResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}
