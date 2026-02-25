import { Resend } from "resend";
import { recipientEmail } from "./config.js";
import type { IntradayAlert } from "./intradayCompare.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Styles (matches email.ts dark theme) ────────────────────────────
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
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function actionBadge(action: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    "STRONG BUY": { bg: "#2ecc71", text: "#000" },
    BUY: { bg: "#3498db", text: "#fff" },
    HOLD: { bg: "#95a5a6", text: "#fff" },
    WAIT: { bg: "#e74c3c", text: "#fff" },
  };
  const c = colors[action] || colors.HOLD;
  return `<span style="background:${c.bg};color:${c.text};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${action}</span>`;
}

function triggerLabel(type: IntradayAlert["triggerType"]): string {
  switch (type) {
    case "action_upgrade":
      return "Action Upgraded";
    case "new_signal":
      return "New Signal";
    case "confidence_increase":
      return "Confidence Increased";
  }
}

function priceDeltaHtml(delta: number): string {
  if (Math.abs(delta) < 0.01) return "";
  const color = delta < 0 ? S.green : S.red; // price drop = green (buying opp)
  const sign = delta > 0 ? "+" : "";
  return `<span style="color:${color};font-size:12px;">Price ${sign}${delta.toFixed(1)}% since morning</span>`;
}

// ── Build HTML ──────────────────────────────────────────────────────
export function buildIntradayEmailHtml(alerts: IntradayAlert[]): string {
  const time = new Date().toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const alertRows = alerts
    .map(
      (a) => `
  <div style="padding:14px 0;border-bottom:1px solid ${S.border};">
    <div style="margin-bottom:6px;">
      <span style="font-weight:bold;font-size:16px;color:#fff;">${a.ticker}</span>
      &nbsp;${actionBadge(a.currentAction)}
      <span style="float:right;font-size:11px;color:${S.yellow};text-transform:uppercase;">${triggerLabel(a.triggerType)}</span>
    </div>
    <div style="margin-bottom:6px;">
      <span style="color:${S.muted};font-size:12px;">Morning:</span>
      <span style="font-size:12px;color:${S.text};">${a.morningAction} ${a.morningConfidence}%</span>
      <span style="color:${S.muted};font-size:12px;"> → </span>
      <span style="font-size:13px;font-weight:bold;color:#fff;">${a.currentAction} ${a.currentConfidence}%</span>
      <span style="color:${S.green};font-size:12px;"> (+${a.confidenceDelta})</span>
    </div>
    ${priceDeltaHtml(a.priceDelta) ? `<div style="margin-bottom:6px;">${priceDeltaHtml(a.priceDelta)}</div>` : ""}
    <div style="font-size:12px;color:${S.text};margin-bottom:4px;">${a.reason}</div>
    ${a.suggestedBuyValue > 0 ? `<div style="font-size:13px;font-weight:bold;color:#fff;">Suggested: ${fmt$(a.suggestedBuyValue)}</div>` : ""}
    ${a.currentAction === "STRONG BUY" && a.suggestedLimitPrice && a.suggestedLimitPrice > 0 ? `<div style="font-size:12px;color:${S.green};margin-top:4px;">Limit order: $${a.suggestedLimitPrice.toFixed(2)}${a.limitPriceReason ? ` — ${a.limitPriceReason}` : ""}</div>` : ""}
  </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${S.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${S.text};font-size:14px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:20px;">

<!-- Header -->
<tr><td style="padding:20px 24px;background:${S.accent};border-radius:8px 8px 0 0;">
  <h1 style="margin:0;font-size:20px;color:${S.yellow};">Intraday Alert</h1>
  <p style="margin:6px 0 0;color:${S.muted};font-size:13px;">${date} at ${time}</p>
  <p style="margin:4px 0 0;color:${S.text};font-size:12px;">${alerts.length} signal${alerts.length > 1 ? "s" : ""} strengthened since morning brief</p>
</td></tr>

<!-- Alerts -->
<tr><td style="padding:8px 24px 16px;background:${S.cardBg};">
  ${alertRows}
</td></tr>

<!-- Footer -->
<tr><td style="padding:12px 24px;background:${S.accent};border-radius:0 0 8px 8px;text-align:center;">
  <p style="margin:0;font-size:11px;color:${S.muted};">
    Intraday check · Powered by Richfolio
  </p>
</td></tr>

</table>
</body>
</html>`;
}

// ── Send email ──────────────────────────────────────────────────────
export async function sendIntradayAlert(
  alerts: IntradayAlert[]
): Promise<void> {
  const html = buildIntradayEmailHtml(alerts);
  const tickers = alerts.map((a) => a.ticker).join(", ");

  const { error } = await resend.emails.send({
    from: "Richfolio <onboarding@resend.dev>",
    to: recipientEmail,
    subject: `Richfolio Alert: ${tickers} signal strengthened`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`Intraday alert email sent to ${recipientEmail}`);
}
