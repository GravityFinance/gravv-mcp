import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { brokenLinks, collectDocsLinks, linksIn, pageUrl } from "../scripts/docs-links.ts";
import { DEFAULT_DOCS_ORIGIN } from "../src/docs.ts";

describe("linksIn", () => {
  test("takes docs-origin URLs and quoted slugs, and nothing else", () => {
    const text =
      "See https://docs.test/platform/cards/overview. Or https://elsewhere.test/x, " +
      "e.g. 'platform/wallets/create-a-wallet' or `recipes/send-a-payout`, not platform/unquoted.";
    assert.deepEqual(linksIn(text, "https://docs.test"), [
      { link: "https://docs.test/platform/cards/overview", kind: "url" },
      { link: "platform/wallets/create-a-wallet", kind: "slug" },
      { link: "recipes/send-a-payout", kind: "slug" },
    ]);
  });
});

describe("collectDocsLinks", () => {
  test("finds the links the server hands out today, without any request", async () => {
    const links = await collectDocsLinks();
    assert.deepEqual(
      links.map((l) => [pageUrl(l, DEFAULT_DOCS_ORIGIN), l.where]),
      [
        [`${DEFAULT_DOCS_ORIGIN}/platform/cards/view-card-sensitive-details/overview`, ["blocked getCardSensitiveDetails"]],
        [`${DEFAULT_DOCS_ORIGIN}/platform/wallets/create-a-wallet`, ["tool getGravvDocPage"]],
        [`${DEFAULT_DOCS_ORIGIN}/recipes/remit-funds-to-a-recipient`, ["tool getGravvDocPage"]],
      ],
    );
  });

  test("follows the configured docs origin, as the server does", async () => {
    const links = await collectDocsLinks("https://docs.test");
    assert.ok(links.some((l) => l.link === "https://docs.test/platform/cards/view-card-sensitive-details/overview"));
    for (const l of links) assert.ok(pageUrl(l, "https://docs.test").startsWith("https://docs.test/"), l.link);
  });
});

describe("brokenLinks", () => {
  test("reports a page that is not 2xx and a request that fails", async () => {
    const links = [
      { link: "https://docs.test/ok", kind: "url" as const, where: ["instructions"] },
      { link: "platform/gone", kind: "slug" as const, where: ["tool x"] },
      { link: "https://docs.test/down", kind: "url" as const, where: ["prompt y"] },
    ];
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      if (url.endsWith("/down")) throw new Error("connection refused");
      return new Response("", { status: url.endsWith("/gone") ? 404 : 200 });
    }) as unknown as typeof fetch;
    const broken = await brokenLinks(links, "https://docs.test", fetchImpl);
    assert.deepEqual(seen, ["https://docs.test/ok", "https://docs.test/platform/gone", "https://docs.test/down"]);
    assert.deepEqual(
      broken.map((b) => [b.link.link, b.answer]),
      [
        ["platform/gone", "404"],
        ["https://docs.test/down", "connection refused"],
      ],
    );
  });
});
