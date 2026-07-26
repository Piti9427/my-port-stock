const { CACHE_TTL_MS } = require("../common/constants");
const { BoundedMap } = require("../common/BoundedMap");
const { insufficientData, normalizeTicker } = require("../common/format");
const { fetchQuoteSources, fetchStooqQuoteSource } = require("../sources/quoteSources");
const { buildTwoSourceQuotePacket, isValidQuoteSource } = require("../gates/priceGate");
const { buildVerifiedDataPacket } = require("../packets/verifiedDataPacket");
const { supabaseConfigured } = require("../db/supabaseClient");
const { getScopedDb } = require("../db");
const { runtimeInsufficientData } = require("./deepAnalysisService");

const quoteCache = new BoundedMap(200);

const HISTORICAL_CONTEXT_WARNING =
  "Markdown portfolio/journal is historical context only; runtime analysis uses Supabase per-user rows.";

function getCachedQuote(ticker) {
  const cached = quoteCache.get(ticker);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    quoteCache.delete(ticker);
    return null;
  }

  return cached.packet;
}

async function getQuotePacket(ticker) {
  const cachedPacket = getCachedQuote(ticker);
  if (cachedPacket) {
    return cachedPacket;
  }

  const asOf = new Date();
  let quoteSources = await fetchQuoteSources(ticker, asOf);
  let packet = buildTwoSourceQuotePacket(ticker, quoteSources, asOf);

  if (
    packet.status === "INSUFFICIENT_DATA" &&
    quoteSources.filter(isValidQuoteSource).length < 2
  ) {
    const stooqSource = await fetchStooqQuoteSource(ticker);
    quoteSources = quoteSources.concat(stooqSource);
    packet = buildTwoSourceQuotePacket(ticker, quoteSources, asOf);
  }

  if (packet.status !== "INSUFFICIENT_DATA") {
    quoteCache.set(ticker, {
      cachedAt: Date.now(),
      packet,
    });
  }

  return packet;
}

function toFiniteNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeHoldingRow(row) {
  return {
    ticker: normalizeTicker(row?.ticker) || row?.ticker || null,
    name: row?.name || null,
    shares: toFiniteNumber(row?.shares, 0),
    avg_cost: toFiniteNumber(row?.avg_cost, null),
    sector: row?.sector || null,
    notes: row?.notes || null,
    source_note: row?.source_note || null,
    opened_at: row?.opened_at || null,
  };
}

function sanitizeJournalRow(row) {
  return {
    id: row?.id || null,
    date: row?.date || null,
    ticker: normalizeTicker(row?.ticker) || row?.ticker || null,
    type: row?.type || null,
    mode: row?.mode || null,
    status: row?.status || null,
    shares: toFiniteNumber(row?.shares, null),
    price: toFiniteNumber(row?.price, null),
    entry: toFiniteNumber(row?.entry, null),
    target: toFiniteNumber(row?.target, null),
    stop_loss: toFiniteNumber(row?.stop_loss, null),
    risk_reward: toFiniteNumber(row?.risk_reward, null),
    profit: toFiniteNumber(row?.profit, null),
    notes: row?.notes || null,
    source_note: row?.source_note || null,
    cognitive_bias: row?.cognitive_bias || null,
  };
}

function isOpenJournalRow(row) {
  const status = String(row?.status || "").trim().toUpperCase();
  return status === "OPEN" || status === "ACTIVE";
}

function buildJournalUnresolvedIssues(rows) {
  const issues = [];
  rows.forEach((row) => {
    const status = String(row?.status || "").trim().toUpperCase();
    if (!isOpenJournalRow(row)) return;

    if (!Number.isFinite(Number(row?.stop_loss)) || Number(row.stop_loss) <= 0) {
      issues.push(`${normalizeTicker(row?.ticker) || "Ticker"} open trade is missing an executable stop-loss`);
    }

    const riskReward = Number(row?.risk_reward);
    if (Number.isFinite(riskReward) && riskReward < 2) {
      issues.push(`${normalizeTicker(row?.ticker) || "Ticker"} open trade risk/reward is below 1:2`);
    }

    if (!status) {
      issues.push(`${normalizeTicker(row?.ticker) || "Ticker"} journal status is missing`);
    }
  });
  return issues;
}

function unavailableRuntimeContexts(ticker) {
  return {
    portfolioContext: {
      source: "unavailable",
      user_scope: "authenticated",
      ticker,
      is_held: false,
      stale_hypothesis: false,
      holdings_rows: [],
    },
    journalContext: {
      source: "unavailable",
      user_scope: "authenticated",
      ticker,
      journal_checked: false,
      is_repeat_ticker: false,
      is_active_trade: false,
      active_trade_rows: [],
      unresolved_issues: ["Supabase runtime data unavailable for authenticated analysis context"],
    },
  };
}

function getRuntimeDbForUser(userId) {
  if (!userId || !supabaseConfigured) {
    return null;
  }
  return getScopedDb(userId);
}

async function buildAuthenticatedAnalysisContext({ userId, ticker, db } = {}) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) {
    return runtimeInsufficientData("Invalid ticker format", {
      historicalContextWarning: HISTORICAL_CONTEXT_WARNING,
      ...unavailableRuntimeContexts(null),
    });
  }

  if (!userId) {
    return runtimeInsufficientData("Missing authenticated user for analysis context", {
      historicalContextWarning: HISTORICAL_CONTEXT_WARNING,
      ...unavailableRuntimeContexts(normalizedTicker),
    });
  }

  if (
    !db ||
    typeof db.getUserPortfolio !== "function" ||
    typeof db.getUserJournalByTicker !== "function"
  ) {
    return runtimeInsufficientData("Supabase runtime data unavailable for authenticated analysis context", {
      historicalContextWarning: HISTORICAL_CONTEXT_WARNING,
      ...unavailableRuntimeContexts(normalizedTicker),
    });
  }

  try {
    const [holdings, journalRows] = await Promise.all([
      db.getUserPortfolio(userId),
      db.getUserJournalByTicker(userId, normalizedTicker),
    ]);

    const tickerHoldings = (holdings || []).filter(
      (row) => normalizeTicker(row?.ticker) === normalizedTicker,
    );
    const sanitizedHoldings = tickerHoldings.map(sanitizeHoldingRow);
    const sanitizedJournalRows = (journalRows || []).map(sanitizeJournalRow);
    const activeTradeRows = sanitizedJournalRows.filter(isOpenJournalRow);
    const unresolvedIssues = buildJournalUnresolvedIssues(journalRows || []);

    return {
      status: "READY",
      portfolioContext: {
        source: "supabase",
        user_scope: "authenticated",
        ticker: normalizedTicker,
        is_held: sanitizedHoldings.some((row) => row.shares > 0),
        stale_hypothesis: false,
        holdings_count: sanitizedHoldings.length,
        holdings_rows: sanitizedHoldings,
      },
      journalContext: {
        source: "supabase",
        user_scope: "authenticated",
        ticker: normalizedTicker,
        journal_checked: true,
        is_repeat_ticker: sanitizedJournalRows.length > 0,
        is_active_trade: activeTradeRows.length > 0,
        active_trade_rows: activeTradeRows,
        trade_rows: sanitizedJournalRows,
        unresolved_issues: unresolvedIssues,
      },
      historicalContextWarning: HISTORICAL_CONTEXT_WARNING,
    };
  } catch (error) {
    console.error("Runtime analysis context lookup failed:", error.message);
    return runtimeInsufficientData("Supabase runtime data unavailable for authenticated analysis context", {
      historicalContextWarning: HISTORICAL_CONTEXT_WARNING,
      ...unavailableRuntimeContexts(normalizedTicker),
    });
  }
}

async function buildRuntimeVerifiedPacket({
  ticker,
  decisionMode,
  quotePacket,
  userId,
  db,
} = {}) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) {
    return insufficientData("Invalid ticker format");
  }

  if (!quotePacket || quotePacket.status === "INSUFFICIENT_DATA") {
    return insufficientData(quotePacket?.error_details || "Missing quote packet");
  }

  const runtimeContext = await buildAuthenticatedAnalysisContext({
    userId,
    ticker: normalizedTicker,
    db: db || getRuntimeDbForUser(userId),
  });

  if (runtimeContext.status === "INSUFFICIENT_DATA") {
    return runtimeInsufficientData(runtimeContext.error_details, {
      historical_context_warning: runtimeContext.historicalContextWarning,
      portfolio_context: runtimeContext.portfolioContext,
      journal_context: runtimeContext.journalContext,
    });
  }

  return buildVerifiedDataPacket(normalizedTicker, quotePacket, {
    decisionMode,
    journalContext: runtimeContext.journalContext,
    portfolioContext: runtimeContext.portfolioContext,
    historicalContextWarning: runtimeContext.historicalContextWarning,
  });
}

async function getVerifiedPacket(ticker, decisionMode, options = {}) {
  const quotePacket = options.quotePacket || await getQuotePacket(ticker);

  return buildRuntimeVerifiedPacket({
    ticker,
    decisionMode,
    quotePacket,
    userId: options.userId,
    db: options.db,
  });
}

async function buildManualVerifiedPacket(ticker, manualPrice, decisionMode, options = {}) {
  const quotePacket = {
    as_of: new Date().toISOString(),
    ticker,
    last_price: manualPrice,
    price_sources: ["Manual User Input (Tier 1)"],
    price_source_tiers: ["Tier 1"],
    quote_timestamp: new Date().toISOString(),
    market_session: "Regular",
    current_price_acceptance_gate: "pass_manual_override",
  };

  return buildRuntimeVerifiedPacket({
    ticker,
    decisionMode,
    quotePacket,
    userId: options.userId,
    db: options.db,
  });
}

module.exports = {
  quoteCache,
  HISTORICAL_CONTEXT_WARNING,
  getCachedQuote,
  getQuotePacket,
  buildAuthenticatedAnalysisContext,
  buildRuntimeVerifiedPacket,
  getVerifiedPacket,
  buildManualVerifiedPacket,
  getRuntimeDbForUser,
};
