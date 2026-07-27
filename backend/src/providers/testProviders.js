"use strict";

const FIXTURE_TIME = "2026-07-27T14:30:00.000Z";

function quoteSource(source, lastPrice) {
  return {
    source,
    tier: "Tier 2",
    last_price: lastPrice,
    quote_timestamp: FIXTURE_TIME,
    quote_delay_status: "fixture",
  };
}

function createQuoteProvider(
  scenario = process.env.MPS_TEST_SCENARIO || "valid",
) {
  return {
    /** @param {string} ticker */
    async fetchQuoteSources(ticker) {
      const activeScenario =
        scenario === "matrix" && ticker === "CONFLICT"
          ? "conflict"
          : scenario === "matrix" && ticker === "FAIL"
            ? "provider-failure"
            : scenario;
      if (activeScenario === "provider-failure")
        return [
          {
            status: "INSUFFICIENT_DATA",
            error_details: "Fixture provider failure",
          },
        ];
      if (activeScenario === "conflict")
        return [
          quoteSource("Fixture Quote A", 100),
          quoteSource("Fixture Quote B", 120),
        ];
      return [
        quoteSource("Fixture Quote A", 100),
        quoteSource("Fixture Quote B", 100.2),
      ];
    },
    /** @param {string} _ticker */
    async fetchFallbackQuoteSource(_ticker) {
      return {
        status: "INSUFFICIENT_DATA",
        error_details: "Fixture fallback disabled",
      };
    },
  };
}

function createMarketOracleProvider(
  scenario = process.env.MPS_TEST_SCENARIO || "valid",
) {
  return {
    /** @param {string} ticker */
    async analyze(ticker) {
      if (scenario === "provider-failure")
        return {
          status: "INSUFFICIENT_DATA",
          error_details: "Fixture oracle failure",
        };
      return {
        ticker,
        piotroski_f_score: 7,
        altman_z_score: 3.5,
        roce: 0.15,
        daily_technicals: { zvr_ratio: 1.8 },
        macro: { index_above_ema200: true },
      };
    },
  };
}

function createGeminiProvider(
  scenario = process.env.MPS_TEST_SCENARIO || "valid",
) {
  return {
    /** @param {Record<string, unknown>} _input */
    async analyze(_input) {
      if (scenario === "provider-failure")
        return {
          status: "INSUFFICIENT_DATA",
          error_details: "Fixture Gemini failure",
        };
      return {
        status: "READY",
        decision_snapshot: {
          verdict: scenario === "conflict" ? "Wait" : "Hold",
          score: 7,
        },
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        trade_plan: {
          thesis: "Fixture-backed analysis",
          entry_zone: "Wait",
          stop_loss: 90,
          target_1: 120,
          target_2: 130,
          rr_ratio: 2,
        },
        analysis: "Deterministic fixture analysis",
      };
    },
  };
}

function createRuntimeDataProvider() {
  const holdingsByUser = new Map([
    [
      "dev-ui-user",
      [{ ticker: "NVDA", shares: 1, avg_cost: 90, sector: "Technology" }],
    ],
    [
      "fixture_user_a",
      [{ ticker: "NVDA", shares: 1, avg_cost: 90, sector: "Technology" }],
    ],
    ["fixture_user_b", []],
  ]);
  const journalByUser = new Map();
  return {
    /** @param {string} userId */
    getUserPortfolio: async (userId) => holdingsByUser.get(userId) || [],
    /** @param {string} userId */
    getUserHoldings: async (userId) => holdingsByUser.get(userId) || [],
    /** @param {string} userId */
    getUserJournal: async (userId) => journalByUser.get(userId) || [],
    /** @param {string} userId @param {string} ticker */
    getUserJournalByTicker: async (userId, ticker) =>
      (journalByUser.get(userId) || []).filter(
        (entry) => entry.ticker === ticker,
      ),
    /** @param {string} _userId */
    getUserWatchlists: async (_userId) => [],
    /** @param {string} userId @param {Record<string, unknown>} entry */
    insertJournalEntry: async (userId, entry) => {
      const stored = {
        id: `00000000-0000-4000-8000-${String(
          (journalByUser.get(userId) || []).length + 1,
        ).padStart(12, "0")}`,
        created_at: FIXTURE_TIME,
        date: FIXTURE_TIME,
        ...entry,
      };
      journalByUser.set(userId, [stored, ...(journalByUser.get(userId) || [])]);
      return [stored];
    },
  };
}

module.exports = {
  FIXTURE_TIME,
  createGeminiProvider,
  createMarketOracleProvider,
  createQuoteProvider,
  createRuntimeDataProvider,
};
