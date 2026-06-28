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
});
