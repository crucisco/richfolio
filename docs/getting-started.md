---
title: Getting Started
layout: default
nav_order: 3
---

# Getting Started

Get Richfolio running locally in under 5 minutes.

---

## Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/)
- **npm** — comes with Node.js
- A **GitHub account** — for automated scheduling via Actions (optional for local use)

---

## Fork & Install

**Recommended:** [Fork the repo](https://github.com/furic/richfolio/fork) first so you can use GitHub Actions for automated daily briefs, intraday alerts, and weekly reports. Then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/richfolio.git
cd richfolio
npm install
```

---

## Configure

### Portfolio (`config.json`)

```bash
cp config.example.json config.json
```

Edit `config.json` with your target allocations and current holdings. See [Configuration](configuration) for the full field reference.

### API Keys (`.env`)

```bash
cp .env.example .env
```

Add your API keys. At minimum you need `RESEND_API_KEY` and `RECIPIENT_EMAIL`. See [API Keys](api-keys) for step-by-step instructions for each service.

---

## Run

```bash
# Daily brief — prices + news + AI analysis + email + Telegram
npm run dev

# Intraday alert check — compares vs morning baseline
npm run intraday

# Weekly rebalancing report — prices + allocation drift + email + Telegram
npm run weekly
```

Check your email and Telegram for the results.

---

## What's Next

- [Configuration](configuration) — customize your portfolio allocations
- [API Keys](api-keys) — set up Resend, NewsAPI, Gemini, and Telegram
- [Deployment](deployment) — automate with GitHub Actions
