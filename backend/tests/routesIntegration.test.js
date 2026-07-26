const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const http = require("http");

async function loadIsolatedApi({ userId, scopedDb, scopedClientFactory }) {
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
    req.auth = userId ? { userId } : null;
    next();
  });
  app.use("/api", router);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  return {
    app: server,
    restore() {
      server.close();
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

describe("routesIntegration", () => {
  let restore = () => {};

  afterEach(() => {
    restore();
    mock.restoreAll();
  });

  describe("POST /api/journal", () => {
    it("Returns 401 when unauthenticated", async () => {
      const loaded = await loadIsolatedApi({ userId: null });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/journal").send({});
      assert.equal(res.statusCode, 401);
    });

    it("Returns 400 with invalid body (missing required fields)", async () => {
      const loaded = await loadIsolatedApi({ userId: "user_1" });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/journal").send({});
      assert.equal(res.statusCode, 400);
    });

    it("Returns 200 with valid journal entry body", async () => {
      const loaded = await loadIsolatedApi({
        userId: "user_1",
        scopedDb: () => ({
          insertJournalEntry: async () => ({ id: "123", ticker: "NVDA" }),
        }),
      });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/journal").send({
        ticker: "NVDA",
        type: "BUY",
        shares: 10,
        price: 150
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { id: "123", ticker: "NVDA" });
    });
  });

  describe("GET /api/watchlists", () => {
    it("Returns 401 when unauthenticated", async () => {
      const loaded = await loadIsolatedApi({ userId: null });
      restore = loaded.restore;
      const res = await request(loaded.app).get("/api/watchlists");
      assert.equal(res.statusCode, 401);
    });

    it("Returns 200 with array response when authenticated", async () => {
      const loaded = await loadIsolatedApi({
        userId: "user_1",
        scopedDb: () => ({
          getUserWatchlists: async () => [{ ticker: "NVDA" }],
        }),
      });
      restore = loaded.restore;
      
      const res = await request(loaded.app).get("/api/watchlists");
      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body), "Response should be an array");
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].ticker, "NVDA");
    });
  });

  describe("POST /api/watchlists", () => {
    it("Returns 401 when unauthenticated", async () => {
      const loaded = await loadIsolatedApi({ userId: null });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/watchlists").send({});
      assert.equal(res.statusCode, 401);
    });

    it("Returns 400 with missing ticker", async () => {
      const loaded = await loadIsolatedApi({ userId: "user_1" });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/watchlists").send({});
      assert.equal(res.statusCode, 400);
    });

    it("Returns 200/201 with valid watchlist body", async () => {
      const mockSupabaseClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [] })
            })
          }),
          insert: () => ({
            select: () => Promise.resolve({ data: [{ id: "w1", ticker: "NVDA" }] })
          })
        })
      };

      const loaded = await loadIsolatedApi({
        userId: "user_1",
        scopedClientFactory: () => mockSupabaseClient
      });
      restore = loaded.restore;
      const res = await request(loaded.app).post("/api/watchlists").send({
        ticker: "NVDA",
        name: "Nvidia"
      });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, [{ id: "w1", ticker: "NVDA" }]);
    });
  });

  describe("DELETE /api/journal/:id", () => {
    it("Returns 401 when unauthenticated", async () => {
      const loaded = await loadIsolatedApi({ userId: null });
      restore = loaded.restore;
      const res = await request(loaded.app).delete("/api/journal/123e4567-e89b-12d3-a456-426614174000");
      assert.equal(res.statusCode, 401);
    });

    it("Returns 400 with invalid (non-UUID) id", async () => {
      const loaded = await loadIsolatedApi({ userId: "user_1" });
      restore = loaded.restore;
      const res = await request(loaded.app).delete("/api/journal/invalid-id");
      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { error: "Invalid journal ID" });
    });

    it("Returns 200 with valid UUID", async () => {
      const mockSupabaseClient = {
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [{ id: "123e4567-e89b-12d3-a456-426614174000" }] })
              })
            })
          })
        })
      };

      const loaded = await loadIsolatedApi({
        userId: "user_1",
        scopedClientFactory: () => mockSupabaseClient
      });
      restore = loaded.restore;
      const res = await request(loaded.app).delete("/api/journal/123e4567-e89b-12d3-a456-426614174000");
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, "Journal entry soft-deleted successfully");
      assert.deepEqual(res.body.data, [{ id: "123e4567-e89b-12d3-a456-426614174000" }]);
    });
  });
});
