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

![Daily Brief](screenshots/morning-debrief.png){: style="max-width: 400px; display: block; margin: 16px auto;" }

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

1. [Fork the repo](https://github.com/furic/richfolio/fork)
2. Add your portfolio data as a GitHub Actions variable (`CONFIG_JSON`)
3. Add your API keys as GitHub Secrets (`RESEND_API_KEY`, etc.)
4. Enable GitHub Actions — done! You'll get daily briefs automatically.

See [Getting Started](getting-started) for the full walkthrough, or [Local Development](local-development) if you want to run it on your machine.

---

## Documentation

| Page | Description |
|------|-------------|
| [Features](features) | What Richfolio does — all 10 capabilities explained |
| [Getting Started](getting-started) | Fork, configure, and deploy in 4 steps |
| [Configuration](configuration) | `config.json` field reference, ticker formats, tips |
| [API Keys](api-keys) | Step-by-step setup for Resend, NewsAPI, Gemini, Telegram |
| [Deployment](deployment) | GitHub Actions, secrets, schedule customization |
| [How It Works](how-it-works) | Architecture, data pipeline, analysis logic |
| [Local Development](local-development) | Run locally for testing or contributing |
| [Troubleshooting](troubleshooting) | Common errors and fixes |
| [References](references) | Prior art and design influences |
