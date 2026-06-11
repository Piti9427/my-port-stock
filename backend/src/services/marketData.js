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
    return cachedThbRate || 34.5;
  }
}

async function getLivePrice(ticker) {
  const result = await yahooFinance.quote(ticker);
  return result.regularMarketPrice;
}

module.exports = { getLivePrice, getUsdThbRate };
