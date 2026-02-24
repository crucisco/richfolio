import { allUniqueTickers } from "./config.js";
import { fetchAllPrices } from "./fetchPrices.js";
import { fetchNews } from "./fetchNews.js";
import { runAnalysis } from "./analyze.js";
import { sendBrief } from "./email.js";

try {
  const tickers = allUniqueTickers();

  const prices = await fetchAllPrices(tickers);
  const news = await fetchNews(tickers);
  const report = runAnalysis(prices);

  // Console summary
  console.log("═══ Portfolio Summary ═══");
  console.log(`Holdings value: $${report.totalCurrentValue.toLocaleString()}`);
  if (report.portfolioBeta != null) {
    console.log(`Portfolio beta: ${report.portfolioBeta}`);
  }
  console.log(`Est. annual dividends: $${report.estimatedAnnualDividend.toLocaleString()}`);

  const buys = report.items.filter((i) => i.gapPct > 0.5).slice(0, 5);
  if (buys.length > 0) {
    console.log("\nTop buys:");
    for (const b of buys) {
      console.log(`  ${b.ticker}: gap ${b.gapPct.toFixed(1)}% → buy ~${b.suggestedBuyShares.toFixed(1)} shares ($${b.suggestedBuyValue.toFixed(0)})`);
    }
  }

  // Send email
  await sendBrief(report, news);
  console.log("\nDone.");
} catch (err) {
  console.error("Fatal error:", (err as Error).message);
  process.exit(1);
}
