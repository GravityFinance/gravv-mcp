/**
 * Hand-authored approval and webhook-ingestion tools.
 *
 * These are not generated because no OpenAPI specification covers them — the approve,
 * reject, and ingestion-search routes are absent from every spec file, so there is
 * nothing for the generator to read.
 *
 * They authenticate with the same API key as every other tool.
 */
import type { GeneratedTool } from "./generated/tools.ts";
import type { Toolset } from "./curation.ts";

export type ManualTool = GeneratedTool;

const APPROVALS: Toolset = "approvals";

const reason = {
  reason: {
    type: "string",
    description: "Why the request is being rejected. Recorded on the audit trail.",
  },
} as const;

function tool(
  partial: Omit<ManualTool, "spec" | "toolset" | "queryParams" | "alsoInBody"> &
    Partial<Pick<ManualTool, "queryParams" | "alsoInBody">>,
): ManualTool {
  return {
    toolset: APPROVALS,
    queryParams: [],
    alsoInBody: [],
    spec: "(hand-authored)",
    ...partial,
  };
}

export const MANUAL_TOOLS: ManualTool[] = [
  tool({
    name: "approveTransfer",
    method: "post",
    path: "/v1/transfer/{id}/approve",
    description:
      `Approve a transfer that is waiting for sign-off, releasing it for execution.\n\n` +
      "MOVES MONEY: once approved the transfer executes and cannot be reversed from the API. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The transfer id to approve." } },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: [],
    movesMoney: true,
    needsIdempotency: true,
  }),

  tool({
    name: "rejectTransfer",
    method: "post",
    path: "/v1/transfer/{id}/reject",
    description:
      `Reject a transfer that is waiting for sign-off, so it will not execute.`,
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The transfer id to reject." }, ...reason },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["reason"],
    movesMoney: false,
    needsIdempotency: true,
  }),

  tool({
    name: "approveExternalAccount",
    method: "post",
    path: "/v1/external-accounts/{id}/approve",
    description:
      `Approve a recipient awaiting sign-off, making it payable.\n\n` +
      "Check the account details before approving — an approved recipient can receive transfers.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The external account id to approve." } },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: [],
    movesMoney: false,
    needsIdempotency: true,
  }),

  tool({
    name: "rejectExternalAccount",
    method: "post",
    path: "/v1/external-accounts/{id}/reject",
    description: `Reject a recipient awaiting sign-off.`,
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The external account id to reject." }, ...reason },
      required: ["id"],
      additionalProperties: true,
    },
    pathParams: ["id"],
    bodyMode: "inline",
    bodyProps: ["reason"],
    movesMoney: false,
    needsIdempotency: true,
  }),

  tool({
    name: "approveFxOrder",
    method: "post",
    path: "/v1/fx/orders/{order_id}/approve",
    description:
      `Approve an OTC order sitting in waiting_approval.\n\n` +
      "MOVES MONEY: approving releases the order for execution at the quoted rate. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string", description: "The FX order id to approve." } },
      required: ["order_id"],
      additionalProperties: true,
    },
    pathParams: ["order_id"],
    bodyMode: "inline",
    bodyProps: [],
    movesMoney: true,
    needsIdempotency: true,
  }),

  tool({
    name: "rejectFxOrder",
    method: "post",
    path: "/v1/fx/orders/{order_id}/reject",
    description: `Reject an OTC order sitting in waiting_approval, so it will not execute.`,
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string", description: "The FX order id to reject." }, ...reason },
      required: ["order_id"],
      additionalProperties: true,
    },
    pathParams: ["order_id"],
    bodyMode: "inline",
    bodyProps: ["reason"],
    movesMoney: false,
    needsIdempotency: true,
  }),

  tool({
    name: "searchWebhookIngestion",
    method: "get",
    path: "/v1/webhooks/ingestion/search",
    description:
      "Search inbound provider webhook ingestion records — use when diagnosing whether a provider " +
      `callback arrived and how it was handled.`,
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Filter by provider, e.g. bridge, sumsub, circle." },
        reference: { type: "string", description: "Filter by a reference present in the payload." },
        start_date: { type: "string", description: "ISO 8601 lower bound." },
        end_date: { type: "string", description: "ISO 8601 upper bound." },
        page: { type: "number" },
        items_per_page: { type: "number" },
      },
      required: [],
      additionalProperties: true,
    },
    pathParams: [],
    queryParams: ["provider", "reference", "start_date", "end_date", "page", "items_per_page"],
    bodyMode: "none",
    bodyProps: [],
    movesMoney: false,
    needsIdempotency: false,
  }),
];

export const MANUAL_TOOL_NAMES = new Set(MANUAL_TOOLS.map((t) => t.name));
