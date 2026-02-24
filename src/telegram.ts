import type { AllocationReport } from "./analyze.js";
import type { AIBuyRecommendation } from "./aiAnalysis.js";
import type { NewsItem } from "./fetchNews.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const MAX_MESSAGE_LENGTH = 4096;

// ── Helpers ─────────────────────────────────────────────────────────
function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function actionEmoji(action: string): string {
  switch (action) {
    case "STRONG BUY": return "🟢";
    case "BUY": return "🔵";
    case "HOLD": return "⚪";
    case "WAIT": return "🔴";
    default: return "⚪";
  }
}

// ── Build message ───────────────────────────────────────────────────
function buildMessage(
  report: AllocationReport,
  news: Record<string, NewsItem[]>,
  aiRecs: AIBuyRecommendation[]
): string {
  const date = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [];

  // Header
  lines.push(`📊 <b>Richfolio Brief</b> — ${date}`);
  lines.push("");
  lines.push(
    `💰 <b>${fmt$(report.totalCurrentValue)}</b>` +
    (report.portfolioBeta != null ? `  |  β ${report.portfolioBeta.toFixed(2)}` : "") +
    `  |  📈 ${fmt$(report.estimatedAnnualDividend)}/yr div`
  );
  lines.push("");

  // AI Recommendations or fallback
  if (aiRecs.length > 0) {
    const actionable = aiRecs.filter(r => r.action === "STRONG BUY" || r.action === "BUY").slice(0, 5);
    if (actionable.length > 0) {
      lines.push("🤖 <b>AI Recommendations:</b>");
      for (const rec of actionable) {
        lines.push(
          `${actionEmoji(rec.action)} <b>${rec.action} ${rec.ticker}</b> (${rec.confidence}%)` +
          (rec.suggestedBuyValue > 0 ? ` — ${fmt$(rec.suggestedBuyValue)}` : "")
        );
        lines.push(`   <i>${rec.reason}</i>`);
      }

      const holds = aiRecs.filter(r => r.action === "HOLD" || r.action === "WAIT");
      if (holds.length > 0) {
        lines.push("");
        lines.push(
          `⏸ Hold/Wait: ${holds.map(r => r.ticker).join(", ")}`
        );
      }
    } else {
      lines.push("🤖 No strong buy opportunities identified today.");
    }
  } else {
    // Fallback: gap-based top buys
    const buys = report.items.filter(i => i.gapPct > 0.5).slice(0, 5);
    if (buys.length > 0) {
      lines.push("📋 <b>Priority Buys (by gap):</b>");
      for (const b of buys) {
        lines.push(
          `• <b>${b.ticker}</b> — gap +${b.gapPct.toFixed(1)}% — buy ~${fmt$(b.suggestedBuyValue)}` +
          (b.overlapDiscount > 0 ? ` (−${fmt$(b.overlapDiscount)} overlap)` : "")
        );
      }
    }
  }

  // News section
  const tickersWithNews = Object.entries(news).filter(([, items]) => items.length > 0);
  if (tickersWithNews.length > 0) {
    lines.push("");
    lines.push("📰 <b>News:</b>");

    const currentLength = lines.join("\n").length;
    const budgetForNews = MAX_MESSAGE_LENGTH - currentLength - 50; // reserve some buffer

    let newsText = "";
    for (const [ticker, articles] of tickersWithNews) {
      const headline = articles[0]; // 1 per ticker
      const line = `<b>${ticker}:</b> <a href="${headline.url}">${escapeHtml(headline.title)}</a>\n`;
      if (newsText.length + line.length > budgetForNews) break;
      newsText += line;
    }
    lines.push(newsText.trim());
  }

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Send to Telegram ────────────────────────────────────────────────
export async function sendTelegramBrief(
  report: AllocationReport,
  news: Record<string, NewsItem[]>,
  aiRecs: AIBuyRecommendation[] = []
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram\n");
    return;
  }

  const message = buildMessage(report, news, aiRecs);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${body}`);
  }

  console.log("Telegram message sent");
}

// ── Weekly Telegram ─────────────────────────────────────────────────
function buildWeeklyMessage(report: AllocationReport): string {
  const date = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [];

  lines.push(`📊 <b>Weekly Rebalancing Report</b> — ${date}`);
  lines.push("");
  lines.push(
    `💰 <b>${fmt$(report.totalCurrentValue)}</b>` +
    (report.portfolioBeta != null ? `  |  β ${report.portfolioBeta.toFixed(2)}` : "") +
    `  |  📈 ${fmt$(report.estimatedAnnualDividend)}/yr div`
  );

  // Underweight (buy)
  const buys = report.items.filter(i => i.gapPct > 0.5);
  if (buys.length > 0) {
    lines.push("");
    lines.push("🔴 <b>Underweight — Buy:</b>");
    for (const b of buys) {
      lines.push(
        `• <b>${b.ticker}</b>  ${b.currentPct.toFixed(1)}% → ${b.targetPct.toFixed(1)}%  gap +${b.gapPct.toFixed(1)}%  ~${fmt$(b.suggestedBuyValue)}` +
        (b.overlapDiscount > 0 ? ` (−${fmt$(b.overlapDiscount)} overlap)` : "")
      );
    }
  }

  // Overweight (sell/trim)
  const sells = report.items.filter(i => i.gapPct < -1);
  if (sells.length > 0) {
    lines.push("");
    lines.push("🟡 <b>Overweight — Consider Trimming:</b>");
    for (const s of sells) {
      lines.push(
        `• <b>${s.ticker}</b>  ${s.currentPct.toFixed(1)}% → ${s.targetPct.toFixed(1)}%  gap ${s.gapPct.toFixed(1)}%`
      );
    }
  }

  // On target
  const onTarget = report.items.filter(i => Math.abs(i.gapPct) <= 1 && i.targetPct > 0);
  if (onTarget.length > 0) {
    lines.push("");
    lines.push(`✅ On target: ${onTarget.map(i => i.ticker).join(", ")}`);
  }

  return lines.join("\n");
}

export async function sendWeeklyTelegram(
  report: AllocationReport
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram\n");
    return;
  }

  const message = buildWeeklyMessage(report);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${body}`);
  }

  console.log("Weekly Telegram message sent");
}
