const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

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
      if (previousServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
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
    const apiSource = fs.readFileSync(path.join(__dirname, "../src/routes/api.js"), "utf8");

    assert.doesNotMatch(apiSource, /bootstrapUserData|importMarkdownSnapshotForOwner|Auto-migration/i);
  });
});
