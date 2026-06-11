const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateConvictionScore,
  evaluateDecision,
} = require("../src/decision/decisionEngine");

function packet(overrides = {}) {
  return {
    ticker: "NVDA",
    decision_mode: "Swing Trade",
    current_price_acceptance_gate: "pass",
    price_sources: ["Yahoo Finance API", "Nasdaq Quote API"],
    quote_timestamp: "2026-06-05T14:30:00.000Z",
    market_session: "Regular",
    staleness_warnings: [],
    known_conflicts: [],
    portfolio_context: {
      is_held: false,
      stale_hypothesis: true,
    },
    journal_context: {
      journal_checked: true,
      is_repeat_ticker: false,
      unresolved_issues: [],
    },
    ...overrides,
  };
}

test("Buy is blocked when price gate fails", () => {
  const result = evaluateDecision(
    packet({ current_price_acceptance_gate: "fail" }),
    {
      riskPlan: {
        stop_loss: 90,
        hard_risk_thb: 500,
        rr_ratio: 2.5,
      },
    },
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.equal(result.decision_snapshot.gate_status, "fail");
});

test("Buy is blocked without executable risk plan", () => {
  const result = evaluateDecision(packet(), {
    agentResults: {
      fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
      technical: { status: "PASS", score: 8, mode_fit: "Strong" },
      macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
    },
  });

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.adaptive_drilldown.warnings.join(" "), /No executable stop-loss/);
});

test("held or repeat ticker journal issue forces non-buy outcome", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Existing Position / Exit Review",
      portfolio_context: { is_held: true, stale_hypothesis: true },
      journal_context: {
        journal_checked: true,
        is_repeat_ticker: true,
        unresolved_issues: ["Stop pending"],
      },
    }),
  );

  assert.equal(result.decision_snapshot.verdict, "Exit Review");
  assert.equal(result.decision_snapshot.gate_status, "fail");
});

test("sub-agent insufficient data caps practical output at Wait", () => {
  const result = evaluateDecision(packet(), {
    riskPlan: {
      stop_loss: 90,
      hard_risk_thb: 500,
      rr_ratio: 2.5,
    },
    agentResults: {
      fundamental: { status: "INSUFFICIENT_DATA", score: null, mode_fit: "Mixed" },
      technical: { status: "PASS", score: 8, mode_fit: "Strong" },
      macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
    },
  });

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.adaptive_drilldown.warnings.join(" "), /INSUFFICIENT_DATA/);
});

test("Mode Fit Poor caps sub-agent score at 5", () => {
  const result = calculateConvictionScore("Swing Trade", {
    fundamental: { status: "PASS", score: 9, mode_fit: "Poor" },
    technical: { status: "PASS", score: 9, mode_fit: "Strong" },
    macro_flow: { status: "PASS", score: 9, mode_fit: "Strong" },
  });

  assert.equal(result.agent_results.fundamental.score, 5);
  assert.equal(result.agent_results.fundamental.score_cap_reason, "Mode Fit: Poor caps sub-agent score at 5");
});
