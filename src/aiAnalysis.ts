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
          "Suggested USD amount to invest in this ticker. 0 if HOLD or WAIT",
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
    },
    propertyOrdering: [
      "ticker",
      "action",
      "confidence",
      "reason",
      "suggestedBuyValue",
      "suggestedLimitPrice",
      "limitPriceReason",
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
      lines.push(`    7-day low: $${tech.recentLow7d}, 30-day low: $${tech.recentLow30d}`);
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
   - suggestedBuyValue: realistic USD amount to invest (based on gap and portfolio size). $0 for HOLD/WAIT.
5. Return only tickers with target > 0%. Sort by confidence descending (best buys first).
6. Be concise and specific in reasons. Reference actual numbers (P/E, 52w%, gap).
7. For ETFs with an "ETF overlap discount", the suggested buy has already been reduced. Mention the overlap when it significantly affects the recommendation.
8. For STRONG BUY and BUY tickers, suggest a limit order price slightly below current market. Base it on the nearest support level: 50-day MA, recent 7d/30d low, or a round number. Set suggestedLimitPrice (the price) and limitPriceReason (1 sentence explaining the level). Set both to 0/"" for HOLD/WAIT.
9. Use technical indicators (MA, RSI, momentum) to refine confidence. A bullish momentum signal with oversold RSI strengthens a buy case. A bearish signal or overbought RSI weakens it.`;
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
          `  ${rec.action} ${rec.ticker} (${rec.confidence}%) — ${rec.reason}` +
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
