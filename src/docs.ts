/**
 * Documentation search over the public Gravv docs.
 *
 * The API tools in this server execute calls. They cannot explain how the flows fit
 * together — an OpenAPI spec describes 86 independent operations and says nothing about
 * ordering, corridor rules, or why a Stellar wallet needs a trustline. That knowledge
 * lives in the guides, so the guides need to be reachable from the same connector.
 *
 * Source of truth is the published docs site, which serves two machine-readable files:
 *
 *   /llms.txt        index — title, URL and description for all 177 pages, grouped by section
 *   /llms-full.txt   the entire corpus, ~1 MB, pages delimited by a `---` line
 *
 * They align positionally (verified 177/177 by title), so zipping them yields a fully
 * attributed corpus with no scraping and no API key. Docs are public, so these tools
 * work before a merchant has credentials — an agent can learn Gravv during evaluation.
 */

const DOCS_ORIGIN = "https://gravv-docs.syntext.dev";

/** Refetch interval. Docs change on their own cadence; an hour keeps a long-running server current. */
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface DocPage {
  title: string;
  /** Path without the .md suffix, e.g. "platform/wallets/create-a-wallet". */
  slug: string;
  url: string;
  /** Top-level grouping from llms.txt: "Get Started", "Developer Platform", "Recipes", "API Reference". */
  section: string;
  description: string;
  content: string;
}

export interface SearchHit {
  title: string;
  slug: string;
  section: string;
  score: number;
  excerpt: string;
}

/** Words carrying no discriminating signal in a payments-docs corpus. */
const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "as", "at", "by", "for", "from",
  "in", "into", "of", "on", "to", "with", "is", "are", "was", "were", "be", "been", "do", "does",
  "how", "what", "why", "when", "which", "can", "i", "you", "my", "me", "it", "this", "that",
  "using", "use", "get", "set", "want", "need", "gravv",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s/]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * Query-side synonym expansion.
 *
 * Keyword matching fails when the user's vocabulary differs from the docs'. Measured
 * against the real corpus: "transfer funds to an external bank recipient" ranks the
 * remit recipe first by a wide margin, while "send money to a Nigerian bank account" —
 * the same intent in ordinary words — does not surface it in the top 25, because
 * "send money" appears nowhere and "money" matches the collections pages instead.
 *
 * Payments vocabulary is small and stable, so expanding the query covers this without
 * needing embeddings. Expansions are scored at a discount (see EXPANSION_WEIGHT) so a
 * literal match always outranks a synonym match.
 */
const SYNONYMS: Record<string, string[]> = {
  // moving money out
  send: ["transfer", "remit", "payout"],
  sending: ["transfer", "remit", "payout"],
  money: ["funds", "transfer", "payment"],
  pay: ["transfer", "payout", "payment"],
  payout: ["transfer", "remit", "disbursement"],
  remit: ["transfer", "remittance"],
  withdraw: ["withdrawal", "payout", "offramp"],

  // money coming in
  collect: ["collection", "onramp", "deposit", "charge"],
  receive: ["collection", "deposit", "onramp"],
  topup: ["fund", "deposit", "collection"],
  fund: ["funding", "deposit", "collection"],

  // the counterparty
  recipient: ["payee", "beneficiary", "external-accounts", "external"],
  beneficiary: ["payee", "recipient", "external"],
  payee: ["recipient", "external"],

  // identity
  verify: ["verification", "kyc", "kyb"],
  verification: ["kyc", "kyb", "verify"],
  onboard: ["customer", "kyc", "signup"],
  identity: ["kyc", "kyb", "customer"],

  // instruments and rails
  wallet: ["wallets", "blockchain", "crypto"],
  crypto: ["blockchain", "wallet", "usdc", "stablecoin"],
  stablecoin: ["usdc", "crypto", "wallet"],
  card: ["cards", "issuing"],
  bank: ["ach", "wire", "sepa", "bank-transfer"],
  exchange: ["fx", "conversion", "rate", "quote"],
  convert: ["fx", "exchange", "conversion"],
  rate: ["fx", "quote", "exchange"],

  // operations
  error: ["errors", "failed", "failure"],
  failed: ["error", "failure", "declined"],
  pending: ["status", "async", "poll"],
  webhook: ["webhooks", "event", "notification"],
  retry: ["idempotency", "idempotent"],
  duplicate: ["idempotency", "idempotent"],
};

/**
 * Multi-word phrases rewritten before tokenising.
 *
 * Tokenisation splits "top up" into "top" and "up", neither of which matches anything —
 * measured: "fund a card" scores 109 on platform/cards/fund-cards while "top up a card"
 * does not surface it at all. Single-token synonyms cannot fix that, so these are
 * substituted first.
 */
const PHRASES: Array<[RegExp, string]> = [
  [/\btop[\s-]?up\b/g, "fund deposit"],
  [/\bcash[\s-]?out\b/g, "withdraw payout"],
  [/\boff[\s-]?ramp\b/g, "withdraw payout"],
  [/\bon[\s-]?ramp\b/g, "collection deposit"],
  [/\bsend money\b/g, "transfer funds"],
  [/\bmove money\b/g, "transfer funds"],
  [/\bbank account\b/g, "external-account bank"],
  [/\bexchange rate\b/g, "fx rate quote"],
  [/\bgo live\b/g, "production live environment"],
  [/\bapi key\b/g, "authentication api-key"],
];

function applyPhrases(query: string): string {
  let q = query.toLowerCase();
  for (const [re, replacement] of PHRASES) q = q.replace(re, replacement);
  return q;
}

/** Synonym matches count for less than the terms the user actually typed. */
const EXPANSION_WEIGHT = 0.45;

/** Query terms plus their expansions, tagged so scoring can discount the expansions. */
function expandQuery(query: string): Array<{ term: string; weight: number }> {
  const literal = tokenize(applyPhrases(query));
  const seen = new Set(literal);
  const out = literal.map((term) => ({ term, weight: 1 }));

  for (const term of literal) {
    for (const syn of SYNONYMS[term] ?? []) {
      if (seen.has(syn)) continue;
      seen.add(syn);
      out.push({ term: syn, weight: EXPANSION_WEIGHT });
    }
  }
  return out;
}

export class DocsIndex {
  private pages: DocPage[] = [];
  private df = new Map<string, number>();
  private fetchedAt = 0;
  private inflight: Promise<void> | null = null;
  private readonly origin: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: { origin?: string; fetchImpl?: typeof fetch } = {}) {
    this.origin = (opts.origin ?? DOCS_ORIGIN).replace(/\/+$/, "");
    this.doFetch = opts.fetchImpl ?? fetch;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.pages.length > 0 && Date.now() - this.fetchedAt < CACHE_TTL_MS) return;
    // Collapse concurrent first-calls into one download rather than N.
    this.inflight ??= this.load().finally(() => {
      this.inflight = null;
    });
    await this.inflight;
  }

  private async load(): Promise<void> {
    const [indexRes, corpusRes] = await Promise.all([
      this.doFetch(`${this.origin}/llms.txt`),
      this.doFetch(`${this.origin}/llms-full.txt`),
    ]);
    if (!indexRes.ok || !corpusRes.ok) {
      throw new Error(
        `Could not load Gravv documentation (llms.txt ${indexRes.status}, llms-full.txt ${corpusRes.status}). ` +
          `These tools need network access to ${this.origin}.`,
      );
    }

    const index = await indexRes.text();
    const corpus = await corpusRes.text();

    // --- index: entries in document order, tagged with their `## Section` heading ---
    const entries: Array<{ title: string; url: string; description: string; section: string }> = [];
    let section = "";
    for (const line of index.split("\n")) {
      const sec = /^##\s+(.+)$/.exec(line);
      if (sec) {
        section = sec[1]!.trim();
        continue;
      }
      const m = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)(?::\s*(.*))?$/.exec(line);
      if (m) entries.push({ title: m[1]!, url: m[2]!, description: (m[3] ?? "").trim(), section });
    }

    // --- corpus: drop the banner, then one chunk per page, in the same order ---
    const chunks = corpus.split("\n---\n").slice(1);

    const pages: DocPage[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const chunk = chunks[i];
      // Alignment is positional. If it ever breaks, fall back to the description rather
      // than silently pairing a page with the wrong body.
      const chunkTitle = chunk?.trim().split("\n")[0]?.replace(/^#+\s*/, "").trim();
      const aligned = chunkTitle && chunkTitle.toLowerCase() === entry.title.toLowerCase();

      pages.push({
        title: entry.title,
        slug: entry.url.replace(`${this.origin}/`, "").replace(/\.md$/, ""),
        url: entry.url,
        section: entry.section,
        description: entry.description,
        content: aligned ? chunk!.trim() : entry.description,
      });
    }

    // Document frequency for IDF weighting.
    const df = new Map<string, number>();
    for (const p of pages) {
      for (const t of new Set(tokenize(`${p.title} ${p.description} ${p.content}`))) {
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }

    this.pages = pages;
    this.df = df;
    this.fetchedAt = Date.now();
  }

  async search(query: string, limit = 6, section?: string): Promise<SearchHit[]> {
    await this.ensureLoaded();

    const weighted = expandQuery(query);
    if (weighted.length === 0) return [];
    const terms = weighted.map((w) => w.term);

    const N = this.pages.length;
    const phrase = query.toLowerCase().trim();
    const hits: SearchHit[] = [];

    for (const page of this.pages) {
      if (section && page.section.toLowerCase() !== section.toLowerCase()) continue;

      const title = page.title.toLowerCase();
      const desc = page.description.toLowerCase();
      const body = page.content.toLowerCase();

      let score = 0;
      for (const { term, weight } of weighted) {
        const idf = Math.log(1 + N / (1 + (this.df.get(term) ?? 0)));
        const inTitle = title.includes(term) ? 1 : 0;
        const inSlug = page.slug.includes(term) ? 1 : 0;
        const inDesc = desc.includes(term) ? 1 : 0;
        const bodyHits = Math.min(count(body, term), 12);
        if (!inTitle && !inSlug && !inDesc && !bodyHits) continue;
        // Title and slug are the strongest signal that a page is *about* a term, rather
        // than merely mentioning it — an API-reference page mentions "wallet" once,
        // the wallets overview is about wallets.
        score += weight * idf * (inTitle * 10 + inSlug * 6 + inDesc * 4 + Math.sqrt(bodyHits));
      }
      if (score === 0) continue;

      if (title.includes(phrase)) score *= 1.6;
      else if (body.includes(phrase)) score *= 1.2;

      // Guides answer "how do I"; reference pages answer "what fields". Nudge guides up
      // so a broad question lands on a flow rather than a single endpoint.
      if (page.section === "API Reference") score *= 0.75;
      if (page.section === "Recipes" || page.section === "Get Started") score *= 1.15;

      hits.push({
        title: page.title,
        slug: page.slug,
        section: page.section,
        score: Number(score.toFixed(2)),
        excerpt: excerpt(page.content || page.description, terms),
      });
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async getPage(slug: string): Promise<DocPage | null> {
    await this.ensureLoaded();
    const clean = slug.replace(/^\/+/, "").replace(/\.md$/, "");
    return (
      this.pages.find((p) => p.slug === clean) ??
      this.pages.find((p) => p.slug.endsWith(`/${clean}`)) ??
      this.pages.find((p) => p.title.toLowerCase() === clean.toLowerCase()) ??
      null
    );
  }

  async listSections(): Promise<string[]> {
    await this.ensureLoaded();
    return [...new Set(this.pages.map((p) => p.section))].filter(Boolean);
  }

  /** Exposed for tests. */
  async pageCount(): Promise<number> {
    await this.ensureLoaded();
    return this.pages.length;
  }
}

function count(haystack: string, needle: string): number {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/** A window of text around the densest cluster of query terms. */
function excerpt(content: string, terms: string[], width = 320): string {
  const lower = content.toLowerCase();
  let best = 0;
  let bestScore = -1;

  for (let pos = 0; pos < Math.max(1, lower.length - width); pos += 80) {
    const window = lower.slice(pos, pos + width);
    const score = terms.reduce((s, t) => s + (window.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  }

  const slice = content
    .slice(best, best + width)
    .replace(/\s+/g, " ")
    .trim();
  return (best > 0 ? "…" : "") + slice + (best + width < content.length ? "…" : "");
}
