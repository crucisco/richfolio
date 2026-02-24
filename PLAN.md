# PLAN.md — Portfolio Brief Build Plan

A step-by-step build guide. Hand this to Claude Code and work through it phase by phase.

---

## Phase 1 — Project Scaffold

- [ ] Init `package.json` with `tsx`, `typescript`, `dotenv`
- [ ] Add Yahoo Finance client: `yahoo-finance2`
- [ ] Add Resend SDK: `resend`
- [ ] Configure `tsconfig.json` (ESNext, strict)
- [ ] Create `.env.example` with `RESEND_API_KEY`, `NEWS_API_KEY`
- [ ] Create `src/config.ts` with target portfolio, current holdings, total value, recipient email

**Prompt for Claude Code:**
> "Scaffold a TypeScript Node project in this folder. Install yahoo-finance2, resend, dotenv, tsx. Create tsconfig.json with strict mode and ESNext. Create src/config.ts with the portfolio config from README."

---

## Phase 2 — Price & Fundamentals Fetching (`src/fetchPrices.ts`)

Goal: For each ticker in target + current holdings, fetch:
- Current price
- P/E ratio (trailingPE, forwardPE)
- 52-week high/low
- 52-week % position (calculated: `(price - 52wLow) / (52wHigh - 52wLow)` — more actionable than raw numbers)
- Market cap (for stocks)
- Dividend yield (important for income ETFs like XLU, BSV)
- Beta (volatility relative to market — helps assess portfolio risk)
- For ETFs: price, 52w range + %, dividend yield, beta (no P/E)

Use `yahoo-finance2` quoteSummary with `summaryDetail` + `defaultKeyStatistics` modules. Handle ETFs gracefully (they won't have P/E).

**Prompt for Claude Code:**
> "Create src/fetchPrices.ts. Use yahoo-finance2 to fetch price, trailingPE, forwardPE, fiftyTwoWeekHigh, fiftyTwoWeekLow, dividendYield, and beta for a list of tickers. Calculate fiftyTwoWeekPercent as (price - low) / (high - low). Return a typed Record<string, QuoteData>. Handle missing fields gracefully — ETFs won't have P/E. Export a fetchAllPrices(tickers: string[]) function."

---

## Phase 3 — News Fetching (`src/fetchNews.ts`)

Goal: For each ticker, fetch top 3 headlines from the last 24 hours via NewsAPI.

- Batch tickers into a single request where possible (NewsAPI `q` param supports OR queries)
- Return `Record<string, NewsItem[]>`
- Limit to 3 articles per ticker, title + url + publishedAt only

**Prompt for Claude Code:**
> "Create src/fetchNews.ts. Use NewsAPI.org /v2/everything endpoint. For a list of tickers, batch fetch news articles from the last 24 hours. Return Record<string, {title, url, publishedAt}[]> with max 3 items per ticker. Use the NEWS_API_KEY env var."

---

## Phase 4 — Allocation Analysis (`src/analyze.ts`)

Goal: Core logic. Given current holdings + prices + target allocations:

1. **Calculate current portfolio value** per ticker (shares × price)
2. **Calculate current allocation %** for each ticker
3. **Calculate gap** = target% − current% for all target tickers
4. **Priority score** = gap magnitude (larger gap = higher priority)
5. **Suggested buy amount** = (gap% × totalPortfolioValue) / currentPrice → shares to buy
6. **P/E signal**: compare trailing P/E to a hardcoded 5yr average benchmark (can be a static map for now, ETFs excluded)
7. **52-week position signal**: flag tickers near 52w low (<20%) as potential opportunities, near 52w high (>80%) as caution
8. **Portfolio beta**: weighted average beta across all holdings — single number showing overall portfolio risk
9. **Dividend income estimate**: sum of (shares × price × dividendYield) across holdings
10. Return a sorted list of `AllocationItem` with all fields

**Prompt for Claude Code:**
> "Create src/analyze.ts. Given priceData, currentHoldings, targetPortfolio, and totalPortfolioValue, calculate: current value per ticker, current allocation %, target allocation %, gap %, suggested shares to buy, P/E signal (below avg = ✅, above avg = ⚠️), 52-week position signal (near low = 🟢 opportunity, near high = 🟡 caution), portfolio-wide weighted beta, and estimated annual dividend income. Return a sorted AllocationReport array, highest gap first. Export a runAnalysis() function."

---

## Phase 5 — Email Template (`src/email.ts`)

Goal: Generate a clean HTML email and send via Resend.

Structure:
- Header: date + total estimated portfolio value + portfolio beta + estimated annual dividend income
- Section 1: **Priority Buy List** (top 5 underweight tickers, with suggested buy amounts + P/E signal + 52w position)
- Section 2: **Full Allocation Table** (all tickers, color-coded: red = underweight, green = on target, yellow = overweight. Columns include dividend yield, beta, 52w %)
- Section 3: **News Digest** (grouped by ticker, top 3 headlines each, link to article)
- Footer: "Edit src/config.ts to update your portfolio"

Use inline CSS only (email client compatibility). Dark-friendly neutral palette.

**Prompt for Claude Code:**
> "Create src/email.ts. Generate an HTML email from an AllocationReport and news data. Use inline CSS, neutral dark palette. Sections: priority buys, full allocation table (color-coded rows), news digest grouped by ticker. Send via Resend SDK using RESEND_API_KEY. Export a sendBrief(report, news) function."

---

## Phase 6 — Entry Point (`src/index.ts`)

Wire everything together:

```ts
const tickers = allUniqueTickers(config)
const prices = await fetchAllPrices(tickers)
const news = await fetchNews(tickers)
const report = runAnalysis(prices)
await sendBrief(report, news)
```

Add error handling + a `console.log` summary so you can see output when running locally.

**Prompt for Claude Code:**
> "Create src/index.ts as the entry point. Import and call fetchAllPrices, fetchNews, runAnalysis, sendBrief in sequence. Add try/catch with useful error messages. Log a summary table to console showing tickers fetched and email send status."

---

## Phase 7 — GitHub Actions Workflow

File: `.github/workflows/morning-brief.yml`

- Schedule: `cron: '0 22 * * *'` (10pm UTC = 8am AEST)
- Uses: `actions/checkout@v4`, `actions/setup-node@v4` (Node 20)
- Runs: `npm ci && npm run start`
- Secrets: `RESEND_API_KEY`, `NEWS_API_KEY`
- Add a `workflow_dispatch` trigger so you can test it manually from GitHub UI

**Prompt for Claude Code:**
> "Create .github/workflows/morning-brief.yml. Cron schedule 10pm UTC daily (8am AEST). Checkout, setup Node 20, npm ci, npm run start. Use RESEND_API_KEY and NEWS_API_KEY from secrets. Add workflow_dispatch for manual runs."

---

## Phase 8 — Test & Polish

- [ ] Run `npm run dev` and verify email arrives
- [ ] Check ETFs don't break P/E logic
- [ ] Check BTC/ETH tickers work in yahoo-finance2 (use `BTC-USD`, `ETH-USD`)
- [ ] Verify news batching doesn't hit rate limits
- [ ] Push to GitHub, add secrets, trigger manual run from Actions tab
- [ ] Confirm email arrives in prod

---

## Known Gotchas

- **Yahoo Finance tickers**: BTC → `BTC-USD`, ETH → `ETH-USD`. AMZN not AMAZ.
- **ETFs have no P/E**: `yahoo-finance2` returns null — handle gracefully, show "N/A".
- **NewsAPI free tier**: 100 requests/day. Batch ticker queries using OR syntax: `q=VOO OR QQQ OR SMH`.
- **Resend free tier**: Requires domain verification for sending FROM a custom address. Use `onboarding@resend.dev` as sender for testing.
- **GitHub Actions timezone**: always use UTC in cron, convert manually to your local time.

---

## Future Ideas (post-MVP)

- Add a `lastBought` field in config to avoid repeat "buy" signals
- Weekly rebalancing summary (how far off are you after 7 days?)
- P/E 5yr averages fetched dynamically instead of hardcoded
- Webhook to Telegram instead of / in addition to email
- **ETF overlap-aware priority**: `currentHoldings` can include stocks not in `targetPortfolio` (e.g. AAPL). When scoring buy priority for target ETFs, discount by the overlap with existing holdings. Example: if you hold 30 shares of AAPL, XLK (~20% AAPL) already gives you indirect exposure — so XLK's priority score should be reduced. Could use ETF holdings data from Yahoo Finance or a static top-holdings map per ETF.
