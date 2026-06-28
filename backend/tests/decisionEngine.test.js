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
  assert.match(result.adaptive_drilldown.blockers.join(" "), /No executable stop-loss/);
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
  assert.match(result.adaptive_drilldown.blockers.join(" "), /INSUFFICIENT_DATA/);
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

test("Core Buy is blocked when Piotroski F-Score is below 7/9", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Long-Term/Core",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 6,
          altman_z_score: 3.5,
          roce: 0.15,
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.decision_snapshot.immediate_next_action, /Piotroski F-Score 6\/9 is below required 7\/9/);
});

test("Core Buy is blocked when Altman Z-Score is below 2.99", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Long-Term/Core",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 8,
          altman_z_score: 2.5,
          roce: 0.15,
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.decision_snapshot.immediate_next_action, /Altman Z-Score 2.5 is below required 2.99/);
});

test("Core Buy is blocked when ROCE is negative", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Long-Term/Core",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 8,
          altman_z_score: 3.5,
          roce: -0.05,
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.decision_snapshot.immediate_next_action, /ROCE -0.05 is non-positive/);
});

test("Core verdict is overridden to Avoid/Trim when Altman Z-Score is < 1.81", () => {
  // New position (not held, not repeat ticker) -> Avoid
  const resultNew = evaluateDecision(
    packet({
      decision_mode: "Long-Term/Core",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 8,
          altman_z_score: 1.5,
          roce: 0.15,
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(resultNew.decision_snapshot.verdict, "Avoid");
  assert.equal(resultNew.decision_snapshot.traffic_light_status, "red");

  // Existing position (held) -> Trim
  const resultHeld = evaluateDecision(
    packet({
      decision_mode: "Long-Term/Core",
      portfolio_context: { is_held: true },
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 8,
          altman_z_score: 1.5,
          roce: 0.15,
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(resultHeld.decision_snapshot.verdict, "Trim");
  assert.equal(resultHeld.decision_snapshot.traffic_light_status, "red");
});

test("Swing Buy is blocked when Piotroski F-Score is below 5/9", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Swing Trade",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 4,
          daily_technicals: { zvr_ratio: 1.8 },
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.decision_snapshot.immediate_next_action, /Piotroski F-Score 4\/9 is below required 5\/9/);
});

test("Swing Buy is blocked when ZVR ratio is below 1.5", () => {
  const result = evaluateDecision(
    packet({
      decision_mode: "Swing Trade",
      fundamental_packet: {
        status: "PASS",
        oracle: {
          piotroski_f_score: 6,
          daily_technicals: { zvr_ratio: 1.2 },
        },
      },
    }),
    {
      riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      agentResults: {
        fundamental: { status: "PASS", score: 8, mode_fit: "Strong" },
        technical: { status: "PASS", score: 8, mode_fit: "Strong" },
        macro_flow: { status: "PASS", score: 8, mode_fit: "Strong" },
      },
    }
  );

  assert.equal(result.decision_snapshot.verdict, "Wait");
  assert.match(result.decision_snapshot.immediate_next_action, /ZVR ratio 1.2 is below required 1.5/);
});
