---
title: Features
layout: default
nav_order: 2
---

# Features

Richfolio packs 12 capabilities into a single pipeline — all running on free-tier APIs.

---

## AI Buy Recommendations

Gemini 2.5 Flash analyzes your entire portfolio context — valuation metrics, allocation gaps, news sentiment, technical indicators, risk factors — and returns ranked buy recommendations with confidence scores and reasoning.

Each ticker gets an action: **STRONG BUY**, **BUY**, **HOLD**, or **WAIT**, along with a suggested dollar amount and limit order price. If the Gemini API is unavailable or quota is exhausted, Richfolio falls back to gap-based recommendations automatically.

![Daily Brief](screenshots/morning-debrief.png){: style="max-width: 400px; display: block; margin: 16px auto;" }

---

## Technical Momentum Signals

Richfolio fetches 250 days of historical price data via Yahoo Finance and computes technical indicators for every ticker in your portfolio:

- **SMA50 / SMA200** — 50-day and 200-day simple moving averages, with current price position relative to each
- **RSI(14)** — 14-day Relative Strength Index (below 30 = oversold, above 70 = overbought)
- **Golden / Death Cross** — SMA50 crossing above (bullish) or below (bearish) SMA200
- **Momentum Signal** — classified as **bullish**, **bearish**, or **neutral** based on price vs MAs and RSI
- **Recent Lows** — 7-day and 30-day lows for identifying nearby support levels

All technical data feeds into the AI prompt for better-informed recommendations. For **STRONG BUY** tickers, momentum details are shown directly in the email and Telegram message.

---

## Limit Order Prices

When Gemini recommends **STRONG BUY** or **BUY**, it also suggests a limit order price slightly below current market. The suggested price is based on the nearest support level:

- **Moving average support** — price near the 50-day or 200-day MA
- **Recent lows** — 7-day or 30-day low as a support floor
- **Round numbers** — psychological support at round price levels

Limit order prices and their reasoning are displayed for **STRONG BUY** tickers in the daily email, Telegram message, and intraday alerts.

---

## Allocation Gap Analysis

Compares your current holdings against your target allocation percentages. Each ticker is scored by how far it is from its target, with suggested buy amounts in dollars and shares.

The analysis uses the higher of your actual portfolio value or configured estimate, so gap calculations remain meaningful even when your current holdings are smaller than your target portfolio size.

---

## Dynamic P/E Signals

Trailing P/E is compared against a historically-computed average P/E derived from Yahoo Finance's earnings history data. No manual benchmarks needed — the system fetches quarterly EPS data and computes the average automatically.

Tickers trading below their historical average P/E are flagged as **below avg** (potential value), while those above are flagged as **above avg** (potentially overvalued). ETFs and crypto naturally skip this signal since they have no earnings data.

---

## ETF Overlap Detection

When you hold individual stocks that are also top holdings of ETFs in your target portfolio, Richfolio detects the overlap and reduces the ETF's buy priority accordingly.

**Example:** If you hold 30 shares of AAPL and VOO contains ~7% AAPL, your direct AAPL exposure partially covers VOO's allocation gap. The suggested buy amount for VOO is reduced by the overlap value.

This prevents you from inadvertently over-concentrating in stocks you already hold through ETFs.

---

## 52-Week Range Signals

Each ticker's current price is positioned within its 52-week range (0% = at the low, 100% = at the high):

- **Near low** (below 20%) — potential buying opportunity
- **Near high** (above 80%) — exercise caution
- **Mid-range** — neutral

The AI analysis factors this into its recommendations alongside P/E and allocation data.

---

## News Digest

Top headlines per ticker from NewsAPI, fetched via batched requests to stay within the free tier's 100 requests/day limit. Headlines from the last 24 hours are matched to tickers using company name mapping.

News sentiment feeds into the AI analysis — negative news might signal a contrarian buying opportunity or genuine risk, depending on context.

---

## Portfolio Health

Two portfolio-wide metrics calculated from your current holdings:

- **Weighted Beta** — portfolio-level market risk, weighted by position size
- **Estimated Annual Dividend Income** — projected yearly dividends based on current yields and position sizes

---

## Intraday Alerts

Don't miss the buying moment of the day. After the morning brief runs, Richfolio saves the AI recommendations as a baseline. Intraday checks (`npm run intraday`) run every 2 hours during market hours, re-fetch prices and technicals, re-run Gemini analysis (skipping news to save API quota), and compare against the morning baseline.

An alert fires only when:

- **Confidence increases** by at least 5 percentage points (configurable) AND is above 80% (configurable)
- **Action upgrades** — e.g., BUY in the morning becomes STRONG BUY in the afternoon
- **New signal** — a ticker that wasn't recommended in the morning now has a strong buy signal

Alerts are delivered via email and Telegram with a focused format showing the morning vs current comparison, price change, AI reasoning, and limit order price for STRONG BUY signals. No alert = no message — you only hear from Richfolio when it matters.

All thresholds are configurable via the `intradayAlerts` section in `config.json`. See [Configuration](configuration) for details.

![Intraday Alert](screenshots/intraday-alert.png){: style="max-width: 400px; display: block; margin: 16px auto;" }

---

## Weekly Rebalancing Report

A separate weekly report (`npm run weekly`) focused purely on portfolio drift and rebalancing actions. No news, no AI — just a clean table showing:

- **BUY** — underweight positions (gap > 1%)
- **TRIM** — overweight positions (gap < -1%)
- **OK** — positions within target range

Includes overweight warnings and flags holdings that aren't in your target portfolio.

![Weekly Rebalance](screenshots/weekly-rebalance.png){: style="max-width: 400px; display: block; margin: 16px auto;" }

---

## Dual Delivery

Every report is delivered through two channels:

- **Email** — dark-themed HTML email via Resend with full detail (allocation table, P/E signals, AI recommendations, technical momentum, limit orders, news)
- **Telegram** — condensed plain-text summary via Telegram Bot API, optimized for mobile reading (includes technicals and limit prices for STRONG BUY)

Both channels work independently — if one isn't configured, the other still delivers.
