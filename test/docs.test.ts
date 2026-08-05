import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DocsIndex } from "../src/docs.ts";

/**
 * Fixture mirroring the real shape of the docs site: an llms.txt index grouped by
 * `## Section`, and an llms-full.txt whose pages align positionally with it.
 */
const INDEX = `# Gravv

> Integration guides for building with Gravv.

## Get Started

- [Authentication](https://docs.test/getting-started/authentication.md): Authenticate requests with your Api-Key header.
- [Idempotent requests](https://docs.test/getting-started/idempotent-requests.md): Safely retry a write without performing it twice.

## Developer Platform

- [Create a wallet](https://docs.test/platform/wallets/create-a-wallet.md): Create a blockchain wallet for a customer.
- [Wallets](https://docs.test/platform/wallets/overview.md)

## Recipes

- [Remit funds to a recipient](https://docs.test/recipes/remit-funds-to-a-recipient.md): Add an external recipient and transfer funds to them.

## API Reference

- [Create a wallet](https://docs.test/api-reference/wallets/post-v1-wallets.md): Create a new blockchain wallet for a customer on the specified network.
`;

const CORPUS = [
  `# Gravv — Full Documentation`,
  `# Authentication\n\nUse the Api-Key header on every request. Gravv derives the tenant from the key, so clients must not send an x-tenant-id header.`,
  `# Idempotent requests\n\nAll authenticated POST requests require an Idempotency-Key. Reusing a key with a different payload returns 422 Unprocessable Entity.`,
  `# Create a wallet\n\nCreate a wallet for a customer on polygon, stellar, ethereum or solana. Wallet provisioning is asynchronous; poll until an address appears.`,
  `# Wallets\n\nWallets hold stablecoin balances on supported blockchain networks. Each wallet belongs to a customer.`,
  `# Remit funds to a recipient\n\nThis recipe creates an external recipient, waits until the recipient is active, and transfers funds from a funded Gravv account.`,
  `# Create a wallet\n\nPOST /v1/wallets. Body requires customer_id and network.`,
].join("\n---\n");

function index() {
  const fetchImpl = (async (url: any) => {
    const u = String(url);
    if (u.endsWith("/llms.txt")) return new Response(INDEX, { status: 200 });
    if (u.endsWith("/llms-full.txt")) return new Response(CORPUS, { status: 200 });
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return new DocsIndex({ origin: "https://docs.test", fetchImpl });
}

describe("docs index", () => {
  test("parses the index and corpus into aligned pages", async () => {
    assert.equal(await index().pageCount(), 6);
  });

  test("captures sections from the ## headings", async () => {
    const sections = await index().listSections();
    assert.deepEqual(sections.sort(), ["API Reference", "Developer Platform", "Get Started", "Recipes"]);
  });

  test("derives slugs by stripping origin and .md", async () => {
    const page = await index().getPage("platform/wallets/create-a-wallet");
    assert.ok(page);
    assert.equal(page.title, "Create a wallet");
    assert.equal(page.section, "Developer Platform");
    assert.match(page.content, /asynchronous/);
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
