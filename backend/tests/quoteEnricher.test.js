const { describe, it, mock, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const marketData = require("../src/services/marketData");

describe("quoteEnricher", () => {
  let enrichWithMarketData, getSparkline, yahooFinance;

  let currentFetchSparkline;

  beforeEach(() => {
    currentFetchSparkline = async () => [145, 148, 150];
    delete require.cache[require.resolve("../src/services/quoteEnricher")];
    
    mock.method(marketData, "fetchSparkline", async (...args) => currentFetchSparkline(...args));
    
    const quoteEnricher = require("../src/services/quoteEnricher");
    enrichWithMarketData = quoteEnricher.enrichWithMarketData;
    getSparkline = quoteEnricher.getSparkline;
    yahooFinance = quoteEnricher.yahooFinance;

    mock.method(yahooFinance, "quote", async () => ({
      regularMarketPrice: 150,
      regularMarketChange: 5,
      regularMarketChangePercent: 3.4,
      beta: 1.2,
      earningsTimestamp: 1600000000,
    }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("enrichWithMarketData returns enriched items with price, change, changePct, beta, spark", async () => {
    const items = [{ ticker: "AAPL", shares: 10 }];
    const result = await enrichWithMarketData(items);
    assert.equal(result.length, 1);
    assert.equal(result[0].ticker, "AAPL");
    assert.equal(result[0].price, 150);
    assert.equal(result[0].change, 5);
    assert.equal(result[0].changePct, 3.4);
    assert.equal(result[0].beta, 1.2);
    assert.equal(result[0].earningsTimestamp, 1600000000);
    assert.deepEqual(result[0].spark, [145, 148, 150]);
  });

  it("enrichWithMarketData gracefully handles quote failure", async () => {
    yahooFinance.quote.mock.restore();
    mock.method(yahooFinance, "quote", async () => { throw new Error("Quote failed"); });

    const items = [{ ticker: "AAPL", shares: 10 }];
    const result = await enrichWithMarketData(items);
    assert.equal(result.length, 1);
    assert.equal(result[0].price, null);
    assert.equal(result[0].change, null);
    assert.equal(result[0].changePct, null);
    assert.equal(result[0].beta, 1.0);
    assert.equal(result[0].earningsTimestamp, null);
    assert.deepEqual(result[0].spark, []);
  });

  it("enrichWithMarketData handles empty items array", async () => {
    const result = await enrichWithMarketData([]);
    assert.deepEqual(result, []);
  });

  it("getSparkline caches results and returns cached data on second call", async () => {
    let callCount = 0;
    currentFetchSparkline = async () => {
      callCount++;
      return [1, 2, 3];
    };

    const spark1 = await getSparkline("CACHE_TEST_1");
    const spark2 = await getSparkline("CACHE_TEST_1");

    assert.deepEqual(spark1, [1, 2, 3]);
    assert.deepEqual(spark2, [1, 2, 3]);
    assert.equal(callCount, 1, "fetchSparkline should have been called only once");
  });

  it("getSparkline returns [0, 0] on fetchSparkline failure", async () => {
    currentFetchSparkline = async () => {
      throw new Error("Fetch failed");
    };

    const result = await getSparkline("FAIL_TEST_1");
    assert.deepEqual(result, [0, 0]);
  });
});
