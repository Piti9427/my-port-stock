const CACHE_TTL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

const TICKER_PATTERN = /^\^?[A-Z0-9][A-Z0-9.-]{0,17}(?:=[A-Z])?$/;
const US_EQUITY_PATTERN = /^[A-Z][A-Z0-9.-]{0,17}$/;

const PRICE_GATE_REGULAR_THRESHOLD_PCT = 0.5;
const PRICE_GATE_EXTENDED_THRESHOLD_PCT = 1.0;

const SOURCE_YAHOO = "Yahoo Finance API";
const SOURCE_NASDAQ = "Nasdaq Quote API";
const SOURCE_STOOQ = "Stooq Delayed CSV";

const VALID_DECISION_MODES = new Set([
  "Quick Trade",
  "Swing Trade",
  "Long-Term/Core",
  "Existing Position / Exit Review",
]);

module.exports = {
  CACHE_TTL_MS,
  PRICE_GATE_EXTENDED_THRESHOLD_PCT,
  PRICE_GATE_REGULAR_THRESHOLD_PCT,
  REQUEST_TIMEOUT_MS,
  SOURCE_NASDAQ,
  SOURCE_STOOQ,
  SOURCE_YAHOO,
  TICKER_PATTERN,
  US_EQUITY_PATTERN,
  VALID_DECISION_MODES,
};
