"use strict";

/**
 * Canonical list of speculative tickers for portfolio risk calculations.
 * Used by decisionEngine and today queue logic.
 */
const SPECULATIVE_SET = new Set([
  "RKLB",
  "ALAB",
  "PLTR",
  "BE",
  "IREN",
  "ASTS",
  "LUNR",
  "ONDS",
  "IONQ",
  "PL",
  "BKSY",
  "IRDM",
  "GSAT",
]);

/**
 * Returns true if the ticker is classified as a speculative name.
 * @param {string} ticker
 * @returns {boolean}
 */
function isSpeculative(ticker) {
  if (!ticker) return false;
  const symbol = String(ticker).toUpperCase().split(".")[0];
  return SPECULATIVE_SET.has(symbol);
}

/**
 * Compute speculative weight percentage for a set of enriched holdings.
 * @param {Array<{ticker: string, shares: number, price: number}>} holdings
 * @param {number} totalValue - total portfolio value
 * @returns {number} speculative weight as a percentage (0-100)
 */
function getSpeculativeWeightPct(holdings, totalValue) {
  if (!totalValue || totalValue <= 0) return 0;
  const specValue = holdings.reduce((sum, h) => {
    if (!isSpeculative(h.ticker)) return sum;
    return sum + (Number(h.shares) || 0) * (Number(h.price) || 0);
  }, 0);
  return (specValue / totalValue) * 100;
}

module.exports = { isSpeculative, getSpeculativeWeightPct, SPECULATIVE_SET };
