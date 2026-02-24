# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Richfolio is a zero-maintenance portfolio monitoring system that sends daily email digests with allocation gaps, buy signals, and relevant news. It runs as a GitHub Actions cron job — no server, no dashboard.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode, ESNext, ESM)
- **Execution**: `tsx` (TypeScript execute, no build step)
- **Data**: `yahoo-finance2` v3 (instance-based API) for prices & fundamentals
- **News**: NewsAPI.org free tier (100 req/day)
- **Email**: Resend.com free tier (3,000 emails/month)
- **Scheduler**: GitHub Actions cron (`0 22 * * *` = 8am AEST)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run locally (same as npm start)
npm run start        # Production entry point: tsx src/index.ts
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

Single-pipeline flow, no API server:

```
src/index.ts (entry point — wires modules sequentially)
  → src/config.ts        # Loads config.json + .env, exports typed portfolio data
  → src/fetchPrices.ts   # Yahoo Finance: price, P/E, 52w range/%, dividend yield, beta
  → src/fetchNews.ts     # NewsAPI: top 3 headlines per ticker, batched with OR queries
  → src/analyze.ts       # Allocation gaps, priority scores, buy amounts, P/E + 52w signals, portfolio beta, dividend estimate
  → src/email.ts         # Dark-themed HTML email (inline CSS) + Resend sending
```

Each module exports a single primary function. Data flows linearly through the pipeline.

## Config Architecture

Private portfolio data is separated from code:

- `config.json` — **gitignored**, your personal portfolio (allocations, holdings, P/E benchmarks)
- `config.example.json` — **committed**, template for new users
- `.env` — **gitignored**, API keys + recipient email
- `src/config.ts` — typed loader that reads both and exports everything

In GitHub Actions, `config.json` is written from the `CONFIG_JSON` secret at runtime.

## GitHub Actions Secrets Required

- `RESEND_API_KEY` — from resend.com
- `NEWS_API_KEY` — from newsapi.org
- `RECIPIENT_EMAIL` — email address for the daily brief
- `CONFIG_JSON` — full contents of your config.json

## Key Gotchas

- **yahoo-finance2 v3**: Must use `new YahooFinance()` (instance-based), not default import
- **Crypto tickers**: BTC → `BTC-USD`, ETH → `ETH-USD` via `toYahooTicker()` in config.ts
- **ETFs have no P/E**: Returns null — handled gracefully throughout, show "N/A"
- **NewsAPI matching**: Uses `TICKER_NAMES` map in fetchNews.ts to match company names (not just symbols) in headlines
- **Resend free tier**: Must send from `onboarding@resend.dev`, can only send to account owner's email unless domain is verified
- **GitHub Actions timezone**: Cron is always UTC. 10pm UTC = 8am AEST
