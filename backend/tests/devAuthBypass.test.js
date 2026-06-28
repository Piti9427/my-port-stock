const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

function snapshotEnv(keys) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearRuntimeModules() {
  [
    "../server",
    "../src/routes/api",
    "../src/db",
    "../src/db/supabaseClient",
  ].forEach((mod) => {
    delete require.cache[require.resolve(mod)];
  });
}

function loadServerWithScopedDb({
  nodeEnv = "test",
  devUiAuthBypass,
  scopedDb,
} = {}) {
  const envKeys = [
    "NODE_ENV",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DEV_UI_AUTH_BYPASS",
  ];
  const previousEnv = snapshotEnv(envKeys);

  process.env.NODE_ENV = nodeEnv;
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "eyJhbGci.test";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_JWT_SECRET = "test_supabase_jwt_secret";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
  process.env.CLERK_SECRET_KEY = "sk_test_123";
  if (devUiAuthBypass === undefined) delete process.env.DEV_UI_AUTH_BYPASS;
  else process.env.DEV_UI_AUTH_BYPASS = devUiAuthBypass;

  clearRuntimeModules();

  const db = require("../src/db");
  const calls = [];
  db.getScopedDb = (userId) => {
    calls.push(userId);
    return scopedDb(userId);
  };

  const { app } = require("../server");

  return {
    app,
    calls,
    restore() {
      clearRuntimeModules();
      restoreEnv(previousEnv);
    },
  };
}

describe("dev UI auth bypass", () => {
  let restore = () => {};

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it("accepts the exact dev UI bearer token when explicitly enabled outside production", async () => {
    const loaded = loadServerWithScopedDb({
      devUiAuthBypass: "true",
      scopedDb: () => ({
        getUserHoldings: async () => [],
        getUserJournal: async () => [],
        getUserWatchlists: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .get("/api/holdings")
      .set("Authorization", "Bearer dev-ui-auth-bypass");

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
    assert.deepEqual(loaded.calls, ["dev-ui-user"]);
  });

  it("issues a short-lived WebSocket ticket through authenticated HTTP", async () => {
    const loaded = loadServerWithScopedDb({
      devUiAuthBypass: "true",
      scopedDb: () => ({}),
    });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .post("/api/ws-ticket")
      .set("Authorization", "Bearer dev-ui-auth-bypass");

    assert.equal(res.statusCode, 200);
    assert.match(res.body.ticket, /^[0-9a-f-]{36}$/i);
    assert.equal(res.body.expires_in_seconds, 30);
  });

  it("rejects the dev UI token when the bypass flag is not enabled", async () => {
    const loaded = loadServerWithScopedDb({
      scopedDb: () => ({
        getUserHoldings: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .get("/api/holdings")
      .set("Authorization", "Bearer dev-ui-auth-bypass");

    assert.equal(res.statusCode, 401);
    assert.deepEqual(loaded.calls, []);
  });

  it("rejects the dev UI token in production even when the flag is set", async () => {
    const loaded = loadServerWithScopedDb({
      nodeEnv: "production",
      devUiAuthBypass: "true",
      scopedDb: () => ({
        getUserHoldings: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .get("/api/holdings")
      .set("Authorization", "Bearer dev-ui-auth-bypass");

    assert.equal(res.statusCode, 401);
    assert.deepEqual(loaded.calls, []);
  });

  it("rejects non-exact bearer tokens when the bypass flag is enabled", async () => {
    const loaded = loadServerWithScopedDb({
      devUiAuthBypass: "true",
      scopedDb: () => ({
        getUserHoldings: async () => [],
      }),
    });
    restore = loaded.restore;

    const res = await request(loaded.app)
      .get("/api/holdings")
      .set("Authorization", "Bearer wrong-token");

    assert.equal(res.statusCode, 401);
    assert.deepEqual(loaded.calls, []);
  });
});
