---
title: Deployment
layout: default
nav_order: 6
---

# Deployment

Richfolio runs as a GitHub Actions cron job — no server needed. Fork the repo, add secrets, and it runs automatically every morning.

---

## Fork the Repo

If you haven't already, [fork richfolio](https://github.com/furic/richfolio/fork) to your own GitHub account. GitHub Actions workflows only run on your own repositories — forking gives you automated scheduling for daily briefs, intraday alerts, and weekly reports.

---

## Enable Workflows

GitHub disables Actions on newly forked repos by default. Go to your fork → **Actions** tab → click **"I understand my workflows, go ahead and enable them"**.

---

## Add Secrets

Go to your forked repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Secret | Value | Required |
|--------|-------|----------|
| `RESEND_API_KEY` | Your Resend API key | Yes |
| `RECIPIENT_EMAIL` | Your email address | Yes |
| `NEWS_API_KEY` | Your NewsAPI key | No |
| `GEMINI_API_KEY` | Your Gemini API key | No |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | No |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | No |

Then switch to the **Variables** tab and add:

| Variable | Value | Required |
|----------|-------|----------|
| `CONFIG_JSON` | Full contents of your `config.json` file | Yes |

{: .important}
> **For `CONFIG_JSON`:** Open your `config.json`, select all, copy, and paste the entire JSON content as the variable value. Using a variable (instead of a secret) lets you view and edit your portfolio config directly in the GitHub UI.

---

## Schedule

The workflow runs automatically:

- **Daily** — every day at 10pm UTC (8am AEST)
- **Intraday** — weekdays at 10am, 12pm, 2pm, 4pm AEST (alerts only when signals strengthen)
- **Weekly** — every Sunday at 10pm UTC (Monday 8am AEST)

You can also trigger manually: repo → **Actions** → **Morning Brief** → **Run workflow** → choose daily, intraday, or weekly mode.

---

## Updating Your Portfolio

When your holdings change, update the `CONFIG_JSON` variable on GitHub (Settings → Secrets and variables → Actions → Variables tab). The next scheduled run will use the updated data.

---

## Pulling Upstream Updates

To get new features from the original repo:

```bash
git remote add upstream https://github.com/furic/richfolio.git
git fetch upstream
git merge upstream/main
git push origin main
```

Or use GitHub's **Sync fork** button on your fork's main page.

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
