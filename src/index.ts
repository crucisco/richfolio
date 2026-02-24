import { allUniqueTickers } from "./config.js";
import { fetchAllPrices } from "./fetchPrices.js";
import { fetchNews } from "./fetchNews.js";
import { runAnalysis } from "./analyze.js";
import { aiAnalyze } from "./aiAnalysis.js";
import { sendBrief } from "./email.js";

try {
  const tickers = allUniqueTickers();

  const prices = await fetchAllPrices(tickers);
  const news = await fetchNews(tickers);
  const report = runAnalysis(prices);
  const aiRecs = await aiAnalyze(report, prices, news);

  // Console summary
  console.log("═══ Portfolio Summary ═══");
  console.log(`Holdings value: $${report.totalCurrentValue.toLocaleString()}`);
  if (report.portfolioBeta != null) {
    console.log(`Portfolio beta: ${report.portfolioBeta}`);
  }
  console.log(`Est. annual dividends: $${report.estimatedAnnualDividend.toLocaleString()}`);

  // Send email
  await sendBrief(report, news, aiRecs);
  console.log("\nDone.");
} catch (err) {
  console.error("Fatal error:", (err as Error).message);
  process.exit(1);
}
