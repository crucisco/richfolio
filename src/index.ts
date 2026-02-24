import { allUniqueTickers } from "./config.js";
import { fetchAllPrices } from "./fetchPrices.js";
import { fetchNews } from "./fetchNews.js";
import { runAnalysis } from "./analyze.js";
import { aiAnalyze } from "./aiAnalysis.js";
import { sendBrief } from "./email.js";
import { sendTelegramBrief, sendWeeklyTelegram } from "./telegram.js";
import { sendWeeklyBrief } from "./weeklyEmail.js";

const isWeekly = process.argv.includes("--weekly");

try {
  const tickers = allUniqueTickers();
  const prices = await fetchAllPrices(tickers);
  const report = runAnalysis(prices);

  // Console summary
  console.log("═══ Portfolio Summary ═══");
  console.log(`Holdings value: $${report.totalCurrentValue.toLocaleString()}`);
  if (report.portfolioBeta != null) {
    console.log(`Portfolio beta: ${report.portfolioBeta}`);
  }
  console.log(`Est. annual dividends: $${report.estimatedAnnualDividend.toLocaleString()}`);

  // Log overlap discounts
  for (const item of report.items) {
    if (item.overlapDiscount > 0) {
      console.log(`  ETF overlap: ${item.ticker} -$${item.overlapDiscount.toFixed(0)} (${item.overlapPct.toFixed(0)}%)`);
    }
  }

  if (isWeekly) {
    // Weekly mode: rebalancing report only (no news, no AI)
    console.log("\nMode: weekly rebalancing");
    await sendWeeklyBrief(report);
    try {
      await sendWeeklyTelegram(report);
    } catch (err) {
      console.error("Telegram send failed:", (err as Error).message);
    }
  } else {
    // Daily mode: full brief with news + AI
    const news = await fetchNews(tickers);
    const aiRecs = await aiAnalyze(report, prices, news);

    await sendBrief(report, news, aiRecs);
    try {
      await sendTelegramBrief(report, news, aiRecs);
    } catch (err) {
      console.error("Telegram send failed:", (err as Error).message);
    }
  }

  console.log("\nDone.");
} catch (err) {
  console.error("Fatal error:", (err as Error).message);
  process.exit(1);
}
