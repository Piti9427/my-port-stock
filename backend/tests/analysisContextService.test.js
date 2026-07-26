"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAuthenticatedAnalysisContext,
  buildManualVerifiedPacket,
  getCachedQuote,
  quoteCache,
} = require("../src/services/analysisContextService");

describe("Analysis Context Service", () => {
  describe("Quote Caching & TTL", () => {
    it("returns null when ticker is not in cache", () => {
      assert.equal(getCachedQuote("NONEXISTENT_TICKER"), null);
    });

    it("evicts stale quotes when TTL (60s) has passed", () => {
      const mockPacket = { ticker: "AAPL", last_price: 150 };
      quoteCache.set("AAPL", {
        cachedAt: Date.now() - 65_000, // 65 seconds ago (stale)
        packet: mockPacket,
      });

      assert.equal(getCachedQuote("AAPL"), null);
    });

    it("returns cached quote packet when within TTL", () => {
      const mockPacket = { ticker: "MSFT", last_price: 300 };
      quoteCache.set("MSFT", {
        cachedAt: Date.now() - 5_000, // 5 seconds ago (fresh)
        packet: mockPacket,
      });

      const cached = getCachedQuote("MSFT");
      assert.ok(cached);
      assert.equal(cached.last_price, 300);
    });
  });

  describe("Authenticated Analysis Context & Journal Issues", () => {
    it("fails closed when userId is missing", async () => {
      const context = await buildAuthenticatedAnalysisContext({
        ticker: "AAPL",
        userId: null,
      });

      assert.equal(context.status, "INSUFFICIENT_DATA");
      assert.match(context.error_details, /Missing authenticated user/i);
    });

    it("detects unresolved journal issues (missing stop loss and R/R < 1:2)", async () => {
      const mockDb = {
        getUserPortfolio: async () => [{ ticker: "NVDA", shares: 10, avg_cost: 120 }],
        getUserJournalByTicker: async () => [
          {
            id: "j1",
            ticker: "NVDA",
            status: "OPEN",
            stop_loss: null, // missing stop loss
            risk_reward: 1.5, // below 1:2
          },
        ],
      };

      const context = await buildAuthenticatedAnalysisContext({
        ticker: "NVDA",
        userId: "user_test_123",
        db: mockDb,
      });

      assert.equal(context.status, "READY");
      assert.equal(context.portfolioContext.is_held, true);
      assert.equal(context.journalContext.is_active_trade, true);

      const issues = context.journalContext.unresolved_issues;
      assert.ok(issues.some((issue) => issue.includes("missing an executable stop-loss")));
      assert.ok(issues.some((issue) => issue.includes("below 1:2")));
    });
  });

  describe("Manual Verified Data Packet Construction", () => {
    it("constructs Tier 1 manual override packet with user context", async () => {
      const mockDb = {
        getUserPortfolio: async () => [],
        getUserJournalByTicker: async () => [],
      };

      const packet = await buildManualVerifiedPacket("TSLA", 250.0, "Swing Trade", {
        userId: "user_test_123",
        db: mockDb,
      });

      assert.ok(packet);
      assert.equal(packet.ticker, "TSLA");
      assert.equal(packet.last_price, 250.0);
      assert.deepEqual(packet.price_source_tiers, ["Tier 1"]);
    });
  });
});
