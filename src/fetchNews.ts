import { toYahooTicker } from "./config.js";

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = "https://newsapi.org/v2/everything";
const MAX_ARTICLES_PER_TICKER = 3;
const BATCH_SIZE = 5; // tickers per request — keeps OR queries manageable

// Company/ETF names for better article matching (tickers alone miss many hits)
const TICKER_NAMES: Record<string, string[]> = {
  AAPL: ["Apple"],
  AMZN: ["Amazon"],
  INTC: ["Intel"],
  TSM: ["TSMC", "Taiwan Semiconductor"],
  DVN: ["Devon Energy"],
  BIPC: ["Brookfield Infrastructure"],
  VOO: ["S&P 500", "S&P500"],
  QQQ: ["Nasdaq", "NASDAQ"],
  SMH: ["semiconductor"],
  XLU: ["utilities"],
  XLV: ["healthcare"],
  ITA: ["defense", "aerospace"],
  GLD: ["gold"],
  BTC: ["Bitcoin"],
  ETH: ["Ethereum"],
  BSV: ["bond", "treasury"],
  ESGU: ["ESG"],
  IJH: ["mid-cap", "midcap"],
  AIQ: ["artificial intelligence", " AI "],
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
  console.log(`Found news for ${withNews}/${tickers.length} tickers\n`);
  return allNews;
}
