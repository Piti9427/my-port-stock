"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFinnhubQuoteSource,
  buildNasdaqQuoteSource,
  buildStooqQuoteSource,
  buildYahooQuoteSource,
  parseMoney,
  parseSimpleCsv,
} = require("../src/sources/quoteSources");

describe("Quote Sources Resiliency & Fallback Data Contracts", () => {
  describe("parseMoney utility", () => {
    it("parses valid numeric and formatted string prices", () => {
      assert.equal(parseMoney(150.25), 150.25);
      assert.equal(parseMoney("$1,234.56"), 1234.56);
      assert.equal(parseMoney("  $ 99.90 "), 99.9);
    });

    it("returns null for invalid, empty, or N/A values", () => {
      assert.equal(parseMoney(null), null);
      assert.equal(parseMoney(undefined), null);
      assert.equal(parseMoney("N/A"), null);
      assert.equal(parseMoney(""), null);
      assert.equal(parseMoney("invalid_text"), null);
    });
  });

  describe("parseSimpleCsv utility", () => {
    it("parses two-line Stooq CSV format into an object", () => {
      const csv = "Symbol,Date,Time,Open,High,Low,Close,Volume\nAAPL.US,2026-07-25,22:00:00,220.0,225.0,219.0,224.5,50000000";
      const result = parseSimpleCsv(csv);
      assert.equal(result.Symbol, "AAPL.US");
      assert.equal(result.Close, "224.5");
      assert.equal(result.Date, "2026-07-25");
    });

    it("returns null for malformed or single-line CSV", () => {
      assert.equal(parseSimpleCsv(null), null);
      assert.equal(parseSimpleCsv("Header,Only"), null);
      assert.equal(parseSimpleCsv(""), null);
    });
  });

  describe("buildYahooQuoteSource fail-closed behavior", () => {
    it("returns insufficientData when Yahoo quote is null or empty", () => {
      const result = buildYahooQuoteSource(null);
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Yahoo/i);
    });

    it("returns insufficientData when price or timestamp field is missing", () => {
      const result = buildYahooQuoteSource({ regularMarketPrice: 150 }); // missing timestamp
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Yahoo price or timestamp/i);
    });
  });

  describe("buildNasdaqQuoteSource fail-closed behavior", () => {
    it("returns insufficientData for non-US equity symbol", () => {
      const result = buildNasdaqQuoteSource("123_INVALID!", {});
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /US equity/i);
    });

    it("returns insufficientData when primaryData is missing or corrupt", () => {
      const result = buildNasdaqQuoteSource("AAPL", { data: {} });
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Nasdaq returned no quote data/i);
    });

    it("returns insufficientData when lastSalePrice is N/A", () => {
      const payload = {
        data: {
          primaryData: {
            lastSalePrice: "N/A",
            lastTradeTimestamp: "Jul 25, 2026 4:00 PM ET",
          },
        },
      };
      const result = buildNasdaqQuoteSource("AAPL", payload);
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Nasdaq price or timestamp/i);
    });
  });

  describe("buildStooqQuoteSource fail-closed behavior", () => {
    it("returns insufficientData when CSV string is invalid or empty", () => {
      const result = buildStooqQuoteSource("AAPL", "invalid csv content");
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Stooq/i);
    });
  });

  describe("buildFinnhubQuoteSource fail-closed behavior", () => {
    it("returns insufficientData when price 'c' is 0 or missing", () => {
      const result = buildFinnhubQuoteSource("AAPL", { c: 0, t: 1700000000 });
      assert.equal(result.status, "INSUFFICIENT_DATA");
      assert.match(result.error_details, /Finnhub/i);
    });
  });
});
