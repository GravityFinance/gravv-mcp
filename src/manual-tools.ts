/**
 * Hand-authored tools, for routes that no OpenAPI specification covers.
 *
 * The list is empty in this release. The approve/reject and webhook-ingestion tools that
 * used to live here were removed in 0.3.2: those routes are Dashboard-only and refuse API
 * keys, so every call failed. Their names are kept in BLOCKED_TOOL_NAMES (curation.ts) so
 * a saved workflow gets a reason instead of "Unknown tool".
 *
 * A tool added here is merged with the generated ones in server.ts and authenticates with
 * the same API key as every other tool.
 */
import type { GeneratedTool } from "./generated/tools.ts";

export type ManualTool = GeneratedTool;

export const MANUAL_TOOLS: ManualTool[] = [];

export const MANUAL_TOOL_NAMES = new Set(MANUAL_TOOLS.map((t) => t.name));
