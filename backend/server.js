require("./instrument");
require("dotenv").config({ path: require("node:path").resolve(__dirname, ".env") });
const Sentry = require("@sentry/node");
const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { createAgentEventBus, broadcast } = require("./src/ws/agentEventBus");
const { execFile } = require("node:child_process");
const { analyzeTicker, chatWithVerifiedContext } = require("./src/services/aiAnalyst");
const { clerkMiddleware } = require('@clerk/express');
const {
  applyDevUiAuthBypass,
  getRequestUserId,
} = require("./src/auth/requestAuth");

const DECISION_MODE_AGENT_MAP = {
  'Quick Trade': ['catalyst-hunter', 'quant-technician'],
  'Swing Trade': ['fundamental-auditor', 'quant-technician', 'catalyst-hunter'],
  'Long-Term/Core': ['fundamental-auditor', 'macro-strategist', 'portfolio-risk-manager'],
  'Existing Position / Exit Review': ['fundamental-auditor', 'quant-technician', 'macro-strategist'],
};

function getAgentsForMode(decisionMode) {
  return DECISION_MODE_AGENT_MAP[decisionMode] || ['fundamental-auditor', 'quant-technician', 'macro-strategist'];
}

function getAgentWorkingMessage(agent, ticker) {
  const messages = {
    'fundamental-auditor': `Reviewing ${ticker} fundamentals & earnings...`,
    'quant-technician': `Analyzing ${ticker} RSI, MACD & order flow...`,
    'macro-strategist': `Evaluating macro regime for ${ticker}...`,
    'portfolio-risk-manager': `Calculating position sizing for ${ticker}...`,
    'catalyst-hunter': `Scanning upcoming catalysts for ${ticker}...`,
  };
  return messages[agent] || `Analyzing ${ticker}...`;
}

function runtimeInsufficientData(reason, extras = {}) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: reason,
    ...extras,
  };
}

function buildDeepAnalysisPayload(oracleData = {}, geminiData = {}) {
  return {
    swot: geminiData.swot || {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    },
    financials: Array.isArray(oracleData.financials) ? oracleData.financials : [],
    balance_sheet: oracleData.balance_sheet || {},
    weekly_technicals: oracleData.weekly_technicals || {},
    daily_technicals: oracleData.daily_technicals || {},
    sentiment: oracleData.sentiment || {},
    trade_plan: geminiData.trade_plan || {
      thesis: "INSUFFICIENT_DATA",
      entry_zone: "INSUFFICIENT_DATA",
      stop_loss: "INSUFFICIENT_DATA",
      target_1: "INSUFFICIENT_DATA",
      target_2: "INSUFFICIENT_DATA",
      rr_ratio: "INSUFFICIENT_DATA",
    },
  };
}

function runMarketOracle(ticker) {
  return new Promise((resolve) => {
    execFile('python3', ['tools/market_oracle.py', ticker], { 
      cwd: path.join(__dirname, '..'),
      timeout: 10000 
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running market_oracle: ${error.message}`);
        return resolve({ error: error.message });
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result[ticker] || { error: 'No data returned' });
      } catch (e) {
        console.error('Oracle JSON parse error:', e.message);
        resolve({ error: 'Failed to parse oracle output' });
      }
    });
  });
}

const {
  CACHE_TTL_MS,
  PRICE_GATE_EXTENDED_THRESHOLD_PCT,
  PRICE_GATE_REGULAR_THRESHOLD_PCT,
  SOURCE_FINNHUB,
  SOURCE_NASDAQ,
  SOURCE_STOOQ,
  SOURCE_YAHOO,
} = require("./src/common/constants");
const { insufficientData, normalizeDecisionMode, normalizeTicker } = require("./src/common/format");
const {
  buildFinnhubQuoteSource,
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildYahooQuoteSource,
  fetchQuoteSources,
  fetchStooqQuoteSource,
  normalizeNasdaqTimestamp,
  normalizeStooqTimestamp,
  parseMoney,
  parseSimpleCsv,
} = require("./src/sources/quoteSources");
const { getNewYorkMarketSession } = require("./src/sources/time");
const {
  buildTwoSourceQuotePacket,
  isValidQuoteSource,
} = require("./src/gates/priceGate");
const { buildVerifiedDataPacket } = require("./src/packets/verifiedDataPacket");
const { evaluateDecision } = require("./src/decision/decisionEngine");
const { supabaseConfigured } = require("./src/db/supabaseClient");
const { getScopedDb } = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const quoteCache = new Map();

app.use(express.json({ limit: "256kb" }));
if (process.env.CLERK_SECRET_KEY) {
  const clerkAuth = clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY
  });
  app.use((req, res, next) => {
    if (applyDevUiAuthBypass(req)) return next();
    return clerkAuth(req, res, next);
  });
} else if (process.env.NODE_ENV === 'production') {
  // In production, force clerkMiddleware to throw or handle missing key securely
  app.use(clerkMiddleware());
} else {
  console.warn("⚠️ CLERK_SECRET_KEY is missing! Bypassing Clerk auth for development.");
  app.use((req, res, next) => {
    if (applyDevUiAuthBypass(req)) return next();
    req.auth = { userId: "dev_mock_user_123" };
    next();
  });
}
app.use(express.static(path.join(__dirname, "../frontend/dist")));

const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

app.get("/favicon.ico", (req, res) => {
  return res.status(204).end();
});

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

const HISTORICAL_CONTEXT_WARNING =
  "Markdown portfolio/journal is historical context only; runtime analysis uses Supabase per-user rows.";

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

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "myportstock-investment-agent",
    as_of: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    cache: {
      ttl_seconds: CACHE_TTL_MS / 1000,
      entries: quoteCache.size,
    },
    providers: [SOURCE_YAHOO, SOURCE_NASDAQ, SOURCE_STOOQ, SOURCE_FINNHUB],
    acceptance_gate: {
      required_valid_sources: 2,
      regular_threshold_pct: PRICE_GATE_REGULAR_THRESHOLD_PCT,
      extended_threshold_pct: PRICE_GATE_EXTENDED_THRESHOLD_PCT,
    },
    endpoints: [
      "GET /api/quote/:ticker",
      "GET /api/packet/:ticker?mode=Swing%20Trade",
      "POST /api/analyze",
      "GET /api/portfolio",
      "GET /api/journal/:ticker",
    ],
  });
});

app.get("/api/quote/:ticker", async (req, res) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const packet = await getQuotePacket(ticker);
  const responsePacket = { ...packet };

  try {
    const { default: YahooFinance } = require('yahoo-finance2');
    const yf = new YahooFinance();
    const quote = await yf.quote(ticker);
    
    responsePacket.high = quote.regularMarketDayHigh || null;
    responsePacket.low = quote.regularMarketDayLow || null;
    responsePacket.volume = quote.regularMarketVolume || null;
    responsePacket.marketCap = quote.marketCap || null;
    responsePacket.currency = quote.currency || 'USD';
    
    // Ensure last_price exists if quote packet somehow missed it
    if (!responsePacket.last_price && quote.regularMarketPrice) {
      responsePacket.last_price = quote.regularMarketPrice;
    }
    if (responsePacket.last_price && !responsePacket.current_price) {
      responsePacket.current_price = responsePacket.last_price;
    }
  } catch (error) {
    console.error(`[Server] Error fetching Yahoo Finance fundamentals for ${ticker}:`, error.message);
    responsePacket.high = null;
    responsePacket.low = null;
    responsePacket.volume = null;
    responsePacket.marketCap = null;
  }

  return res.status(200).json(responsePacket);
});

app.get("/api/packet/:ticker", async (req, res) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const decisionMode = normalizeDecisionMode(req.query.mode);
  const userId = getRequestUserId(req);
  const packet = await getVerifiedPacket(ticker, decisionMode, { userId });
  return res.status(200).json(packet);
});

function broadcastAnalyzeKickoff(ticker, agents, totalAgents) {
  broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'TYPING', ticker, message: `Dispatching ${totalAgents} sub-agents for ${ticker}...` });
  agents.forEach((agent) => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SPAWNED', ticker }));
  agents.forEach((agent, idx) => {
    setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'WALKING', ticker }), idx * 400);
    setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SITTING', ticker }), idx * 400 + 600);
    setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'TYPING', ticker, message: getAgentWorkingMessage(agent, ticker) }), idx * 400 + 900);
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
    current_price_acceptance_gate: "pass",
  };

  return buildRuntimeVerifiedPacket({
    ticker,
    decisionMode,
    quotePacket,
    userId: options.userId,
    db: options.db,
  });
}

function buildAgentResultsFromGemini(geminiData) {
  if (geminiData?.status === "INSUFFICIENT_DATA" || !geminiData?.sub_agent_scores) {
    return null;
  }

  const scores = geminiData.sub_agent_scores;
  return {
    fundamental: {
      status: scores.fundamental ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.fundamental?.score ?? null,
      mode_fit: scores.fundamental?.mode_fit ?? "Mixed",
      reason: scores.fundamental?.reason ?? "",
    },
    technical: {
      status: scores.technical ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.technical?.score ?? null,
      mode_fit: scores.technical?.mode_fit ?? "Mixed",
      reason: scores.technical?.reason ?? "",
    },
    macro_flow: {
      status: scores.macro_flow ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.macro_flow?.score ?? null,
      mode_fit: scores.macro_flow?.mode_fit ?? "Mixed",
      reason: scores.macro_flow?.reason ?? "",
    },
  };
}

function mergeGeminiAnalysis(analysis, geminiData) {
  if (geminiData.status !== "INSUFFICIENT_DATA" && geminiData.decision_snapshot) {
    analysis.decision_snapshot.score = geminiData.decision_snapshot.score || analysis.decision_snapshot.score;
    if (geminiData.decision_snapshot.one_line_reason && !analysis.decision_snapshot.one_line_reason) {
      analysis.decision_snapshot.one_line_reason = geminiData.decision_snapshot.one_line_reason;
    }
    analysis.analysis = geminiData.analysis;
    return;
  }

  if (geminiData.status === "INSUFFICIENT_DATA") {
    analysis.adaptive_drilldown.warnings.push(geminiData.error_details || "AI analyst unavailable");
  }
}

function broadcastAnalyzeCompletion(ticker, agents, totalAgents, analysis) {
  let completed = 0;
  agents.forEach((agent, idx) => {
    setTimeout(() => {
      completed++;
      broadcast({ type: 'ANALYSIS_PROGRESS', agent, ticker, payload: { progress: completed, total: totalAgents } });
      broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'PRESENTING', ticker });
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'DONE', ticker }), 800);
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'EXITED', ticker }), 1500);
    }, (totalAgents - idx) * 600 + 1000);
  });

  setTimeout(() => {
    broadcast({
      type: 'ANALYSIS_COMPLETE',
      agent: 'cio',
      ticker,
      payload: { verdict: analysis.decision_snapshot?.verdict || 'Complete', analysis },
    });
    broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'PRESENTING', ticker, message: `Analysis complete for ${ticker}` });
    setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker }), 2000);
  }, totalAgents * 600 + 2500);
}

function buildInsufficientAnalyzeResponse(packet, ticker, decisionMode) {
  return {
    ...packet,
    decision_snapshot: {
      traffic_light_status: "yellow",
      verdict: "Wait",
      ticker,
      decision_mode: decisionMode,
      score: null,
      gate_status: "fail",
      one_line_reason: packet.error_details,
      immediate_next_action: "Provide broker/user-visible quote or wait for two accepted Tier 2 sources",
    },
  };
}

app.post("/api/chat", async (req, res) => {
  const ticker = normalizeTicker(req.body?.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const message = String(req.body?.message || "").trim();
  if (!message || message.length > 1000) {
    return res.status(400).json({ error: "Message must be 1-1000 characters" });
  }

  const userId = getRequestUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decisionMode = normalizeDecisionMode(req.body?.decision_mode);

  try {
    const packet = await getVerifiedPacket(ticker, decisionMode, { userId });
    if (packet.status === "INSUFFICIENT_DATA") {
      return res.status(200).json({
        as_of: new Date().toISOString(),
        ticker,
        decision_mode: decisionMode,
        ...packet,
        message: packet.error_details,
      });
    }

    const chat = await chatWithVerifiedContext({
      ticker,
      message,
      decisionMode,
      packet,
    });

    return res.status(200).json({
      as_of: new Date().toISOString(),
      ticker,
      decision_mode: decisionMode,
      ...chat,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/analyze", async (req, res) => {
  const ticker = normalizeTicker(req.body?.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const decisionMode = normalizeDecisionMode(req.body.decision_mode);
  const agents = getAgentsForMode(decisionMode);
  const totalAgents = agents.length;

  try {
    broadcastAnalyzeKickoff(ticker, agents, totalAgents);

    const userId = getRequestUserId(req);
    const manualPrice = req.body.manual_price ? Number.parseFloat(req.body.manual_price) : null;
    const packet =
      manualPrice && !Number.isNaN(manualPrice) && manualPrice > 0 && manualPrice < 1000000
        ? await buildManualVerifiedPacket(ticker, manualPrice, decisionMode, { userId })
        : await getVerifiedPacket(ticker, decisionMode, { userId });

    if (packet.status === "INSUFFICIENT_DATA") {
      broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker });
      return res.status(200).json(buildInsufficientAnalyzeResponse(packet, ticker, decisionMode));
    }

    const oracleData = await runMarketOracle(ticker);
    const geminiData = await analyzeTicker(ticker, packet.portfolio_context, oracleData);

    packet.fundamental_packet = { ...packet.fundamental_packet, gemini_scores: geminiData, oracle: oracleData };

    const agentResults = buildAgentResultsFromGemini(geminiData);
    const analysis = evaluateDecision(packet, {
      riskPlan: req.body.risk_plan,
      agentResults: agentResults || undefined,
    });

    mergeGeminiAnalysis(analysis, geminiData);
    analysis.deep_analysis = buildDeepAnalysisPayload(oracleData, geminiData);

    broadcastAnalyzeCompletion(ticker, agents, totalAgents, analysis);

    return res.status(200).json({
      as_of: new Date().toISOString(),
      packet,
      ...analysis,
    });
  } catch (error) {
    broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker });
    return res.status(500).json({ error: error.message });
  }
});

Sentry.setupExpressErrorHandler(app);

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

if (require.main === module) {
  const server = http.createServer(app);

  server.on("error", (error) => {
    console.error(`Investment Agent failed to listen on ${HOST}:${PORT}: ${error.message}`);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    console.log(`Investment Agent listening on http://${HOST}:${PORT}`);
  });
  createAgentEventBus(server);
}

module.exports = {
  app,
  buildFinnhubQuoteSource,
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildTwoSourceQuotePacket,
  buildVerifiedDataPacket,
  buildYahooQuoteSource,
  evaluateDecision,
  buildDeepAnalysisPayload,
  buildAuthenticatedAnalysisContext,
  buildRuntimeVerifiedPacket,
  getNewYorkMarketSession,
  getQuotePacket,
  getVerifiedPacket,
  isValidQuoteSource,
  normalizeNasdaqTimestamp,
  normalizeStooqTimestamp,
  normalizeTicker,
  parseMoney,
  parseSimpleCsv,
  quoteCache,
};
