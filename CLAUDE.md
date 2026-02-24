# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Richfolio is a zero-maintenance portfolio monitoring system that sends daily email digests with allocation gaps, buy signals, and relevant news. It runs as a GitHub Actions cron job — no server, no dashboard.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode, ESNext)
- **Execution**: `tsx` (TypeScript execute, no build step)
- **Data**: `yahoo-finance2` for prices & fundamentals (unofficial, free)
- **News**: NewsAPI.org free tier (100 req/day)
- **Email**: Resend.com free tier (3,000 emails/month)
- **Scheduler**: GitHub Actions cron (`0 22 * * *` = 8am AEST)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run locally (same as npm start)
npm run start        # Production entry point: tsx src/index.ts
```

## Architecture

Single-pipeline flow, no API server:

```
src/index.ts (entry point)
  → src/config.ts        # Portfolio config: target allocations, current holdings, total value
  → src/fetchPrices.ts   # Yahoo Finance: price, P/E, 52w range per ticker
  → src/fetchNews.ts     # NewsAPI: top 3 headlines per ticker, batched with OR queries
  → src/analyze.ts       # Allocation gaps, priority scores, suggested buy amounts, P/E signals
  → src/email.ts         # HTML email generation (inline CSS) + Resend sending
```

All modules export a single primary function. `index.ts` wires them sequentially.

## Environment Variables

Required in `.env` (see `.env.example`):
- `RESEND_API_KEY` — from resend.com
- `NEWS_API_KEY` — from newsapi.org

In GitHub Actions, these are set as repository secrets.

## Key Gotchas

- **Crypto tickers**: BTC must be `BTC-USD`, ETH must be `ETH-USD` for yahoo-finance2
- **ETFs have no P/E**: yahoo-finance2 returns null for ETF P/E ratios — show "N/A", never error
- **NewsAPI batching**: Free tier is 100 req/day. Batch tickers using OR syntax: `q=VOO OR QQQ OR SMH`
- **Resend testing**: Use `onboarding@resend.dev` as sender during development
- **GitHub Actions timezone**: Cron is always UTC. 10pm UTC = 8am AEST

## Build Plan

Follow `PLAN.md` phases sequentially (Phase 1-8). Each phase has a specific Claude Code prompt. Reference `REFERENCES.md` for implementation patterns from prior art repos.

## Portfolio Config Model

`src/config.ts` holds all user-editable state:
- `targetPortfolio: Record<string, number>` — ticker → target allocation %
- `currentHoldings: Record<string, number>` — ticker → shares owned
- `totalPortfolioValueUSD: number` — estimated total portfolio value
- `recipientEmail: string` — where to send the daily digest
