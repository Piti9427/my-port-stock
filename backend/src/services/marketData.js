const { default: YahooFinance } = require('yahoo-finance2');
const yahooFinance = new YahooFinance();

let cachedThbRate = null;
let lastThbRateFetch = 0;

async function getUsdThbRate() {
  const now = Date.now();
  if (cachedThbRate && (now - lastThbRateFetch < 1000 * 60 * 5)) {
    return cachedThbRate;
  }
  try {
    const res = await yahooFinance.quote('THB=X');
    cachedThbRate = res.regularMarketPrice;
    lastThbRateFetch = now;
    return cachedThbRate;
  } catch (err) {
    console.error('[MarketData] Error fetching USDTHB rate:', err.message);
    if (cachedThbRate) return cachedThbRate;
    throw err;
  }
}

async function getLivePrice(ticker) {
  let timeoutId;
  try {
    const apiCall = yahooFinance.quote(ticker);
    
    // SRE best practice: enforce timeout for external API requests
    const timeoutPromise = new Promise((_, reject) =>
      timeoutId = setTimeout(() => reject(new Error('Yahoo Finance API request timed out')), 6000)
    );

    const result = await Promise.race([apiCall, timeoutPromise]);
    if (!result || !result.regularMarketPrice) {
      throw new Error('No price data found');
    }
    return result.regularMarketPrice;
  } catch (err) {
    console.error(`[MarketData] Error getting price for ${ticker}:`, err.message);
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

module.exports = { getLivePrice, getUsdThbRate };
