---
title: Deployment
layout: default
nav_order: 6
---

# Deployment

Richfolio runs as a GitHub Actions cron job — no server needed. Push your code, add secrets, and it runs automatically every morning.

---

## Push Your Repo

```bash
git add -A
git commit -m "Initial setup"
git push origin main
```

---

## Add Secrets

Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Secret | Value | Required |
|--------|-------|----------|
| `RESEND_API_KEY` | Your Resend API key | Yes |
| `RECIPIENT_EMAIL` | Your email address | Yes |
| `CONFIG_JSON` | Full contents of your `config.json` file | Yes |
| `NEWS_API_KEY` | Your NewsAPI key | No |
| `GEMINI_API_KEY` | Your Gemini API key | No |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | No |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | No |

{: .important}
> **For `CONFIG_JSON`:** Open your `config.json`, select all, copy, and paste the entire JSON content as the secret value.

---

## Schedule

The workflow runs automatically:

- **Daily** — every day at 10pm UTC (8am AEST)
- **Weekly** — every Sunday at 10pm UTC (Monday 8am AEST)

You can also trigger manually: repo → **Actions** → **Morning Brief** → **Run workflow** → choose daily or weekly mode.

---

## Updating Your Portfolio

When your holdings change, update the `CONFIG_JSON` secret on GitHub with your new `config.json` content. The next scheduled run will use the updated data.

---

## Customizing the Schedule

Edit `.github/workflows/morning-brief.yml`:

```yaml
schedule:
  - cron: "0 22 * * *"  # Daily at 10pm UTC
```

Cron is always UTC. Common timezone conversions:

| Desired Local Time | UTC Cron |
|-------------------|----------|
| 8am AEST (UTC+10) | `0 22 * * *` (previous day) |
| 8am EST (UTC-5) | `0 13 * * *` |
| 8am PST (UTC-8) | `0 16 * * *` |
| 8am GMT (UTC+0) | `0 8 * * *` |
| 8am IST (UTC+5:30) | `0 2 * * *` (30 min offset — closest match) |
