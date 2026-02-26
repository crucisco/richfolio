import YahooFinance from "yahoo-finance2";
import { toYahooTicker, fromYahooTicker } from "./config.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

// ── Types ───────────────────────────────────────────────────────────
export interface TechnicalData {
  ticker: string;
  sma50: number;
  sma200: number | null;
  rsi14: number;
  priceVsSma50: number;       // % above/below 50MA
  priceVsSma200: number | null;
  goldenCross: boolean;       // 50MA > 200MA
  deathCross: boolean;        // 50MA < 200MA
  momentumSignal: "bullish" | "bearish" | "neutral";
  recentLow7d: number;
  recentLow30d: number;
  volumeChange7d: number | null;
}

// ── Computation helpers ─────────────────────────────────────────────
function computeSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

function computeRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const recent = prices.slice(-(period + 1));
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < recent.length; i++) {
    const change = recent[i] - recent[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

// ── Fetch technicals for a single ticker ────────────────────────────
async function fetchOne(ticker: string): Promise<TechnicalData | null> {
  const yahooTicker = toYahooTicker(ticker);

  try {
    const now = new Date();
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - 365); // ~250 trading days

    const result = await yahooFinance.chart(yahooTicker, {
      period1,
      period2: now,
      interval: "1d",
    });

    const quotes = result.quotes;
    if (!quotes || quotes.length < 50) {
      console.warn(`  ⚠ ${ticker}: insufficient chart data (${quotes?.length ?? 0} days), skipping technicals`);
      return null;
    }

    const closes = quotes
      .map((q) => q.close)
      .filter((c): c is number => c != null);

    if (closes.length < 50) {
      console.warn(`  ⚠ ${ticker}: insufficient closing prices, skipping technicals`);
      return null;
    }

    const currentPrice = closes[closes.length - 1];
    const sma50 = computeSMA(closes, 50)!;
    const sma200 = computeSMA(closes, 200);
    const rsi14 = computeRSI(closes) ?? 50;

    const priceVsSma50 = ((currentPrice - sma50) / sma50) * 100;
    const priceVsSma200 = sma200 != null
      ? ((currentPrice - sma200) / sma200) * 100
      : null;

    const goldenCross = sma200 != null && sma50 > sma200;
    const deathCross = sma200 != null && sma50 < sma200;

    // Determine momentum signal
    let momentumSignal: "bullish" | "bearish" | "neutral" = "neutral";
    if (currentPrice > sma50 && (sma200 == null || sma50 > sma200) && rsi14 > 40) {
      momentumSignal = "bullish";
    } else if (currentPrice < sma50 && sma200 != null && sma50 < sma200 && rsi14 < 60) {
      momentumSignal = "bearish";
    }

    // Recent lows for support levels
    const last7 = closes.slice(-7);
    const last30 = closes.slice(-30);
    const recentLow7d = Math.min(...last7);
    const recentLow30d = Math.min(...last30);

    // Volume change: avg 7d vs prior 30d (for crypto bottom-fishing model)
    const volumes = quotes
      .map((q) => q.volume)
      .filter((v): v is number => v != null && v > 0);

    let volumeChange7d: number | null = null;
    if (volumes.length >= 37) {
      const recentVol = volumes.slice(-7);
      const priorVol = volumes.slice(-37, -7);
      const avgRecent = recentVol.reduce((s, v) => s + v, 0) / recentVol.length;
      const avgPrior = priorVol.reduce((s, v) => s + v, 0) / priorVol.length;
      if (avgPrior > 0) {
        volumeChange7d = Math.round(((avgRecent - avgPrior) / avgPrior) * 1000) / 10;
      }
    }

    return {
      ticker,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: sma200 != null ? Math.round(sma200 * 100) / 100 : null,
      rsi14,
      priceVsSma50: Math.round(priceVsSma50 * 10) / 10,
      priceVsSma200: priceVsSma200 != null ? Math.round(priceVsSma200 * 10) / 10 : null,
      goldenCross,
      deathCross,
      momentumSignal,
      recentLow7d: Math.round(recentLow7d * 100) / 100,
      recentLow30d: Math.round(recentLow30d * 100) / 100,
      volumeChange7d,
    };
  } catch (err) {
    console.error(`  ✗ ${ticker}: chart fetch failed —`, (err as Error).message);
    return null;
  }
}

// ── Fetch technicals for all tickers ────────────────────────────────
export async function fetchTechnicals(
  tickers: string[]
): Promise<Record<string, TechnicalData>> {
  console.log(`Fetching technicals for ${tickers.length} tickers...`);

  const results: Record<string, TechnicalData> = {};

  for (const ticker of tickers) {
    const data = await fetchOne(ticker);
    if (data) {
      results[ticker] = data;
      console.log(
        `  ✓ ${ticker}: 50MA=$${data.sma50}` +
          (data.sma200 != null ? ` 200MA=$${data.sma200}` : "") +
          ` RSI=${data.rsi14}` +
          ` ${data.momentumSignal}` +
          (data.goldenCross ? " ✨golden" : "") +
          (data.deathCross ? " ☠️death" : "") +
          (data.volumeChange7d != null ? ` vol${data.volumeChange7d > 0 ? "+" : ""}${data.volumeChange7d}%` : "")
      );
    }
  }

  console.log(
    `Technicals fetched for ${Object.keys(results).length}/${tickers.length} tickers\n`
  );
  return results;
}
