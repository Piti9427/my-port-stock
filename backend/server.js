const express = require("express");
const http = require("http");
const path = require("path");
const { createAgentEventBus } = require("./src/ws/agentEventBus");

const {
  CACHE_TTL_MS,
  PRICE_GATE_EXTENDED_THRESHOLD_PCT,
  PRICE_GATE_REGULAR_THRESHOLD_PCT,
  SOURCE_NASDAQ,
  SOURCE_STOOQ,
  SOURCE_YAHOO,
} = require("./src/common/constants");
const { insufficientData, normalizeDecisionMode, normalizeTicker } = require("./src/common/format");
const {
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
  readPortfolioSnapshot,
  readTickerPortfolioContext,
} = require("./src/journal/journalReader");
const { evaluateDecision } = require("./src/decision/decisionEngine");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const quoteCache = new Map();

app.use(express.json({ limit: "256kb" }));
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
    providers: [SOURCE_YAHOO, SOURCE_NASDAQ, SOURCE_STOOQ],
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
  return res.status(200).json(packet);
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
  const ticker = normalizeTicker(req.body && req.body.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const decisionMode = normalizeDecisionMode(req.body.decision_mode);
  const packet = await getVerifiedPacket(ticker, decisionMode);

  if (packet.status === "INSUFFICIENT_DATA") {
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

  const analysis = evaluateDecision(packet, {
    riskPlan: req.body.risk_plan,
  });

  return res.status(200).json({
    as_of: new Date().toISOString(),
    packet,
    ...analysis,
  });
});

app.get("/api/portfolio", (req, res) => {
  return res.status(200).json(readPortfolioSnapshot());
});

app.get("/api/journal/:ticker", (req, res) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  return res.status(200).json(readJournalContext(ticker));
});

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
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildTwoSourceQuotePacket,
  buildVerifiedDataPacket,
  buildYahooQuoteSource,
  evaluateDecision,
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
