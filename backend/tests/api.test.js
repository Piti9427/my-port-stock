const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { app } = require("../server");

describe("API Routes", () => {
  it("fails closed on invalid analyze ticker", async () => {
    const res = await request(app)
      .post("/api/analyze")
      .send({ ticker: "not valid ticker", portfolioData: { shares: 10 } });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "INSUFFICIENT_DATA");
  });
});
