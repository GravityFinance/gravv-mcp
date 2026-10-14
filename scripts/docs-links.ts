/**
 * Check that every docs link the server hands out still resolves.
 *
 * The server points the model at docs pages: a URL in a blocked-tool message, example slugs
 * in a tool description, and (once there are prompts) links in prompts. The docs are rebuilt
 * on their own schedule, so a page can move without any change here. This collects the links
 * from what the running server actually says, then checks each one on the live site.
 *
 *   npm run docs-links       collect, then fetch each link (network)
 *
 * GRAVV_DOCS_ORIGIN checks another docs host, as it does for the server.
 *
 * Collection runs the real server in process with a stand-in sandbox key, so it sees every
 * tool, and with a fetch that refuses every request, so nothing leaves the process.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.ts";
import { BLOCKED_TOOL_NAMES } from "../src/curation.ts";
import { DEFAULT_DOCS_ORIGIN } from "../src/docs.ts";

export interface DocsLink {
  /** The page as the model is given it: a full URL, or a slug for getGravvDocPage. */
  link: string;
  kind: "url" | "slug";
  /** Where the server says it: "instructions", "tool searchGravvDocs", "blocked getCardSensitiveDetails". */
  where: string[];
}

/** Docs slugs as the descriptions quote them, e.g. 'platform/wallets/create-a-wallet'. */
const SLUG = /['"`]((?:platform|recipes|getting-started|api-reference|guides)\/[a-z0-9][a-z0-9\-/]*)['"`]/g;

/** Every link to `origin` and every quoted docs slug in `text`. */
export function linksIn(text: string, origin: string): { link: string; kind: "url" | "slug" }[] {
  const found: { link: string; kind: "url" | "slug" }[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s"'`<>()\]]+/g)) {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    if (url === origin || url.startsWith(`${origin}/`)) found.push({ link: url, kind: "url" });
  }
  for (const m of text.matchAll(SLUG)) found.push({ link: m[1]!.replace(/\/+$/, ""), kind: "slug" });
  return found;
}

function descriptions(schema: unknown, out: string[] = []): string[] {
  if (Array.isArray(schema)) {
    for (const s of schema) descriptions(s, out);
  } else if (schema && typeof schema === "object") {
    for (const [k, v] of Object.entries(schema)) {
      if (k === "description" && typeof v === "string") out.push(v);
      else descriptions(v, out);
    }
  }
  return out;
}

function textOf(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] }).content ?? [];
  return content.map((c) => c.text ?? "").join("\n");
}

/** Every docs link the server hands out, with where it says each one. */
export async function collectDocsLinks(origin = DEFAULT_DOCS_ORIGIN): Promise<DocsLink[]> {
  const refuse = (async () => {
    throw new Error("docs-links collects offline");
  }) as unknown as typeof fetch;
  const { server } = createServer({
    apiKey: "grvSec_sandbox_docs_links",
    toolsets: "all",
    readOnly: false,
    allowLiveWrites: false,
    docsOrigin: origin,
    fetchImpl: refuse,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "docs-links", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);

  const texts: { where: string; text: string }[] = [];
  try {
    texts.push({ where: "instructions", text: client.getInstructions() ?? "" });
    for (const tool of (await client.listTools()).tools) {
      texts.push({ where: `tool ${tool.name}`, text: [tool.description ?? "", ...descriptions(tool.inputSchema)].join("\n") });
    }
    for (const name of Object.keys(BLOCKED_TOOL_NAMES)) {
      texts.push({ where: `blocked ${name}`, text: textOf(await client.callTool({ name, arguments: {} })) });
    }
    if (client.getServerCapabilities()?.prompts) {
      for (const prompt of (await client.listPrompts()).prompts) {
        texts.push({ where: `prompt ${prompt.name}`, text: prompt.description ?? "" });
        try {
          const got = await client.getPrompt({ name: prompt.name, arguments: {} });
          const body = got.messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join("\n");
          texts.push({ where: `prompt ${prompt.name}`, text: body });
        } catch {
          // A prompt that needs arguments still has its description checked.
        }
      }
    }
  } finally {
    await client.close();
  }

  const byLink = new Map<string, DocsLink>();
  for (const { where, text } of texts) {
    for (const { link, kind } of linksIn(text, origin)) {
      const entry = byLink.get(link) ?? { link, kind, where: [] };
      if (!entry.where.includes(where)) entry.where.push(where);
      byLink.set(link, entry);
    }
  }
  return [...byLink.values()].sort((x, y) => x.link.localeCompare(y.link));
}

/** The page URL for a link: a slug is a path on the docs origin. */
export function pageUrl(link: DocsLink, origin: string): string {
  return link.kind === "url" ? link.link : `${origin}/${link.link}`;
}

/** The links whose page does not answer 2xx, with what it answered instead. */
export async function brokenLinks(
  links: DocsLink[],
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ link: DocsLink; answer: string }[]> {
  const broken: { link: DocsLink; answer: string }[] = [];
  for (const link of links) {
    try {
      const res = await fetchImpl(pageUrl(link, origin), {
        redirect: "follow",
        headers: { "User-Agent": "gravv-mcp docs-links" },
      });
      if (!res.ok) broken.push({ link, answer: `${res.status}` });
    } catch (err) {
      broken.push({ link, answer: (err as Error).message });
    }
  }
  return broken;
}

async function main(): Promise<void> {
  const origin = (process.env.GRAVV_DOCS_ORIGIN ?? DEFAULT_DOCS_ORIGIN).replace(/\/+$/, "");
  const links = await collectDocsLinks(origin);
  console.log(`${links.length} docs link(s) handed out by the server, checked on ${origin}`);
  const broken = await brokenLinks(links, origin);
  for (const link of links) {
    const bad = broken.find((b) => b.link === link);
    console.log(`${bad ? `FAIL ${bad.answer}` : "ok"}  ${pageUrl(link, origin)}  (${link.where.join(", ")})`);
  }
  if (broken.length > 0) {
    for (const { link, answer } of broken) {
      console.error(`::error::${pageUrl(link, origin)} answered ${answer}; it is handed out in ${link.where.join(", ")}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
