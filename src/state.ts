import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AIBuyRecommendation } from "./aiAnalysis.js";

// ── Types ───────────────────────────────────────────────────────────
export interface MorningBaseline {
  timestamp: string;
  date: string;
  recommendations: AIBuyRecommendation[];
  prices: Record<string, number>;
}

export interface ReasoningSnapshot {
  date: string;
  ticker: string;
  /** Which AI produced this snapshot. Required from schema v2 onwards. */
  providerId: string;
  action: string;
  confidence: number;
  reason: string;
  price: number;
}

export interface ReasoningHistory {
  /** Schema version. Bumped from 1 → 2 when per-provider attribution was added. */
  version?: number;
  snapshots: Record<string, ReasoningSnapshot[]>; // date → array of per-ticker-per-provider snapshots
}

const REASONING_SCHEMA_VERSION = 2;

// ── Paths ───────────────────────────────────────────────────────────
const STATE_DIR = resolve(process.cwd(), "state");
const BASELINE_FILE = resolve(STATE_DIR, "morning-baseline.json");
const REASONING_FILE = resolve(STATE_DIR, "reasoning-history.json");
const MAX_REASONING_DAYS = 7;

// ── Save / Load ─────────────────────────────────────────────────────
export function saveBaseline(baseline: MorningBaseline): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(`Morning baseline saved (${baseline.recommendations.length} recs)`);
}

export function loadBaseline(): MorningBaseline | null {
  try {
    const raw = readFileSync(BASELINE_FILE, "utf-8");
    const data = JSON.parse(raw) as MorningBaseline;

    // Check baseline age instead of date string — works across any timezone
    // (daily at 10pm UTC + intraday at 0-6am UTC straddles midnight in many TZs)
    const ageHours = (Date.now() - new Date(data.timestamp).getTime()) / (1000 * 60 * 60);
    if (ageHours > 18) {
      console.log(`Baseline is ${ageHours.toFixed(1)}h old (max 18h) — skipping comparison`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// ── Reasoning History ──────────────────────────────────────────────
// Per-provider attribution: each snapshot records which AI produced it, so
// in multi-provider mode each AI can be shown its own historical conviction
// trend (and not be confused by another AI's contradictions). The orchestrator
// ensures rec.providers is populated (length ≥1) before calling here.
export function saveReasoningHistory(
  recs: AIBuyRecommendation[],
  prices: Record<string, number>,
): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const history = loadReasoningHistory();

  const todaysSnapshots: ReasoningSnapshot[] = [];
  for (const rec of recs) {
    const price = prices[rec.ticker] ?? 0;
    if (rec.providers && rec.providers.length > 0) {
      for (const p of rec.providers) {
        todaysSnapshots.push({
          date: today,
          ticker: rec.ticker,
          providerId: p.providerId,
          action: p.action,
          confidence: p.confidence,
          reason: p.reason,
          price,
        });
      }
    } else {
      // Defensive: if no providers metadata, still save with an "unknown"
      // attribution. This path shouldn't fire from the orchestrator, but
      // direct callers (tests, refresh mode) might bypass.
      todaysSnapshots.push({
        date: today,
        ticker: rec.ticker,
        providerId: "unknown",
        action: rec.action,
        confidence: rec.confidence,
        reason: rec.reason,
        price,
      });
    }
  }
  history.snapshots[today] = todaysSnapshots;
  history.version = REASONING_SCHEMA_VERSION;

  // Prune old entries beyond MAX_REASONING_DAYS
  const dates = Object.keys(history.snapshots).sort();
  while (dates.length > MAX_REASONING_DAYS) {
    const oldest = dates.shift()!;
    delete history.snapshots[oldest];
  }

  writeFileSync(REASONING_FILE, JSON.stringify(history, null, 2));
  console.log(
    `Reasoning history saved (${dates.length} days, ${todaysSnapshots.length} snapshots)`,
  );
}

export function loadReasoningHistory(): ReasoningHistory {
  try {
    const raw = readFileSync(REASONING_FILE, "utf-8");
    const data = JSON.parse(raw) as ReasoningHistory;
    // Schema migration: pre-v2 history has no providerId on snapshots.
    // Per design decision, we clear on upgrade (7 days isn't precious data).
    if ((data.version ?? 1) < REASONING_SCHEMA_VERSION) {
      console.log(
        `Reasoning history schema v${data.version ?? 1} → v${REASONING_SCHEMA_VERSION}; clearing legacy snapshots`,
      );
      return { version: REASONING_SCHEMA_VERSION, snapshots: {} };
    }
    return data;
  } catch {
    return { version: REASONING_SCHEMA_VERSION, snapshots: {} };
  }
}

/**
 * Format reasoning history as a prompt section for the AI.
 * Shows per-ticker conviction trend over the last 7 days.
 *
 * Pass `providerId` to filter to just that provider's snapshots — each AI
 * should see only its own past convictions, not another AI's. If `providerId`
 * is undefined (e.g. legacy callers), all snapshots are flattened together.
 */
export function formatReasoningContext(history: ReasoningHistory, providerId?: string): string {
  const dates = Object.keys(history.snapshots).sort();
  if (dates.length === 0) return "";

  // Collect per-ticker history across days, filtered by providerId if given
  const tickerHistory: Record<
    string,
    { date: string; action: string; confidence: number; price: number }[]
  > = {};
  for (const date of dates) {
    for (const snap of history.snapshots[date]) {
      if (providerId && snap.providerId !== providerId) continue;
      if (!tickerHistory[snap.ticker]) tickerHistory[snap.ticker] = [];
      tickerHistory[snap.ticker].push({
        date,
        action: snap.action,
        confidence: snap.confidence,
        price: snap.price,
      });
    }
  }

  // Only show tickers with 2+ days of history
  const lines: string[] = ["HISTORICAL CONTEXT (AI conviction over last 7 days):"];
  for (const [ticker, entries] of Object.entries(tickerHistory)) {
    if (entries.length < 2) continue;
    const trend = entries
      .map((e) => `${e.action} ${e.confidence}% ($${e.price.toFixed(0)})`)
      .join(" → ");
    // Determine trend direction
    const first = entries[0].confidence;
    const last = entries[entries.length - 1].confidence;
    const direction =
      last > first + 5 ? "— strengthening" : last < first - 5 ? "— weakening" : "— stable";
    lines.push(`  ${ticker}: ${trend} ${direction}`);
  }

  if (lines.length === 1) return ""; // No multi-day history
  lines.push("");
  lines.push(
    "Use this to identify conviction momentum. Strengthening 3+ days confirms the trend. Weakening suggests caution.",
  );
  return lines.join("\n");
}
