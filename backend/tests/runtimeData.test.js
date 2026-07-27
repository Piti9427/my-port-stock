const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

function quotePacket(overrides = {}) {
  return {
    as_of: "2026-06-20T12:00:00.000Z",
    ticker: "NVDA",
    last_price: 190,
    price_sources: ["Manual User Input (Tier 1)"],
    price_source_tiers: ["Tier 1"],
    quote_timestamp: "2026-06-20T12:00:00.000Z",
    market_session: "Regular",
    current_price_acceptance_gate: "pass",
    ...overrides,
  };
}

function loadServerWithoutSupabase() {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.SUPABASE_URL = "https://mock.supabase.co";
  process.env.SUPABASE_ANON_KEY = "mock_key";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete require.cache[require.resolve("../server")];
  delete require.cache[require.resolve("../src/db/supabaseClient")];

  const server = require("../server");

  return {
    app: server.app,
    restore() {
      if (previousUrl) process.env.SUPABASE_URL = previousUrl;
      else delete process.env.SUPABASE_URL;
      if (previousKey) process.env.SUPABASE_ANON_KEY = previousKey;
      else delete process.env.SUPABASE_ANON_KEY;
      if (previousServiceKey)
        process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    },
  };
}

describe("runtime personal data endpoints", () => {
  let restore = () => {};

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it("GET /api/journal fails closed without Supabase config instead of returning sample trades", async () => {
    const loaded = loadServerWithoutSupabase();
    restore = loaded.restore;

    const res = await request(loaded.app).get("/api/journal");

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
    assert.deepEqual(res.body.trades, []);
    assert.doesNotMatch(JSON.stringify(res.body), /AAPL|TSLA|Mock/i);
  });

  it("POST /api/journal fails closed without Supabase config instead of mock-saving", async () => {
    const loaded = loadServerWithoutSupabase();
    restore = loaded.restore;

    const res = await request(loaded.app)
      .post("/api/journal")
      .send({ ticker: "NVDA", entry: 100, shares: 1 });

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
    assert.doesNotMatch(JSON.stringify(res.body), /Mock save successful/i);
  });

  it("runtime routes do not auto-import owner markdown for empty users", () => {
    const apiSource = fs.readFileSync(
      path.join(__dirname, "../src/routes/api.js"),
      "utf8",
    );

    assert.doesNotMatch(
      apiSource,
      /bootstrapUserData|importMarkdownSnapshotForOwner|Auto-migration/i,
    );
  });

  it("builds authenticated analysis context from Supabase-scoped per-user rows", async () => {
    const server = require("../server");
    const calls = [];
    const db = {
      getUserPortfolio: async (userId) => {
        calls.push(["portfolio", userId]);
        return [
          {
            ticker: "NVDA",
            shares: 2,
            avg_cost: 120,
            sector: "Semiconductors",
          },
          { ticker: "TSLA", shares: 1, avg_cost: 250, sector: "EV" },
        ];
      },
      getUserJournalByTicker: async (userId, ticker) => {
        calls.push(["journal", userId, ticker]);
        return [
          {
            ticker: "NVDA",
            status: "OPEN",
            entry: 175,
            stop_loss: null,
            risk_reward: 1.4,
            notes: "Needs risk review",
          },
        ];
      },
    };

    const context = await server.buildAuthenticatedAnalysisContext({
      userId: "user_123",
      ticker: "nvda",
      db,
    });

    assert.equal(context.status, "READY");
    assert.equal(context.portfolioContext.source, "supabase");
    assert.equal(context.portfolioContext.stale_hypothesis, false);
    assert.equal(context.portfolioContext.is_held, true);
    assert.equal(context.journalContext.source, "supabase");
    assert.equal(context.journalContext.journal_checked, true);
    assert.equal(context.journalContext.is_repeat_ticker, true);
    assert.equal(context.journalContext.is_active_trade, true);
    assert.match(context.historicalContextWarning, /historical context only/i);
    assert.deepEqual(calls, [
      ["portfolio", "user_123"],
      ["journal", "user_123", "NVDA"],
    ]);
  });

  it("fails closed for authenticated analysis context without user or Supabase DB", async () => {
    const server = require("../server");

    const missingUser = await server.buildAuthenticatedAnalysisContext({
      userId: null,
      ticker: "NVDA",
      db: {},
    });
    const missingDb = await server.buildAuthenticatedAnalysisContext({
      userId: "user_123",
      ticker: "NVDA",
      db: null,
    });

    assert.equal(missingUser.status, "INSUFFICIENT_DATA");
    assert.match(missingUser.error_details, /authenticated user/i);
    assert.equal(missingDb.status, "INSUFFICIENT_DATA");
    assert.match(missingDb.error_details, /Supabase runtime data unavailable/i);
  });

  it("builds verified packets with Supabase context and no markdown runtime context", async () => {
    const server = require("../server");
    const db = {
      getUserPortfolio: async () => [
        { ticker: "NVDA", shares: 2, avg_cost: 120, sector: "Semiconductors" },
      ],
      getUserJournalByTicker: async () => [],
    };

    const packet = await server.buildRuntimeVerifiedPacket({
      ticker: "NVDA",
      decisionMode: "Swing Trade",
      quotePacket: quotePacket(),
      userId: "user_123",
      db,
    });

    assert.equal(packet.portfolio_context.source, "supabase");
    assert.equal(packet.journal_context.source, "supabase");
    assert.equal(packet.portfolio_context.stale_hypothesis, false);
    assert.equal(
      packet.historical_context_warning.includes("historical context only"),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(packet.portfolio_context),
      /stock_portfolio\.md|markdown/i,
    );
  });
});
