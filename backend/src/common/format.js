function insufficientData(errorDetails) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: errorDetails,
  };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTicker(rawTicker) {
  const { TICKER_PATTERN } = require("./constants");

  if (typeof rawTicker !== "string") {
    return null;
  }

  const ticker = rawTicker.trim().toUpperCase();
  if (!ticker || !TICKER_PATTERN.test(ticker)) {
    return null;
  }

  return ticker;
}

function normalizeDecisionMode(rawMode) {
  const { VALID_DECISION_MODES } = require("./constants");

  if (typeof rawMode !== "string" || !rawMode.trim()) {
    return "Long-Term/Core";
  }

  const mode = rawMode.trim();
  return VALID_DECISION_MODES.has(mode) ? mode : "Long-Term/Core";
}

module.exports = {
  insufficientData,
  isFiniteNumber,
  normalizeDecisionMode,
  normalizeTicker,
};
