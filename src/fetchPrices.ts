import YahooFinance from "yahoo-finance2";
import { toYahooTicker, fromYahooTicker } from "./config.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

// ── Types ───────────────────────────────────────────────────────────
export interface HoldingInfo {
  symbol: string;
  holdingPercent: number;
}

export interface QuoteData {
  ticker: string;
  price: number;
  trailingPE: number | null;
  forwardPE: number | null;
  avgPE: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekPercent: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  beta: number | null;
  holdings: HoldingInfo[] | null;
  // Fundamental data (from financialData module)
  returnOnEquity: number | null;
  debtToEquity: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  targetMeanPrice: number | null;
  recommendationKey: string | null;
  // After-hours / pre-market prices (from Yahoo price module)
  postMarketPrice: number | null;
  preMarketPrice: number | null;
}

// ── Latest price helper (prefers after-hours when available) ────────
export function getLatestPrice(quote: QuoteData): { price: number; source: string } {
  if (quote.postMarketPrice != null && quote.postMarketPrice > 0) {
    return { price: quote.postMarketPrice, source: "after-hours" };
  }
  if (quote.preMarketPrice != null && quote.preMarketPrice > 0) {
    return { price: quote.preMarketPrice, source: "pre-market" };
  }
  return { price: quote.price, source: "regular" };
}

// ── Fetch a single ticker ───────────────────────────────────────────
async function fetchOne(yahooTicker: string): Promise<QuoteData | null> {
  const configTicker = fromYahooTicker(yahooTicker);

  try {
    const result = await yahooFinance.quoteSummary(yahooTicker, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics", "earningsHistory", "topHoldings", "financialData"],
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

    // Compute avg P/E from earnings history (quarterly EPS)
    let avgPE: number | null = null;
    const history = result.earningsHistory?.history;
    if (history && history.length >= 2) {
      const epsValues = history
        .map((q) => q.epsActual)
        .filter((eps): eps is number => eps != null && eps > 0);
      if (epsValues.length >= 2) {
        const avgQuarterlyEPS =
          epsValues.reduce((sum, eps) => sum + eps, 0) / epsValues.length;
        const annualizedEPS = avgQuarterlyEPS * 4;
        if (annualizedEPS > 0) {
          avgPE = Math.round((price / annualizedEPS) * 10) / 10;
        }
      }
    }

    // Extract fundamental data (null for ETFs and crypto)
    const fin = result.financialData;

    // Extract ETF top holdings (null for individual stocks)
    const rawHoldings = result.topHoldings?.holdings;
    const holdings: HoldingInfo[] | null =
      rawHoldings && rawHoldings.length > 0
        ? rawHoldings
            .filter((h) => h.symbol && h.holdingPercent != null)
            .map((h) => ({ symbol: h.symbol, holdingPercent: h.holdingPercent }))
        : null;

    return {
      ticker: configTicker,
      price,
      trailingPE: result.summaryDetail?.trailingPE ?? null,
      forwardPE: result.summaryDetail?.forwardPE ?? null,
      avgPE,
      fiftyTwoWeekHigh: high,
      fiftyTwoWeekLow: low,
      fiftyTwoWeekPercent: range != null ? Math.round(range * 1000) / 1000 : null,
      marketCap: result.summaryDetail?.marketCap ?? result.price?.marketCap ?? null,
      dividendYield: result.summaryDetail?.dividendYield ?? null,
      beta: result.defaultKeyStatistics?.beta ?? null,
      holdings,
      returnOnEquity: fin?.returnOnEquity ?? null,
      debtToEquity: fin?.debtToEquity ?? null,
      freeCashflow: fin?.freeCashflow ?? null,
      operatingCashflow: fin?.operatingCashflow ?? null,
      profitMargins: fin?.profitMargins ?? null,
      revenueGrowth: fin?.revenueGrowth ?? null,
      earningsGrowth: fin?.earningsGrowth ?? null,
      targetMeanPrice: fin?.targetMeanPrice ?? null,
      recommendationKey: fin?.recommendationKey ?? null,
      postMarketPrice: result.price?.postMarketPrice ?? null,
      preMarketPrice: result.price?.preMarketPrice ?? null,
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
          (data.avgPE != null ? ` avgPE=${data.avgPE.toFixed(1)}` : "") +
          (data.fiftyTwoWeekPercent != null
            ? ` 52w=${(data.fiftyTwoWeekPercent * 100).toFixed(0)}%`
            : "") +
          (data.dividendYield != null
            ? ` div=${(data.dividendYield * 100).toFixed(2)}%`
            : "") +
          (data.beta != null ? ` β=${data.beta.toFixed(2)}` : "") +
          (data.returnOnEquity != null ? ` ROE=${(data.returnOnEquity * 100).toFixed(0)}%` : "") +
          (data.holdings != null ? ` [${data.holdings.length} holdings]` : "")
      );
    }
  }

  console.log(
    `Fetched ${Object.keys(results).length}/${tickers.length} tickers\n`
  );
  return results;
}
