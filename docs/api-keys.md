---
title: API Keys
layout: default
nav_order: 5
---

# API Keys

Richfolio uses up to 5 external services, all with generous free tiers. Only Resend and a recipient email are required — everything else is optional.

```bash
cp .env.example .env
```

---

## Resend (Email) — Required
{: .text-green-200}

Resend delivers the HTML email reports.

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**, give it a name, and copy the key
4. Add to `.env`:
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

**Free tier:** 250 requests/day, 10 requests/minute. Richfolio uses 1 request per run. New keys may take a few minutes for quota to activate (you might see 429 errors initially). If not set or quota exhausted, falls back to gap-based recommendations.

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
