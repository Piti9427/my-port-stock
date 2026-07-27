const { default: YahooFinance } = require("yahoo-finance2");
const { isTestMode } = require("../providers/testMode");
const yahooFinance = new YahooFinance();
const SPARKLINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @typedef {{chart: (ticker: string, options: {
 *   period1: Date, period2: Date, interval: string
 * }) => Promise<{quotes: Array<{close?: number|null}>}>}} ChartClient
 */

let cachedThbRate = null;
let lastThbRateFetch = 0;

async function getUsdThbRate() {
  if (isTestMode()) return 33.69;
  const now = Date.now();
  if (cachedThbRate && now - lastThbRateFetch < 1000 * 60 * 5) {
    return cachedThbRate;
  }
  try {
    const res = await yahooFinance.quote("THB=X");
    cachedThbRate = res.regularMarketPrice;
    lastThbRateFetch = now;
    return cachedThbRate;
  } catch (err) {
    console.error("[MarketData] Error fetching USDTHB rate:", err.message);
    if (cachedThbRate) return cachedThbRate;
    throw err;
  }
}

async function getLivePrice(ticker) {
  let timeoutId;
  try {
    const apiCall = yahooFinance.quote(ticker);

    // SRE best practice: enforce timeout for external API requests
    const timeoutPromise = new Promise(
      (_, reject) =>
        (timeoutId = setTimeout(
          () => reject(new Error("Yahoo Finance API request timed out")),
          6000,
        )),
    );

    const result = await Promise.race([apiCall, timeoutPromise]);
    if (!result || !result.regularMarketPrice) {
      throw new Error("No price data found");
    }
    return result.regularMarketPrice;
  } catch (err) {
    console.error(
      `[MarketData] Error getting price for ${ticker}:`,
      err.message,
    );
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** @param {string} ticker @param {number} [now] @param {ChartClient} [client] */
async function fetchSparkline(
  ticker,
  now = Date.now(),
  client = /** @type {ChartClient} */ (/** @type {unknown} */ (yahooFinance)),
) {
  let timeoutId;
  try {
    const apiCall = client.chart(ticker, {
      period1: new Date(now - SPARKLINE_WINDOW_MS),
      period2: new Date(now),
      interval: "1d",
    });

    const timeoutPromise = new Promise(
      (_, reject) =>
        (timeoutId = setTimeout(
          () => reject(new Error("Yahoo Finance API request timed out")),
          6000,
        )),
    );

    const result = /** @type {{quotes: Array<{close?: number|null}>}} */ (
      await Promise.race([apiCall, timeoutPromise])
    );

    return result.quotes.map((quote) => quote.close).filter(Number.isFinite);
  } catch (err) {
    console.error(
      `[MarketData] Error fetching sparkline for ${ticker}:`,
      err.message,
    );
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

module.exports = { fetchSparkline, getLivePrice, getUsdThbRate };
