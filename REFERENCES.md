# References & Prior Art

Open-source repos referenced during the design and build of richfolio. Read these before building each module — they've already solved the hard parts.

---

## 🥇 [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) ⭐ ~15k

> Angular + NestJS + Prisma + TypeScript

The gold standard open-source wealth management app. You don't want to *use* it (it's a full self-hosted web app requiring Docker + Postgres), but it's the best reference for how to solve portfolio data modelling at scale. It's also the largest consumer of `yahoo-finance2` in the wild, so its issues and PRs are a great debugging resource.

**Mine from it:**
- Portfolio and holding data models (how to represent target vs actual allocation)
- Yahoo Finance fetching patterns and batching strategy
- How they handle ETFs, stocks, and crypto uniformly under one interface
- Allocation calculation and performance metric logic

**Relevant source paths:** `apps/api/src/app/portfolio/`, `libs/common/src/lib/`

---

## 🥈 [hvkshetry/agentic-investment-management](https://github.com/hvkshetry/agentic-investment-management)

> TypeScript + Claude Code + MCP agents

Built specifically for Claude Code with slash commands like `/daily-check` and `/rebalance`. Uses a multi-agent structure with specialist roles: `portfolio-manager`, `equity-analyst`, `etf-analyst`, `macro-analyst`. Pulls data from Yahoo Finance + Finnhub + OpenBB, all zero-cost. Almost directly analogous to what richfolio is building.

**Mine from it:**
- The `CLAUDE.md` orchestration pattern for agentic workflows
- `/daily-check` command structure — what it checks and in what order
- How it decomposes equity analysis vs ETF analysis (ETFs skip P/E, use different signals)
- Macro analyst prompt: how to connect macro news to specific portfolio positions

---

## 🥉 [gadicc/yahoo-finance2](https://github.com/gadicc/yahoo-finance2) ⭐ ~1.5k

> The actual TypeScript library used for all price and fundamentals fetching

Not a portfolio app but the core dependency. Fully typed, actively maintained, works in Node/serverless. The README documents every `quoteSummary` submodule available.

**Key submodules for richfolio:**

| Submodule | Fields we need |
|-----------|---------------|
| `summaryDetail` | `trailingPE`, `forwardPE`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `marketCap`, `dividendYield` |
| `financialData` | `currentPrice`, `targetMeanPrice`, `recommendationMean` |
| `defaultKeyStatistics` | `enterpriseToEbitda`, `priceToBook`, `beta`, `fiveYearAvgDividendYield` |
| `price` | `regularMarketPrice`, `regularMarketChangePercent` |

**Mine from it:**
- Which submodules return which fields (P/E missing on ETFs — handle gracefully)
- How to batch `quoteSummary` calls efficiently to avoid rate limits
- BTC/ETH ticker format: use `BTC-USD`, `ETH-USD`
- AMZN not AMAZ (ticker correction from current holdings config)

---

## 🎖️ [T1mn/MarketPulse](https://github.com/T1mn/MarketPulse) ⭐ 234

> Python + Gemini AI + Finnhub + push notifications

Already evaluated as "don't fork" (Python daemon, Chinese push apps, no portfolio awareness). But the AI news summarisation prompt pattern is directly reusable in our TypeScript news digest.

**Mine from it:**
- Gemini prompt structure for per-ticker news analysis → outputs: investment advice, confidence score (%), source reliability score (%)
- Deduplication logic via `app_state.json` — how to avoid re-sending the same news story across multiple morning runs
- Trusted source list: Reuters, Bloomberg, WSJ, AP, CNBC, Dow Jones, MarketWatch — use this as the default `TRUSTED_SOURCES` filter in `fetchNews.ts`

---

## Design Decisions Informed by These Repos

| Decision | Informed by |
|----------|-------------|
| Use `yahoo-finance2` not Finnhub for fundamentals | ghostfolio (battle-tested at scale), yahoo-finance2 docs |
| Skip P/E for ETFs, use 52w range position instead | ghostfolio data model, yahoo-finance2 ETF quirks |
| AI-summarise news per ticker, not raw headlines | MarketPulse prompt pattern |
| Slash command structure for Claude Code dev workflow | agentic-investment-management CLAUDE.md |
| Fork-and-run model (no shared server) | Contrast with ghostfolio's self-hosted complexity |
