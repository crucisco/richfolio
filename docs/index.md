---
title: Home
layout: home
nav_order: 1
---

# Richfolio

A zero-maintenance portfolio monitoring system. Set your target allocations once, get daily briefings with allocation gaps, AI-powered buy signals, and relevant news — delivered via email and Telegram, automatically via GitHub Actions.

**Everything runs on free tiers. No server, no dashboard, no ongoing costs.**

---

## What You Get

Every morning, Richfolio fetches live market data, runs allocation analysis, generates AI buy recommendations, and delivers a polished report to your inbox and Telegram.

| Component | Service | Cost |
|-----------|---------|------|
| Prices & Fundamentals | Yahoo Finance | Free |
| News | NewsAPI.org | Free (100 req/day) |
| AI Analysis | Google Gemini 2.5 Flash | Free (250 req/day) |
| Email | Resend.com | Free (3,000/month) |
| Telegram | Telegram Bot API | Free |
| Scheduler | GitHub Actions | Free (cron) |

---

## Quick Start

```bash
git clone https://github.com/furic/richfolio.git
cd richfolio
npm install
cp config.example.json config.json
cp .env.example .env
```

Edit `config.json` with your portfolio data and `.env` with your API keys, then:

```bash
npm run dev       # Daily brief (email + Telegram)
npm run weekly    # Weekly rebalancing report
```

See [Getting Started](getting-started) for full prerequisites, or jump to [API Keys](api-keys) if you just need to set up services.

---

## Documentation

| Page | Description |
|------|-------------|
| [Features](features) | What Richfolio does — all 9 capabilities explained |
| [Getting Started](getting-started) | Prerequisites, installation, and first run |
| [Configuration](configuration) | `config.json` field reference, ticker formats, tips |
| [API Keys](api-keys) | Step-by-step setup for Resend, NewsAPI, Gemini, Telegram |
| [Deployment](deployment) | GitHub Actions, secrets, schedule customization |
| [How It Works](how-it-works) | Architecture, data pipeline, analysis logic |
| [Troubleshooting](troubleshooting) | Common errors and fixes |
| [References](references) | Prior art and design influences |
