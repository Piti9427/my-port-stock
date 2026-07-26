/**
 * Shared currency and number formatting utilities.
 *
 * Currency logic:
 * - Tickers ending in `.BK` are Thai stocks → prefix with `฿`
 * - All other tickers are USD stocks → prefix with `$`
 * - When no ticker is provided, defaults to THB (`฿`) for portfolio-level aggregates
 *   since the portfolio risk budget is denominated in THB.
 */

/**
 * Determine the currency symbol for a ticker.
 * @param {string} [ticker] - Stock ticker symbol
 * @returns {'$' | '฿'}
 */
export function currencySymbol(ticker) {
  if (!ticker) return '฿';
  return ticker.endsWith('.BK') ? '฿' : '$';
}

/**
 * Format a numeric value as currency with the correct symbol for the ticker.
 *
 * @param {number|string} value - The numeric value to format
 * @param {string} [ticker] - Stock ticker to determine currency symbol
 * @param {object} [options]
 * @param {boolean} [options.signed=false] - If true, prefix with +/- sign
 * @param {number} [options.decimals=2] - Number of decimal places
 * @returns {string}
 */
export function formatCurrency(value, ticker, { signed = false, decimals = 2 } = {}) {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';

  const symbol = currencySymbol(ticker);
  const absValue = Math.abs(numeric).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (signed) {
    const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
    return `${sign}${symbol}${absValue}`;
  }
  const sign = numeric < 0 ? '-' : '';
  return `${sign}${symbol}${absValue}`;
}

/**
 * Format a compact currency value (e.g. ฿10k, $1.2M) for display.
 *
 * @param {number|string} value
 * @param {string} [ticker]
 * @returns {string}
 */
export function formatCurrencyCompact(value, ticker) {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const symbol = currencySymbol(ticker);
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';

  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${symbol}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Format a percentage value.
 *
 * @param {number|string} value - The numeric value (already in percent, e.g. 5.32 = 5.32%)
 * @param {object} [options]
 * @param {boolean} [options.signed=false] - If true, prefix with +/- sign
 * @param {number} [options.decimals=2]
 * @returns {string}
 */
export function formatPercent(value, { signed = false, decimals = 2 } = {}) {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const prefix = signed && numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(decimals)}%`;
}
