const { describe, it } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const { app } = require("../backend/server");

describe("Express Server - Static Serving", () => {
  it("should serve static frontend files on the root route", async () => {
    const res = await request(app).get("/");
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/html/);
  });

  it("should catch-all non-api routes and return frontend/dist/index.html", async () => {
    const res = await request(app).get("/some-random-react-route");
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/html/);
  });
});
