import { GoogleGenAI, Type } from "@google/genai";
import type { AllocationReport } from "./analyze.js";
import type { QuoteData } from "./fetchPrices.js";
import type { NewsItem } from "./fetchNews.js";
import type { TechnicalData } from "./fetchTechnicals.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── Types ───────────────────────────────────────────────────────────
export interface AIBuyRecommendation {
  ticker: string;
  action: string;
  confidence: number;
  reason: string;
  suggestedBuyValue: number;
  suggestedLimitPrice?: number;
  limitPriceReason?: string;
  valueRating?: string;
  bottomSignal?: string;
  analysisUrl?: string;
}

// ── Schema for structured Gemini output ─────────────────────────────
const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      ticker: {
        type: Type.STRING,
        description: "The ticker symbol",
      },
      action: {
        type: Type.STRING,
        description:
          "One of: STRONG BUY, BUY, HOLD, WAIT",
      },
      confidence: {
        type: Type.NUMBER,
        description: "Confidence level 0-100",
      },
      reason: {
        type: Type.STRING,
        description:
          "1-2 sentence explanation of why this action is recommended",
      },
      suggestedBuyValue: {
        type: Type.NUMBER,
        description:
          "USD amount to invest this time based on the calculated gap amount. For gaps ≤$5000 use full amount; for gaps >$5000 use 60-100% for high conviction or $3000-5000 first tranche for moderate. 0 if HOLD or WAIT.",
      },
      suggestedLimitPrice: {
        type: Type.NUMBER,
        description:
          "For STRONG BUY and BUY: a limit order price below current market based on nearby support (moving average, recent low, round number). 0 if HOLD or WAIT.",
      },
      limitPriceReason: {
        type: Type.STRING,
        description:
          "1 sentence explaining the limit price level, e.g. 'Near 50-day MA support at $218'",
      },
      valueRating: {
        type: Type.STRING,
        description:
          "For US stocks only: A (excellent value), B (good), C (fair), D (overvalued). Empty string for ETFs and crypto.",
      },
      bottomSignal: {
        type: Type.STRING,
        description:
          "Brief bottom/oversold signal if bottom indicators are present (e.g. 'RSI oversold + volume contraction'). Applies to all tickers (stocks, ETFs, crypto). Empty string if no bottom signal.",
      },
    },
    propertyOrdering: [
      "ticker",
      "action",
      "confidence",
      "reason",
      "suggestedBuyValue",
      "suggestedLimitPrice",
      "limitPriceReason",
      "valueRating",
      "bottomSignal",
    ],
  },
};

// ── Build the prompt ────────────────────────────────────────────────
function buildPrompt(
  report: AllocationReport,
  priceData: Record<string, QuoteData>,
  news: Record<string, NewsItem[]>,
  technicals: Record<string, TechnicalData> = {}
): string {
  const tickerSummaries = report.items.map((item) => {
    const quote = priceData[item.ticker];
    const tech = technicals[item.ticker];
    const headlines = (news[item.ticker] || [])
      .map((n) => `"${n.title}" (${n.source})`)
      .join("; ");

    const lines = [
      `${item.ticker}:`,
      `  Price: $${item.price.toFixed(2)}`,
      `  Trailing P/E: ${quote?.trailingPE?.toFixed(1) ?? "N/A"}`,
      `  Forward P/E: ${quote?.forwardPE?.toFixed(1) ?? "N/A"}`,
      `  Avg P/E (historical): ${quote?.avgPE?.toFixed(1) ?? "N/A"}`,
      `  52-week position: ${item.fiftyTwoWeekPercent != null ? (item.fiftyTwoWeekPercent * 100).toFixed(0) + "%" : "N/A"} (0%=at low, 100%=at high)`,
      `  Dividend yield: ${item.dividendYield != null ? (item.dividendYield * 100).toFixed(2) + "%" : "N/A"}`,
      `  Beta: ${item.beta?.toFixed(2) ?? "N/A"}`,
      `  Current allocation: ${item.currentPct.toFixed(1)}% (target: ${item.targetPct.toFixed(1)}%, gap: ${item.gapPct > 0 ? "+" : ""}${item.gapPct.toFixed(1)}%)`,
      item.suggestedBuyValue > 0 ? `  Calculated gap amount: $${item.suggestedBuyValue.toFixed(0)} (full amount needed to close allocation gap)` : null,
      item.overlapDiscount > 0 ? `  ETF overlap discount: -$${item.overlapDiscount.toFixed(0)} (${item.overlapPct.toFixed(0)}% of gap covered by held stocks)` : null,
      `  P/E signal: ${item.peSignal ?? "none"}`,
    ];

    if (tech) {
      lines.push(`  Technical indicators:`);
      lines.push(`    50-day MA: $${tech.sma50} (price ${tech.priceVsSma50 > 0 ? "+" : ""}${tech.priceVsSma50}% vs MA)`);
      if (tech.sma200 != null) {
        lines.push(`    200-day MA: $${tech.sma200} (price ${tech.priceVsSma200! > 0 ? "+" : ""}${tech.priceVsSma200}% vs MA)`);
      }
      lines.push(`    RSI(14): ${tech.rsi14} (>70 overbought, <30 oversold)`);
      lines.push(`    Momentum: ${tech.momentumSignal}${tech.goldenCross ? " (golden cross)" : ""}${tech.deathCross ? " (death cross)" : ""}`);
      // MACD
      if (tech.macd != null && tech.macdSignal != null) {
        lines.push(`    MACD: ${tech.macd} / signal: ${tech.macdSignal} / histogram: ${tech.macdHistogram}${tech.macdCrossover ? ` (${tech.macdCrossover} crossover)` : ""}`);
      }
      // Bollinger Bands
      if (tech.bollMiddle != null) {
        lines.push(`    Bollinger Bands: $${tech.bollLower} / $${tech.bollMiddle} / $${tech.bollUpper} (%B=${tech.bollPercentB}, BW=${tech.bollBandwidth})${tech.bollSqueeze ? " (SQUEEZE — low volatility, breakout likely)" : ""}`);
      }
      lines.push(`    7-day low: $${tech.recentLow7d}, 30-day low: $${tech.recentLow30d}`);
      if (tech.volumeChange7d != null) {
        lines.push(`    Volume change (7d vs 30d avg): ${tech.volumeChange7d > 0 ? "+" : ""}${tech.volumeChange7d}%${tech.volumeChange7d < -20 ? " (contraction)" : tech.volumeChange7d > 50 ? " (surge)" : ""}`);
      }
    }

    // Fundamental data (stocks only — null for ETFs/crypto)
    if (quote && (quote.returnOnEquity != null || quote.debtToEquity != null || quote.freeCashflow != null)) {
      lines.push(`  Fundamentals:`);
      if (quote.returnOnEquity != null) {
        lines.push(`    ROE: ${(quote.returnOnEquity * 100).toFixed(1)}% (>15% is strong)`);
      }
      if (quote.debtToEquity != null) {
        lines.push(`    Debt/Equity: ${quote.debtToEquity.toFixed(1)}% (<50% is conservative)`);
      }
      if (quote.freeCashflow != null && quote.operatingCashflow != null && quote.operatingCashflow > 0) {
        const fcfRatio = (quote.freeCashflow / quote.operatingCashflow) * 100;
        lines.push(`    FCF/Operating CF: ${fcfRatio.toFixed(0)}% (>80% shows strong cash conversion)`);
      }
      if (quote.profitMargins != null) {
        lines.push(`    Profit margin: ${(quote.profitMargins * 100).toFixed(1)}%`);
      }
      if (quote.revenueGrowth != null) {
        lines.push(`    Revenue growth: ${(quote.revenueGrowth * 100).toFixed(1)}% YoY`);
      }
      if (quote.earningsGrowth != null) {
        lines.push(`    Earnings growth: ${(quote.earningsGrowth * 100).toFixed(1)}% YoY`);
      }
      if (quote.targetMeanPrice != null) {
        lines.push(`    Analyst target: $${quote.targetMeanPrice.toFixed(2)} (${quote.recommendationKey ?? "N/A"})`);
      }
    }

    lines.push(headlines ? `  Recent news: ${headlines}` : `  Recent news: none`);

    return lines.filter(Boolean).join("\n");
  });

  return `You are a portfolio analyst. Analyze these tickers and recommend which to buy.

PORTFOLIO CONTEXT:
- Total portfolio value: $${report.totalCurrentValue.toLocaleString()} (target: $50,000)
- Portfolio beta: ${report.portfolioBeta?.toFixed(2) ?? "N/A"}
- Estimated annual dividends: $${report.estimatedAnnualDividend.toFixed(0)}

TICKER DATA:
${tickerSummaries.join("\n\n")}

INSTRUCTIONS:
1. Only recommend tickers that are in the target portfolio (target > 0%).
2. Prioritize tickers that have BOTH allocation need AND good entry price. A small gap with excellent valuation (low P/E, near 52w low) should rank ABOVE a large gap with poor valuation (high P/E, near 52w high).
3. Consider news sentiment — negative news may mean a buying opportunity (contrarian) or genuine risk.
4. For each ticker, assign:
   - action: STRONG BUY (great price + needed), BUY (decent opportunity), HOLD (already near target or poor timing), WAIT (overvalued or risky right now)
   - confidence: 0-100 (how confident you are in this recommendation)
   - reason: 1-2 sentences explaining why
   - suggestedBuyValue: USD amount to invest this time. Use the "Calculated gap amount" as the reference. Rules:
     * If gap ≤ $5,000: suggest the FULL gap amount. Small positions aren't worth splitting — commit fully if the setup is good.
     * If gap > $5,000: decide whether to buy all at once or in a tranche. For high conviction (confidence ≥ 85%, STRONG BUY), suggest at least 60-100% of the gap. For moderate conviction, suggest a first tranche of $3,000-$5,000 and note "first tranche" in the reason.
     * $0 for HOLD/WAIT.
5. Return only tickers with target > 0%. Sort by confidence descending (best buys first).
6. Be concise and specific in reasons. Reference actual numbers (P/E, 52w%, gap).
7. For ETFs with an "ETF overlap discount", the suggested buy has already been reduced. Mention the overlap when it significantly affects the recommendation.
8. For STRONG BUY and BUY tickers, suggest a limit order price slightly below current market. Base it on the nearest support level: 50-day MA, recent 7d/30d low, or a round number. Set suggestedLimitPrice (the price) and limitPriceReason (1 sentence explaining the level). Set both to 0/"" for HOLD/WAIT.
9. Use technical indicators (MA, RSI, MACD, Bollinger Bands, momentum) to refine confidence:
   - A bullish momentum signal with oversold RSI strengthens a buy case. A bearish signal or overbought RSI weakens it.
   - MACD: A bullish crossover (MACD crosses above signal) confirms upward momentum. A positive and rising histogram strengthens conviction. A bearish crossover is a caution signal.
   - Bollinger Bands: %B near 0 (at lower band) suggests oversold/mean-reversion opportunity. %B near 1 (at upper band) suggests overbought. A squeeze (low bandwidth) signals an imminent breakout — wait for direction confirmation from MACD before acting.
   INDICATOR CONFLICT RESOLUTION (follow this hierarchy when indicators disagree):
   a) MACD is best for TRENDING markets — trust it over Bollinger Bands when price is clearly trending (above/below both MAs, strong momentum).
   b) Bollinger Bands are best for RANGE-BOUND markets — trust them over MACD when price is oscillating between bands with no clear trend (flat MAs, neutral momentum).
   c) When MACD says bullish but Bollinger %B > 0.9 (near upper band): reduce confidence by 5-10pts — momentum may be overextended. Prefer a limit order near the middle band.
   d) When Bollinger %B < 0.1 (near lower band) but MACD histogram is still falling: do NOT buy the dip yet — wait for MACD histogram to flatten or turn up. Reduce confidence by 10pts.
   e) When both MACD and Bollinger agree (e.g., bullish crossover + bounce off lower band, or bearish crossover + rejection at upper band): boost confidence by 5-10pts — high-conviction signal.
   f) A Bollinger Squeeze with a simultaneous MACD crossover is the strongest entry signal — boost confidence by 10-15pts.
10. VALUE INVESTING FRAMEWORK (individual stocks only — skip for ETFs and crypto):
   Rate each stock A through D based on these criteria:
   - ROE > 15% (strong profitability)
   - Debt/Equity < 50% (conservative leverage)
   - FCF/Operating CF > 80% (strong cash conversion)
   - Positive earnings growth
   - Current price below analyst target
   Rating: A (excellent, meets 4-5 criteria), B (good, meets 3), C (fair, meets 1-2), D (overvalued, meets 0 or negative growth with high debt).
   If fundamental data is unavailable (ETFs, crypto), set valueRating to empty string.
   Factor the value rating into your confidence: A boosts confidence ~10pts, D reduces ~10pts.
11. BOTTOM-FISHING MODEL (all tickers — stocks, ETFs, and crypto):
   Evaluate these bottom indicators for every ticker:
   - RSI < 30 (oversold)
   - Volume contraction > 20% (selling exhaustion)
   - Price below 200-day MA (deep value territory)
   - Death cross present (may already be priced in — contrarian signal if RSI is very low)
   Thresholds differ by asset type:
   - Crypto (BTC, ETH): flag bottomSignal when 2+ indicators are present. Consider STRONG BUY upgrade when 3+ align.
   - Stocks and ETFs: flag bottomSignal when 3+ indicators are present (stricter — avoids false signals from single dips). Consider STRONG BUY upgrade when all 4 align.
   Set bottomSignal to a brief description (e.g. "RSI oversold + volume contraction + below 200MA").
   If not enough indicators are present, set bottomSignal to empty string.`;
}

// ── Call Gemini ─────────────────────────────────────────────────────
export async function aiAnalyze(
  report: AllocationReport,
  priceData: Record<string, QuoteData>,
  news: Record<string, NewsItem[]>,
  technicals: Record<string, TechnicalData> = {}
): Promise<AIBuyRecommendation[]> {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — skipping AI analysis\n");
    return [];
  }

  console.log("Running AI analysis...");

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildPrompt(report, priceData, news, technicals);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const recommendations = JSON.parse(
      response.text ?? "[]"
    ) as AIBuyRecommendation[];

    // Log summary
    for (const rec of recommendations) {
      if (rec.action === "STRONG BUY" || rec.action === "BUY") {
        console.log(
          `  ${rec.action} ${rec.ticker} (${rec.confidence}%)` +
            (rec.valueRating ? ` [${rec.valueRating}]` : "") +
            (rec.bottomSignal ? ` [${rec.bottomSignal}]` : "") +
            ` — ${rec.reason}` +
            (rec.suggestedLimitPrice ? ` [limit: $${rec.suggestedLimitPrice}]` : "")
        );
      }
    }
    console.log(`AI analysis complete — ${recommendations.length} tickers scored\n`);

    return recommendations;
  } catch (err) {
    console.error("AI analysis failed:", (err as Error).message);
    console.log("Falling back to gap-based recommendations\n");
    return [];
  }
}
