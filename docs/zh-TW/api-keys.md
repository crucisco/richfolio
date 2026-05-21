---
title: API 金鑰
layout: default
nav_order: 5
lang: zh-TW
permalink: /api-keys.html
---

# API 金鑰

Richfolio 最多使用 5 個外部服務,全部都有寬裕的免費額度。只有 Resend 與收件信箱是必要的 — 其餘皆為可選。

將每個金鑰加入為儲存庫 Secret:Settings → Secrets and variables → Actions → **Secrets** 分頁。`RECIPIENT_EMAIL` 改為加入為**變數**(更方便檢視與編輯)。

![GitHub Actions Secret](../screenshots/github_actions_secrets.png){: style="max-width: 500px; display: block; margin: 16px auto;" }

---

## Resend(電子郵件)— 必要
{: .text-green-200}

Resend 負責投遞 HTML 信件報告。

1. 前往 [resend.com](https://resend.com) 並註冊
2. 在主控台找到 **API Keys**
3. 點選 **Create API Key**、命名並複製金鑰
4. 加入為 GitHub Secret — 名稱:`RESEND_API_KEY`,值:剛複製的金鑰

**免費額度:** 每月 3,000 封。預設由 `onboarding@resend.dev` 寄送。除非驗證自訂網域,否則只能寄到**你的帳號擁有者信箱**(Dashboard → Domains → Add Domain → 加入 DNS 紀錄)。

---

## 收件信箱 — 必要
{: .text-green-200}

加入為 GitHub **變數**(不是 Secret):名稱:`RECIPIENT_EMAIL`,值:你的電子郵件信箱。

除非驗證了自訂網域,否則必須與 Resend 帳號信箱相同。

---

## NewsAPI(新聞頭條)— 可選
{: .text-yellow-200}

為每日簡報提供每個股票代碼的頭條新聞。

1. 前往 [newsapi.org](https://newsapi.org) 並註冊
2. 主控台會立即顯示你的 API 金鑰
3. 加入為 GitHub Secret — 名稱:`NEWS_API_KEY`,值:主控台中的金鑰

**免費額度:** 每日 100 次請求。Richfolio 每次執行透過批次請求只用約 4 次。僅回傳最近 24 小時的頭條。若未設定,簡報會略過新聞。

---

## Google Gemini(AI 分析)— 可選
{: .text-yellow-200}

由 Gemini 2.5 Flash 驅動的 AI 買進建議。

1. 前往 [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. 點選 **Create API Key**,選擇一個 Google Cloud 專案(或新增一個)
3. 複製金鑰並加入為 GitHub Secret — 名稱:`GEMINI_API_KEY`,值:剛複製的金鑰

**免費額度:** 每日 250 次請求,每分鐘 10 次。Richfolio 每次執行使用 1 次請求(每個 STRONG BUY 標的再額外使用 1 次做詳細分析)。新金鑰可能需要幾分鐘才會啟用(你可能先看到 429 錯誤)。若未設定或額度用盡,會回退到基於缺口的建議。

### 關於 Gemini 模型層級的說明

Google 的定價頁面聲明 Gemini 2.5 Pro 對輸入與輸出 token 都是["免費"](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro)。實務上,免費層的 Pro 請求經常遇到 `429 RESOURCE_EXHAUSTED` — 即使用量很低也會。Google 沒有公布免費層的實際 RPD(每日請求數)上限;第三方資料推測 Pro 大約限制在 100 RPD,但實際數字會因帳號而異,且無任何保證。

**Richfolio 所有 AI 呼叫都使用 Gemini 2.5 Flash**(主分析與 STRONG BUY 詳細分析都是),因為 Flash 的免費額度更寬裕且更穩定。對金融分析文字而言,品質差異可忽略。

### 使用其他 AI 模型

若你有付費的 Gemini 方案,或想完全換到別家服務商,模型很容易替換。AI 呼叫集中在兩個檔案:

- `src/aiAnalysis.ts` — 主買進建議(約第 225 行)
- `src/detailedAnalysis.ts` — STRONG BUY 詳細分析(約第 119 行)

**切換到 Gemini Pro**(若你有付費額度):

```typescript
// 在兩個檔案中將:
model: "gemini-2.5-flash",
// 改成:
model: "gemini-2.5-pro",
```

**切換到 Claude 或其他服務商**,需要把 `@google/genai` 的呼叫替換為對應服務商的 SDK。例如改用 Anthropic SDK:

```typescript
// npm install @anthropic-ai/sdk
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // 使用 ANTHROPIC_API_KEY 環境變數
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});
```

提示詞與 JSON 解析邏輯保持不變 — 只是 API 呼叫方式不同。將服務商的 API 金鑰加入為 GitHub Secret 即可。

---

## Telegram 機器人 — 可選
{: .text-yellow-200}

將精簡摘要傳送到你的 Telegram。

### 建立機器人

1. 開啟 Telegram、搜尋 **@BotFather**
2. 傳送 `/newbot`
3. 命名(例如 "Richfolio Brief")並指定使用者名稱(必須以 `bot` 結尾,例如 `richfolio_brief_bot`)
4. BotFather 會回傳你的機器人 token — 複製下來

### 取得你的 chat ID

1. 在 Telegram 搜尋 **@userinfobot** 並啟動它
2. 它會回傳你的數字使用者 ID — 這就是你的 chat ID

**重要:** 在執行 Richfolio 之前,先給新建立的機器人傳送任意訊息(例如 "hi") — 必須先完成這一步,機器人才能傳送訊息給你。

把兩個值都加入為 GitHub Secret:

- 名稱:`TELEGRAM_BOT_TOKEN`,值:BotFather 提供的 token
- 名稱:`TELEGRAM_CHAT_ID`,值:你的數字使用者 ID

**注意:** 未設定時,簡報會略過 Telegram。訊息為精簡摘要(不是完整 HTML)。單則訊息上限 4,096 字元,新聞區段必要時會被截斷。

---

## 彙整

| 金鑰 | 必填 | 服務 |
|------|------|------|
| `RESEND_API_KEY` | 是 | 信件投遞 |
| `RECIPIENT_EMAIL` | 是 | 你的電子郵件信箱 |
| `NEWS_API_KEY` | 否 | 新聞頭條 |
| `GEMINI_API_KEY` | 否 | AI 買進建議 |
| `TELEGRAM_BOT_TOKEN` | 否 | Telegram 投遞 |
| `TELEGRAM_CHAT_ID` | 否 | Telegram 投遞 |
