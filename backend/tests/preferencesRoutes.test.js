// backend/tests/preferencesRoutes.test.js
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

describe("Preferences API Routes", () => {
  let prevUrl;
  let prevKey;
  let mockSupabaseConfigured = true;
  let mockUserPreferences = null;
  let lastUpsertData = null;

  beforeEach(() => {
    prevUrl = process.env.SUPABASE_URL;
    prevKey = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_URL = "https://test-project.supabase.co";
    process.env.SUPABASE_ANON_KEY = "eyJhbGci.test";

    // Clean up caches
    for (const mod of [
      require.resolve("../src/db/supabaseClient"),
      require.resolve("../src/preferences/preferenceRepository"),
      require.resolve("../src/routes/preferences"),
      require.resolve("../src/routes/api"),
    ]) {
      delete require.cache[mod];
    }

    mockUserPreferences = null;
    lastUpsertData = null;
    mockSupabaseConfigured = true;

    // Mock supabaseConfigured
    const supabaseClient = require("../src/db/supabaseClient");
    Object.defineProperty(supabaseClient, "supabaseConfigured", {
      get() {
        return mockSupabaseConfigured;
      },
      configurable: true,
    });

    // Mock preferenceRepository
    const preferenceRepository = require("../src/preferences/preferenceRepository");
    preferenceRepository.getForUser = async (userId) => {
      if (!mockSupabaseConfigured) {
        throw new Error("Supabase is not configured");
      }
      return mockUserPreferences;
    };
    preferenceRepository.upsertForUser = async (userId, data) => {
      if (!mockSupabaseConfigured) {
        throw new Error("Supabase is not configured");
      }
      lastUpsertData = {
        ...data,
        user_id: userId,
        onboarding_completed_at:
          mockUserPreferences?.onboarding_completed_at ||
          new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return lastUpsertData;
    };
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
    app.use((req, res, next) => {
      req.auth = () => ({ userId: userId || null });
      next();
    });

    const preferencesRouter = require("../src/routes/preferences");
    app.use("/api/preferences", preferencesRouter);
    app.use((err, req, res, next) => {
      console.error("TEST ROUTE ERROR:", err.stack || err);
      res.status(500).json({ error: err.message });
    });
    return app;
  }

  it("GET /api/preferences rejects anonymous request with 401", async () => {
    const app = createApp(null);
    const res = await request(app).get("/api/preferences");
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: "Unauthorized" });
  });

  it("GET /api/preferences returns defaults and onboarding_completed: false when no preference row exists", async () => {
    const app = createApp("user_123");
    mockUserPreferences = null;

    const res = await request(app).get("/api/preferences");
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reporting_currency, "THB");
    assert.equal(res.body.disclosure_level, "beginner");
    assert.equal(res.body.theme, "light");
    assert.equal(res.body.onboarding_completed, false);
  });

  it("GET /api/preferences returns existing preferences and onboarding_completed: true", async () => {
    const app = createApp("user_123");
    mockUserPreferences = {
      user_id: "user_123",
      reporting_currency: "USD",
      disclosure_level: "advanced",
      theme: "dark",
      onboarding_completed_at: "2026-07-03T00:00:00.000Z",
    };

    const res = await request(app).get("/api/preferences");
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reporting_currency, "USD");
    assert.equal(res.body.disclosure_level, "advanced");
    assert.equal(res.body.theme, "dark");
    assert.equal(res.body.onboarding_completed, true);
  });

  it("GET /api/preferences returns 503 when database is unconfigured", async () => {
    const app = createApp("user_123");
    mockSupabaseConfigured = false;

    const res = await request(app).get("/api/preferences");
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
  });

  it("PUT /api/preferences rejects anonymous request with 401", async () => {
    const app = createApp(null);
    const res = await request(app).put("/api/preferences").send({
      reporting_currency: "THB",
      disclosure_level: "beginner",
      theme: "light",
    });
    assert.equal(res.statusCode, 401);
  });

  it("PUT /api/preferences upserts valid preferences successfully", async () => {
    const app = createApp("user_123");
    const payload = {
      reporting_currency: "USD",
      disclosure_level: "advanced",
      theme: "dark",
    };

    const res = await request(app).put("/api/preferences").send(payload);

    assert.equal(res.statusCode, 200);
    assert.equal(lastUpsertData.reporting_currency, "USD");
    assert.equal(lastUpsertData.disclosure_level, "advanced");
    assert.equal(lastUpsertData.theme, "dark");
    assert.equal(lastUpsertData.user_id, "user_123");
  });

  it("PUT /api/preferences accepts theme system successfully", async () => {
    const app = createApp("user_123");
    const payload = {
      reporting_currency: "THB",
      disclosure_level: "beginner",
      theme: "system",
    };

    const res = await request(app).put("/api/preferences").send(payload);

    assert.equal(res.statusCode, 200);
    assert.equal(lastUpsertData.theme, "system");
  });

  it("PUT /api/preferences rejects invalid currency, disclosure level, or theme with 400", async () => {
    const app = createApp("user_123");

    const badCurrency = await request(app).put("/api/preferences").send({
      reporting_currency: "EUR",
      disclosure_level: "beginner",
      theme: "light",
    });
    assert.equal(badCurrency.statusCode, 400);

    const badDisclosure = await request(app).put("/api/preferences").send({
      reporting_currency: "THB",
      disclosure_level: "expert",
      theme: "light",
    });
    assert.equal(badDisclosure.statusCode, 400);

    const badTheme = await request(app).put("/api/preferences").send({
      reporting_currency: "THB",
      disclosure_level: "beginner",
      theme: "blue",
    });
    assert.equal(badTheme.statusCode, 400);
  });

  it("PUT /api/preferences rejects unknown keys or risk-policy overrides", async () => {
    const app = createApp("user_123");

    const res = await request(app).put("/api/preferences").send({
      reporting_currency: "USD",
      disclosure_level: "advanced",
      theme: "dark",
      minRR: 5,
      maxSpeculativePct: 50,
    });

    assert.equal(res.statusCode, 400);
  });
});
