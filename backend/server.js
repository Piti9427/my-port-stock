require("./instrument");
require("dotenv").config({ path: require("node:path").resolve(__dirname, ".env") });
const Sentry = require("@sentry/node");
const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { createAgentEventBus, broadcast } = require("./src/ws/agentEventBus");
const { execFile } = require("node:child_process");
const { analyzeTicker } = require("./src/services/aiAnalyst");
const { clerkMiddleware } = require('@clerk/express');

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

function getRequestUserId(req) {
  if (req.auth?.userId) return req.auth.userId;
  if (typeof req.auth === "function") {
    try {
      return req.auth()?.userId || null;
    } catch (_) {
      return null;
    }
  }
  return null;
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
const {
  readJournalContext,
  readTickerPortfolioContext,
} = require("./src/journal/journalReader");
const { evaluateDecision } = require("./src/decision/decisionEngine");
const { supabaseConfigured } = require("./src/db/supabaseClient");
const {
  getUserJournal,
  getUserJournalByTicker,
  getUserPortfolio,
  insertJournalEntry,
} = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const quoteCache = new Map();

app.use(express.json({ limit: "256kb" }));
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY
  }));
} else if (process.env.NODE_ENV === 'production') {
  // In production, force clerkMiddleware to throw or handle missing key securely
  app.use(clerkMiddleware());
} else {
  console.warn("⚠️ CLERK_SECRET_KEY is missing! Bypassing Clerk auth for development.");
  app.use((req, res, next) => {
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

async function getVerifiedPacket(ticker, decisionMode) {
  const quotePacket = await getQuotePacket(ticker);

  if (quotePacket.status === "INSUFFICIENT_DATA") {
    return insufficientData(quotePacket.error_details);
  }

  return buildVerifiedDataPacket(ticker, quotePacket, {
    decisionMode,
    journalContext: readJournalContext(ticker),
    portfolioContext: readTickerPortfolioContext(ticker),
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
  const packet = await getVerifiedPacket(ticker, decisionMode);
  return res.status(200).json(packet);
});

app.post("/api/analyze", async (req, res) => {
  const ticker = normalizeTicker(req.body?.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const decisionMode = normalizeDecisionMode(req.body.decision_mode);
  const agents = getAgentsForMode(decisionMode);
  const totalAgents = agents.length;
  let completed = 0;

  try {
    broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'TYPING', ticker, message: `Dispatching ${totalAgents} sub-agents for ${ticker}...` });
    agents.forEach(agent => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SPAWNED', ticker }));
    agents.forEach((agent, idx) => {
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'WALKING', ticker }), idx * 400);
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SITTING', ticker }), idx * 400 + 600);
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'TYPING', ticker, message: getAgentWorkingMessage(agent, ticker) }), idx * 400 + 900);
    });

    let packet;
    const manualPrice = req.body.manual_price ? Number.parseFloat(req.body.manual_price) : null;
    
    if (manualPrice && !Number.isNaN(manualPrice) && manualPrice > 0 && manualPrice < 1000000) {
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
       packet = buildVerifiedDataPacket(ticker, quotePacket, {
          decisionMode,
          journalContext: readJournalContext(ticker),
          portfolioContext: readTickerPortfolioContext(ticker),
       });
    } else {
       packet = await getVerifiedPacket(ticker, decisionMode);
    }

    if (packet.status === "INSUFFICIENT_DATA") {
      broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker });
      return res.status(200).json({
        ...packet,
        decision_snapshot: {
          traffic_light_status: "yellow",
          verdict: "Wait",
          ticker,
          decision_mode: decisionMode,
          score: null,
          gate_status: "fail",
          one_line_reason: packet.error_details,
          immediate_next_action:
            "Provide broker/user-visible quote or wait for two accepted Tier 2 sources",
        },
      });
    }

    const oracleData = await runMarketOracle(ticker);
    const geminiData = await analyzeTicker(ticker, packet.portfolioContext, oracleData);

    packet.fundamental_packet = { ...packet.fundamental_packet, gemini_scores: geminiData, oracle: oracleData };

    // Format agentResults from Gemini if available
    let agentResults = null;
    if (geminiData && geminiData.status !== "INSUFFICIENT_DATA" && geminiData.sub_agent_scores) {
      agentResults = {
        fundamental: {
          status: geminiData.sub_agent_scores.fundamental ? "SUCCESS" : "INSUFFICIENT_DATA",
          score: geminiData.sub_agent_scores.fundamental?.score ?? null,
          mode_fit: geminiData.sub_agent_scores.fundamental?.mode_fit ?? "Mixed",
          reason: geminiData.sub_agent_scores.fundamental?.reason ?? "",
        },
        technical: {
          status: geminiData.sub_agent_scores.technical ? "SUCCESS" : "INSUFFICIENT_DATA",
          score: geminiData.sub_agent_scores.technical?.score ?? null,
          mode_fit: geminiData.sub_agent_scores.technical?.mode_fit ?? "Mixed",
          reason: geminiData.sub_agent_scores.technical?.reason ?? "",
        },
        macro_flow: {
          status: geminiData.sub_agent_scores.macro_flow ? "SUCCESS" : "INSUFFICIENT_DATA",
          score: geminiData.sub_agent_scores.macro_flow?.score ?? null,
          mode_fit: geminiData.sub_agent_scores.macro_flow?.mode_fit ?? "Mixed",
          reason: geminiData.sub_agent_scores.macro_flow?.reason ?? "",
        }
      };
    }

    const analysis = evaluateDecision(packet, {
      riskPlan: req.body.risk_plan,
      agentResults: agentResults || undefined,
    });

    if (geminiData.status !== "INSUFFICIENT_DATA" && geminiData.decision_snapshot) {
       analysis.decision_snapshot.score = geminiData.decision_snapshot.score || analysis.decision_snapshot.score;
       if (geminiData.decision_snapshot.one_line_reason && !analysis.decision_snapshot.one_line_reason) {
         analysis.decision_snapshot.one_line_reason = geminiData.decision_snapshot.one_line_reason;
       }
       analysis.analysis = geminiData.analysis;
    } else if (geminiData.status === "INSUFFICIENT_DATA") {
      analysis.adaptive_drilldown.warnings.push(geminiData.error_details || "AI analyst unavailable");
    }
    analysis.deep_analysis = buildDeepAnalysisPayload(oracleData, geminiData);

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
