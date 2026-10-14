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
 *   /llms.txt        index — title, URL and description for every page, grouped by section
 *   /llms-full.txt   the entire corpus, ~1 MB; each page is a `---` line, then `# Title`,
 *                    its description, and the body
 *
 * The two files are not guaranteed to list pages in the same order. On 13 October 2026 one
 * page sat second in the index and 72nd in the corpus, so pairing by position left 71
 * pages with only their one-line description, 68 of them with no text at all. Each page
 * is therefore found by its own header and paired with the index entry of the same title,
 * using the description and the URL to tell repeated titles apart. Docs are public, so
 * these tools work before a merchant has credentials — an agent can learn Gravv during
 * evaluation.
 */

const DOCS_ORIGIN = "https://gravv-docs.syntext.dev";

/** Refetch interval. Docs change on their own cadence; an hour keeps a long-running server current. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * After a refresh fails, the pages already loaded keep being served, and the next attempt
 * waits this long, so a docs outage does not add a failing download to every call.
 */
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

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

export interface DocsFreshness {
  /** When the pages being served were downloaded (ISO 8601), or null before the first load. */
  loadedAt: string | null;
  /** True while a refresh has failed and older pages are being served. */
  stale: boolean;
  /** Why the last refresh failed, while stale. */
  error?: string;
}

export interface DocsStats {
  pages: number;
  unmatchedEntries: number;
  unmatchedPages: number;
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
  private counts: DocsStats = { pages: 0, unmatchedEntries: 0, unmatchedPages: 0 };
  private fetchedAt = 0;
  private refreshError: string | null = null;
  private retryAt = 0;
  private inflight: Promise<void> | null = null;
  private readonly origin: string;
  private readonly doFetch: typeof fetch;
  private readonly now: () => number;

  constructor(opts: { origin?: string; fetchImpl?: typeof fetch; now?: () => number } = {}) {
    this.origin = (opts.origin ?? DOCS_ORIGIN).replace(/\/+$/, "");
    this.doFetch = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? Date.now;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.pages.length > 0) {
      const t = this.now();
      if (t - this.fetchedAt < CACHE_TTL_MS) return;
      if (this.refreshError !== null && t < this.retryAt) return;
    }
    // Collapse concurrent first-calls into one download rather than N.
    this.inflight ??= this.load()
      .then(
        () => {
          this.refreshError = null;
        },
        (err: unknown) => {
          // A failed refresh used to fail the call although the pages were still there.
          // Keep serving them, say so through freshness(), and try again later. With
          // nothing loaded yet there is nothing to serve, so the error stands.
          if (this.pages.length === 0) throw err;
          this.refreshError = err instanceof Error ? err.message : String(err);
          this.retryAt = this.now() + RETRY_AFTER_FAILURE_MS;
        },
      )
      .finally(() => {
        this.inflight = null;
      });
    await this.inflight;
  }

  /** Whether the pages being served are current. Reads state only; it never downloads. */
  freshness(): DocsFreshness {
    const loadedAt = this.pages.length > 0 ? new Date(this.fetchedAt).toISOString() : null;
    return this.refreshError === null
      ? { loadedAt, stale: false }
      : { loadedAt, stale: true, error: this.refreshError };
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

    const entries = parseIndex(index, this.origin);
    // A 200 that is not the index (an error page, a parked domain) must not replace good pages.
    if (entries.length === 0) throw new Error(`${this.origin}/llms.txt lists no pages.`);
    const { pages, unmatchedEntries, unmatchedPages } = pairPages(entries, parseCorpus(corpus, entries), (url) =>
      slugFromUrl(url, this.origin),
    );

    // Document frequency for IDF weighting.
    const df = new Map<string, number>();
    for (const p of pages) {
      for (const t of new Set(tokenize(`${p.title} ${p.description} ${p.content}`))) {
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }

    this.pages = pages;
    this.df = df;
    this.counts = { pages: pages.length, unmatchedEntries, unmatchedPages };
    this.fetchedAt = this.now();
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
    // A full docs URL works too, on whatever host it names.
    const clean = /^https?:\/\//i.test(slug.trim())
      ? slugFromUrl(slug.trim(), this.origin)
      : slug.replace(/^\/+/, "").replace(/\.md$/, "");
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

  /**
   * How the last load went: pages indexed, index entries that found no page text (they
   * fall back to their description), and corpus pages that matched no entry (dropped,
   * as they have no URL). Exposed for tests.
   */
  async stats(): Promise<DocsStats> {
    await this.ensureLoaded();
    return { ...this.counts };
  }
}

// ---- parsing and pairing ------------------------------------------------------

export interface IndexEntry {
  title: string;
  url: string;
  description: string;
  section: string;
}

export interface CorpusPage {
  title: string;
  /** The paragraph under the title: the page's description on the live site. */
  lead: string;
  /** The paragraph under the title matches the entry's description: surely a page start. */
  header: boolean;
  /** The whole page, header included, `---` rules inside it kept. */
  content: string;
}

/**
 * Entries of llms.txt in document order, each tagged with its `## Section` heading.
 * A relative link resolves against `base`, the origin the index was fetched from.
 */
export function parseIndex(index: string, base?: string): IndexEntry[] {
  const entries: IndexEntry[] = [];
  let section = "";
  for (const line of index.replace(/\r\n?/g, "\n").split("\n")) {
    const sec = /^##\s+(.+)$/.exec(line);
    if (sec) {
      section = sec[1]!.trim();
      continue;
    }
    const m = /^-\s+\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/.exec(line);
    if (!m) continue;
    let url: string;
    try {
      url = new URL(m[2]!, base ? `${base}/` : undefined).href;
    } catch {
      continue; // a relative link with no base, or not a link at all
    }
    entries.push({ title: m[1]!.trim(), url, description: (m[3] ?? "").trim(), section });
  }
  return entries;
}

/**
 * A page's slug: its URL path, without the leading `/`, the origin's own path prefix
 * (for an origin such as `https://example.com/docs`) or the `.md` suffix.
 *
 * Taken from the path alone, so the slug is the same whatever host the index names. The
 * old slug removed the origin as text, and an index whose URLs sat on another host (after
 * a docs move, or behind a redirect) gave whole URLs as slugs.
 */
export function slugFromUrl(url: string, origin: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return url.replace(/^\/+/, "").replace(/\.md$/, "");
  }
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep it encoded */
  }
  let prefix = "";
  try {
    prefix = new URL(origin).pathname.replace(/\/+$/, "");
  } catch {
    /* no prefix */
  }
  if (prefix && path.startsWith(`${prefix}/`)) path = path.slice(prefix.length);
  return path.replace(/^\/+/, "").replace(/\.md$/, "");
}

/** Case and whitespace folded, for comparing titles and descriptions. */
function fold(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** One description may be a shortened copy of the other. */
function sameDescription(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  if (!x || !y) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

/**
 * Pages of llms-full.txt, found by their own header.
 *
 * Pages are separated by a `---` line, but a page can contain one too (a Markdown rule,
 * or front matter). Splitting on every `---` cut such a page short and shifted every page
 * after it. So a segment is a candidate page only when it opens with `# Title` for a title
 * the index lists. It is a sure page (`header`) when the paragraph under the title is that
 * entry's description, as on the live site, or the entry has none. Any other segment is
 * put back onto the page before it, `---` included; so is a candidate that pairPages
 * leaves unpaired, which is how a `---` and a heading inside a page stay in that page.
 * The banner before the first page is dropped.
 */
export function parseCorpus(corpus: string, entries: IndexEntry[]): CorpusPage[] {
  const descriptions = new Map<string, string[]>();
  for (const e of entries) {
    const key = fold(e.title);
    descriptions.set(key, [...(descriptions.get(key) ?? []), e.description]);
  }

  const pages: CorpusPage[] = [];
  for (const segment of corpus.replace(/\r\n?/g, "\n").split(/^---[ \t]*$/m)) {
    const text = segment.trim();
    const title = /^#\s+(.+)$/.exec(text.split("\n")[0] ?? "")?.[1]?.trim() ?? "";
    const lead = text.split(/\n\s*\n/)[1]?.trim() ?? "";
    const known = title ? descriptions.get(fold(title)) : undefined;

    if (known) {
      const header = known.some((d) => d === "" || sameDescription(d, lead));
      pages.push({ title, lead, header, content: text });
    } else if (pages.length > 0) {
      pages[pages.length - 1]!.content += `\n\n---\n\n${text}`;
    }
  }
  return pages;
}

/** Words of a URL path that can say which of two same-titled pages it is. */
const GENERIC_URL_WORDS = new Set([
  "overview", "platform", "api", "reference", "index", "v1", "get", "post", "put", "patch", "delete",
]);

/** A URL's path without the `.md` suffix; the text itself when it is not a URL. */
function urlPath(url: string): string {
  try {
    return new URL(url).pathname.replace(/\.md$/, "");
  } catch {
    return url.replace(/\.md$/, "");
  }
}

function urlWords(url: string): string[] {
  return urlPath(url)
    .toLowerCase()
    .split(/[/\-_.]+/)
    .filter((w) => w.length > 2 && !GENERIC_URL_WORDS.has(w));
}

/** `<Endpoint method="POST" path="/v1/wallets" />` → `post-v1-wallets`, as reference URLs end. */
function endpointSlug(content: string): string | null {
  const m = /<Endpoint\s+method="(\w+)"\s+path="([^"]+)"/.exec(content);
  if (!m) return null;
  return `${m[1]!.toLowerCase()}-${m[2]!.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/^-+|-+$/g, "");
}

/**
 * Pairs index entries with corpus pages by title, whatever order either file is in.
 *
 * Titles repeat (the guide and the reference page for "Create a wallet"; three pages
 * called "Overview"), so each same-title candidate is scored:
 *
 *   +4  the page's description line matches the entry's
 *   +8  a reference page's endpoint matches the end of the entry's URL
 *   ≤1  the words of the entry's URL appear in the page
 *
 * Measured on the live files: the collections and webhooks overviews share both title and
 * description, and only the URL words tell them apart; without them, 136 of 300 shuffles
 * of the corpus paired the two the wrong way round. Pairs are taken best score first,
 * then by rank among same-titled pages, then in index order.
 */
export function pairPages(
  entries: IndexEntry[],
  corpus: CorpusPage[],
  slugOf: (url: string) => string,
): { pages: DocPage[]; unmatchedEntries: number; unmatchedPages: number } {
  const entriesByTitle = new Map<string, number[]>();
  entries.forEach((e, i) => {
    const key = fold(e.title);
    entriesByTitle.set(key, [...(entriesByTitle.get(key) ?? []), i]);
  });

  const candidates: Array<{ score: number; distance: number; entry: number; page: number }> = [];
  const rankOfTitle = new Map<string, number>();
  corpus.forEach((page, p) => {
    const key = fold(page.title);
    const rank = rankOfTitle.get(key) ?? 0;
    rankOfTitle.set(key, rank + 1);

    const body = page.content.toLowerCase();
    const endpoint = endpointSlug(page.content);
    (entriesByTitle.get(key) ?? []).forEach((e, k) => {
      const entry = entries[e]!;
      let score = 0;
      if (sameDescription(entry.description, page.lead)) score += 4;
      if (endpoint && urlPath(entry.url).toLowerCase().split("/").pop() === endpoint) score += 8;
      const words = urlWords(entry.url);
      if (words.length > 0) {
        score += words.reduce((s, w) => s + Math.min(count(body, w), 50) / 50, 0) / words.length;
      }
      candidates.push({ score, distance: Math.abs(rank - k), entry: e, page: p });
    });
  });

  candidates.sort((a, b) => b.score - a.score || a.distance - b.distance || a.entry - b.entry);
  const pageFor = new Map<number, number>();
  const usedPages = new Set<number>();
  for (const c of candidates) {
    if (pageFor.has(c.entry) || usedPages.has(c.page)) continue;
    pageFor.set(c.entry, c.page);
    usedPages.add(c.page);
  }

  // A candidate that is not a sure header and found no entry was a `---` and a heading
  // inside the page before it: put it back there.
  const content = corpus.map((c) => c.content);
  let host = -1;
  let unmatchedPages = 0;
  corpus.forEach((page, p) => {
    if (usedPages.has(p) || page.header || host < 0) {
      host = p;
      if (!usedPages.has(p)) unmatchedPages++;
      return;
    }
    content[host] += `\n\n---\n\n${content[p]}`;
  });

  const pages = entries.map((entry, i): DocPage => {
    const p = pageFor.get(i);
    return {
      title: entry.title,
      slug: slugOf(entry.url),
      url: entry.url,
      section: entry.section,
      description: entry.description,
      // An entry with no page keeps its description rather than borrowing another page's body.
      content: p === undefined ? entry.description : content[p]!,
    };
  });

  return { pages, unmatchedEntries: entries.length - pageFor.size, unmatchedPages };
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
