---
title: API Keys
layout: default
nav_order: 5
---

# API Keys

Richfolio uses up to 5 external services, all with generous free tiers. Only Resend and a recipient email are required — everything else is optional.

**GitHub Actions:** Add each key as a repository Secret (Settings → Secrets and variables → Actions → **Secrets** tab). Add `RECIPIENT_EMAIL` as a **Variable** instead (easier to view/edit).

**Local development:** Run `cp .env.example .env` and add your keys there. See [Local Development](local-development).

---

## Resend (Email) — Required
{: .text-green-200}

Resend delivers the HTML email reports.

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**, give it a name, and copy the key
4. Add to your `.env` file (local) or GitHub Secrets (Actions):
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

**Free tier:** 3,000 emails/month. Sends from `onboarding@resend.dev` by default. Can only send to your **account owner email** unless you verify a custom domain (Dashboard → Domains → Add Domain → add DNS records).

---

## Recipient Email — Required
{: .text-green-200}

```
RECIPIENT_EMAIL=you@example.com
```

Must match your Resend account email unless you've verified a custom domain.

---

## NewsAPI (Headlines) — Optional
{: .text-yellow-200}

Provides top headlines per ticker for the daily brief.

1. Go to [newsapi.org](https://newsapi.org) and sign up
2. Your API key is shown on the dashboard immediately
3. Add to `.env`:
   ```
   NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxx
   ```

**Free tier:** 100 requests/day. Richfolio uses ~4 requests per run via batching. Headlines from the last 24 hours only. If not set, the brief runs without news.

---

## Google Gemini (AI Analysis) — Optional
{: .text-yellow-200}

Powers the AI buy recommendations with Gemini 2.5 Flash.

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**, select a Google Cloud project (or create one)
3. Copy the key and add to `.env`:
   ```
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx
   ```

**Free tier:** 250 requests/day, 10 requests/minute. Richfolio uses 1 request per run (plus 1 per STRONG BUY ticker for detailed analysis). New keys may take a few minutes for quota to activate (you might see 429 errors initially). If not set or quota exhausted, falls back to gap-based recommendations.

### A note on Gemini model tiers

Google's pricing page states that Gemini 2.5 Pro is ["Free of charge"](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro) for both input and output tokens. In practice, however, free-tier Pro requests frequently hit `429 RESOURCE_EXHAUSTED` errors — even with minimal usage. Google does not publish the actual RPD (requests per day) limits for the free tier; third-party sources suggest Pro may be capped at ~100 RPD, but the real number appears to vary by account and is not guaranteed.

**Richfolio uses Gemini 2.5 Flash for all AI calls** (both main analysis and detailed STRONG BUY analysis) because Flash has a more generous and reliable free-tier quota. The quality difference for financial analysis text is negligible.

### Using a different AI model

If you have a paid Gemini plan or want to use a different provider entirely, the model is easy to swap. The AI calls live in two files:

- `src/aiAnalysis.ts` — main buy recommendations (line ~225)
- `src/detailedAnalysis.ts` — detailed STRONG BUY analysis (line ~119)

**To switch to Gemini Pro** (if you have paid quota):

```typescript
// In both files, change:
model: "gemini-2.5-flash",
// To:
model: "gemini-2.5-pro",
```

**To switch to Claude or another provider**, you would replace the `@google/genai` calls with your provider's SDK. For example, with the Anthropic SDK:

```typescript
// npm install @anthropic-ai/sdk
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});
```

The prompt and JSON parsing logic stay the same — only the API call changes. Add your provider's API key to `.env` and GitHub Actions secrets.

---

## Telegram Bot — Optional
{: .text-yellow-200}

Delivers condensed summaries to your Telegram account.

### Create the bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., "Richfolio Brief") and username (must end in `bot`, e.g., `richfolio_brief_bot`)
4. BotFather replies with your bot token — copy it

### Get your chat ID

1. Search for **@userinfobot** on Telegram and start it
2. It replies with your numeric user ID — this is your chat ID

**Important:** Send any message to your new bot (e.g., "hi") before running Richfolio — this is required before the bot can message you.

Add both to `.env`:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_CHAT_ID=1234567890
```

**Notes:** If not set, the brief skips Telegram. Messages are condensed summaries (not full HTML). 4,096 character limit per message — news is truncated if needed.

---

## Summary

| Key | Required | Service |
|-----|----------|---------|
| `RESEND_API_KEY` | Yes | Email delivery |
| `RECIPIENT_EMAIL` | Yes | Your email address |
| `NEWS_API_KEY` | No | News headlines |
| `GEMINI_API_KEY` | No | AI buy recommendations |
| `TELEGRAM_BOT_TOKEN` | No | Telegram delivery |
| `TELEGRAM_CHAT_ID` | No | Telegram delivery |
