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

// ── Paths ───────────────────────────────────────────────────────────
const STATE_DIR = resolve(process.cwd(), "state");
const BASELINE_FILE = resolve(STATE_DIR, "morning-baseline.json");

// ── Save / Load ─────────────────────────────────────────────────────
export function saveBaseline(baseline: MorningBaseline): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(
    `Morning baseline saved (${baseline.recommendations.length} recs)`
  );
}

export function loadBaseline(): MorningBaseline | null {
  try {
    const raw = readFileSync(BASELINE_FILE, "utf-8");
    const data = JSON.parse(raw) as MorningBaseline;

    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) {
      console.log(
        `Baseline is from ${data.date}, not today (${today}) — skipping comparison`
      );
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
