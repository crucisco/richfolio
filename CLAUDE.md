# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Richfolio is a zero-maintenance portfolio monitoring system that sends daily email + Telegram digests with allocation gaps, AI-powered buy signals, ETF overlap detection, and relevant news. It runs as a GitHub Actions cron job — no server, no dashboard.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode, ESNext, ESM)
- **Execution**: `tsx` (TypeScript execute, no build step)
- **Data**: `yahoo-finance2` v3 (instance-based API) for prices, fundamentals, earnings history, ETF holdings, chart data (technicals)
- **News**: NewsAPI.org free tier (100 req/day)
- **AI**: Google Gemini 2.5 Flash via `@google/genai` (250 req/day free)
- **Email**: Resend.com free tier (3,000 emails/month)
- **Telegram**: Native `fetch` to Telegram Bot API (no npm package)
- **Scheduler**: GitHub Actions cron (`0 22 * * *` = 8am AEST)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run daily brief locally
npm run intraday     # Run intraday alert check (compares vs morning)
npm run weekly       # Run weekly rebalancing report
npm run refresh -- SMH  # Re-analyze single ticker with after-hours price
npm run start        # Production daily entry point
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

Single-pipeline flow, no API server. Four modes: daily (default), intraday (`--intraday`), weekly (`--weekly`), and refresh (`--refresh TICKER`).

```
src/index.ts (entry point — parses --weekly/--intraday/--refresh flags, wires modules)
  → src/config.ts          # Loads config.json + .env, exports typed portfolio data + intradayConfig
  → src/fetchPrices.ts     # Yahoo Finance: price, P/E, avgPE, 52w, beta, dividends, ETF top holdings, fundamentals, after-hours prices
  → src/fetchTechnicals.ts # Yahoo Finance chart: SMA50, SMA200, RSI(14), MACD, Bollinger Bands, momentum, support levels, volume change
  → src/fetchNews.ts       # NewsAPI: top 3 headlines per ticker (daily only) + Gemini relevance filter
  → src/analyze.ts         # Allocation gaps, P/E signals, ETF overlap discounts, portfolio beta, dividend estimate
  → src/aiAnalysis.ts      # Gemini AI: buy recs + confidence + limit prices + value ratings + bottom signals
  → src/state.ts           # Save/load morning baseline for intraday comparison
  → src/intradayCompare.ts # Compare current AI recs vs morning baseline, alert on STRONG BUY changes
  → src/email.ts           # Daily dark-themed HTML email + Resend
  → src/intradayEmail.ts   # Intraday + refresh alert emails + Resend
  → src/weeklyEmail.ts     # Weekly rebalancing HTML email + Resend
  → src/telegram.ts        # Telegram delivery (daily + intraday + weekly + refresh message builders)
```

## Config Architecture

Private portfolio data is separated from code:

- `config.json` — **gitignored**, your personal portfolio (allocations, holdings)
- `config.example.json` — **committed**, template for new users
- `.env` — **gitignored**, API keys + recipient email
- `src/config.ts` — typed loader that reads both and exports everything

In GitHub Actions, `config.json` is written from the `CONFIG_JSON` Actions variable at runtime.

## GitHub Actions Secrets

- `RESEND_API_KEY` — from resend.com
- `NEWS_API_KEY` — from newsapi.org (optional)
- `GEMINI_API_KEY` — from aistudio.google.com (optional)
- `TELEGRAM_BOT_TOKEN` — from @BotFather (optional)
- `TELEGRAM_CHAT_ID` — from @userinfobot (optional)

## GitHub Actions Variables

- `CONFIG_JSON` — full contents of config.json (uses Actions Variables instead of Secrets for easy viewing/editing)
- `RECIPIENT_EMAIL` — email address for briefs (variable, not secret — easy to view/edit)

## Key Gotchas

- **yahoo-finance2 v3**: Must use `new YahooFinance()` (instance-based), not default import
- **Crypto tickers**: BTC → `BTC-USD`, ETH → `ETH-USD` via `toYahooTicker()` in config.ts
- **ETFs have no P/E**: Returns null — handled gracefully throughout, show "N/A"
- **ETF top holdings**: Yahoo returns only top 10 holdings per ETF — overlap detection uses these
- **Dynamic avgPE**: Computed from `earningsHistory` quarterly EPS — no manual config needed
- **NewsAPI matching**: Uses `TICKER_NAMES` map in fetchNews.ts to match company names in headlines. Three-layer filtering: (1) specific financial phrases in search terms to avoid generic matches, (2) regex pre-filter drops non-English articles (CJK/Korean/Arabic), (3) Gemini relevance filter removes shopping/lifestyle/coincidental matches in one cheap batch call. Gemini filter is optional — graceful fallback if key is missing
- **Resend free tier**: Sends from `onboarding@resend.dev`, can only send to account owner email unless domain verified
- **Telegram char limit**: 4,096 chars per message — news section is truncated if needed
- **GitHub Actions timezone**: Cron is always UTC. 10pm UTC = 8am AEST
- **Gemini quota**: New API keys may take minutes to activate. Graceful fallback to gap-based recommendations
- **Technical data**: Fetched via `yahooFinance.chart()` with 365-day lookback. Tickers with <50 data points are skipped. SMA200 is null if <200 data points. MACD needs 35+ data points; Bollinger Bands need 20+
- **Technicals display**: Only shown for STRONG BUY tickers in email/Telegram to avoid info overload. AI receives technicals for all tickers
- **MACD**: EMA(12) − EMA(26), signal line = EMA(9) of MACD, histogram = MACD − signal. Bullish/bearish crossover detected from last 2 days. Best for trending markets
- **Bollinger Bands**: SMA(20) ± 2σ. %B = position within bands (0=lower, 1=upper). Bandwidth = (upper−lower)/middle. Squeeze = bandwidth in bottom 20% of 120-day range (signals imminent breakout). Best for range-bound markets
- **Indicator conflict resolution**: AI prompt includes explicit hierarchy — MACD trusted in trending markets, Bollinger in range-bound. Both agreeing boosts confidence (+5pts); disagreements reduce it (-10-15pts). Squeeze + MACD crossover = strong signal (+5-10pts, not sufficient alone for STRONG BUY)
- **Limit order prices**: Suggested by AI based on nearest support (50MA, 30d low, round numbers). Shown for STRONG BUY in daily, intraday, and Telegram
- **Value investing framework**: AI rates stocks A-D based on ROE, debt/equity, FCF, earnings growth, analyst target. Data from Yahoo `financialData` module (same API call). ETFs and crypto get no rating
- **STRONG BUY criteria**: Strict gate — requires ALL of: ≥2% allocation gap, ≥80% base confidence (before boosts), 2+ entry signals (low P/E, near 52w low, RSI<35, bullish MACD, lower Bollinger), no major red flags. Max 2 STRONG BUYs at any time. Intraday alerts enforce `minConfidenceToAlert` (default 80)
- **Stable income / bond ETFs**: Hardcoded `STABLE_INCOME_ETFS` set in `aiAnalysis.ts` covers BSV, BND, AGG, TLT, SHY, LQD, TIP, etc. These get a different AI framework: BUY cap (never STRONG BUY, enforced in code), no RSI/MACD/momentum signals, focus on allocation gap + yield + rate environment. "Oversold RSI" on a bond ETF = rates rose, not a buying signal
- **Bottom-fishing model**: AI checks RSI<30, volume contraction, price below 200MA, death cross for all tickers (stocks, ETFs, crypto). 2+ indicators triggers a bottom signal but it's a supporting factor only — does not auto-upgrade to STRONG BUY. Volume change computed from existing chart data
- **Fundamentals data**: `financialData` module added to existing `quoteSummary` call — zero extra API overhead. Returns null for ETFs and crypto
- **After-hours prices**: Yahoo `price` module returns `postMarketPrice` and `preMarketPrice`. Only used in refresh mode via `getLatestPrice()` — daily/intraday modes use `regularMarketPrice`. Fields may be null outside trading windows
- **Refresh mode**: Re-analyzes a single ticker with after-hours price. Sends email + Telegram with new analysis URL. Triggered via `npm run refresh -- TICKER` or GitHub Actions workflow_dispatch
