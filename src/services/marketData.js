const yahooFinance = require('yahoo-finance2').default;

async function getLivePrice(ticker) {
  const result = await yahooFinance.quote(ticker);
  return result.regularMarketPrice;
}

module.exports = { getLivePrice };
