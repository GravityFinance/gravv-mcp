/**
 * MCP server assembly: pick the tool set, register handlers, enforce safety.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { GravvClient, GravvApiError, detectEnvironment, type Environment } from "./client.ts";
import { SafetyGate, SafetyError, redact } from "./safety.ts";
import { BLOCKED_TOOL_NAMES, type Toolset } from "./curation.ts";
import { TOOLS, TOOLS_BY_NAME, type GeneratedTool } from "./generated/tools.ts";

export interface ServerConfig {
  apiKey: string;
  baseUrl?: string;
  toolsets: Toolset[] | "all";
  readOnly: boolean;
  allowLiveWrites: boolean;
  ratePerMinute?: number;
}

export function selectTools(toolsets: Toolset[] | "all", gate: SafetyGate): GeneratedTool[] {
  const wanted = toolsets === "all" ? null : new Set(toolsets);
  return TOOLS.filter((t) => (wanted === null || wanted.has(t.toolset)) && gate.isToolAvailable(t));
}

function instructions(environment: Environment, gate: SafetyGate, tools: GeneratedTool[]): string {
  const sets = [...new Set(tools.map((t) => t.toolset))].sort();
  return [
    "Gravv — payments infrastructure for global money movement.",
    "",
    `ENVIRONMENT: ${gate.describeEnvironment()}`,
    "",
    `${tools.length} tools loaded across: ${sets.join(", ")}.`,
    "",
    "Working with this API:",
    "- Read each tool's description before calling it. Several operations have prerequisites that are not obvious from their names — an account needs a KYC-verified customer, an external account must reach status `active` before you can transfer to it, and server-to-server KYC requires documents uploaded first.",
    "- Operations that move money return a preview instead of executing. Show the preview to the user, get agreement, then call again with confirm: true.",
    "- Idempotency keys are generated automatically for POSTs. The key used is returned with each result, so a deliberate retry can reuse it.",
    "- Sandbox and live hold entirely separate data. An id from one environment will 404 in the other.",
    "",
    "For integration guidance — call ordering, corridor rules, worked examples — consult the Gravv documentation at https://gravv-docs.syntext.dev. The tools here execute calls; the docs explain how the flows fit together.",
  ].join("\n");
}

export function createServer(config: ServerConfig) {
  const environment = detectEnvironment(config.apiKey);

  const gate = new SafetyGate({
    environment,
    allowLiveWrites: config.allowLiveWrites,
    readOnly: config.readOnly,
  });

  const client = new GravvClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    ratePerMinute: config.ratePerMinute,
  });

  const active = selectTools(config.toolsets, gate);
  const activeByName = new Map(active.map((t) => [t.name, t]));

  const server = new Server(
    { name: "gravv", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: instructions(environment, gate, active) },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: active.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

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
      const preview = client.buildRequest(tool, args);
      const gateResult = gate.check(tool, args, {
        method: tool.method.toUpperCase(),
        path: tool.path,
        body: preview.body,
      });

      if (gateResult) {
        return { content: [{ type: "text" as const, text: JSON.stringify(gateResult, null, 2) }] };
      }

      const result = await client.call(tool, args);

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

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}
