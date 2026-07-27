const test = require("node:test");
const assert = require("node:assert/strict");

const { buildDeepAnalysisPayload } = require("../server");

test("deep analysis payload merges oracle data and AI structured sections", () => {
  const payload = buildDeepAnalysisPayload(
    {
      financials: [
        {
          date: "2026-03-31",
          revenue: 1000,
          free_cash_flow: 120,
          fcf_margin: 0.12,
        },
      ],
      balance_sheet: { cash: 500, total_debt: 250, debt_to_equity: 0.25 },
      weekly_technicals: {
        close: 300,
        ema200: 200,
        ma50: 250,
        ema20: 280,
        golden_filter_pass: true,
      },
      daily_technicals: {
        close: 300,
        pullback_active: false,
        zvr_ratio: 1.4,
        rsi_14: 48.2,
      },
      sentiment: { institutional_ownership: 58.4, short_percent_of_float: 1.1 },
    },
    {
      swot: {
        strengths: ["Moat"],
        weaknesses: ["Valuation"],
        opportunities: ["AI demand"],
        threats: ["Rates"],
      },
      trade_plan: {
        thesis: "Quality compounder",
        entry_zone: "Pullback only",
        stop_loss: "Below W1 MA50",
        target_1: "2R",
        target_2: "Trail",
        rr_ratio: ">= 1:2",
      },
    },
  );

  assert.deepEqual(payload.swot.strengths, ["Moat"]);
  assert.equal(payload.financials[0].fcf_margin, 0.12);
  assert.equal(payload.balance_sheet.debt_to_equity, 0.25);
  assert.equal(payload.weekly_technicals.golden_filter_pass, true);
  assert.equal(payload.trade_plan.rr_ratio, ">= 1:2");
});
