const test = require("node:test");
const assert = require("node:assert/strict");

const { getLivePrice, getUsdThbRate } = require("../src/services/marketData");

test("market data service exports live price helpers", () => {
  assert.equal(typeof getLivePrice, "function");
  assert.equal(typeof getUsdThbRate, "function");
});
