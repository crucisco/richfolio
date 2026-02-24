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
  → fetchPrices (Yahoo Finance: prices, P/E, 52w range, beta, dividends, ETF holdings)
  → fetchNews (NewsAPI: top headlines per ticker)
  → analyze (allocation gaps, P/E signals, overlap discounts, portfolio metrics)
  → aiAnalyze (Gemini: AI buy recommendations with confidence scores)
  → email + telegram (deliver daily brief)
```

Weekly mode (`--weekly`) skips news and AI, producing a focused rebalancing report.

---

## Architecture

```
src/
├── config.ts          # Typed loader for config.json + .env
├── index.ts           # Entry point — parses --weekly flag, wires modules
├── fetchPrices.ts     # Yahoo Finance via yahoo-finance2 (instance-based v3 API)
├── fetchNews.ts       # NewsAPI with ticker-to-company-name mapping
├── analyze.ts         # Core analysis: gaps, P/E signals, overlap, portfolio metrics
├── aiAnalysis.ts      # Gemini prompt builder + JSON response parser
├── email.ts           # Daily HTML email template + Resend delivery
├── weeklyEmail.ts     # Weekly rebalancing email template + Resend delivery
└── telegram.ts        # Telegram Bot API delivery (daily + weekly formatters)
```

Each module is independent — they communicate through typed interfaces (`QuoteData`, `AllocationItem`, `AllocationReport`, `AIBuyRecommendation`).

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

### AI Scoring

The Gemini prompt includes all data points per ticker: price, P/E ratios, 52-week position, allocation gap, dividend yield, beta, ETF overlap, and recent news headlines. The AI weighs these holistically and returns:

- **Action**: STRONG BUY, BUY, HOLD, or WAIT
- **Confidence**: 0–100%
- **Reason**: 1–2 sentence explanation
- **Suggested amount**: USD to invest

If Gemini is unavailable, the system falls back to gap-based ranking (largest allocation gap first).

---

## Two Modes

| | Daily | Weekly |
|---|---|---|
| Prices & fundamentals | Yes | Yes |
| News headlines | Yes | No |
| AI recommendations | Yes | No |
| Allocation analysis | Yes | Yes |
| Email template | Full brief | Rebalancing table |
| Telegram format | AI recs + news | BUY/TRIM actions |
