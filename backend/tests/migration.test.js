const test = require("node:test");
const assert = require("node:assert/strict");
const { 
  parsePortfolioHoldings, 
  parseJournalTrades, 
  parseWatchlist 
} = require("../src/services/migrationService");

const samplePortfolioMarkdown = `
# Portfolio Snapshot
## Holdings Snapshot (Synced with Dime! App)

| Ticker | Shares | Avg. Cost (USD) | Snapshot Price | Total Cost | Snapshot Value | P/L % | Snapshot Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **$ASTS** | 2.0859459 | $74.00 | $81.34 | $154.36 | $169.66 | 🟢 +9.91% | **HOLD:** Space Telecom. |
| **$TSM** | 0.3859116 | $399.9880 | $414.90 | $154.36 | $160.11 | 🟢 +3.73% | **HOLD:** AI Backbone. |

## Tactical Watchlist

| Ticker | Sector / Trend | Historical Entry Zone | Historical Target | Strategy / Hypothesis |
| :--- | :--- | :--- | :--- | :--- |
| **$CRDO** | AI Connectivity | ~$165 - $170 | $202.00 | **Rotate In:** Buy on 50MA dip. |
| **$VRT** | AI Thermal | Wait for pullback | TBD | **Wait:** Extended RSI. |
`;

const sampleJournalMarkdown = `
# Elite Trade Journal & Post-Mortem
## Active Trades

| Entry Date | Ticker | Action | Entry | Stop-Loss | Target | R/R | Thesis Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-05-28 | $NFLX | BUY/Add | $85.75 | $79.90 | $95.00 | 1:1.6 | Added $61.50 / 0.7172012 shares; Drop below 50MA | Active |
| 2026-05-28 | $NVDA | BUY | $212.65 | $198.00 | $298.00 | 1:5.8 | New $307.50 / 1.4460381 share AI core starter | Active |
`;

test("parsePortfolioHoldings parses correct tickers and values", () => {
  const result = parsePortfolioHoldings(samplePortfolioMarkdown, "user_123");
  assert.equal(result.length, 2);
  assert.equal(result[0].ticker, "ASTS");
  assert.equal(result[0].shares, 2.0859459);
  assert.equal(result[0].avg_cost, 74.0);
  assert.equal(result[1].ticker, "TSM");
  assert.equal(result[1].shares, 0.3859116);
  assert.equal(result[1].avg_cost, 399.988);
});

test("parseJournalTrades parses correct actions, entry prices, and dynamic shares count", () => {
  const result = parseJournalTrades(sampleJournalMarkdown, "user_123");
  assert.equal(result.length, 2);
  assert.equal(result[0].ticker, "NFLX");
  assert.equal(result[0].type, "BUY");
  assert.equal(result[0].shares, 0.7172012); // Extracted from thesis string!
  assert.equal(result[0].entry, 85.75);
  assert.equal(result[0].status, "OPEN");

  assert.equal(result[1].ticker, "NVDA");
  assert.equal(result[1].type, "BUY");
  assert.equal(result[1].shares, 1.4460381); // Extracted from thesis string!
  assert.equal(result[1].entry, 212.65);
});

test("parseWatchlist parses correct tickers, sectors, and target prices as alert prices", () => {
  const result = parseWatchlist(samplePortfolioMarkdown, "user_123");
  assert.equal(result.length, 2);
  assert.equal(result[0].ticker, "CRDO");
  assert.equal(result[0].sector, "AI Connectivity");
  assert.equal(result[0].alert_price, 202.0); // Target price parsed
  assert.equal(result[1].ticker, "VRT");
  assert.equal(result[1].sector, "AI Thermal");
  assert.equal(result[1].alert_price, null); // TBD parsed as null
});
