import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { DEFAULT_DOCS_ORIGIN, DocsIndex, expandQuery, parseDocsOrigin, slugFromUrl } from "../src/docs.ts";
import { createServer } from "../src/server.ts";

/**
 * Fixture in the shape of the live docs site: an llms.txt index grouped by `## Section`,
 * and an llms-full.txt where each page is a `---` line, `# Title`, its description and
 * the body. The two files are not in the same order, as on 13 October 2026.
 */
const GENERIC = "Guides and API reference for integrating with Gravv.";

const INDEX = `# Gravv

> Integration guides for building with Gravv.

## Get Started

- [Overview](https://docs.test/index.md): Integration guides for building with Gravv.
- [Authentication](https://docs.test/getting-started/authentication.md): Authenticate requests with your Api-Key header.
- [Idempotent requests](https://docs.test/getting-started/idempotent-requests.md): Safely retry a write without performing it twice.

## Developer Platform

- [Create a wallet](https://docs.test/platform/wallets/create-a-wallet.md): ${GENERIC}
- [Wallets](https://docs.test/platform/wallets/overview.md)
- [Overview](https://docs.test/platform/collections/collections-overview.md): ${GENERIC}
- [Overview](https://docs.test/platform/webhooks/webhooks-overview.md): ${GENERIC}

## Recipes

- [Remit funds to a recipient](https://docs.test/recipes/remit-funds-to-a-recipient.md): Add an external recipient and transfer funds to them.

## API Reference

- [Create a wallet](https://docs.test/api-reference/wallets/post-v1-wallets.md): Create a new blockchain wallet for a customer on the specified network.
`;

/** One llms-full.txt page: header (title and description), then the body. */
function page(title: string, description: string, body: string): string {
  return `\n# ${title}\n\n${description ? `${description}\n\n` : ""}${body}\n`;
}

/** The pages in index order. Bodies carry `---` the way real Markdown can. */
const PAGES = [
  page("Overview", "Integration guides for building with Gravv.", "Move money in stablecoins with one API."),
  page(
    "Authentication",
    "Authenticate requests with your Api-Key header.",
    "Use the Api-Key header on every request. Gravv derives the tenant from the key, so clients must not send an x-tenant-id header.",
  ),
  page(
    "Idempotent requests",
    "Safely retry a write without performing it twice.",
    "All authenticated POST requests require an Idempotency-Key.\n\n---\n\n# Reusing a key\n\nReusing a key with a different payload returns 422 Unprocessable Entity.",
  ),
  page(
    "Create a wallet",
    GENERIC,
    "Create a wallet for a customer on polygon, stellar, ethereum or solana. The address comes back at once.\n\n---\n\n# Overview\n\nThe wallet lifecycle starts at creation and ends when the wallet is archived.",
  ),
  page("Wallets", "", "Wallets hold stablecoin balances on supported blockchain networks. Each wallet belongs to a customer."),
  page(
    "Overview",
    GENERIC,
    "Collections accept payments from payers. A collection settles to the customer's wallet once the payer pays.",
  ),
  page("Overview", GENERIC, "Webhooks send an event to your endpoint when a resource changes. Verify each webhook signature."),
  page(
    "Remit funds to a recipient",
    "Add an external recipient and transfer funds to them.",
    "---\ntitle: Remit funds\n---\n\nThis recipe creates an external recipient, waits until the recipient is active, and transfers funds from a funded Gravv account.",
  ),
  page(
    "Create a wallet",
    "Create a new blockchain wallet for a customer on the specified network.",
    `<Endpoint method="POST" path="/v1/wallets" />\n\nPOST /v1/wallets. Body requires customer_id and network.`,
  ),
];

function corpus(order: number[] = PAGES.map((_, i) => i)): string {
  return ["# Gravv — Full Documentation\n", ...order.map((i) => PAGES[i]!)].join("\n---\n");
}

/** The served order: the index's third page comes last, as the playground did on 13 October. */
const CORPUS = corpus([0, 1, 3, 4, 5, 6, 7, 8, 2]);

function index(corpusText = CORPUS, indexText = INDEX) {
  const fetchImpl = (async (url: any) => {
    const u = String(url);
    if (u.endsWith("/llms.txt")) return new Response(indexText, { status: 200 });
    if (u.endsWith("/llms-full.txt")) return new Response(corpusText, { status: 200 });
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return new DocsIndex({ origin: "https://docs.test", fetchImpl });
}

/** Every indexed page, through the public API. */
async function allPages(docs: DocsIndex) {
  const slugs = [...INDEX.matchAll(/\(https:\/\/docs\.test\/(.+?)\.md\)/g)].map((m) => m[1]!);
  return Promise.all(slugs.map(async (slug) => (await docs.getPage(slug))!));
}

describe("docs index", () => {
  test("pairs every index entry with its own page text", async () => {
    assert.deepEqual(await index().stats(), { pages: 9, unmatchedEntries: 0, unmatchedPages: 0 });
    const docs = index();
    const lines = INDEX.split("\n").filter((l) => l.startsWith("- ["));
    for (const line of lines) {
      const slug = /\(https:\/\/docs\.test\/(.+)\.md\)/.exec(line)![1]!;
      const p = await docs.getPage(slug);
      assert.ok(p, slug);
      // Every page has body text beyond its title and description.
      assert.ok(p.content.length > `# ${p.title}\n\n${p.description}`.length + 20, `${slug} has no body`);
    }
  });

  test("captures sections from the ## headings", async () => {
    const sections = await index().listSections();
    assert.deepEqual(sections.sort(), ["API Reference", "Developer Platform", "Get Started", "Recipes"]);
  });

  test("derives slugs from the URL path, without .md", async () => {
    const page = await index().getPage("platform/wallets/create-a-wallet");
    assert.ok(page);
    assert.equal(page.title, "Create a wallet");
    assert.equal(page.section, "Developer Platform");
    assert.match(page.content, /comes back at once/);
  });

  test("tells same-titled pages apart by description, endpoint and URL", async () => {
    const docs = index();
    assert.match((await docs.getPage("index"))!.content, /one API/);
    assert.match((await docs.getPage("platform/collections/collections-overview"))!.content, /payer pays/);
    assert.match((await docs.getPage("platform/webhooks/webhooks-overview"))!.content, /webhook signature/);
    assert.match((await docs.getPage("api-reference/wallets/post-v1-wallets"))!.content, /customer_id and network/);
  });

  test("a shuffled corpus gives every page the same text", async () => {
    const reference = new Map<string, string>();
    for (const p of await allPages(index())) reference.set(p.slug, p.content);

    const shuffles = [
      [8, 7, 6, 5, 4, 3, 2, 1, 0],
      [6, 5, 0, 8, 1, 3, 7, 2, 4],
      [5, 6, 3, 8, 2, 0, 4, 1, 7],
      [2, 0, 1, 6, 5, 8, 3, 7, 4],
    ];
    for (const order of shuffles) {
      const shuffled = await allPages(index(corpus(order)));
      assert.equal(shuffled.length, reference.size);
      for (const p of shuffled) assert.equal(p.content, reference.get(p.slug), `${p.slug} with order ${order}`);
    }
  });

  test("a --- inside a page does not cut it short", async () => {
    const docs = index();
    const idem = (await docs.getPage("getting-started/idempotent-requests"))!;
    assert.match(idem.content, /Idempotency-Key[\s\S]*---[\s\S]*422 Unprocessable Entity/);

    // The rule is followed by a heading that is also a page title ("Overview").
    const guide = (await docs.getPage("platform/wallets/create-a-wallet"))!;
    assert.match(guide.content, /comes back at once[\s\S]*---\n\n# Overview\n\nThe wallet lifecycle/);

    // Front matter inside a page.
    const recipe = (await docs.getPage("recipes/remit-funds-to-a-recipient"))!;
    assert.match(recipe.content, /title: Remit funds[\s\S]*waits until the recipient is active/);
  });

  test("an entry with no page keeps its description, and a page with no entry is counted", async () => {
    const extraIndex = INDEX.replace(
      "## Recipes\n",
      "## Recipes\n\n- [Not published yet](https://docs.test/recipes/later.md): Coming soon.\n",
    );
    // A second page with a listed title and description has no entry left to pair with.
    const extraCorpus = `${CORPUS}\n---\n${page("Authentication", "Authenticate requests with your Api-Key header.", "Old copy.")}`;
    const docs = index(extraCorpus, extraIndex);
    assert.deepEqual(await docs.stats(), { pages: 10, unmatchedEntries: 1, unmatchedPages: 1 });
    assert.equal((await docs.getPage("recipes/later"))!.content, "Coming soon.");
  });

  test("a section under a title the index does not list stays with the page before it", async () => {
    // It cannot be told from a `---` and a heading inside that page, so no text is lost.
    const docs = index(`${CORPUS}\n---\n${page("Unlisted", "Not in the index.", "Trailing text.")}`);
    assert.deepEqual(await docs.stats(), { pages: 9, unmatchedEntries: 0, unmatchedPages: 0 });
    assert.match((await docs.getPage("getting-started/idempotent-requests"))!.content, /# Unlisted[\s\S]*Trailing text/);
  });
});

describe("slugs", () => {
  test("come from the URL path, whatever host the index names", async () => {
    // Fetched from docs.test, but the index lists its pages on another host, as after a
    // docs move or behind a redirect.
    const moved = INDEX.replaceAll("https://docs.test/", "https://docs.example/");
    const docs = index(CORPUS, moved);
    const page = await docs.getPage("platform/wallets/create-a-wallet");
    assert.ok(page);
    assert.equal(page.url, "https://docs.example/platform/wallets/create-a-wallet.md");
    const hits = await docs.search("422 unprocessable");
    assert.equal(hits[0]!.slug, "getting-started/idempotent-requests");
  });

  test("a relative link resolves against the origin", async () => {
    const relative = INDEX.replace("(https://docs.test/getting-started/authentication.md)", "(/getting-started/authentication.md)");
    const page = await index(CORPUS, relative).getPage("getting-started/authentication");
    assert.equal(page?.url, "https://docs.test/getting-started/authentication.md");
    assert.match(page!.content, /x-tenant-id/);
  });

  test("an origin with a path drops that prefix", () => {
    assert.equal(slugFromUrl("https://example.com/docs/platform/x.md", "https://example.com/docs"), "platform/x");
    assert.equal(slugFromUrl("https://other.example/platform/x.md", "https://example.com/docs"), "platform/x");
    assert.equal(slugFromUrl("https://docs.test/index.md", "https://docs.test"), "index");
  });

  test("a page can be fetched by its full docs URL", async () => {
    const page = await index().getPage("https://docs.test/recipes/remit-funds-to-a-recipient.md");
    assert.equal(page?.title, "Remit funds to a recipient");
  });
});

describe("docs origin", () => {
  test("accepts an http or https URL and drops trailing slashes", () => {
    assert.equal(parseDocsOrigin("https://docs.example/"), "https://docs.example");
    assert.equal(parseDocsOrigin(" https://example.com/docs// "), "https://example.com/docs");
    assert.equal(parseDocsOrigin("http://127.0.0.1:8080"), "http://127.0.0.1:8080");
    assert.equal(parseDocsOrigin(DEFAULT_DOCS_ORIGIN), DEFAULT_DOCS_ORIGIN);
  });

  test("refuses what is not a docs origin", () => {
    for (const bad of ["docs.example", "ftp://docs.example", "https://docs.example/?v=1", "https://docs.example/#top", "https://u:p@docs.example"]) {
      assert.throws(() => parseDocsOrigin(bad), /docs origin/, bad);
    }
  });

  test("the index reads llms.txt and llms-full.txt under the origin's path", async () => {
    const asked: string[] = [];
    const docs = new DocsIndex({
      origin: "https://example.com/docs",
      fetchImpl: (async (url: any) => {
        asked.push(String(url));
        const moved = INDEX.replaceAll("https://docs.test/", "https://example.com/docs/");
        return new Response(String(url).endsWith("/llms.txt") ? moved : CORPUS, { status: 200 });
      }) as unknown as typeof fetch,
    });
    assert.equal((await docs.getPage("platform/wallets/overview"))?.title, "Wallets");
    assert.deepEqual(asked.sort(), ["https://example.com/docs/llms-full.txt", "https://example.com/docs/llms.txt"]);
  });
});

describe("search ranking", () => {
  test("finds pages by content, not just title", async () => {
    // "422" appears only in the body of the idempotency page.
    const hits = await index().search("422 unprocessable");
    assert.equal(hits[0]!.slug, "getting-started/idempotent-requests");
  });

  test("prefers guides over API reference for the same title", async () => {
    // Two pages are titled "Create a wallet". A how-do-I question should land on the
    // guide, not the endpoint reference.
    const hits = await index().search("create a wallet on polygon");
    assert.equal(hits[0]!.section, "Developer Platform", `got ${hits[0]!.section} (${hits[0]!.slug})`);
  });

  test("section filter narrows results", async () => {
    const hits = await index().search("create a wallet", 10, "API Reference");
    assert.ok(hits.length > 0);
    assert.ok(hits.every((h) => h.section === "API Reference"));
  });

  test("returns an excerpt containing the query terms", async () => {
    const hits = await index().search("recipient active transfer");
    assert.equal(hits[0]!.slug, "recipes/remit-funds-to-a-recipient");
    assert.match(hits[0]!.excerpt, /active/);
  });

  test("ignores stopwords so 'how do I use gravv' is not a match-everything query", async () => {
    const hits = await index().search("the and of");
    assert.equal(hits.length, 0);
  });

  test("returns nothing rather than noise for an unrelated query", async () => {
    assert.equal((await index().search("kubernetes helm chart")).length, 0);
  });

  test("respects the limit", async () => {
    assert.ok((await index().search("wallet customer network", 2)).length <= 2);
  });
});

describe("query expansion", () => {
  test("the 0.4.0 vocabulary reaches the pages that use other words", () => {
    const terms = (q: string) => expandQuery(q).map((t) => t.term);
    assert.ok(terms("resume a paused transfer").includes("requirements"));
    assert.ok(terms("upload documents").includes("supporting"));
    assert.ok(terms("customer limits").includes("tier"));
    assert.ok(terms("simulate a deposit").includes("sandbox"));
    assert.ok(terms("account capabilities").includes("eligibility"));
    assert.ok(terms("settlement for fx").includes("settlement-instructions"));
  });

  test("an expansion weighs less than a typed term", () => {
    const paused = expandQuery("paused");
    assert.equal(paused.find((t) => t.term === "paused")?.weight, 1);
    assert.ok((paused.find((t) => t.term === "resume")?.weight ?? 1) < 1);
  });
});

describe("failure handling", () => {
  test("surfaces an actionable error when the docs site is unreachable", async () => {
    const failing = new DocsIndex({
      origin: "https://docs.test",
      fetchImpl: (async () => new Response("nope", { status: 503 })) as unknown as typeof fetch,
    });
    await assert.rejects(failing.search("wallet"), /network access|Could not load/i);
  });

  test("unknown slug returns null rather than throwing", async () => {
    assert.equal(await index().getPage("does/not/exist"), null);
  });

  test("tolerates a leading slash and a .md suffix on the slug", async () => {
    const a = await index().getPage("/platform/wallets/overview.md");
    assert.equal(a?.title, "Wallets");
  });
});

describe("sections", () => {
  /** The same pages with a "Guides" section and the reference section renamed. */
  const REGROUPED = INDEX.replace(
    "## Developer Platform\n",
    "## Guides\n\n- [Overview](https://docs.test/platform/collections/collections-overview.md): " +
      `${GENERIC}\n\n## Developer Platform\n`,
  )
    .replace(`- [Overview](https://docs.test/platform/collections/collections-overview.md): ${GENERIC}\n- [Overview](https://docs.test/platform/webhooks`, `- [Overview](https://docs.test/platform/webhooks`)
    .replace("## API Reference", "## Reference");

  test("come from the index, a Guides section included", async () => {
    const docs = index(CORPUS, REGROUPED);
    assert.deepEqual((await docs.listSections()).sort(), ["Developer Platform", "Get Started", "Guides", "Recipes", "Reference"]);
    const page = await docs.getPage("platform/collections/collections-overview");
    assert.equal(page?.section, "Guides");
    assert.match(page!.content, /payer pays/);

    const hits = await docs.search("collections settle", 10, "guides");
    assert.deepEqual(hits.map((h) => h.slug), ["platform/collections/collections-overview"]);
  });

  test("a renamed reference section still ranks below the guide", async () => {
    const hits = await index(CORPUS, REGROUPED).search("create a wallet on polygon");
    assert.equal(hits[0]!.slug, "platform/wallets/create-a-wallet");
    const reference = hits.find((h) => h.slug === "api-reference/wallets/post-v1-wallets");
    assert.ok(!reference || reference.score < hits[0]!.score);
  });

  test("searchGravvDocs names the real sections when given an unknown one", async () => {
    const { server } = createServer({
      toolsets: "all",
      readOnly: false,
      allowLiveWrites: false,
      docsOrigin: "https://docs.test",
      fetchImpl: (async (url: any) =>
        new Response(String(url).endsWith("/llms.txt") ? REGROUPED : CORPUS, { status: 200 })) as unknown as typeof fetch,
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "docs-test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    try {
      const miss = (await client.callTool({ name: "searchGravvDocs", arguments: { query: "wallet", section: "Home" } })) as any;
      assert.equal(miss.isError, true);
      assert.match(miss.content[0].text, /No docs section is called "Home"\. The sections are: Get Started, Guides, Developer Platform, Recipes, Reference\./);

      const hit = (await client.callTool({ name: "searchGravvDocs", arguments: { query: "wallet", section: "Guides" } })) as any;
      assert.notEqual(hit.isError, true);

      const tools = (await client.listTools()).tools;
      const section = (tools.find((t) => t.name === "searchGravvDocs")!.inputSchema.properties as any).section;
      assert.equal(section.enum, undefined, "no fixed list of sections");
    } finally {
      await client.close();
    }
  });
});

describe("stale index", () => {
  const HOUR = 60 * 60 * 1000;

  /** An index whose site can be switched off, on a clock the test moves. */
  function flaky() {
    const state = { up: true, fetches: 0, clock: 0, index: INDEX };
    const docs = new DocsIndex({
      origin: "https://docs.test",
      now: () => state.clock,
      fetchImpl: (async (url: any) => {
        state.fetches++;
        if (!state.up) return new Response("unavailable", { status: 503 });
        return new Response(String(url).endsWith("/llms.txt") ? state.index : CORPUS, { status: 200 });
      }) as unknown as typeof fetch,
    });
    return { docs, state };
  }

  test("a failed refresh serves the pages already loaded", async () => {
    const { docs, state } = flaky();
    await docs.search("wallet");
    assert.equal(docs.freshness().stale, false);

    state.up = false;
    state.clock = HOUR + 1;
    const hits = await docs.search("422 unprocessable");
    assert.equal(hits[0]!.slug, "getting-started/idempotent-requests");
    const f = docs.freshness();
    assert.equal(f.stale, true);
    assert.match(f.error!, /503/);
    assert.equal(f.loadedAt, new Date(0).toISOString());
  });

  test("waits five minutes before trying again, then recovers", async () => {
    const { docs, state } = flaky();
    await docs.search("wallet");
    state.up = false;
    state.clock = HOUR + 1;
    await docs.search("wallet");
    const afterFailure = state.fetches;

    state.clock += 60_000;
    await docs.search("wallet");
    assert.equal(state.fetches, afterFailure, "no download within five minutes of a failure");

    state.up = true;
    state.clock += 5 * 60_000;
    await docs.search("wallet");
    assert.equal(state.fetches, afterFailure + 2);
    assert.deepEqual(docs.freshness(), { loadedAt: new Date(state.clock).toISOString(), stale: false });
  });

  test("an index that lists no pages does not replace good pages", async () => {
    const { docs, state } = flaky();
    await docs.search("wallet");
    state.index = "<html>Parked</html>";
    state.clock = HOUR + 1;
    assert.ok((await docs.search("wallet")).length > 0);
    assert.match(docs.freshness().error!, /lists no pages/);
  });

  test("doc tool results say when they come from the old copy", async () => {
    const state = { up: true, clock: 0 };
    const { server } = createServer({
      toolsets: "all",
      readOnly: false,
      allowLiveWrites: false,
      docsOrigin: "https://docs.test",
      now: () => state.clock,
      fetchImpl: (async (url: any) => {
        if (!state.up) return new Response("unavailable", { status: 503 });
        return new Response(String(url).endsWith("/llms.txt") ? INDEX : CORPUS, { status: 200 });
      }) as unknown as typeof fetch,
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "docs-test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    const call = async (name: string, args: Record<string, unknown>) =>
      ((await client.callTool({ name, arguments: args })) as any).content[0].text as string;

    try {
      assert.doesNotMatch(await call("searchGravvDocs", { query: "wallet" }), /could not be refreshed/);

      state.up = false;
      state.clock = HOUR + 1;
      const search = JSON.parse(await call("searchGravvDocs", { query: "wallet" }));
      assert.ok(search.results.length > 0);
      assert.match(search.note, /could not be refreshed: Could not load .*503.*\. This comes from the copy loaded at 1970-01-01T00:00:00\.000Z/);

      const page = await call("getGravvDocPage", { slug: "platform/wallets/create-a-wallet" });
      assert.match(page, /^Note: The documentation index could not be refreshed/);
      assert.match(page, /# Create a wallet/);
    } finally {
      await client.close();
    }
  });

  test("with nothing loaded yet, a failure is still an error", async () => {
    const { docs, state } = flaky();
    state.index = "# Gravv\n";
    await assert.rejects(docs.search("wallet"), /lists no pages/);
    assert.deepEqual(docs.freshness(), { loadedAt: null, stale: false });
  });
});

describe("caching", () => {
  test("downloads the corpus once across many searches", async () => {
    let fetches = 0;
    const counting = new DocsIndex({
      origin: "https://docs.test",
      fetchImpl: (async (url: any) => {
        fetches++;
        const u = String(url);
        if (u.endsWith("/llms.txt")) return new Response(INDEX, { status: 200 });
        return new Response(CORPUS, { status: 200 });
      }) as unknown as typeof fetch,
    });

    await Promise.all([counting.search("wallet"), counting.search("idempotency"), counting.search("transfer")]);
    await counting.search("again");

    // Two files, fetched once — concurrent first-calls must not each trigger a download.
    assert.equal(fetches, 2, `expected 2 fetches, got ${fetches}`);
  });
});
