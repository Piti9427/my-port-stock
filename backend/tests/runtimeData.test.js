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

function clearRuntimeModules() {
  [
    "../server",
    "../src/routes/api",
    "../src/db",
    "../src/db/supabaseClient",
    "../src/providers/providerRegistry",
    "../src/providers/testProviders",
  ].forEach((mod) => {
    delete require.cache[require.resolve(mod)];
  });
}

function loadServerWithoutSupabase({
  testMode = false,
  devUiAuthBypass = undefined,
} = {}) {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousTestMode = process.env.MPS_TEST_MODE;
  const previousScenario = process.env.MPS_TEST_SCENARIO;
  const previousBypass = process.env.DEV_UI_AUTH_BYPASS;

  process.env.SUPABASE_URL = "https://mock.supabase.co";
  process.env.SUPABASE_ANON_KEY = "mock_key";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (testMode) {
    process.env.MPS_TEST_MODE = "1";
    process.env.MPS_TEST_SCENARIO = process.env.MPS_TEST_SCENARIO || "matrix";
  } else {
    delete process.env.MPS_TEST_MODE;
    delete process.env.MPS_TEST_SCENARIO;
  }
  if (devUiAuthBypass === undefined) delete process.env.DEV_UI_AUTH_BYPASS;
  else process.env.DEV_UI_AUTH_BYPASS = devUiAuthBypass;

  clearRuntimeModules();
  const server = require("../server");

  return {
    app: server.app,
    restore() {
      clearRuntimeModules();
      if (previousUrl) process.env.SUPABASE_URL = previousUrl;
      else delete process.env.SUPABASE_URL;
      if (previousKey) process.env.SUPABASE_ANON_KEY = previousKey;
      else delete process.env.SUPABASE_ANON_KEY;
      if (previousServiceKey)
        process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (previousTestMode) process.env.MPS_TEST_MODE = previousTestMode;
      else delete process.env.MPS_TEST_MODE;
      if (previousScenario) process.env.MPS_TEST_SCENARIO = previousScenario;
      else delete process.env.MPS_TEST_SCENARIO;
      if (previousBypass) process.env.DEV_UI_AUTH_BYPASS = previousBypass;
      else delete process.env.DEV_UI_AUTH_BYPASS;
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
    const loaded = loadServerWithoutSupabase({ testMode: false });
    restore = loaded.restore;

    const res = await request(loaded.app).get("/api/journal");

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
    assert.deepEqual(res.body.trades, []);
    assert.doesNotMatch(JSON.stringify(res.body), /AAPL|TSLA|Mock/i);
  });

  it("POST /api/journal fails closed without Supabase config instead of mock-saving", async () => {
    const loaded = loadServerWithoutSupabase({ testMode: false });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .post("/api/journal")
      .send({ ticker: "NVDA", entry: 100, shares: 1 });

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
    assert.doesNotMatch(JSON.stringify(res.body), /Mock save successful/i);
  });

  it("POST/GET /api/journal uses deterministic fixtures in MPS_TEST_MODE without Supabase", async () => {
    const loaded = loadServerWithoutSupabase({
      testMode: true,
      devUiAuthBypass: "true",
    });
    restore = loaded.restore;

    const post = await request(loaded.app)
      .post("/api/journal")
      .set("Authorization", "Bearer dev-ui-auth-bypass")
      .send({
        ticker: "NVDA",
        type: "BUY",
        shares: 2,
        price: 100,
        status: "OPEN",
      });

    assert.equal(post.statusCode, 200);
    assert.equal(post.body[0]?.ticker, "NVDA");
    assert.equal(post.body[0]?.shares, 2);

    const get = await request(loaded.app)
      .get("/api/journal")
      .set("Authorization", "Bearer dev-ui-auth-bypass");

    assert.equal(get.statusCode, 200);
    assert.equal(get.body.status, undefined);
    assert.equal(get.body.trades?.[0]?.ticker, "NVDA");
    assert.equal(get.body.trades?.[0]?.shares, 2);
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
