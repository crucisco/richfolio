# Richfolio

[![Morning Brief](https://github.com/furic/richfolio/actions/workflows/morning-brief.yml/badge.svg)](https://github.com/furic/richfolio/actions/workflows/morning-brief.yml)
[![Docs](https://github.com/furic/richfolio/actions/workflows/docs.yml/badge.svg)](https://furic.github.io/richfolio/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/richfolio?logo=npm&logoColor=white)](https://www.npmjs.com/package/richfolio)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Cost](https://img.shields.io/badge/Cost-%240%2Fmonth-2ecc71)](https://furic.github.io/richfolio/features)

A zero-maintenance portfolio monitoring system. Set your target allocations once, get daily briefings with allocation gaps, AI-powered buy signals, and relevant news — delivered via email and Telegram, automatically via GitHub Actions.

<p align="center">
  <img src="docs/screenshots/morning-debrief.png" alt="Daily Brief" width="280">
  &nbsp;&nbsp;
  <img src="docs/screenshots/intraday-alert.png" alt="Intraday Alert" width="280">
  &nbsp;&nbsp;
  <img src="docs/screenshots/weekly-rebalance.png" alt="Weekly Rebalance" width="280">
</p>

## Features

- **AI Buy Recommendations** — Gemini-powered analysis considering valuation, allocation gap, news sentiment, technicals, and risk (with gap-based fallback)
- **Value Investing Framework** — AI rates individual stocks A–D based on ROE, debt/equity, FCF, earnings growth, and analyst targets (data from Yahoo Finance, zero extra API calls)
- **Crypto Bottom-Fishing Model** — AI detects accumulation zones for BTC/ETH using RSI, volume contraction, 200MA position, and death cross signals
- **Technical Momentum Signals** — SMA50, SMA200, RSI(14), golden/death cross, and momentum classification (bullish/bearish/neutral) for each ticker
- **Limit Order Prices** — AI-suggested limit order prices based on nearby support levels (moving averages, recent lows, round numbers)
- **Allocation Gap Analysis** — current vs target %, flagged by priority with suggested buy amounts
- **Dynamic P/E Signals** — trailing P/E compared against historical averages fetched from Yahoo Finance (no manual benchmarks needed)
- **ETF Overlap Detection** — reduces buy priority for ETFs where you already hold overlapping stocks (e.g., holding AAPL reduces VOO's priority)
- **52-Week Range Signals** — highlights tickers near their 52-week low (opportunity) or high (caution)
- **News Digest** — top headlines per ticker from NewsAPI
- **Portfolio Health** — weighted beta, estimated annual dividend income
- **Intraday Alerts** — periodic checks that alert only when buy signals strengthen vs the morning brief (configurable thresholds)
- **Weekly Rebalancing Report** — focused drift analysis with BUY/TRIM/OK actions
- **Dual Delivery** — dark-themed HTML email via Resend + condensed Telegram message

## Quick Start

1. **Fork** this repo on GitHub
2. **Add secrets** — go to Settings → Secrets → Actions and add:
   - `CONFIG_JSON` — your portfolio config (see [config.example.json](config.example.json))
   - `RESEND_API_KEY` + `RECIPIENT_EMAIL` — for email delivery
   - Optionally: `NEWS_API_KEY`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
3. **Run** — trigger manually from Actions → Morning Brief → Run workflow, or wait for the daily cron (8am AEST)

That's it — no local setup required. See the [full setup guide](https://furic.github.io/richfolio/getting-started) for detailed instructions on each API key.

<details>
<summary>Local development</summary>

```bash
git clone https://github.com/furic/richfolio.git
cd richfolio
npm install
cp config.example.json config.json
cp .env.example .env
```

Edit `config.json` and `.env`, then:

```bash
npm run dev       # Daily brief (email + Telegram)
npm run intraday  # Intraday alert check (compares vs morning)
npm run weekly    # Weekly rebalancing report
```

</details>

## Stack

| Component | Service | Cost |
|-----------|---------|------|
| Runtime | Node.js + TypeScript (tsx) | Free |
| Prices & Fundamentals | Yahoo Finance (yahoo-finance2) | Free |
| News | NewsAPI.org | Free (100 req/day) |
| AI Analysis | Google Gemini 2.5 Flash | Free (250 req/day) |
| Email | Resend.com | Free (3,000/month) |
| Telegram | Telegram Bot API | Free |
| Scheduler | GitHub Actions | Free (cron) |

## Project Structure

```
richfolio/
├── src/
│   ├── config.ts          # Typed loader for config.json + .env
│   ├── index.ts           # Entry point (daily/intraday/weekly mode)
│   ├── fetchPrices.ts     # Yahoo Finance: price, P/E, 52w, beta, dividends, ETF holdings, fundamentals
│   ├── fetchTechnicals.ts # Yahoo Finance chart: SMA50, SMA200, RSI, momentum, volume change
│   ├── fetchNews.ts       # NewsAPI: headlines per ticker
│   ├── analyze.ts         # Allocation gaps, P/E signals, overlap discounts
│   ├── aiAnalysis.ts      # Gemini AI: buy recs, limit prices, value ratings, bottom signals
│   ├── email.ts           # Daily HTML email template + Resend
│   ├── intradayEmail.ts   # Intraday alert email template
│   ├── intradayCompare.ts # Compare current vs morning baseline
│   ├── state.ts           # Morning baseline persistence
│   ├── weeklyEmail.ts     # Weekly rebalancing email template
│   └── telegram.ts        # Telegram bot delivery (daily/intraday/weekly)
├── docs/
│   └── setup.md           # Detailed setup & API key guide
├── .github/workflows/
│   └── morning-brief.yml  # Daily + intraday + weekly cron jobs
├── config.example.json    # Template portfolio config
├── .env.example           # Template environment variables
├── package.json
└── tsconfig.json
```

## How It Works

```
config.json + .env
  → fetchPrices (Yahoo Finance: prices, P/E, 52w range, beta, dividends, ETF holdings, fundamentals)
  → fetchTechnicals (Yahoo Finance chart: SMA50, SMA200, RSI, momentum, volume change)
  → fetchNews (NewsAPI: top headlines per ticker)
  → analyze (allocation gaps, P/E signals, overlap discounts, portfolio metrics)
  → aiAnalyze (Gemini: buy recs + confidence + limit prices + value ratings + bottom signals)
  → email + telegram (deliver daily brief with value ratings, bottom signals, technicals)
```

Weekly mode (`--weekly`) skips news and AI, producing a focused rebalancing report.

Intraday mode (`--intraday`) re-fetches prices, technicals, and AI (skipping news), compares against the morning baseline, and alerts only when buy signals strengthen significantly.

## Updating Your Portfolio

Edit `config.json` and push (or update the `CONFIG_JSON` GitHub secret). The next run will reflect the changes.

## References

See [docs/references.md](docs/references.md) for repos and resources referenced during design and build.

## License

ISC
