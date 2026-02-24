# Richfolio

A zero-maintenance portfolio monitoring system. Set your target allocations once, get daily briefings with allocation gaps, AI-powered buy signals, and relevant news — delivered via email and Telegram, automatically via GitHub Actions.

## Features

- **AI Buy Recommendations** — Gemini-powered analysis considering valuation, allocation gap, news sentiment, and risk (with gap-based fallback)
- **Allocation Gap Analysis** — current vs target %, flagged by priority with suggested buy amounts
- **Dynamic P/E Signals** — trailing P/E compared against historical averages fetched from Yahoo Finance (no manual benchmarks needed)
- **ETF Overlap Detection** — reduces buy priority for ETFs where you already hold overlapping stocks (e.g., holding AAPL reduces VOO's priority)
- **52-Week Range Signals** — highlights tickers near their 52-week low (opportunity) or high (caution)
- **News Digest** — top headlines per ticker from NewsAPI
- **Portfolio Health** — weighted beta, estimated annual dividend income
- **Weekly Rebalancing Report** — focused drift analysis with BUY/TRIM/OK actions
- **Dual Delivery** — dark-themed HTML email via Resend + condensed Telegram message

## Quick Start

```bash
git clone https://github.com/furic/richfolio.git
cd richfolio
npm install
cp config.example.json config.json
cp .env.example .env
```

Edit `config.json` with your portfolio data and `.env` with your API keys (see [docs/setup.md](docs/setup.md) for detailed instructions), then:

```bash
npm run dev       # Daily brief (email + Telegram)
npm run weekly    # Weekly rebalancing report
```

## Stack

| Component | Service | Cost |
|-----------|---------|------|
| Runtime | Node.js + TypeScript (tsx) | Free |
| Prices & Fundamentals | Yahoo Finance (yahoo-finance2) | Free |
| News | NewsAPI.org | Free (100 req/day) |
| AI Analysis | Google Gemini 2.0 Flash | Free (250 req/day) |
| Email | Resend.com | Free (3,000/month) |
| Telegram | Telegram Bot API | Free |
| Scheduler | GitHub Actions | Free (cron) |

## Project Structure

```
richfolio/
├── src/
│   ├── config.ts          # Typed loader for config.json + .env
│   ├── index.ts           # Entry point (daily/weekly mode)
│   ├── fetchPrices.ts     # Yahoo Finance: price, P/E, 52w, beta, dividends, ETF holdings
│   ├── fetchNews.ts       # NewsAPI: headlines per ticker
│   ├── analyze.ts         # Allocation gaps, P/E signals, overlap discounts
│   ├── aiAnalysis.ts      # Gemini AI buy recommendations
│   ├── email.ts           # Daily HTML email template + Resend
│   ├── weeklyEmail.ts     # Weekly rebalancing email template
│   └── telegram.ts        # Telegram bot delivery (daily + weekly)
├── docs/
│   └── setup.md           # Detailed setup & API key guide
├── .github/workflows/
│   └── morning-brief.yml  # Daily cron + weekly Sunday job
├── config.example.json    # Template portfolio config
├── .env.example           # Template environment variables
├── package.json
└── tsconfig.json
```

## How It Works

```
config.json + .env
  → fetchPrices (Yahoo Finance: prices, P/E, 52w range, beta, dividends, ETF holdings)
  → fetchNews (NewsAPI: top headlines per ticker)
  → analyze (allocation gaps, P/E signals, overlap discounts, portfolio metrics)
  → aiAnalyze (Gemini: AI buy recommendations with confidence scores)
  → email + telegram (deliver daily brief)
```

Weekly mode (`--weekly`) skips news and AI, producing a focused rebalancing report.

## Updating Your Portfolio

Edit `config.json` and push (or update the `CONFIG_JSON` GitHub secret). The next run will reflect the changes.

## References

See [docs/references.md](docs/references.md) for repos and resources referenced during design and build.

## License

ISC
