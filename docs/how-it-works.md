---
title: How It Works
layout: default
nav_order: 7
---

# How It Works

Richfolio is a single-pipeline system — no API server, no database, no dashboard. It runs once, produces a report, and exits.

---

## Data Pipeline

```
config.json + .env
  → fetchPrices (Yahoo Finance: prices, P/E, 52w range, beta, dividends, ETF holdings, fundamentals)
  → fetchTechnicals (Yahoo Finance chart: SMA50, SMA200, RSI, momentum, volume change)
  → fetchNews (NewsAPI: top headlines per ticker)
  → analyze (allocation gaps, P/E signals, overlap discounts, portfolio metrics)
  → aiAnalyze (Gemini: buy recs + confidence + limit prices + value ratings + bottom signals)
  → email + telegram (deliver daily brief with value ratings, bottom signals, technicals)
```

Weekly mode (`--weekly`) skips news, technicals, and AI, producing a focused rebalancing report.

Intraday mode (`--intraday`) re-fetches prices and technicals, re-runs AI (skipping news), compares against the morning baseline, and alerts only when signals strengthen.

---

## Architecture

```
src/
├── config.ts          # Typed loader for config.json + .env
├── index.ts           # Entry point — parses --weekly/--intraday flags, wires modules
├── fetchPrices.ts     # Yahoo Finance via yahoo-finance2 (instance-based v3 API) + fundamentals
├── fetchTechnicals.ts # Yahoo Finance chart: SMA50, SMA200, RSI, momentum, volume change
├── fetchNews.ts       # NewsAPI with ticker-to-company-name mapping
├── analyze.ts         # Core analysis: gaps, P/E signals, overlap, portfolio metrics
├── aiAnalysis.ts      # Gemini prompt builder + JSON response parser + value ratings + bottom signals
├── detailedAnalysis.ts# Gemini 2.5 Pro: detailed buy thesis + risk analysis for STRONG BUY tickers
├── analysisUrl.ts     # Compress analysis data into URL hash for the GitHub Pages analysis page
├── state.ts           # Morning baseline save/load for intraday comparison
├── intradayCompare.ts # Compare current AI recs vs morning baseline
├── email.ts           # Daily HTML email template + Resend delivery
├── intradayEmail.ts   # Intraday alert email template + Resend delivery
├── weeklyEmail.ts     # Weekly rebalancing email template + Resend delivery
└── telegram.ts        # Telegram Bot API delivery (daily + intraday + weekly formatters)
```

Each module is independent — they communicate through typed interfaces (`QuoteData`, `TechnicalData`, `AllocationItem`, `AllocationReport`, `AIBuyRecommendation`, `IntradayAlert`). `QuoteData` includes fundamental data (ROE, debt/equity, FCF, margins, growth) from Yahoo's `financialData` module. `TechnicalData` includes volume change (7d vs 30d) for crypto bottom detection.

---

## Analysis Logic

### Allocation Gaps

For each ticker in your target portfolio:

1. **Current value** = shares held × current price
2. **Current %** = current value / portfolio value × 100
3. **Gap %** = target % − current %
4. **Suggested buy** = gap % × portfolio value (only when underweight)

Portfolio value uses the higher of actual holdings value or configured `totalPortfolioValueUSD`.

### Dynamic P/E Signals

Yahoo Finance provides quarterly EPS data via `earningsHistory`. Richfolio computes:

1. Filter positive quarterly EPS values (need at least 2 quarters)
2. Average quarterly EPS → annualize (× 4)
3. **Average P/E** = current price / annualized EPS
4. Compare trailing P/E against this average:
   - **Below average** → potential value opportunity
   - **Above average** → potentially overvalued

ETFs and crypto skip this signal (no earnings data).

### ETF Overlap Detection

For each target ETF, Yahoo Finance returns its top ~10 holdings with weight percentages. Richfolio checks if you hold any of those stocks directly:

1. For each ETF holding that matches a stock in `currentHoldings`:
   - **ETF exposure** = holding weight × ETF's suggested buy value
   - **Your exposure** = shares held × stock price
   - **Overlap** = min(ETF exposure, your exposure)
2. Sum all overlaps for the ETF
3. Reduce the ETF's suggested buy value by the total overlap

**Example:** VOO contains ~7% AAPL. If you hold $8,000 in AAPL and VOO's suggested buy is $10,000, the AAPL overlap is min(7% × $10,000, $8,000) = $700. VOO's buy suggestion drops to $9,300.

### 52-Week Range Scoring

Each ticker's price is positioned within its 52-week range:

- **0–20%** → near 52-week low (buying opportunity signal)
- **20–80%** → mid-range (neutral)
- **80–100%** → near 52-week high (caution signal)

### Technical Indicators

Richfolio fetches ~250 days of daily OHLCV data via `yahooFinance.chart()` and computes:

1. **SMA50** — simple moving average of the last 50 closing prices
2. **SMA200** — simple moving average of the last 200 closing prices (null if < 200 data points)
3. **RSI(14)** — standard Relative Strength Index using 14-day average gain/loss
4. **Momentum signal**:
   - **Bullish** — price > SMA50, SMA50 > SMA200, RSI > 40
   - **Bearish** — price < SMA50, SMA50 < SMA200, RSI < 60
   - **Neutral** — mixed signals
5. **Golden/Death cross** — SMA50 crossing above (golden) or below (death) SMA200
6. **Recent lows** — minimum price in last 7 and 30 trading days (support levels)
7. **Volume change** — 7-day average volume vs prior 30-day average (used by the crypto bottom-fishing model to detect selling exhaustion)

Tickers with fewer than 50 data points are gracefully skipped.

### AI Scoring

The Gemini prompt includes all data points per ticker: price, P/E ratios, 52-week position, allocation gap, dividend yield, beta, ETF overlap, technical indicators (MAs, RSI, momentum, volume change), fundamental data (ROE, debt/equity, FCF, margins, growth, analyst targets), and recent news headlines. The AI applies two structured analytical frameworks and returns:

- **Action**: STRONG BUY, BUY, HOLD, or WAIT
- **Confidence**: 0–100%
- **Reason**: 1–2 sentence explanation
- **Suggested amount**: USD to invest
- **Limit order price**: suggested price below market based on nearest support (MAs, recent lows, round numbers)
- **Limit price reason**: 1 sentence explaining the support level
- **Value rating**: A/B/C/D for individual stocks (empty for ETFs and crypto)
- **Bottom signal**: crypto accumulation zone description (empty for stocks and ETFs)

#### Value Investing Framework (Stocks Only)

The AI rates each individual stock A–D based on five fundamental criteria: ROE > 15%, debt/equity < 50%, FCF/operating CF > 80%, positive earnings growth, and price below analyst target. The rating adjusts the AI's confidence score (A boosts ~10 points, D reduces ~10 points). Fundamental data comes from Yahoo's `financialData` module — added to the existing `quoteSummary` call with zero extra API overhead.

#### Crypto Bottom-Fishing Model (BTC/ETH Only)

The AI evaluates four bottom indicators: RSI < 30, volume contraction > 20%, price below 200-day MA, and death cross. When 2+ indicators are present, the AI flags a bottom signal. When 3+ align, it strongly considers upgrading to STRONG BUY with a DCA recommendation. Volume change is computed from existing chart data — no additional API calls.

Technical indicators further refine the AI's confidence — a bullish momentum signal with oversold RSI strengthens a buy case, while bearish signals or overbought RSI weaken it.

If Gemini is unavailable, the system falls back to gap-based ranking (largest allocation gap first).

### Detailed Analysis Page (STRONG BUY Only)

For each **STRONG BUY** ticker, a separate Gemini 2.5 Pro call generates an in-depth buy thesis (3–4 paragraphs) and 3–4 specific risk factors. This detailed analysis, along with all metrics and technical data, is compressed using zlib and encoded as a base64url URL hash fragment.

The email and Telegram messages include a **"More Details"** link pointing to a static analysis page hosted on GitHub Pages (`docs/analysis/index.html`). The page decodes the URL hash client-side using pako and renders:

- **Interactive TradingView chart** — 6-month candlestick with SMA50, SMA200, and RSI overlays
- **Key metrics grid** — price, P/E, 52-week position, RSI, moving averages, momentum
- **Buy thesis** — multi-paragraph detailed analysis from Gemini Pro
- **Risk analysis** — specific risk factors to watch
- **Fundamentals** — ROE, debt/equity, margins, growth, analyst target (stocks only)
- **Signals** — golden/death cross, bottom signals (crypto)
- **Action summary** — suggested investment amount, limit order price with reasoning
- **52-week range bar** — visual position within the yearly range

No server-side logic is needed — all data is embedded in the URL. The page works offline once loaded. The URL is typically ~1,000–1,500 characters, well within email client limits.

---

## Three Modes

| | Daily | Intraday | Weekly |
|---|---|---|---|
| Prices & fundamentals | Yes | Yes | Yes |
| Technical indicators | Yes | Yes | No |
| News headlines | Yes | No | No |
| AI recommendations | Yes | Yes | No |
| Limit order prices | Yes | Yes | No |
| Value ratings (stocks) | Yes | Yes | No |
| Bottom signals (crypto) | Yes | Yes | No |
| Allocation analysis | Yes | Yes | Yes |
| Baseline comparison | Saves baseline | Compares vs morning | No |
| Email template | Full brief | Alert (triggered only) | Rebalancing table |
| Telegram format | AI recs + news | Alert (triggered only) | BUY/TRIM actions |

![Daily Brief](screenshots/morning-debrief.png){: style="max-width: 260px; display: inline-block;" }
![Intraday Alert](screenshots/intraday-alert.png){: style="max-width: 260px; display: inline-block;" }
![Weekly Rebalance](screenshots/weekly-rebalance.png){: style="max-width: 260px; display: inline-block;" }
