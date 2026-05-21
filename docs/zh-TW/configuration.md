---
title: 設定說明
layout: default
nav_order: 4
lang: zh-TW
permalink: /configuration.html
---

# 設定說明

Richfolio 用一份 JSON 設定承載所有投資組合資料 — 你的組合資訊保持隱私。

---

## 設定步驟

進入你 Fork 的儲存庫 Settings → Secrets and variables → Actions → **Variables** 分頁 → 建立名為 `CONFIG_JSON` 的變數,內容為下方的 JSON。

## 範例

```json
{
  "targetPortfolio": {
    "VOO": 20,
    "QQQ": 15,
    "GLD": 10,
    "BSV": 20,
    "SMH": 5,
    "BTC": 1.5
  },
  "currentHoldings": {
    "AAPL": 30,
    "VOO": 1,
    "BTC": 0.0002
  },
  "totalPortfolioValueUSD": 50000,
  "intradayAlerts": {
    "enabled": true,
    "confidenceIncreaseThreshold": 10
  }
}
```

---

## 欄位參考

| 欄位 | 必填 | 描述 |
|------|------|------|
| `targetPortfolio` | 是 | 目標配置百分比。鍵為股票代碼,值為百分比,總和應約為 100%。 |
| `currentHoldings` | 是 | 你目前持有的股數。可以包含不在目標組合中的股票(例如 AAPL 用於 ETF 重疊偵測)。 |
| `totalPortfolioValueUSD` | 是 | 你估計的投資組合總價值(美元)。當實際持倉小於目標時,用於配置計算。 |
| `intradayAlerts` | 否 | 盤中警示設定(見下)。省略時套用預設值。 |

---

## 盤中警示

`intradayAlerts` 區段控制盤中檢查何時送出警示。所有欄位都可選 — 已備好合理的預設值。

警示僅在 STRONG BUY 相關變動時觸發:
1. **升級為 STRONG BUY** — 其他層級 → STRONG BUY
2. **從 STRONG BUY 降級** — STRONG BUY → 其他層級
3. **信心度變動** — 維持 STRONG BUY 期間信心度變動 ≥ 門檻

| 欄位 | 預設值 | 描述 |
|------|--------|------|
| `enabled` | `true` | 總開關。設為 `false` 可完全停用盤中警示。 |
| `confidenceIncreaseThreshold` | `10` | 觸發 STRONG BUY 股票警示所需的最小信心度變化(絕對值,百分點)。 |

---

## 重新分析

以最新價格(含盤後/盤前)重新分析單一股票代碼。會寄送電子郵件 + Telegram,並附上新的分析 URL。

Actions → Portfolio Monitor → **Run workflow** → mode: `refresh`、ticker: `SMH`。

可用時會使用 Yahoo Finance 的 `postMarketPrice` 與 `preMarketPrice`。盤後資料無法取得時會回退到一般市價。

---

## 股票代碼格式

| 類型 | 格式 | 範例 |
|------|------|------|
| 美股/ETF | 標準代碼 | `AAPL`、`VOO`、`QQQ`、`SMH` |
| 加密貨幣 | 簡稱 | `BTC`、`ETH`(自動轉為 `BTC-USD`、`ETH-USD`) |
| 國際市場 | Yahoo Finance 代碼 | `0700.HK`(騰訊)、`TM`(豐田) |

---

## 小提示

- **目標百分比**總和應為 100%。若不是,缺口計算仍能運作,但建議買進金額可能偏大或偏小。

- **目標之外的持倉**會用於 ETF 重疊偵測。例如,持有 AAPL 會降低包含 AAPL 的 ETF(如 VOO 或 QQQ)買進優先度。

- **支援零股** — 對加密貨幣(`"BTC": 0.000188`)或支援零股交易的券商很有用。

- **投資組合估值**取實際持倉價值與設定估值的較大者。即使你目前持倉還小於目標配置,缺口計算仍然有意義。

<details>
<summary><strong>最多可以加入多少個股票代碼?</strong></summary>

<br>

Richfolio 在聚焦的投資組合中表現最佳。雖然沒有硬性上限,但免費版 API 額度與簡報的可讀性給了實務上的界線。

**建議範圍:**

| 數量 | 評價 |
|------|------|
| **10-20** | 最佳區間 — 聚焦、可執行、所有免費額度都游刃有餘 |
| **20-30** | 仍然不錯 — 簡報好讀、額度尚有餘 |
| **30-50** | 技術上可行,但每日簡報會顯得雜亂 |
| **50+** | 不建議(見下) |

**為什麼不建議 50+:**

- **NewsAPI(每日 100 次)** — 新聞以每 5 個代碼為一批抓取。50 個代碼下,daily + intraday 約耗 22 次;100 個代碼約 42 次,留給 refresh 的額度很少。
- **AI 分析品質** — 一次評估太多選項時,Gemini 的建議會被稀釋。
- **簡報可讀性** — 信件變長,Telegram 在 4,096 字元處截斷,訊號雜訊比急遽下降。
- **執行時間** — 每個代碼都需要 Yahoo Finance 呼叫取得價格、技術指標與基本面,會拖慢 GitHub Actions 執行時間。

Gemini 免費層(每日 250 次請求、每分鐘 25 萬 token)很寬裕,通常不會成為瓶頸 — 即使 100 個代碼每次執行也只用約 5.3 萬 token。真正的限制是 NewsAPI 額度與資訊過載。

**結論 — 想在所有免費層都取得最佳體驗,建議控制在 30 個代碼以內。**

</details>

---

## 更新設定

當持倉變動時,在 GitHub 以新的 JSON 內容更新 `CONFIG_JSON` 變數(Settings → Secrets and variables → Actions → Variables 分頁)。
