const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

const { app } = require("../server");

describe("HTTP hardening", () => {
  it("assigns a server-generated request ID", async () => {
    const response = await request(app)
      .get("/health")
      .set("X-Request-ID", "client-controlled");

    assert.match(response.headers["x-request-id"], /^[0-9a-f-]{36}$/i);
    assert.notEqual(response.headers["x-request-id"], "client-controlled");
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await request(app).get("/api/does-not-exist");

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, {
      error: "Not found",
      requestId: response.headers["x-request-id"],
    });
  });

  it("sanitizes unexpected internal errors", async () => {
    const { requestContext } = require("../src/http/appMiddleware");
    const { errorHandler, notFoundHandler } = require("../src/http/errors");
    const testApp = express();

    testApp.use(requestContext);
    testApp.get("/__throw", async () => {
      throw new Error("database secret detail");
    });
    testApp.use(notFoundHandler);
    testApp.use(errorHandler);

    const response = await request(testApp).get("/__throw");

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, {
      error: "Internal server error",
      requestId: response.headers["x-request-id"],
    });
    assert.doesNotMatch(JSON.stringify(response.body), /database|stack|secret/i);
  });

  it("sets security headers without exposing Express", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.ok(response.headers["content-security-policy"]);
    assert.ok(response.headers["referrer-policy"]);
    assert.equal(response.headers["x-powered-by"], undefined);
  });

  it("publishes standard rate-limit policies without legacy headers", async () => {
    const ordinary = await request(app).get("/api/does-not-exist");
    const quote = await request(app).get("/api/quote/not%20valid");
    const ai = await request(app)
      .post("/api/analyze")
      .send({ ticker: "not valid" });

    assert.match(String(ordinary.headers.ratelimit), /"ordinary"/);
    assert.match(String(quote.headers.ratelimit), /"quote"/);
    assert.match(String(ai.headers.ratelimit), /"ai"/);
    assert.equal(ordinary.headers["x-ratelimit-limit"], undefined);
    assert.equal(quote.headers["x-ratelimit-limit"], undefined);
    assert.equal(ai.headers["x-ratelimit-limit"], undefined);
  });

  it("exempts health checks from the global limiter", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers.ratelimit, undefined);
  });

  it("keys limits on the forwarded client behind exactly one proxy", async () => {
    const { createApiRateLimiters } = require("../src/http/appMiddleware");
    const proxyApp = express();
    const { ordinary } = createApiRateLimiters({ ordinaryLimit: 1 });

    proxyApp.set("trust proxy", 1);
    proxyApp.use(requestContextForTest());
    proxyApp.use(ordinary);
    proxyApp.get("/resource", (_req, res) => res.status(200).json({ ok: true }));

    const first = await request(proxyApp)
      .get("/resource")
      .set("X-Forwarded-For", "203.0.113.10");
    const blocked = await request(proxyApp)
      .get("/resource")
      .set("X-Forwarded-For", "203.0.113.10");
    const otherClient = await request(proxyApp)
      .get("/resource")
      .set("X-Forwarded-For", "203.0.113.11");

    assert.equal(first.statusCode, 200);
    assert.equal(blocked.statusCode, 429);
    assert.deepEqual(blocked.body, {
      error: "Too many requests",
      requestId: blocked.headers["x-request-id"],
    });
    assert.equal(otherClient.statusCode, 200);
  });
});

function requestContextForTest() {
  const { requestContext } = require("../src/http/appMiddleware");
  return requestContext;
}
