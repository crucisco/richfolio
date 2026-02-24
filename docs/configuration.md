---
title: Configuration
layout: default
nav_order: 4
---

# Configuration

Richfolio uses a single `config.json` file for all portfolio data. This file is gitignored — your portfolio stays private.

---

## Setup

```bash
cp config.example.json config.json
```

## Example

```json
{
  "targetPortfolio": {
    "VOO": 20,
    "QQQ": 15,
    "GLD": 10,
    "BSV": 20,
    "SMH": 5,
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

---

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `targetPortfolio` | Yes | Target allocation percentages. Keys are ticker symbols, values are percentages that should sum to ~100%. |
| `currentHoldings` | Yes | Number of shares you currently own. Can include stocks not in your target (e.g., AAPL for ETF overlap detection). |
| `totalPortfolioValueUSD` | Yes | Your estimated total portfolio value in USD. Used for allocation math when your actual holdings are smaller than the target. |

---

## Ticker Formats

| Type | Format | Examples |
|------|--------|----------|
| US stocks/ETFs | Standard symbol | `AAPL`, `VOO`, `QQQ`, `SMH` |
| Crypto | Short name | `BTC`, `ETH` (auto-converted to `BTC-USD`, `ETH-USD`) |
| International | Yahoo Finance symbol | `0700.HK` (Tencent), `TM` (Toyota) |

---

## Tips

- **Target percentages** should add up to 100%. If they don't, gap calculations still work but may suggest larger or smaller buys.

- **Holdings outside your target** are tracked for ETF overlap detection. For example, holding AAPL reduces the buy priority for ETFs that contain AAPL (like VOO or QQQ).

- **Fractional shares** are supported — useful for crypto (`"BTC": 0.000188`) or brokers that support fractional stock purchases.

- **Portfolio value** uses the higher of your actual holdings value or the configured estimate. This keeps gap calculations meaningful when you're still building toward your target allocation.

---

## Updating

When your holdings change:

- **Locally**: Edit `config.json` directly
- **GitHub Actions**: Update the `CONFIG_JSON` secret with the new JSON content (see [Deployment](deployment))
