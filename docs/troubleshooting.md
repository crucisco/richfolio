---
title: Troubleshooting
layout: default
nav_order: 8
---

# Troubleshooting

Common issues and how to fix them.

---

## "Can only send testing emails to your own email address"

**Cause:** Resend free tier restriction.

**Fix:** Set `RECIPIENT_EMAIL` to the same email you used to sign up for Resend, or verify a custom domain on Resend (Dashboard → Domains → Add Domain → add DNS records).

---

## "GEMINI_API_KEY quota: limit 0"

**Cause:** New Gemini API keys take a few minutes to activate.

**Fix:** Wait 5–10 minutes and try again. In the meantime, Richfolio automatically falls back to gap-based recommendations — the brief will still be delivered, just without AI analysis.

---

## "fetch failed — internal-error" for a ticker

**Cause:** Yahoo Finance occasionally has issues with specific tickers (especially less common ones like BIPC).

**Fix:** No action needed. The ticker is skipped and everything else continues normally. This is an intermittent Yahoo Finance issue.

---

## GitHub Actions shows empty secrets

**Cause:** Secrets were added at the wrong level.

**Fix:** Make sure you added secrets at the **repository** level: Settings → Secrets and variables → Actions → Repository secrets. Not at the environment level.

---

## No news returned

**Cause:** NewsAPI free tier only returns articles from the last 24 hours. Some tickers (especially ETFs and small-caps) rarely appear in news headlines.

**Fix:** This is normal behavior. The brief runs fine without news for those tickers. AI analysis will note "no recent news" in its recommendations.

---

## Telegram message not received

**Cause:** You haven't started a conversation with your bot yet.

**Fix:** Open Telegram, find your bot by username, and send it any message (e.g., "hi"). The Telegram Bot API requires the user to initiate contact before the bot can send messages. After that, re-run Richfolio.

---

## "Missing config.json" error

**Cause:** `config.json` doesn't exist in the project root.

**Fix:** Copy the example config:

```bash
cp config.example.json config.json
```

Then edit it with your portfolio data. In GitHub Actions, make sure the `CONFIG_JSON` secret contains valid JSON.

---

## Brief runs but email is empty or missing sections

**Cause:** One or more API keys are missing or invalid.

**Fix:** Check your `.env` file. The brief adapts to what's available:
- Without `NEWS_API_KEY` → no news section
- Without `GEMINI_API_KEY` → gap-based recommendations instead of AI
- Without `TELEGRAM_BOT_TOKEN` → email only (no Telegram)

All combinations are valid — only `RESEND_API_KEY` and `RECIPIENT_EMAIL` are required.
