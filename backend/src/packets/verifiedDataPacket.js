const { normalizeDecisionMode } = require("../common/format");
const { readJournalContext, readTickerPortfolioContext } = require("../journal/journalReader");

function buildVerifiedDataPacket(ticker, quotePacket, options = {}) {
  const decisionMode = normalizeDecisionMode(options.decisionMode);
  const journalContext = options.journalContext || readJournalContext(ticker);
  const portfolioContext =
    options.portfolioContext || readTickerPortfolioContext(ticker);
  const historicalContextWarning = options.historicalContextWarning || null;
  const knownConflicts = [];
  const stalenessWarnings = [];

  if (!quotePacket || quotePacket.status === "INSUFFICIENT_DATA") {
    knownConflicts.push(quotePacket ? quotePacket.error_details : "Missing quote packet");
  }

  if (portfolioContext?.stale_hypothesis) {
    stalenessWarnings.push("Portfolio/watchlist data is historical context only");
  }

  if (historicalContextWarning) {
    stalenessWarnings.push(historicalContextWarning);
  }

  if ((journalContext?.unresolved_issues?.length ?? 0) > 0) {
    knownConflicts.push("Journal contains unresolved risk/thesis items");
  }

  const currentPriceGate = quotePacket.current_price_acceptance_gate || "fail";

  return {
    as_of: new Date().toISOString(),
    ticker,
    decision_mode: decisionMode,
    last_price: quotePacket.last_price || null,
    analyst_price_target: null,
    fair_value_estimate: null,
    entry_zone: null,
    price_sources: quotePacket.price_sources || [],
    price_source_tiers: quotePacket.price_source_tiers || [],
    quote_timestamp: quotePacket.quote_timestamp || null,
    market_session: quotePacket.market_session || "Unknown",
    quote_delay_status: quotePacket.quote_delay_status || "Unknown",
    current_price_acceptance_gate: currentPriceGate,
    fundamental_packet: {
      status: "INSUFFICIENT_DATA",
      reason: "v1 packet does not fetch filings, earnings, guidance, or valuation data yet",
    },
    technical_packet: {
      status:
        currentPriceGate === "pass" ? "PARTIAL_CONTEXT" : "INSUFFICIENT_DATA",
      reason:
        currentPriceGate === "pass"
          ? "Current price verified; D1/W1 indicators still require chart adapter or user-provided levels"
          : "No technical calculation without accepted current price",
    },
    macro_flow_packet: {
      status: "INSUFFICIENT_DATA",
      reason: "v1 packet does not fetch macro, flow, or sentiment data yet",
    },
    portfolio_context: portfolioContext,
    journal_context: journalContext,
    historical_context_warning: historicalContextWarning,
    known_conflicts: knownConflicts,
    staleness_warnings: stalenessWarnings,
    quote_packet: quotePacket,
  };
}

module.exports = {
  buildVerifiedDataPacket,
};
