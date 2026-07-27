const test = require("node:test");
const assert = require("node:assert/strict");

test("AI analyst fails closed when Gemini API key is missing", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousTestMode = process.env.MPS_TEST_MODE;
  delete process.env.GEMINI_API_KEY;
  delete process.env.MPS_TEST_MODE;
  delete require.cache[require.resolve("../src/services/aiAnalyst")];

  const { analyzeTicker } = require("../src/services/aiAnalyst");
  const analysis = await analyzeTicker(
    "AAPL",
    { shares: 100 },
    { last_price: 150.5 },
  );

  assert.equal(analysis.status, "INSUFFICIENT_DATA");
  assert.equal(analysis.reason_code, "AI_ANALYST_UNAVAILABLE");
  assert.notEqual(analysis.decision_snapshot?.verdict, "Buy");

  if (previousKey) {
    process.env.GEMINI_API_KEY = previousKey;
  }
  if (previousTestMode) {
    process.env.MPS_TEST_MODE = previousTestMode;
  }
});

test("AI analyst validates structured deep-analysis sections", () => {
  const { validateAnalysisShape } = require("../src/services/aiAnalyst");

  const result = validateAnalysisShape({
    decision_snapshot: {
      verdict: "Wait",
      score: 6.2,
      one_line_reason: "ข้อมูลยังไม่ครบ",
    },
    sub_agent_scores: {},
    swot: {
      strengths: ["Moat"],
      weaknesses: ["Valuation"],
      opportunities: ["AI demand"],
      threats: ["Macro risk"],
    },
    trade_plan: {
      thesis: "Wait for pullback",
      entry_zone: "W1 EMA20",
      stop_loss: "Below W1 MA50",
      target_1: "2R",
      target_2: "Trail",
      rr_ratio: ">= 1:2",
    },
    analysis: "รายละเอียด",
  });

  assert.equal(result.swot.strengths[0], "Moat");
});

test("AI analyst rejects unstructured deep-analysis output", () => {
  const { validateAnalysisShape } = require("../src/services/aiAnalyst");

  assert.throws(
    () =>
      validateAnalysisShape({
        decision_snapshot: {
          verdict: "Wait",
        },
        analysis: "Only markdown is not enough",
      }),
    /swot/,
  );
});
