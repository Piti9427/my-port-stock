const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchSparkline,
  getLivePrice,
  getUsdThbRate,
} = require("../src/services/marketData");

test("market data service exports live price helpers", () => {
  assert.equal(typeof getLivePrice, "function");
  assert.equal(typeof getUsdThbRate, "function");
});

test("fetchSparkline uses chart with a bounded date range", async () => {
  const now = Date.UTC(2026, 5, 21, 12);
  let chartCall;
  const yahooClient = {
    chart: async (ticker, options) => {
      chartCall = { ticker, options };
      return {
        quotes: [
          { close: 100 },
          { close: null },
          { close: 102.5 },
        ],
      };
    },
  };

  const sparkline = await fetchSparkline("NVDA", now, yahooClient);

  assert.deepEqual(sparkline, [100, 102.5]);
  assert.equal(chartCall.ticker, "NVDA");
  assert.equal(chartCall.options.interval, "1d");
  assert.equal(chartCall.options.period2.getTime(), now);
  assert.equal(
    chartCall.options.period1.getTime(),
    now - 7 * 24 * 60 * 60 * 1000,
  );
});
