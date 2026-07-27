"use strict";

const { default: YahooFinance } = require("yahoo-finance2");
const { fetchSparkline } = require("./marketData");
const { BoundedMap } = require("../common/BoundedMap");
const { isTestMode } = require("../providers/testMode");

const yahooFinance = new YahooFinance();

// Simple sparkline cache (shared across all callers)
const sparklineCache = new BoundedMap(200);
const SPARKLINE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * @typedef {{
 *   regularMarketPrice?: number,
 *   regularMarketChange?: number,
 *   regularMarketChangePercent?: number,
 *   beta?: number,
 *   earningsTimestamp?: Date|number|null
 * }} MarketQuote
 */

async function getSparkline(ticker) {
  const now = Date.now();
  if (sparklineCache.has(ticker)) {
    const cached = sparklineCache.get(ticker);
    if (now - cached.timestamp < SPARKLINE_TTL) return cached.data;
  }
  try {
    const data = await fetchSparkline(ticker, now);
    sparklineCache.set(ticker, { timestamp: now, data });
    return data;
  } catch (e) {
    console.error(`Error fetching sparkline for ${ticker}:`, e.message);
    return [0, 0];
  }
}

/**
 * Enrich a list of items (holdings or watchlists) with live market data.
 * Adds: price, change, changePct, beta, spark, earningsTimestamp.
 */
async function enrichWithMarketData(items) {
  if (isTestMode()) {
    return items.map((item) => ({
      ...item,
      price: item.avg_cost || 100,
      change: 0,
      changePct: 0,
      beta: 1,
      earningsTimestamp: null,
      spark: [100, 100],
    }));
  }
  return Promise.all(
    items.map(async (item) => {
      try {
        const quote = /** @type {MarketQuote} */ (
          await yahooFinance.quote(String(item.ticker))
        );
        const spark = await getSparkline(item.ticker);
        return {
          ...item,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePct: quote.regularMarketChangePercent,
          beta: quote.beta || 1.0,
          earningsTimestamp: quote.earningsTimestamp ?? null,
          spark,
        };
      } catch (e) {
        console.error(
          `Error enriching market data for ${item.ticker}:`,
          e.message,
        );
        return {
          ...item,
          price: null,
          change: null,
          changePct: null,
          beta: 1.0,
          earningsTimestamp: null,
          spark: [],
        };
      }
    }),
  );
}

module.exports = { enrichWithMarketData, getSparkline, yahooFinance };
