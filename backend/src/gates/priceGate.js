const {
  PRICE_GATE_EXTENDED_THRESHOLD_PCT,
  PRICE_GATE_REGULAR_THRESHOLD_PCT,
  SOURCE_STOOQ,
} = require("../common/constants");
const { insufficientData, isFiniteNumber } = require("../common/format");
const { getNewYorkMarketSession } = require("../sources/time");

function getGateThresholdPct(marketSession) {
  return marketSession === "Regular"
    ? PRICE_GATE_REGULAR_THRESHOLD_PCT
    : PRICE_GATE_EXTENDED_THRESHOLD_PCT;
}

function getPriceDifferencePct(primaryPrice, secondaryPrice) {
  const midpoint = (primaryPrice + secondaryPrice) / 2;
  if (!isFiniteNumber(midpoint) || midpoint <= 0) {
    return null;
  }

  return (Math.abs(primaryPrice - secondaryPrice) / midpoint) * 100;
}

function isValidQuoteSource(source) {
  return (
    source?.status !== "INSUFFICIENT_DATA" &&
    typeof source?.source === "string" &&
    source?.tier === "Tier 2" &&
    isFiniteNumber(source?.last_price) &&
    Boolean(source?.quote_timestamp)
  );
}

function buildTwoSourceQuotePacket(ticker, sources, asOf = new Date()) {
  const validSources = sources.filter(isValidQuoteSource);
  const unavailableSources = sources
    .filter((source) => source?.status === "INSUFFICIENT_DATA")
    .map((source) => source.error_details);

  if (validSources.length < 2) {
    return insufficientData(
      unavailableSources.length
        ? `Need two valid quote sources; unavailable: ${unavailableSources.join("; ")}`
        : "Need two valid quote sources",
    );
  }

  const primarySource = validSources[0];
  const secondarySource = validSources[1];
  const marketSession = getNewYorkMarketSession(asOf);
  const thresholdPct = getGateThresholdPct(marketSession);
  const priceDifferencePct = getPriceDifferencePct(
    primarySource.last_price,
    secondarySource.last_price,
  );

  if (!isFiniteNumber(priceDifferencePct)) {
    return insufficientData("Unable to compare quote source prices");
  }

  if (priceDifferencePct > thresholdPct) {
    return insufficientData(
      `Quote sources differ by ${priceDifferencePct.toFixed(3)}%, above ${thresholdPct}% threshold`,
    );
  }

  return {
    as_of: asOf.toISOString(),
    ticker,
    last_price: primarySource.last_price,
    price_sources: [primarySource.source, secondarySource.source],
    price_source_tiers: [primarySource.tier, secondarySource.tier],
    quote_timestamp: primarySource.quote_timestamp,
    market_session: marketSession,
    quote_delay_status: {
      [primarySource.source]: primarySource.quote_delay_status,
      [secondarySource.source]: secondarySource.quote_delay_status,
    },
    current_price_acceptance_gate: "pass",
    source_quotes: [primarySource, secondarySource],
    fallback_used: [primarySource.source, secondarySource.source].includes(SOURCE_STOOQ),
    cross_check: {
      primary_source: primarySource.source,
      secondary_source: secondarySource.source,
      price_difference_pct: Number(priceDifferencePct.toFixed(4)),
      threshold_pct: thresholdPct,
      status: "pass",
    },
    unavailable_sources: unavailableSources,
  };
}

module.exports = {
  buildTwoSourceQuotePacket,
  getGateThresholdPct,
  getPriceDifferencePct,
  isValidQuoteSource,
};
