import { Resend } from "resend";
import { recipientEmail } from "./config.js";
import type { AllocationReport } from "./analyze.js";
import type { NewsItem } from "./fetchNews.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Styles ──────────────────────────────────────────────────────────
const S = {
  bg: "#1a1a2e",
  cardBg: "#16213e",
  text: "#e0e0e0",
  muted: "#8a8a9a",
  accent: "#0f3460",
  green: "#2ecc71",
  red: "#e74c3c",
  yellow: "#f39c12",
  blue: "#3498db",
  border: "#2a2a4a",
} as const;

// ── Helpers ─────────────────────────────────────────────────────────
function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function gapColor(gap: number): string {
  if (gap > 1) return S.red;
  if (gap < -1) return S.yellow;
  return S.green;
}

function weekBar(pct: number | null): string {
  if (pct == null) return "—";
  const filled = Math.round(pct * 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `${bar} ${(pct * 100).toFixed(0)}%`;
}

// ── Build HTML ──────────────────────────────────────────────────────
export function buildEmailHtml(
  report: AllocationReport,
  news: Record<string, NewsItem[]>
): string {
  const date = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buys = report.items.filter((i) => i.gapPct > 0.5).slice(0, 5);
  const tickersWithNews = Object.entries(news).filter(([, items]) => items.length > 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${S.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${S.text};font-size:14px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:20px;">

<!-- Header -->
<tr><td style="padding:20px 24px;background:${S.accent};border-radius:8px 8px 0 0;">
  <h1 style="margin:0;font-size:22px;color:#fff;">Richfolio Daily Brief</h1>
  <p style="margin:6px 0 0;color:${S.muted};font-size:13px;">${date}</p>
</td></tr>

<!-- Portfolio Stats -->
<tr><td style="padding:16px 24px;background:${S.cardBg};border-bottom:1px solid ${S.border};">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="text-align:center;padding:8px;">
      <div style="font-size:11px;color:${S.muted};text-transform:uppercase;">Holdings Value</div>
      <div style="font-size:20px;font-weight:bold;color:#fff;">${fmt$(report.totalCurrentValue)}</div>
    </td>
    <td style="text-align:center;padding:8px;">
      <div style="font-size:11px;color:${S.muted};text-transform:uppercase;">Portfolio Beta</div>
      <div style="font-size:20px;font-weight:bold;color:#fff;">${report.portfolioBeta?.toFixed(2) ?? "—"}</div>
    </td>
    <td style="text-align:center;padding:8px;">
      <div style="font-size:11px;color:${S.muted};text-transform:uppercase;">Est. Annual Div</div>
      <div style="font-size:20px;font-weight:bold;color:#fff;">${fmt$(report.estimatedAnnualDividend)}</div>
    </td>
  </tr></table>
</td></tr>

<!-- Priority Buys -->
${buys.length > 0 ? `
<tr><td style="padding:20px 24px 8px;background:${S.cardBg};">
  <h2 style="margin:0;font-size:16px;color:${S.blue};">Priority Buys</h2>
</td></tr>
<tr><td style="padding:0 24px 16px;background:${S.cardBg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
    <tr style="color:${S.muted};font-size:11px;text-transform:uppercase;">
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};">Ticker</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;">Gap</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;">Buy ~Shares</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;">Buy ~Value</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:center;">P/E</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:center;">52w</td>
    </tr>
    ${buys.map((b) => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};font-weight:bold;">${b.ticker}</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;color:${S.red};">${fmtPct(b.gapPct)}</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;">${b.suggestedBuyShares.toFixed(1)}</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:right;">${fmt$(b.suggestedBuyValue)}</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:center;">${b.peSignal ?? "—"}</td>
      <td style="padding:6px 4px;border-bottom:1px solid ${S.border};text-align:center;">${b.weekSignal ?? "—"}</td>
    </tr>`).join("")}
  </table>
</td></tr>
` : ""}

<!-- Full Allocation Table -->
<tr><td style="padding:20px 24px 8px;background:${S.cardBg};border-top:1px solid ${S.border};">
  <h2 style="margin:0;font-size:16px;color:${S.blue};">Allocation Table</h2>
</td></tr>
<tr><td style="padding:0 24px 16px;background:${S.cardBg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;">
    <tr style="color:${S.muted};font-size:10px;text-transform:uppercase;">
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};">Ticker</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Price</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Current</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Target</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Gap</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Div</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">Beta</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};">52w Range</td>
    </tr>
    ${report.items.map((item) => `
    <tr>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};font-weight:bold;">${item.ticker}</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">$${item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">${item.currentPct.toFixed(1)}%</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">${item.targetPct.toFixed(1)}%</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;color:${gapColor(item.gapPct)};">${fmtPct(item.gapPct)}</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">${item.dividendYield != null ? (item.dividendYield * 100).toFixed(1) + "%" : "—"}</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};text-align:right;">${item.beta?.toFixed(2) ?? "—"}</td>
      <td style="padding:5px 3px;border-bottom:1px solid ${S.border};font-family:monospace;font-size:11px;">${weekBar(item.fiftyTwoWeekPercent)}</td>
    </tr>`).join("")}
  </table>
</td></tr>

<!-- News Digest -->
${tickersWithNews.length > 0 ? `
<tr><td style="padding:20px 24px 8px;background:${S.cardBg};border-top:1px solid ${S.border};">
  <h2 style="margin:0;font-size:16px;color:${S.blue};">News Digest</h2>
</td></tr>
<tr><td style="padding:0 24px 16px;background:${S.cardBg};">
  ${tickersWithNews.map(([ticker, articles]) => `
  <div style="margin-bottom:12px;">
    <div style="font-weight:bold;font-size:13px;color:#fff;margin-bottom:4px;">${ticker}</div>
    ${articles.map((a) => `
    <div style="margin-left:12px;margin-bottom:4px;font-size:12px;">
      <a href="${a.url}" style="color:${S.blue};text-decoration:none;">→ ${a.title}</a>
      <span style="color:${S.muted};font-size:11px;"> — ${a.source}</span>
    </div>`).join("")}
  </div>`).join("")}
</td></tr>
` : ""}

<!-- Footer -->
<tr><td style="padding:16px 24px;background:${S.accent};border-radius:0 0 8px 8px;text-align:center;">
  <p style="margin:0;font-size:11px;color:${S.muted};">
    Edit config.json to update your portfolio · Powered by Richfolio
  </p>
</td></tr>

</table>
</body>
</html>`;
}

// ── Send email ──────────────────────────────────────────────────────
export async function sendBrief(
  report: AllocationReport,
  news: Record<string, NewsItem[]>
): Promise<void> {
  const html = buildEmailHtml(report, news);

  const { error } = await resend.emails.send({
    from: "Richfolio <onboarding@resend.dev>",
    to: recipientEmail,
    subject: `Richfolio Brief — ${new Date().toLocaleDateString("en-AU")}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`Email sent to ${recipientEmail}`);
}
