# Setup Guide

Complete instructions for setting up Richfolio locally and deploying to GitHub Actions.

---

## 1. Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/)
- **npm** — comes with Node.js
- A **GitHub account** (for Actions deployment)

---

## 2. Fork & Install

While Richfolio can be run locally or triggered manually, **forking the repo is recommended** so you can use GitHub Actions to automatically schedule daily briefs, intraday alerts, and weekly reports — no server needed.

### Fork the repo

1. Go to [github.com/furic/richfolio](https://github.com/furic/richfolio)
2. Click the **Fork** button (top right)
3. Keep the default settings and click **Create fork**

### Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/richfolio.git
cd richfolio
npm install
```

Replace `YOUR_USERNAME` with your GitHub username.

> **Why fork?** GitHub Actions workflows only run on your own repositories. Forking gives you your own copy where the scheduled workflows will execute automatically, and you can pull upstream updates when new features are released.

---

## 3. Configure Your Portfolio (`config.json`)

Copy the example config:

```bash
cp config.example.json config.json
```

Edit `config.json`:

```json
{
  "targetPortfolio": {
    "VOO": 20,
    "QQQ": 15,
    "GLD": 10,
    "BSV": 20,
    "BTC": 1.5
  },
  "currentHoldings": {
    "AAPL": 30,
    "VOO": 1,
    "BTC": 0.0002
  },
  "totalPortfolioValueUSD": 50000
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `targetPortfolio` | Yes | Target allocation percentages (must sum to ~100%). Keys are ticker symbols. |
| `currentHoldings` | Yes | Number of shares you currently own. Can include stocks not in your target (e.g., AAPL). |
| `totalPortfolioValueUSD` | Yes | Your estimated total portfolio value in USD. Used for allocation math when your actual holdings are smaller. |


### Ticker Formats

- **US stocks/ETFs**: Use standard symbols — `AAPL`, `VOO`, `QQQ`, `SMH`
- **Crypto**: Use short names — `BTC`, `ETH` (automatically converted to `BTC-USD`, `ETH-USD` for Yahoo Finance)
- **International**: Use the Yahoo Finance symbol — e.g., `0700.HK` for Tencent

### Tips

- `targetPortfolio` percentages should add up to 100%. If they don't, the gap calculations will still work but may suggest larger or smaller buys.
- `currentHoldings` can include stocks **not** in your target portfolio. These are tracked for overlap detection (e.g., if you hold AAPL, ETFs containing AAPL will have reduced buy priority).
- Fractional shares are supported (e.g., `"BTC": 0.000188`).

---

## 4. API Keys (`.env`)

Copy the example:

```bash
cp .env.example .env
```

### Resend (Email) — Required

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**, give it a name, and copy the key
4. Paste into `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

**Free tier notes:**
- 3,000 emails/month (more than enough for daily + weekly)
- Sends from `onboarding@resend.dev` by default
- Can only send to your **account owner email** unless you verify a custom domain
- To verify a domain: Dashboard → Domains → Add Domain → add the DNS records

### NewsAPI (News Headlines) — Optional

1. Go to [newsapi.org](https://newsapi.org) and sign up
2. Your API key is shown on the dashboard immediately
3. Paste into `.env`:
   ```
   NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxx
   ```

**Free tier notes:**
- 100 requests/day (Richfolio uses ~4 requests per run via batching)
- Headlines from the last 24 hours only
- If not set, the brief runs without news — everything else still works

### Google Gemini (AI Analysis) — Optional

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**, select a Google Cloud project (or create one)
3. Copy the key and paste into `.env`:
   ```
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx
   ```

**Free tier notes:**
- 250 requests/day, 10 requests/minute (Richfolio uses 1 request per run)
- Uses Gemini 2.5 Flash model
- New API keys may take a few minutes for quota to activate — you might see 429 errors initially
- If not set or quota exhausted, the brief falls back to gap-based recommendations

### Telegram Bot (Telegram Delivery) — Optional

**Create the bot:**
1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., "Richfolio Brief") and username (must end in `bot`, e.g., `richfolio_brief_bot`)
4. BotFather replies with your bot token — copy it

**Get your chat ID:**
1. Search for **@userinfobot** on Telegram and start it
2. It replies with your numeric user ID — this is your chat ID

**Important:** Send any message to your new bot (e.g., "hi") — this is required before the bot can message you.

Paste both into `.env`:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_CHAT_ID=1234567890
```

**Notes:**
- If not set, the brief skips Telegram — email still works
- Telegram messages are condensed summaries (not full HTML like email)
- 4,096 character limit per message — news section is truncated if needed

### Recipient Email — Required

```
RECIPIENT_EMAIL=you@example.com
```

This must match your Resend account email unless you've verified a custom domain.

---

## 5. Run Locally

```bash
# Daily brief (prices + news + AI analysis + email + Telegram)
npm run dev

# Weekly rebalancing report (prices + allocation drift + email + Telegram)
npm run weekly
```

Check your email and Telegram for the results.

---

## 6. Deploy to GitHub Actions

### Add secrets to your fork

Go to your forked repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add these secrets:

| Secret | Value | Required |
|--------|-------|----------|
| `RESEND_API_KEY` | Your Resend API key | Yes |
| `NEWS_API_KEY` | Your NewsAPI key | No |
| `GEMINI_API_KEY` | Your Gemini API key | No |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | No |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | No |

Then switch to the **Variables** tab and add:

| Variable | Value | Required |
|----------|-------|----------|
| `CONFIG_JSON` | Full contents of your `config.json` file | Yes |
| `RECIPIENT_EMAIL` | Your email address | Yes |

**For `CONFIG_JSON`:** Open `config.json`, select all, copy, and paste the entire JSON content as the variable value. Using a variable (instead of a secret) lets you view and edit your portfolio config directly in the GitHub UI.

### Schedule

The workflow runs automatically:
- **Daily**: Every day at 10pm UTC (8am AEST)
- **Weekly**: Every Sunday at 10pm UTC (Monday 8am AEST)

You can also trigger manually: repo → **Actions** → **Morning Brief** → **Run workflow** (choose daily, intraday, or weekly mode).

### Enable workflows

GitHub disables Actions on newly forked repos by default. Go to your fork → **Actions** tab → click **"I understand my workflows, go ahead and enable them"**.

### Updating your portfolio

When your holdings change, update the `CONFIG_JSON` variable on GitHub (Settings → Secrets and variables → Actions → Variables tab). The next scheduled run will use the updated data.

### Pulling upstream updates

To get new features from the original repo:

```bash
git remote add upstream https://github.com/furic/richfolio.git
git fetch upstream
git merge upstream/main
git push origin main
```

Or use GitHub's **Sync fork** button on your fork's main page.

---

## 7. Customizing the Schedule

Edit `.github/workflows/morning-brief.yml`:

```yaml
schedule:
  - cron: "0 22 * * *"  # Daily at 10pm UTC
```

Cron is always UTC. Common timezone conversions:

| Local Time | UTC Cron |
|-----------|----------|
| 8am AEST (UTC+10) | `0 22 * * *` (previous day) |
| 8am EST (UTC-5) | `0 13 * * *` |
| 8am PST (UTC-8) | `0 16 * * *` |
| 8am GMT (UTC+0) | `0 8 * * *` |

---

## Troubleshooting

### "Can only send testing emails to your own email address"
Resend free tier restriction. Set `RECIPIENT_EMAIL` to your Resend account email, or verify a custom domain on Resend.

### "GEMINI_API_KEY quota: limit 0"
New keys need time to activate. Wait 5–10 minutes, then try enabling the [Generative Language API](https://console.cloud.google.com/apis/library) in Google Cloud Console, and adding billing details in [AI Studio](https://aistudio.google.com) (free tier is fine). See [Troubleshooting](troubleshooting) for full steps.

### "fetch failed — internal-error" for a ticker
Yahoo Finance occasionally has issues with specific tickers. The ticker is skipped and everything else continues normally.

### GitHub Actions shows empty secrets
Make sure you added the secrets at the **repository** level (Settings → Secrets → Actions), not at the environment level.

### No news returned
NewsAPI free tier only returns articles from the last 24 hours. Some tickers (especially ETFs) rarely appear in news headlines. This is normal.
