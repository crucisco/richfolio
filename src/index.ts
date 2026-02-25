import { allUniqueTickers, intradayConfig } from "./config.js";
import { fetchAllPrices } from "./fetchPrices.js";
import { fetchTechnicals } from "./fetchTechnicals.js";
import { fetchNews } from "./fetchNews.js";
import type { NewsItem } from "./fetchNews.js";
import { runAnalysis } from "./analyze.js";
import { aiAnalyze } from "./aiAnalysis.js";
import { sendBrief } from "./email.js";
import { sendTelegramBrief, sendWeeklyTelegram, sendIntradayTelegram } from "./telegram.js";
import { sendWeeklyBrief } from "./weeklyEmail.js";
import { saveBaseline, loadBaseline } from "./state.js";
import { compareWithBaseline } from "./intradayCompare.js";
import { sendIntradayAlert } from "./intradayEmail.js";

const isWeekly = process.argv.includes("--weekly");
const isIntraday = process.argv.includes("--intraday");

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
  } else if (isIntraday) {
    // Intraday mode: compare against morning baseline, alert on strengthening
    console.log("\nMode: intraday check");

    if (!intradayConfig.enabled) {
      console.log("Intraday alerts disabled in config — exiting");
      process.exit(0);
    }

    const baseline = loadBaseline();
    if (!baseline) {
      console.log("No morning baseline found for today — skipping intraday check");
      process.exit(0);
    }

    // Run AI analysis WITHOUT news (saves NewsAPI quota), WITH technicals
    const emptyNews: Record<string, NewsItem[]> = {};
    const technicals = await fetchTechnicals(tickers);
    const aiRecs = await aiAnalyze(report, prices, emptyNews, technicals);

    if (aiRecs.length === 0) {
      console.log("AI analysis returned no results — skipping comparison");
      process.exit(0);
    }

    // Build price map for comparison
    const priceMap: Record<string, number> = {};
    for (const item of report.items) {
      priceMap[item.ticker] = item.price;
    }

    const alerts = compareWithBaseline(aiRecs, priceMap, baseline, intradayConfig);

    if (alerts.length === 0) {
      console.log("No signals strengthened — no alert needed");
    } else {
      console.log(`\n${alerts.length} signal(s) strengthened:`);
      for (const a of alerts) {
        console.log(
          `  ${a.ticker}: ${a.morningAction} ${a.morningConfidence}% → ${a.currentAction} ${a.currentConfidence}% (${a.triggerType})`
        );
      }

      await sendIntradayAlert(alerts);
      try {
        await sendIntradayTelegram(alerts);
      } catch (err) {
        console.error("Telegram send failed:", (err as Error).message);
      }
    }
  } else {
    // Daily mode: full brief with news + AI + technicals
    const [news, technicals] = await Promise.all([
      fetchNews(tickers),
      fetchTechnicals(tickers),
    ]);
    const aiRecs = await aiAnalyze(report, prices, news, technicals);

    // Save morning baseline for intraday comparison
    if (aiRecs.length > 0) {
      const priceMap: Record<string, number> = {};
      for (const item of report.items) {
        priceMap[item.ticker] = item.price;
      }
      saveBaseline({
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        recommendations: aiRecs,
        prices: priceMap,
      });
    }

    await sendBrief(report, news, aiRecs, technicals);
    try {
      await sendTelegramBrief(report, news, aiRecs, technicals);
    } catch (err) {
      console.error("Telegram send failed:", (err as Error).message);
    }
  }

  console.log("\nDone.");
} catch (err) {
  console.error("Fatal error:", (err as Error).stack ?? (err as Error).message);
  process.exit(1);
}
