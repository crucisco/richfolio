import type { AIBuyRecommendation } from "./aiAnalysis.js";
import type { MorningBaseline } from "./state.js";
import type { IntradayAlertConfig } from "./config.js";

// ── Types ───────────────────────────────────────────────────────────
export interface IntradayAlert {
  ticker: string;
  morningAction: string;
  morningConfidence: number;
  currentAction: string;
  currentConfidence: number;
  confidenceDelta: number;
  reason: string;
  suggestedBuyValue: number;
  suggestedLimitPrice?: number;
  limitPriceReason?: string;
  triggerType: "confidence_increase" | "action_upgrade" | "new_signal";
  currentPrice: number;
  morningPrice: number;
  priceDelta: number;
}

// ── Action ranking for upgrade detection ────────────────────────────
const ACTION_RANK: Record<string, number> = {
  WAIT: 0,
  HOLD: 1,
  BUY: 2,
  "STRONG BUY": 3,
};

// ── Compare current AI recs against morning baseline ────────────────
export function compareWithBaseline(
  currentRecs: AIBuyRecommendation[],
  currentPrices: Record<string, number>,
  baseline: MorningBaseline,
  config: IntradayAlertConfig
): IntradayAlert[] {
  const alerts: IntradayAlert[] = [];

  const baselineMap = new Map(
    baseline.recommendations.map((r) => [r.ticker, r])
  );

  for (const rec of currentRecs) {
    if (!config.onlyAlertForActions.includes(rec.action)) continue;

    const morning = baselineMap.get(rec.ticker);
    const morningAction = morning?.action ?? "N/A";
    const morningConfidence = morning?.confidence ?? 0;
    const morningPrice = baseline.prices[rec.ticker] ?? 0;
    const currentPrice = currentPrices[rec.ticker] ?? 0;

    const confidenceDelta = rec.confidence - morningConfidence;
    const currentRank = ACTION_RANK[rec.action] ?? 0;
    const morningRank = ACTION_RANK[morningAction] ?? 0;
    const actionUpgraded = currentRank > morningRank;

    let triggerType: IntradayAlert["triggerType"] | null = null;

    // Trigger 1: Confidence increased beyond threshold AND meets minimum
    if (
      confidenceDelta >= config.confidenceIncreaseThreshold &&
      rec.confidence >= config.minConfidenceToAlert
    ) {
      triggerType = "confidence_increase";
    }

    // Trigger 2: Action upgraded (e.g., BUY → STRONG BUY)
    if (
      config.actionUpgradesAlert &&
      actionUpgraded &&
      rec.confidence >= config.minConfidenceToAlert
    ) {
      triggerType = "action_upgrade";
    }

    // Trigger 3: New signal — ticker wasn't in morning recs at all
    if (!morning && rec.confidence >= config.minConfidenceToAlert) {
      triggerType = "new_signal";
    }

    if (triggerType) {
      alerts.push({
        ticker: rec.ticker,
        morningAction,
        morningConfidence,
        currentAction: rec.action,
        currentConfidence: rec.confidence,
        confidenceDelta,
        reason: rec.reason,
        suggestedBuyValue: rec.suggestedBuyValue,
        suggestedLimitPrice: rec.suggestedLimitPrice,
        limitPriceReason: rec.limitPriceReason,
        triggerType,
        currentPrice,
        morningPrice,
        priceDelta:
          morningPrice > 0
            ? ((currentPrice - morningPrice) / morningPrice) * 100
            : 0,
      });
    }
  }

  // Strongest signals first
  alerts.sort((a, b) => b.currentConfidence - a.currentConfidence);

  return alerts;
}
