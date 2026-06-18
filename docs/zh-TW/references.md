---
title: 參考資料
layout: default
nav_order: 9
lang: zh-TW
permalink: /references.html
---

# 參考資料與先前作品

richfolio 設計與建置過程中參考的開源儲存庫與文章。建議在建置每個模組前先閱讀它們 — 困難的部分別人已經解過了。

---

## 🥇 [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) ⭐ ~15k

> Angular + NestJS + Prisma + TypeScript

開源財富管理應用的黃金標準。你大概並不想*使用*它(它是一個需要 Docker + Postgres 的完整自架 Web 應用),但對於如何在規模化情境中為投資組合資料建模,它是最佳參考。它也是 `yahoo-finance2` 在實際生產中最大的使用者,所以它的 issue 與 PR 是極佳的除錯資源。

**可借鏡:**
- 投資組合與持倉的資料模型(如何表達目標 vs 實際配置)
- Yahoo Finance 的擷取模式與批次處理策略
- 如何在統一介面下處理 ETF、股票與加密貨幣
- 配置計算與績效指標邏輯

**相關原始碼路徑:** `apps/api/src/app/portfolio/`、`libs/common/src/lib/`

---

## 🥈 [TraderAlice/OpenAlice](https://github.com/TraderAlice/OpenAlice) ⭐ ~3.8k

> TypeScript + Claude SDK + 多券商(Alpaca、IBKR、CCXT)+ 檔案式狀態

一個自主 AI 交易代理,能直接執行交易,使用多層次分析方法,把技術指標、基本面資料與結構化的 AI 推理結合起來。OpenAlice 的架構把可解釋性、安全性與可稽核性優先於純粹的自動化 — 每個決策可追溯、每個守護可設定,整個推理過程對外可見。

**直接啟發 Richfolio 的六項功能:**

- **兩階段 Think/Plan AI 提示詞** — OpenAlice 的 `think` 與 `plan` 工具把觀察與決策分離。階段 1 記錄關於市場資料的觀察;階段 2 評估選項並提交動作。Richfolio 借鏡為兩次順序的 Gemini 呼叫:Observe(擷取結構化訊號)→ Decide(對觀察套用規則)。這種分離顯著提升 STRONG BUY 標準的一致性。

- **AI 後置守護驗證管線** — OpenAlice 的 `guard-pipeline.ts` 在券商執行前執行順序驗證檢查(部位上限、冷卻期、白名單),並透過上下文隔離防止守護意外觸發交易。Richfolio 的 `guards.ts` 借鏡此模式實作 6 項 AI 後置檢查:債券 ETF 上限、財報臨近、STRONG BUY 標準強制、最多 2 個 STRONG BUY、信心度合理性以及買進金額合理性。

- **財報行事曆感知** — OpenAlice 的股票研究工具(`equity.ts`)會檢查財報行事曆以避免在高風險事件期間持倉。Richfolio 將 `calendarEvents` 加入既有的 Yahoo Finance 呼叫,並在臨近財報時硬性上限建議(≤3 天 → HOLD,≤7 天 → 不出 STRONG BUY)。

- **新聞情緒評分** — OpenAlice 在新聞管線中使用結構化的情緒分析。Richfolio 把 Gemini 新聞過濾器從二元相關性升級為每篇文章的情緒(看漲/看跌/中性)+ 影響度(高/中/低)評分。

- **推理持久化(腦/記憶)** — OpenAlice 的 `Brain.ts` 透過類 Git 提交追蹤認知狀態,帶情緒狀態與跨工作階段持久化的工作記憶。Richfolio 借鏡為 7 天滾動的 AI 推理快照歷史,在決策提示詞中呈現信念走勢。

- **更多技術指標** — OpenAlice 基於公式的指標系統(`calculator.ts`)支援 ATR、隨機指標等,不只 MACD/RSI。Richfolio 補充 ATR(14) 提供波動上下文、隨機指標(%K/%D)用於超賣/超買確認,以及 OBV 趨勢用於吸籌/派發偵測 — 全部基於既有圖表資料。

**採納的關鍵架構洞察:** OpenAlice 的守護管線設計原則 — 守護從不直接看到券商物件,只看到一個 `GuardContext` — 直接對應到 Richfolio 的做法:守護接收建議資料與報告上下文,而非原始 API 物件。這種隔離防止守護邏輯產生意料外的副作用。

---

## 🥉 [gadicc/yahoo-finance2](https://github.com/gadicc/yahoo-finance2) ⭐ ~1.5k

> 實際用於所有價格與基本面擷取的 TypeScript 函式庫

不是投資組合應用,但是核心相依套件。完整型別化、積極維護,可在 Node/Serverless 中執行。README 文件化了 `quoteSummary` 的每個子模組。

**richfolio 關鍵子模組:**

| 子模組 | 需要的欄位 |
|--------|------------|
| `summaryDetail` | `trailingPE`、`forwardPE`、`fiftyTwoWeekHigh`、`fiftyTwoWeekLow`、`marketCap`、`dividendYield` |
| `financialData` | `currentPrice`、`targetMeanPrice`、`recommendationKey`、`returnOnEquity`、`debtToEquity`、`freeCashflow`、`operatingCashflow`、`profitMargins`、`revenueGrowth`、`earningsGrowth` |
| `defaultKeyStatistics` | `enterpriseToEbitda`、`priceToBook`、`beta`、`fiveYearAvgDividendYield` |
| `price` | `regularMarketPrice`、`regularMarketChangePercent` |

**可借鏡:**
- 哪些子模組回傳哪些欄位(P/E 在 ETF 上不存在 — 需優雅處理)
- 如何有效率地批次呼叫 `quoteSummary` 以避免限流
- BTC/ETH 的代碼格式:使用 `BTC-USD`、`ETH-USD`
- AMZN 不是 AMAZ(目前持倉設定的代碼修正)

---

## 🎖️ [T1mn/MarketPulse](https://github.com/T1mn/MarketPulse) ⭐ 234

> Python + Gemini AI + Finnhub + 推播通知

已被評估為 "不要 fork"(Python 常駐程式、中國系推播應用、無投資組合感知)。但 AI 新聞摘要的提示詞模式在我們 TypeScript 版的新聞摘要中可以直接重用。

**可借鏡:**
- 每個標的的新聞分析 Gemini 提示詞結構 → 輸出:投資建議、信心度評分(%)、來源可信度評分(%)
- 透過 `app_state.json` 達成的去重邏輯 — 如何避免多次早盤執行時重複寄送相同新聞
- 可信來源清單:Reuters、Bloomberg、WSJ、AP、CNBC、Dow Jones、MarketWatch — 用作 `fetchNews.ts` 的預設 `TRUSTED_SOURCES` 過濾器

---

## 文章

---

### 🧠 [XinGPT (@xingpt)](https://x.com/xingpt) — AI Agent Skills 框架

> [BlockTempo 文章](https://www.blocktempo.com/ai-agent-personal-business-productivity-transformation-guide/),作者 Joe,整理自 [X 上的 @xingpt](https://x.com/xingpt/status/2025219080421277813)

一篇關於把結構化分析「技能」嵌入個人理財 AI 代理的全面指南。文章說明如何透過賦予 AI 具體框架、清晰標準與評分準則,把通用 AI 轉化為領域專家。

**直接啟發 Richfolio 兩項功能:**

- **價值投資框架** — 文章的「美股價值投資框架」概念:用基本面標準(ROE、負債比、FCF、護城河)給股票評 A/B/C/D 等級。Richfolio 將其實作為餵給 Gemini 的提示詞指示,使用 Yahoo Finance `financialData` 提供底層指標。
- **加密貨幣抄底模型** — 文章的「比特幣抄底模型」概念:使用技術指標(RSI、成交量、移動均線)辨識吸籌區。Richfolio 基於既有圖表資料以四個抄底指標實作。

**採納的關鍵洞察:** 不需要獨立的 AI 代理或額外 API 呼叫 — 在一次 Gemini 呼叫中以提示詞指示的形式嵌入結構化框架,就足以產出有紀律、基於標準的分析。

---

### 🤖 hvkshetry — Agentic AI for Investment Management

> [Medium 文章](https://medium.com/data-science-collective/agentic-ai-for-investment-management-from-concept-to-production-a2713c37cc76) — *Agentic AI for Investment Management: From Concept to Production*

一篇關於用 Claude Code 與 MCP 建置多代理投資管理系統的實踐指南,涵蓋專家代理角色(`portfolio-manager`、`equity-analyst`、`etf-analyst`、`macro-analyst`)、透過 `CLAUDE.md` 編排的斜線指令,以及來自 Yahoo Finance + Finnhub + OpenBB 的零成本資料來源。與 richfolio 的目標幾乎完全對應。

**啟發 Richfolio 在以下面向的做法:**
- 用於代理式開發工作流程的 `CLAUDE.md` 編排模式
- 如何拆解股票 vs ETF 分析(ETF 略過 P/E、使用不同訊號)
- 把總體資料與具體部位的評註串接起來

---

## 受這些參考啟發的設計決策

| 決策 | 啟發來源 |
|------|----------|
| 基本面採用 `yahoo-finance2` 而非 Finnhub | ghostfolio(規模化驗證)、yahoo-finance2 文件 |
| ETF 略過 P/E,改用 52 週區間位置 | ghostfolio 資料模型、yahoo-finance2 ETF 的細節 |
| 用 AI 摘要每個標的新聞,而非原始頭條 | MarketPulse 提示詞模式 |
| Claude Code 開發流程的斜線指令結構 | hvkshetry 的代理式投資管理文章 |
| Fork-and-run 模型(無共享伺服器) | 與 ghostfolio 自架複雜度的對比 |
| 把分析技能嵌入提示詞指示,而非獨立代理 | XinGPT 的 AI Agent Skills 框架 |
| 用基本面標準給股票 A-D 評級 | XinGPT 的「美股價值投資框架」概念 |
| 多指標加密貨幣抄底偵測 | XinGPT 的「比特幣抄底模型」概念 |
| 兩階段 Think/Plan AI 提示詞(先觀察再決策) | OpenAlice 的 think/plan 認知工具 |
| AI 後置守護驗證管線(6 項順序檢查) | OpenAlice 的 guard-pipeline 與上下文隔離 |
| 財報行事曆守護(臨近財報硬上限) | OpenAlice 股票研究的財報感知 |
| 新聞情緒評分(每篇文章的看漲/看跌/中性) | OpenAlice 的結構化情緒分析 |
| 7 天推理持久化(信念走勢) | OpenAlice 的 Brain 模組(把認知狀態作為提交) |
| ATR + 隨機指標 + OBV 等指標 | OpenAlice 基於公式的指標可擴充性 |
| Gemini 指數退避重試 | OpenAlice 的暫時性錯誤分類模式 |
