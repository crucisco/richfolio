import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ───────────────────────────────────────────────────────────
export interface PortfolioConfig {
  targetPortfolio: Record<string, number>;
  currentHoldings: Record<string, number>;
  totalPortfolioValueUSD: number;
  peBenchmarks: Record<string, number>;
}

// ── Load config.json ────────────────────────────────────────────────
const configPath = resolve(process.cwd(), "config.json");
let raw: string;
try {
  raw = readFileSync(configPath, "utf-8");
} catch {
  throw new Error(
    `Missing config.json — copy config.example.json to config.json and edit it:\n  cp config.example.json config.json`
  );
}

const json = JSON.parse(raw) as PortfolioConfig;

export const targetPortfolio = json.targetPortfolio;
export const currentHoldings = json.currentHoldings;
export const totalPortfolioValueUSD = json.totalPortfolioValueUSD;
export const peBenchmarks = json.peBenchmarks;

// ── Environment-only settings ───────────────────────────────────────
export const recipientEmail =
  process.env.RECIPIENT_EMAIL || "you@example.com";

// ── Ticker mapping ──────────────────────────────────────────────────
// Yahoo Finance requires specific ticker formats for crypto
const tickerMap: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};

/** Convert a config ticker to its Yahoo Finance symbol */
export function toYahooTicker(ticker: string): string {
  return tickerMap[ticker] || ticker;
}

/** Convert a Yahoo Finance symbol back to the config ticker */
export function fromYahooTicker(yahooTicker: string): string {
  for (const [key, value] of Object.entries(tickerMap)) {
    if (value === yahooTicker) return key;
  }
  return yahooTicker;
}

/** Get all unique tickers from both target and current holdings */
export function allUniqueTickers(): string[] {
  return [
    ...new Set([
      ...Object.keys(targetPortfolio),
      ...Object.keys(currentHoldings),
    ]),
  ];
}
