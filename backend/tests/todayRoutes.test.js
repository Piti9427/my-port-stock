// backend/tests/todayRoutes.test.js
"use strict";
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

describe("Today API Route — /api/today", () => {
  let prevUrl;
  let prevKey;

  // --- Mock state ---
  let mockHoldings = /** @type {Array<Record<string, unknown>>} */ ([]);
  let mockJournal = /** @type {Array<Record<string, unknown>>} */ ([]);
  let mockWatchlists = /** @type {Array<Record<string, unknown>>} */ ([]);
  let mockPrefs = null;
  let mockEnriched = null; // if set, overrides enrichWithMarketData output

  beforeEach(() => {
    prevUrl = process.env.SUPABASE_URL;
    prevKey = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "eyJhbGci.test";

    // Clear module cache for all modules under test
    for (const mod of [
      require.resolve("../src/db/supabaseClient"),
      require.resolve("../src/services/quoteEnricher"),
      require.resolve("../src/preferences/preferenceRepository"),
      require.resolve("../src/routes/today"),
    ]) {
      delete require.cache[mod];
    }

    mockHoldings = [];
    mockJournal = [];
    mockWatchlists = [];
    mockPrefs = null;
    mockEnriched = null;
  });

  afterEach(() => {
    if (prevUrl) process.env.SUPABASE_URL = prevUrl;
    else delete process.env.SUPABASE_URL;
    if (prevKey) process.env.SUPABASE_ANON_KEY = prevKey;
    else delete process.env.SUPABASE_ANON_KEY;
  });

  function createApp(userId) {
    const app = express();
    app.use(express.json());

    // Auth middleware stub
    app.use((req, res, next) => {
      req.auth = () => ({ userId: userId || null });
      next();
    });

    // Mock quoteEnricher
    const quoteEnricher = require("../src/services/quoteEnricher");
    quoteEnricher.enrichWithMarketData = async (items) => {
      if (mockEnriched) return mockEnriched;
      return items.map((item) => ({
        ...item,
        price: item.avg_cost || 100,
        change: 0,
        changePct: 0,
        beta: 1.0,
        earningsTimestamp: null,
        spark: [],
      }));
    };

    // Mock DB (getScopedDb)
    const db = require("../src/db");
    db.getScopedDb = /** @type {typeof db.getScopedDb} */ (
      /** @type {unknown} */ (
        () => ({
          getUserHoldings: async () => mockHoldings,
          getUserJournal: async () => mockJournal,
          getUserWatchlists: async () => mockWatchlists,
        })
      )
    );

    // Mock preferenceRepository
    const prefs = require("../src/preferences/preferenceRepository");
    prefs.getForUser = async () => mockPrefs;

    const todayRouter = require("../src/routes/today");
    app.use("/api/today", todayRouter);

    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    return app;
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  it("GET /api/today returns 401 for anonymous request", async () => {
    const app = createApp(null);
    const res = await request(app).get("/api/today");
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, "Unauthorized");
  });

  // ─── Response shape ───────────────────────────────────────────────────────────

  it("GET /api/today returns queue and pulse objects for authenticated user", async () => {
    const app = createApp("user_123");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.queue), "queue should be an array");
    assert.ok(typeof res.body.pulse === "object", "pulse should be an object");
    assert.ok("totalValue" in res.body.pulse, "pulse should have totalValue");
    assert.ok("drawdownPct" in res.body.pulse, "pulse should have drawdownPct");
    assert.ok(
      "missingStopCount" in res.body.pulse,
      "pulse should have missingStopCount",
    );
  });

  it("GET /api/today returns empty queue when user has no data", async () => {
    const app = createApp("user_empty");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.queue.length, 0);
    assert.equal(res.body.pulse.totalValue, 0);
  });

  // ─── Priority ordering ───────────────────────────────────────────────────────

  it("queue items are ordered: protect > prepare > opportunity > learn", async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(
      today.getTime() - 20 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Swing trade held 20 days → time stop (Prepare)
    mockHoldings = [
      { ticker: "AAPL", shares: 10, avg_cost: 150, sector: "Technology" },
    ];
    mockJournal = [
      {
        ticker: "AAPL",
        status: "OPEN",
        mode: "Swing Trade",
        stop_loss: 100, // valid stop, so NOT a missing-stop Protect item
        notes: "",
        opened_at: sevenDaysAgo,
      },
    ];
    // Watchlist alert triggered (Opportunity)
    mockWatchlists = [
      { ticker: "MSFT", alert_price: 200, alert_type: "above", name: "MSFT" },
    ];
    // Closed trade with no notes → post-mortem (Learn)
    mockJournal.push({
      ticker: "TSLA",
      status: "CLOSED",
      notes: "",
      mode: "Swing Trade",
    });

    // Price for MSFT triggers above-alert (200+)
    mockEnriched = [
      {
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        price: 155,
        change: 0,
        changePct: 0,
        beta: 1.0,
        earningsTimestamp: null,
        spark: [],
        sector: "Technology",
        stop_loss: 100,
        mode: "Swing Trade",
        opened_at: sevenDaysAgo,
      },
      {
        ticker: "MSFT",
        alert_price: 200,
        alert_type: "above",
        price: 210,
        change: 0,
        changePct: 0,
        beta: 1.0,
        earningsTimestamp: null,
        spark: [],
      },
    ];

    const app = createApp("user_priority");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    const categories = res.body.queue.map((c) => c.category);
    // Prepare should appear before Opportunity
    const prepareIdx = categories.indexOf("prepare");
    const opportunityIdx = categories.indexOf("opportunity");
    const learnIdx = categories.indexOf("learn");

    if (prepareIdx !== -1 && opportunityIdx !== -1) {
      assert.ok(
        prepareIdx < opportunityIdx,
        "prepare should come before opportunity",
      );
    }
    if (opportunityIdx !== -1 && learnIdx !== -1) {
      assert.ok(
        opportunityIdx < learnIdx,
        "opportunity should come before learn",
      );
    }
  });

  // ─── Protect Capital triggers ─────────────────────────────────────────────────

  it("generates a protect item when stop_loss is missing for an open trade", async () => {
    mockHoldings = [
      { ticker: "NVDA", shares: 5, avg_cost: 400, sector: "Technology" },
    ];
    mockJournal = [
      {
        ticker: "NVDA",
        status: "OPEN",
        mode: "Swing Trade",
        stop_loss: null,
        notes: "",
        opened_at: new Date().toISOString(),
      },
    ];

    const app = createApp("user_missing_stop");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    const protectItems = res.body.queue.filter((c) => c.category === "protect");
    assert.ok(
      protectItems.length > 0,
      "should have at least one protect item for missing stop",
    );
  });

  it("generates a protect item when thesis has #failed tag in notes", async () => {
    mockHoldings = [
      {
        ticker: "META",
        shares: 3,
        avg_cost: 500,
        sector: "Communication Services",
      },
    ];
    mockJournal = [
      {
        ticker: "META",
        status: "OPEN",
        mode: "Long-Term/Core",
        stop_loss: 400,
        notes: "Thesis is broken. #failed guidance miss",
        opened_at: new Date().toISOString(),
      },
    ];

    const app = createApp("user_thesis_failed");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    const protectItems = res.body.queue.filter((c) => c.category === "protect");
    assert.ok(
      protectItems.length > 0,
      "should have protect item for thesis failure",
    );
    const thesisItem = protectItems.find((c) => c.type === "thesis_failure");
    assert.ok(thesisItem, "should have a thesis_failure typed card");
  });

  // ─── Learn triggers ───────────────────────────────────────────────────────────

  it("generates a learn item for closed trade with no notes", async () => {
    mockHoldings = [];
    mockJournal = [
      { ticker: "AMD", status: "CLOSED", notes: "", mode: "Swing Trade" },
    ];

    const app = createApp("user_learn");
    const res = await request(app).get("/api/today");

    assert.equal(res.statusCode, 200);
    const learnItems = res.body.queue.filter((c) => c.category === "learn");
    assert.ok(
      learnItems.length > 0,
      "should have a learn post-mortem reminder",
    );
  });
});
