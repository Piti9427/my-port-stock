const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

function loadIsolatedApi({ userId, scopedDb }) {
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
  const originalGetScopedDb = db.getScopedDb;
  db.getScopedDb = scopedDb;

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
