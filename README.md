# 📈 Portfolio Brief

A zero-maintenance morning email digest for your investment portfolio. Set your target allocations once, get a daily briefing with allocation gaps, buy signals, and relevant news — automatically via GitHub Actions.

## What You Get Every Morning

- **Allocation Gap Table** — current vs target %, flagging what to prioritise buying
- **Buy Signal Analysis** — P/E ratio vs 5-year average for underweight positions
- **Morning News Digest** — top headlines for every ticker you hold or are targeting
- **Suggested Buy Amounts** — "to get VOO to 20%, at current prices, buy ~X shares"

## Stack

- **Runtime**: Node.js + TypeScript
- **Data**: Yahoo Finance (unofficial, free) for prices + fundamentals
- **News**: NewsAPI.org (free tier, 100 req/day)
- **Email**: Resend.com (free tier, 3,000 emails/month)
- **Scheduler**: GitHub Actions (free, cron)

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd portfolio-brief
npm install
```

### 2. Configure Your Portfolio

Edit `src/config.ts`:

```ts
export const targetPortfolio: Record<string, number> = {
  AIQ: 5, SMH: 5, XLU: 5, ITA: 3,
  GLD: 10, IJH: 3, VOO: 20, QQQ: 15,
  ESGU: 9, BSV: 20, XLV: 2,
  BTC: 1.5, ETH: 1.5,
}

export const currentHoldings: Record<string, number> = {
  AAPL: 30, AMZN: 3, BIPC: 1,
  DVN: 2.738, INTC: 5, TSM: 10, VOO: 1,
}

export const totalPortfolioValueUSD = 50000 // your best estimate
export const recipientEmail = 'you@example.com'
```

### 3. Set Up API Keys

Get free keys from:
- [NewsAPI.org](https://newsapi.org) — free, instant signup
- [Resend.com](https://resend.com) — free, requires domain or use their test domain

Copy `.env.example` to `.env` and fill in:

```
RESEND_API_KEY=re_xxxx
NEWS_API_KEY=xxxx
```

### 4. Run Locally to Test

```bash
npm run dev
```

Check your inbox. Tweak config. Done.

### 5. Deploy to GitHub Actions

1. Push repo to GitHub (can be private)
2. Go to **Settings → Secrets → Actions** and add:
   - `RESEND_API_KEY`
   - `NEWS_API_KEY`
3. The workflow in `.github/workflows/morning-brief.yml` runs every day at 8am AEST

That's it. No server, no dashboard to log into.

## Updating Your Portfolio

Just edit `src/config.ts` and push. The next morning's email will reflect the change.

## References

Prior art and open-source repos referenced during design and build. See [REFERENCES.md](./REFERENCES.md) for full details on what to mine from each.

| Repo | What it informs |
|------|----------------|
| [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) | Portfolio data models, Yahoo Finance fetching, allocation math |
| [hvkshetry/agentic-investment-management](https://github.com/hvkshetry/agentic-investment-management) | Claude Code agent structure, daily-check pattern, ETF vs equity split |
| [gadicc/yahoo-finance2](https://github.com/gadicc/yahoo-finance2) | Which API submodules to call, TypeScript types, ETF edge cases |
| [T1mn/MarketPulse](https://github.com/T1mn/MarketPulse) | AI news summarisation prompt pattern, dedup logic |

## Project Structure

```
portfolio-brief/
├── src/
│   ├── config.ts          # Your portfolio + settings (edit this)
│   ├── index.ts           # Entry point
│   ├── fetchPrices.ts     # Yahoo Finance price + fundamentals fetching
│   ├── fetchNews.ts       # NewsAPI news fetching
│   ├── analyze.ts         # Allocation gap + buy signal logic
│   └── email.ts           # HTML email template + Resend sending
├── .github/
│   └── workflows/
│       └── morning-brief.yml
├── .env.example
├── package.json
└── tsconfig.json
```
