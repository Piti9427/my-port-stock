require("./instrument");
require("dotenv").config({
  path: require("node:path").resolve(__dirname, ".env"),
});
const {
  assertTestModeIsSafe,
  installOutboundNetworkGuard,
  isTestMode,
} = require("./src/providers/testMode");
assertTestModeIsSafe();
installOutboundNetworkGuard();
const Sentry = require("@sentry/node");
const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { clerkMiddleware } = require("@clerk/express");
const { createAgentEventBus } = require("./src/ws/agentEventBus");
const { WsTicketStore } = require("./src/ws/wsTicketStore");
const {
  applyDevUiAuthBypass,
  getRequestUserId,
} = require("./src/auth/requestAuth");
const {
  createApiRateLimiters,
  requestContext,
  securityHeaders,
} = require("./src/http/appMiddleware");
const { errorHandler, notFoundHandler } = require("./src/http/errors");
const {
  CACHE_TTL_MS,
  PRICE_GATE_EXTENDED_THRESHOLD_PCT,
  PRICE_GATE_REGULAR_THRESHOLD_PCT,
  SOURCE_FINNHUB,
  SOURCE_NASDAQ,
  SOURCE_STOOQ,
  SOURCE_YAHOO,
} = require("./src/common/constants");
const {
  insufficientData,
  normalizeDecisionMode,
  normalizeTicker,
} = require("./src/common/format");
const {
  buildFinnhubQuoteSource,
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildYahooQuoteSource,
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
const {
  quoteCache,
  getQuotePacket,
  getVerifiedPacket,
  buildAuthenticatedAnalysisContext,
  buildRuntimeVerifiedPacket,
} = require("./src/services/analysisContextService");
const {
  buildDeepAnalysisPayload,
} = require("./src/services/deepAnalysisService");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const apiRateLimiters = createApiRateLimiters();
const wsTicketStore = new WsTicketStore();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");
app.use(requestContext);
app.use(securityHeaders);
app.use(apiRateLimiters.ordinary);
app.use(["/api/quote", "/api/packet"], apiRateLimiters.quote);
app.use(["/api/analyze", "/api/chat"], apiRateLimiters.ai);
app.use(express.json({ limit: "256kb" }));

if (process.env.CLERK_SECRET_KEY) {
  const clerkAuth = clerkMiddleware({
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  app.use((req, res, next) => {
    if (applyDevUiAuthBypass(req)) return next();
    return clerkAuth(req, res, next);
  });
} else if (process.env.NODE_ENV === "production") {
  app.use(clerkMiddleware());
} else {
  console.warn(
    "⚠️ CLERK_SECRET_KEY is missing! Bypassing Clerk auth for development.",
  );
  app.use((req, res, next) => {
    if (applyDevUiAuthBypass(req)) return next();
    req.auth = { userId: "dev_mock_user_123" };
    next();
  });
}

app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Mount API Routers
const apiRoutes = require("./src/routes/api");
const aiRoutes = require("./src/routes/aiRoutes");

app.use("/api", apiRoutes);
app.use("/api", aiRoutes);

app.get("/favicon.ico", (req, res) => res.status(204).end());

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

app.post("/api/ws-ticket", (req, res) => {
  const userId = getRequestUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const issued = wsTicketStore.issue(userId);
  return res.status(200).json({
    ticket: issued.ticket,
    expires_in_seconds: issued.expiresInSeconds,
  });
});

app.get("/api/quote/:ticker", async (req, res) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) {
    return res.status(200).json(insufficientData("Invalid ticker format"));
  }

  const packet = await getQuotePacket(ticker);
  const responsePacket = { ...packet };

  if (isTestMode()) {
    responsePacket.high = 101;
    responsePacket.low = 99;
    responsePacket.volume = 1_000_000;
    responsePacket.marketCap = 1_000_000_000;
    responsePacket.currency = "USD";
    responsePacket.current_price = responsePacket.last_price || null;
  } else
    try {
      const { default: YahooFinance } = require("yahoo-finance2");
      const yf = new YahooFinance();
      const quote = await yf.quote(ticker);

      responsePacket.high = quote.regularMarketDayHigh || null;
      responsePacket.low = quote.regularMarketDayLow || null;
      responsePacket.volume = quote.regularMarketVolume || null;
      responsePacket.marketCap = quote.marketCap || null;
      responsePacket.currency = quote.currency || "USD";

      if (!responsePacket.last_price && quote.regularMarketPrice) {
        responsePacket.last_price = quote.regularMarketPrice;
      }
      if (responsePacket.last_price && !responsePacket.current_price) {
        responsePacket.current_price = responsePacket.last_price;
      }
    } catch (error) {
      console.error(
        `[Server] Error fetching Yahoo Finance fundamentals for ${ticker}:`,
        error.message,
      );
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

app.use("/api", notFoundHandler);

app.get(/.*/, (req, res) => {
  res.sendFile("index.html", {
    root: path.join(__dirname, "../frontend/dist"),
    dotfiles: "deny",
  });
});

Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

function closeHttpServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function createGracefulShutdown({
  eventBus,
  server,
  timeoutMs = 10_000,
  forceExit = (code) => process.exit(code),
}) {
  let shutdownPromise = null;

  return function shutdown(signal = "shutdown") {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      const forceExitTimer = setTimeout(() => {
        console.error(`Forced exit after ${timeoutMs}ms during ${signal}`);
        forceExit(1);
      }, timeoutMs);
      forceExitTimer.unref?.();

      try {
        await eventBus.close();
        await closeHttpServer(server);
      } finally {
        clearTimeout(forceExitTimer);
      }
    })();

    return shutdownPromise;
  };
}

function startServer({ port = PORT, host = HOST } = {}) {
  const listenPort = Number(port);
  if (!Number.isInteger(listenPort) || listenPort < 0 || listenPort > 65535) {
    throw new TypeError(`Invalid server port: ${port}`);
  }
  const server = http.createServer(app);
  const eventBus = createAgentEventBus(server, { ticketStore: wsTicketStore });
  const shutdown = createGracefulShutdown({ eventBus, server });

  server.on("error", (error) => {
    console.error(
      `Investment Agent failed to listen on ${host}:${port}: ${error.message}`,
    );
    process.exit(1);
  });

  server.listen(listenPort, host, () => {
    const address = server.address();
    const activePort =
      typeof address === "object" && address ? address.port : listenPort;
    console.log(`Investment Agent listening on http://${host}:${activePort}`);
  });

  return { eventBus, server, shutdown };
}

if (require.main === module) {
  const runtime = startServer();
  process.once("SIGTERM", () => void runtime.shutdown("SIGTERM"));
  process.once("SIGINT", () => void runtime.shutdown("SIGINT"));
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
  createGracefulShutdown,
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
  startServer,
};
