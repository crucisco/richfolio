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

## Add Secrets & Variables

Go to your forked repo → **Settings** → **Secrets and variables** → **Actions**.

1. **Secrets tab** — add your API keys (`RESEND_API_KEY` is required, others are optional). See [API Keys](api-keys) for step-by-step instructions for each service.

2. **Variables tab** — add:
   - `CONFIG_JSON` — paste your full portfolio JSON (see [Configuration](configuration) for the format)
   - `RECIPIENT_EMAIL` — your email address

{: .important}
> **For `CONFIG_JSON`:** Using a variable (instead of a secret) lets you view and edit your portfolio config directly in the GitHub UI.

---

## Schedule

The workflow runs automatically:

- **Daily** — every day at 10pm UTC (8am AEST)
- **Intraday** — weekdays at 10am, 12pm, 2pm, 4pm AEST (alerts only when signals strengthen)
- **Weekly** — every Sunday at 10pm UTC (Monday 8am AEST)

You can also trigger manually: repo → **Actions** → **Portfolio Monitor** → **Run workflow** → choose daily, intraday, or weekly mode.

<details>
<summary><strong>Changing the schedule or timezone</strong></summary>

<br>

The default schedule is set for AEST (UTC+10). To change it, edit `.github/workflows/portfolio-monitor.yml` in your fork.

The file contains three cron entries — one for each mode:

```yaml
schedule:
  - cron: "0 22 * * *"    # Daily at 10pm UTC (8am AEST)
  - cron: "0 0,2,4,6 * * 1-5"  # Intraday checks (weekdays)
  - cron: "0 22 * * 0"    # Weekly on Sunday 10pm UTC
```

GitHub Actions cron is **always in UTC**. To get your desired local time, convert to UTC first:

| Your Local Time | UTC Cron |
|-----------------|----------|
| 8am AEST (UTC+10) | `0 22 * * *` (previous day) |
| 8am EST (UTC-5) | `0 13 * * *` |
| 8am PST (UTC-8) | `0 16 * * *` |
| 8am GMT (UTC+0) | `0 8 * * *` |
| 8am IST (UTC+5:30) | `0 2 * * *` (closest match) |
| 9am JST (UTC+9) | `0 0 * * *` |
| 8am CET (UTC+1) | `0 7 * * *` |

**Tip:** Search "UTC time converter" to find the right cron value for your timezone. Only change the hour (`22` in `0 22 * * *`) — the rest controls minute, day, month, and weekday.

</details>

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

