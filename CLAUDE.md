# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Richfolio is a zero-maintenance portfolio monitoring system that sends daily email + Telegram digests with allocation gaps, AI-powered buy signals, ETF overlap detection, and relevant news. It runs as a GitHub Actions cron job — no server, no dashboard.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode, ESNext, ESM)
- **Execution**: `tsx` (TypeScript execute, no build step)
- **Data**: `yahoo-finance2` v3 (instance-based API) for prices, fundamentals, earnings history, ETF holdings
- **News**: NewsAPI.org free tier (100 req/day)
- **AI**: Google Gemini 2.5 Flash via `@google/genai` (250 req/day free)
- **Email**: Resend.com free tier (3,000 emails/month)
- **Telegram**: Native `fetch` to Telegram Bot API (no npm package)
- **Scheduler**: GitHub Actions cron (`0 22 * * *` = 8am AEST)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run daily brief locally
npm run weekly       # Run weekly rebalancing report
npm run start        # Production daily entry point
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

Single-pipeline flow, no API server. Two modes: daily (default) and weekly (`--weekly`).

```
src/index.ts (entry point — parses --weekly flag, wires modules)
  → src/config.ts          # Loads config.json + .env, exports typed portfolio data
  → src/fetchPrices.ts     # Yahoo Finance: price, P/E, avgPE, 52w, beta, dividends, ETF top holdings
  → src/fetchNews.ts       # NewsAPI: top 3 headlines per ticker (daily only)
  → src/analyze.ts         # Allocation gaps, P/E signals, ETF overlap discounts, portfolio beta, dividend estimate
  → src/aiAnalysis.ts      # Gemini AI: buy recommendations with confidence scores (daily only)
  → src/email.ts           # Daily dark-themed HTML email + Resend
  → src/weeklyEmail.ts     # Weekly rebalancing HTML email + Resend
  → src/telegram.ts        # Telegram delivery (daily + weekly message builders)
```

## Config Architecture

Private portfolio data is separated from code:

- `config.json` — **gitignored**, your personal portfolio (allocations, holdings)
- `config.example.json` — **committed**, template for new users
- `.env` — **gitignored**, API keys + recipient email
- `src/config.ts` — typed loader that reads both and exports everything

In GitHub Actions, `config.json` is written from the `CONFIG_JSON` secret at runtime.

## GitHub Actions Secrets

- `RESEND_API_KEY` — from resend.com
- `NEWS_API_KEY` — from newsapi.org (optional)
- `GEMINI_API_KEY` — from aistudio.google.com (optional)
- `RECIPIENT_EMAIL` — email address for briefs
- `CONFIG_JSON` — full contents of config.json
- `TELEGRAM_BOT_TOKEN` — from @BotFather (optional)
- `TELEGRAM_CHAT_ID` — from @userinfobot (optional)

## Key Gotchas

- **yahoo-finance2 v3**: Must use `new YahooFinance()` (instance-based), not default import
- **Crypto tickers**: BTC → `BTC-USD`, ETH → `ETH-USD` via `toYahooTicker()` in config.ts
- **ETFs have no P/E**: Returns null — handled gracefully throughout, show "N/A"
- **ETF top holdings**: Yahoo returns only top 10 holdings per ETF — overlap detection uses these
- **Dynamic avgPE**: Computed from `earningsHistory` quarterly EPS — no manual config needed
- **NewsAPI matching**: Uses `TICKER_NAMES` map in fetchNews.ts to match company names in headlines
- **Resend free tier**: Sends from `onboarding@resend.dev`, can only send to account owner email unless domain verified
- **Telegram char limit**: 4,096 chars per message — news section is truncated if needed
- **GitHub Actions timezone**: Cron is always UTC. 10pm UTC = 8am AEST
- **Gemini quota**: New API keys may take minutes to activate. Graceful fallback to gap-based recommendations
