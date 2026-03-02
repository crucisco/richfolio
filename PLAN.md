# PLAN.md — Portfolio Brief Build Plan

A step-by-step build guide. Hand this to Claude Code and work through it phase by phase.

---

## Phase 1 — Project Scaffold ✅

- [x] Init `package.json` with `tsx`, `typescript`, `dotenv`
- [x] Add Yahoo Finance client: `yahoo-finance2`
- [x] Add Resend SDK: `resend`
- [x] Configure `tsconfig.json` (ESNext, strict, ESM)
- [x] Create `.env.example` with `RESEND_API_KEY`, `NEWS_API_KEY`, `GEMINI_API_KEY`
- [x] Create `config.json` / `config.example.json` (gitignored private config)
- [x] Create `src/config.ts` as typed loader for config.json + .env

---

## Phase 2 — Price & Fundamentals Fetching (`src/fetchPrices.ts`) ✅

- [x] Fetch price, trailingPE, forwardPE, 52w high/low, marketCap, dividendYield, beta
- [x] Calculate 52-week % position: `(price - low) / (high - low)`
- [x] Handle ETFs gracefully (no P/E → null)
- [x] Handle crypto tickers via `toYahooTicker()` (BTC → BTC-USD)
- [x] Uses yahoo-finance2 v3 instance API with `quoteSummary`

---

## Phase 3 — News Fetching (`src/fetchNews.ts`) ✅

- [x] Batch tickers using OR queries to NewsAPI /v2/everything
- [x] Match articles by ticker symbol AND company name (`TICKER_NAMES` map)
- [x] Return max 3 articles per ticker with title, url, source, publishedAt
- [x] Graceful skip when `NEWS_API_KEY` not set

---

## Phase 4 — Allocation Analysis (`src/analyze.ts`) ✅

- [x] Calculate current value, allocation %, gap % per ticker
- [x] Suggested buy amounts (shares + USD) for underweight positions
- [x] P/E signal vs configured benchmarks (individual stocks only)
- [x] 52-week position signal (near low = opportunity, near high = caution)
- [x] Portfolio-wide weighted beta
- [x] Estimated annual dividend income
- [x] Sorted by gap descending

---

## Phase 5 — Email Template (`src/email.ts`) ✅

- [x] Dark-themed HTML email with inline CSS
- [x] Header: date, holdings value, portfolio beta, annual dividend estimate
- [x] AI Buy Recommendations section (when Gemini available) with action badges + confidence bars
- [x] Fallback: gap-based Priority Buys table (when no AI)
- [x] Full Allocation Table with P/E, dividend yield, beta, 52w range bar
- [x] News Digest grouped by ticker
- [x] Send via Resend SDK

---

## Phase 6 — Entry Point (`src/index.ts`) ✅

- [x] Wire: fetchPrices → fetchNews → runAnalysis → aiAnalyze → sendBrief
- [x] Error handling with try/catch + useful console output
- [x] Graceful degradation when API keys missing

---

## Phase 7 — GitHub Actions Workflow ✅

- [x] `.github/workflows/morning-brief.yml`
- [x] Cron: `0 22 * * *` (10pm UTC = 8am AEST)
- [x] Node 20, npm ci, npm run start
- [x] Secrets: `RESEND_API_KEY`, `NEWS_API_KEY`, `GEMINI_API_KEY`, `RECIPIENT_EMAIL`
- [x] Variable: `CONFIG_JSON` (uses Actions Variables for easy viewing/editing)
- [x] `workflow_dispatch` for manual trigger
- [x] `CONFIG_JSON` variable written to file at runtime (portfolio data)

---

## Phase 8 — AI-Powered Buy Analysis (`src/aiAnalysis.ts`) ✅

- [x] Install `@google/genai` (Gemini 2.0 Flash, free tier)
- [x] Single API call with all ticker data: price, P/E, 52w%, dividends, beta, gap, news
- [x] Structured JSON output: action (STRONG BUY / BUY / HOLD / WAIT), confidence %, reason, suggested buy amount
- [x] Prioritizes by value opportunity + allocation need (not just gap)
- [x] Graceful fallback when `GEMINI_API_KEY` not set or API fails

---

## Phase 9 — Test & Polish

- [x] Run `npm run dev` and verify email arrives
- [x] Check ETFs don't break P/E logic
- [x] Check BTC/ETH tickers work (BTC-USD, ETH-USD)
- [x] Verify news batching doesn't hit rate limits
- [x] Push to GitHub, add secrets, trigger manual run from Actions tab
- [ ] Confirm AI analysis works in production (Gemini quota needs to activate)
- [ ] Verify domain on Resend to send to any email address

---

## Known Gotchas

- **Yahoo Finance tickers**: BTC → `BTC-USD`, ETH → `ETH-USD`. AMZN not AMAZ.
- **ETFs have no P/E**: `yahoo-finance2` returns null — handled gracefully, shows "N/A".
- **NewsAPI free tier**: 100 requests/day. Batched using OR syntax + `TICKER_NAMES` map for company name matching.
- **Resend free tier**: Must send from `onboarding@resend.dev`. Can only send to account owner email unless domain verified.
- **GitHub Actions timezone**: always use UTC in cron, convert manually to your local time.
- **Gemini free tier**: ~15 RPM, 250 RPD. New API keys may take minutes to activate quota.
- **Config is gitignored**: `config.json` contains portfolio data. In GitHub Actions, it's written from the `CONFIG_JSON` Actions variable.

---

## Phase 10 — Dynamic P/E Averages ✅

- [x] Add `earningsHistory` module to Yahoo Finance `quoteSummary` call
- [x] Compute `avgPE` from quarterly EPS data (annualized)
- [x] Use dynamic `avgPE` for P/E signal, fall back to manual `peBenchmarks` in config
- [x] Make `peBenchmarks` optional in config.json
- [x] Include `avgPE` in Gemini AI prompt

---

## Phase 11 — Telegram Webhook ✅

- [x] Create `src/telegram.ts` using native `fetch` with Telegram Bot API
- [x] Condensed HTML message with AI recs (or gap-based fallback) + news
- [x] Graceful skip when `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` not set
- [x] Wire into `src/index.ts` — independent of email (one failing doesn't block the other)
- [x] Add secrets to `.github/workflows/morning-brief.yml`

---

## Phase 12 — ETF Overlap-Aware Priority ✅

- [x] Fetch `topHoldings` from Yahoo Finance for each ETF
- [x] Calculate overlap discount: reduce suggested buy by indirect exposure through held stocks
- [x] Show overlap discounts in email, Telegram, and AI prompt
- [x] Console logs overlap amounts (e.g., VOO -$973, QQQ -$919)

---

## Phase 13 — Weekly Rebalancing Summary ✅

- [x] `--weekly` CLI flag skips news + AI, produces rebalancing-focused report
- [x] `src/weeklyEmail.ts`: dark-themed rebalancing email with action table (BUY/TRIM/OK)
- [x] Weekly Telegram message with underweight/overweight/on-target breakdown
- [x] `npm run weekly` script in package.json
- [x] GitHub Actions: weekly job runs on Sundays + manual `workflow_dispatch` with mode selector
