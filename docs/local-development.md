---
title: Local Development
layout: default
nav_order: 9
---

# Local Development

Run Richfolio locally for testing, debugging, or contributing.

---

## Requirements

- **Node.js 22+** — [Download](https://nodejs.org/)
- **npm** — comes with Node.js

---

## Install

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

# Re-analyze single ticker with after-hours price
npm run refresh -- SMH

# Type-check without emitting
npx tsc --noEmit
```

Check your email and Telegram for the results.
