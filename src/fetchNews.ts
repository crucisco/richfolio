import { GoogleGenAI, Type } from "@google/genai";
import { toYahooTicker } from "./config.js";

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NEWS_API_BASE = "https://newsapi.org/v2/everything";
const MAX_ARTICLES_PER_TICKER = 3;
const BATCH_SIZE = 5; // tickers per request — keeps OR queries manageable

// Company/ETF names for better article matching (tickers alone miss many hits)
// Use specific financial phrases to avoid false positives (e.g. "bond" matching animal articles)
const TICKER_NAMES: Record<string, string[]> = {
  AAPL: ["Apple"],
  AMZN: ["Amazon"],
  INTC: ["Intel"],
  TSM: ["TSMC", "Taiwan Semiconductor"],
  DVN: ["Devon Energy"],
  BIPC: ["Brookfield Infrastructure"],
  VOO: ["S&P 500", "S&P500"],
  QQQ: ["Nasdaq", "NASDAQ"],
  SMH: ["semiconductor ETF", "chip stocks", "semiconductor index"],
  XLU: ["utilities ETF", "utility stocks"],
  XLV: ["healthcare ETF", "health stocks"],
  ITA: ["defense ETF", "aerospace ETF", "defense stocks"],
  GLD: ["gold price", "gold ETF", "gold futures"],
  BTC: ["Bitcoin"],
  ETH: ["Ethereum"],
  BSV: ["bond ETF", "bond market", "treasury bond", "short-term bond", "fixed income", "Vanguard bond"],
  ESGU: ["ESG investing", "ESG fund"],
  IJH: ["mid-cap ETF", "midcap stocks", "S&P MidCap"],
  AIQ: ["artificial intelligence ETF", "AI stocks"],
};

// ── Types ───────────────────────────────────────────────────────────
export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface NewsApiArticle {
  title: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

// ── Fetch a batch of tickers ────────────────────────────────────────
async function fetchBatch(
  tickers: string[]
): Promise<Record<string, NewsItem[]>> {
  // Build query using ticker symbols + company names for better coverage
  const queryTerms: string[] = [];
  for (const ticker of tickers) {
    queryTerms.push(ticker);
    const names = TICKER_NAMES[ticker];
    if (names) queryTerms.push(...names);
  }
  const query = queryTerms.join(" OR ");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const params = new URLSearchParams({
    q: query,
    from: since,
    sortBy: "relevancy",
    language: "en",
    pageSize: "50",
    apiKey: NEWS_API_KEY!,
  });

  const res = await fetch(`${NEWS_API_BASE}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NewsAPI ${res.status}: ${body}`);
  }

  const data = (await res.json()) as NewsApiResponse;

  // Assign articles to tickers by matching ticker or name in title
  const result: Record<string, NewsItem[]> = {};
  for (const ticker of tickers) {
    result[ticker] = [];
  }

  for (const article of data.articles) {
    // Skip non-English articles (NewsAPI language filter isn't perfect)
    if (/[\u3000-\u9FFF\uAC00-\uD7AF\u0600-\u06FF]/.test(article.title)) continue;

    const titleUpper = article.title.toUpperCase();
    for (const ticker of tickers) {
      if (result[ticker].length >= MAX_ARTICLES_PER_TICKER) continue;

      const yahooTicker = toYahooTicker(ticker);
      const names = TICKER_NAMES[ticker] || [];
      const matches =
        titleUpper.includes(ticker.toUpperCase()) ||
        titleUpper.includes(yahooTicker.toUpperCase()) ||
        names.some((name) => titleUpper.includes(name.toUpperCase()));

      if (matches) {
        result[ticker].push({
          title: article.title,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
        });
      }
    }
  }

  return result;
}

// ── Gemini relevance filter ─────────────────────────────────────────
// Sends all ticker→headline pairs in one call, returns only relevant ones.
// Costs ~1000-2000 tokens (titles only) — negligible on free tier.
const relevanceSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      ticker: { type: Type.STRING },
      relevantIndices: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: "0-based indices of articles that are relevant to this ticker's financial context",
      },
    },
  },
};

async function filterNewsWithGemini(
  allNews: Record<string, NewsItem[]>
): Promise<Record<string, NewsItem[]>> {
  if (!GEMINI_API_KEY) return allNews;

  // Build a compact list of ticker → headlines for the prompt
  const entries: { ticker: string; headlines: string[] }[] = [];
  for (const [ticker, articles] of Object.entries(allNews)) {
    if (articles.length === 0) continue;
    entries.push({
      ticker,
      headlines: articles.map((a) => `${a.title} — ${a.source}`),
    });
  }
  if (entries.length === 0) return allNews;

  const prompt = `You are a financial news relevance filter for an investment portfolio tracker. For each ticker below, determine which headlines are actually about the company/fund's financial context: stock performance, earnings, market analysis, sector trends, company strategy, M&A, regulatory impact, or macroeconomic effects on the ticker.

REMOVE headlines that are:
- Shopping/product/deal articles (e.g. "best deals on Amazon", "Dutch ovens under $50 on Amazon" — these are about the marketplace, not the stock)
- Lifestyle, food, fashion, or consumer product reviews that merely mention a brand/platform
- Animal, science, sports, or entertainment articles where the keyword match is coincidental (e.g. "bond" matching animal bonding, not bond markets)
- Ads, sponsored content, or affiliate/deal roundups
- Non-English articles that slipped through filters

KEEP only headlines about: stock price, earnings, revenue, analyst ratings, market trends, company leadership, regulatory news, sector performance, fund flows, or economic indicators relevant to the ticker.

Tickers and their matched headlines:
${entries.map((e) => `${e.ticker}:\n${e.headlines.map((h, i) => `  [${i}] ${h}`).join("\n")}`).join("\n\n")}

Return each ticker with the indices of headlines that ARE financially relevant. If none are relevant, return an empty array for that ticker.`;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: relevanceSchema,
      },
    });

    const filtered = JSON.parse(response.text!) as Array<{
      ticker: string;
      relevantIndices: number[];
    }>;

    const result: Record<string, NewsItem[]> = {};
    // Start with empty arrays for all tickers
    for (const ticker of Object.keys(allNews)) {
      result[ticker] = [];
    }
    // Keep only Gemini-approved articles
    for (const { ticker, relevantIndices } of filtered) {
      const original = allNews[ticker];
      if (!original) continue;
      result[ticker] = relevantIndices
        .filter((i) => i >= 0 && i < original.length)
        .map((i) => original[i]);
    }

    const before = Object.values(allNews).reduce((s, a) => s + a.length, 0);
    const after = Object.values(result).reduce((s, a) => s + a.length, 0);
    if (before !== after) {
      console.log(`  Gemini filter: ${before} → ${after} articles (removed ${before - after} irrelevant)`);
    }

    return result;
  } catch (err) {
    console.warn(`  ⚠ Gemini news filter failed, using unfiltered results: ${(err as Error).message}`);
    return allNews;
  }
}

// ── Fetch news for all tickers ──────────────────────────────────────
export async function fetchNews(
  tickers: string[]
): Promise<Record<string, NewsItem[]>> {
  if (!NEWS_API_KEY) {
    console.warn("NEWS_API_KEY not set — skipping news fetch\n");
    return Object.fromEntries(tickers.map((t) => [t, []]));
  }

  console.log(`Fetching news for ${tickers.length} tickers...`);
  const allNews: Record<string, NewsItem[]> = {};

  // Batch tickers to reduce API calls
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    try {
      const batchNews = await fetchBatch(batch);
      Object.assign(allNews, batchNews);
    } catch (err) {
      console.error(
        `  ✗ News batch [${batch.join(", ")}] failed:`,
        (err as Error).message
      );
      for (const t of batch) allNews[t] = [];
    }
  }

  const withNews = Object.values(allNews).filter((a) => a.length > 0).length;
  console.log(`Found news for ${withNews}/${tickers.length} tickers`);

  // Second pass: Gemini filters out irrelevant articles (graceful fallback if unavailable)
  const filtered = await filterNewsWithGemini(allNews);
  console.log();
  return filtered;
}
