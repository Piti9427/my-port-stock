const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

function loadIsolatedApi({ userId, scopedDb, scopedClientFactory }) {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;

  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "eyJhbGci.test";

  const dbPath = require.resolve("../src/db");
  const supabaseClientPath = require.resolve("../src/db/supabaseClient");
  const apiPath = require.resolve("../src/routes/api");
  for (const mod of [apiPath, dbPath, supabaseClientPath]) {
    delete require.cache[mod];
  }

  const db = require("../src/db");
  const supabaseClient = require("../src/db/supabaseClient");
  const originalGetScopedDb = db.getScopedDb;
  const originalCreateScopedClient = supabaseClient.createScopedClient;
  db.getScopedDb = scopedDb;
  if (scopedClientFactory) {
    supabaseClient.createScopedClient = scopedClientFactory;
  }

  const router = require("../src/routes/api");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId };
    next();
  });
  app.use("/api", router);

  return {
    app,
    restore() {
      db.getScopedDb = originalGetScopedDb;
      supabaseClient.createScopedClient = originalCreateScopedClient;
      for (const mod of [apiPath, dbPath, supabaseClientPath]) {
        delete require.cache[mod];
      }
      if (prevUrl) process.env.SUPABASE_URL = prevUrl;
      else delete process.env.SUPABASE_URL;
      if (prevKey) process.env.SUPABASE_ANON_KEY = prevKey;
      else delete process.env.SUPABASE_ANON_KEY;
    },
  };
}

describe("API Routes", () => {
  it("fails closed on invalid analyze ticker", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/analyze")
      .send({ ticker: "not valid ticker", portfolioData: { shares: 10 } });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
  });

  it("fails closed on invalid chat ticker", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/chat")
      .send({ ticker: "not valid ticker", message: "What changed?" });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
  });

  it("requires authenticated context before market chat", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/chat")
      .send({ ticker: "NVDA", message: "What invalidates the thesis?" });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, "Unauthorized");
  });

  it("rejects control characters in market chat messages", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/chat")
      .send({ ticker: "NVDA", message: "hidden\u0000control" });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Message must be 1-1000 characters" });
  });

  it("rejects market chat messages over 1,000 characters", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/chat")
      .send({ ticker: "NVDA", message: "x".repeat(1001) });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Message must be 1-1000 characters" });
  });

  it("allows tabs and newlines through market chat message validation", async () => {
    const { app } = require("../server");

    const res = await request(app)
      .post("/api/chat")
      .send({ ticker: "NVDA", message: "line one\n\tline two" });

    assert.equal(res.statusCode, 401);
  });
});

describe("route input validation", () => {
  let restore = () => {};

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it("rejects malformed watchlist tickers before Supabase access", async () => {
    let supabaseCalls = 0;
    const loaded = loadIsolatedApi({
      userId: "user_a",
      scopedDb: () => ({}),
      scopedClientFactory: () => {
        supabaseCalls += 1;
        throw new Error("database secret detail");
      },
    });
    restore = loaded.restore;

    const res = await request(loaded.app).delete("/api/watchlists/not%20valid");

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Invalid ticker format" });
    assert.equal(supabaseCalls, 0);
  });

  it("rejects malformed journal IDs before Supabase access", async () => {
    let supabaseCalls = 0;
    const loaded = loadIsolatedApi({
      userId: "user_a",
      scopedDb: () => ({}),
      scopedClientFactory: () => {
        supabaseCalls += 1;
        throw new Error("database secret detail");
      },
    });
    restore = loaded.restore;

    const res = await request(loaded.app).delete("/api/journal/not-a-uuid");

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Invalid journal ID" });
    assert.equal(supabaseCalls, 0);
  });
});

describe("runtime portfolio isolation", () => {
  let restore = () => {};

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it("returns empty holdings for a user with no Supabase rows", async () => {
    const loaded = loadIsolatedApi({
      userId: "user_b",
      scopedDb: () => ({
        getUserHoldings: async () => [],
        getUserJournal: async () => [],
        getUserWatchlists: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app).get("/api/holdings");

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
  });

  it("does not return user A rows to user B", async () => {
    const userATrades = [{ ticker: "NVDA", type: "BUY", shares: 1, price: 100 }];
    const loaded = loadIsolatedApi({
      userId: "user_b",
      scopedDb: (userId) => ({
        getUserHoldings: async () => [],
        getUserJournal: async (id) => (id === "user_b" ? [] : userATrades),
        getUserWatchlists: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app).get("/api/journal");

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.trades, []);
    assert.doesNotMatch(JSON.stringify(res.body), /NVDA/);
  });
});
