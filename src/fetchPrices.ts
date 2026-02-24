import YahooFinance from "yahoo-finance2";
import { toYahooTicker, fromYahooTicker } from "./config.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

// ── Types ───────────────────────────────────────────────────────────
export interface QuoteData {
  ticker: string;
  price: number;
  trailingPE: number | null;
  forwardPE: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekPercent: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  beta: number | null;
}

// ── Fetch a single ticker ───────────────────────────────────────────
async function fetchOne(yahooTicker: string): Promise<QuoteData | null> {
  const configTicker = fromYahooTicker(yahooTicker);

  try {
    const result = await yahooFinance.quoteSummary(yahooTicker, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics"],
    });

    const price =
      result.price?.regularMarketPrice ?? null;

    if (price == null) {
      console.warn(`  ⚠ ${configTicker}: no price data, skipping`);
      return null;
    }

    const high = result.summaryDetail?.fiftyTwoWeekHigh ?? null;
    const low = result.summaryDetail?.fiftyTwoWeekLow ?? null;
    const range = high != null && low != null && high !== low
      ? (price - low) / (high - low)
      : null;

    return {
      ticker: configTicker,
      price,
      trailingPE: result.summaryDetail?.trailingPE ?? null,
      forwardPE: result.summaryDetail?.forwardPE ?? null,
      fiftyTwoWeekHigh: high,
      fiftyTwoWeekLow: low,
      fiftyTwoWeekPercent: range != null ? Math.round(range * 1000) / 1000 : null,
      marketCap: result.summaryDetail?.marketCap ?? result.price?.marketCap ?? null,
      dividendYield: result.summaryDetail?.dividendYield ?? null,
      beta: result.defaultKeyStatistics?.beta ?? null,
    };
  } catch (err) {
    console.error(`  ✗ ${configTicker}: fetch failed —`, (err as Error).message);
    return null;
  }
}

// ── Fetch all tickers ───────────────────────────────────────────────
export async function fetchAllPrices(
  tickers: string[]
): Promise<Record<string, QuoteData>> {
  console.log(`Fetching prices for ${tickers.length} tickers...`);

  const results: Record<string, QuoteData> = {};

  for (const ticker of tickers) {
    const yahooTicker = toYahooTicker(ticker);
    const data = await fetchOne(yahooTicker);
    if (data) {
      results[data.ticker] = data;
      console.log(
        `  ✓ ${data.ticker}: $${data.price.toFixed(2)}` +
          (data.trailingPE != null ? ` P/E=${data.trailingPE.toFixed(1)}` : "") +
          (data.fiftyTwoWeekPercent != null
            ? ` 52w=${(data.fiftyTwoWeekPercent * 100).toFixed(0)}%`
            : "") +
          (data.dividendYield != null
            ? ` div=${(data.dividendYield * 100).toFixed(2)}%`
            : "") +
          (data.beta != null ? ` β=${data.beta.toFixed(2)}` : "")
      );
    }
  }

  console.log(
    `Fetched ${Object.keys(results).length}/${tickers.length} tickers\n`
  );
  return results;
}
