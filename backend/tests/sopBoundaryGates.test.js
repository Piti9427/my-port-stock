"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  capPoorModeFit,
  evaluateDecision,
} = require("../src/decision/decisionEngine");

describe("Investment SOP Mathematical Boundary Gates", () => {
  describe("Risk/Reward Ratio (R/R >= 2.0 Boundary)", () => {
    it("rejects Risk/Reward ratio of 1.99 (adds risk plan blocker)", () => {
      const mockPacket = {
        ticker: "AAPL",
        last_price: 110,
        current_price_acceptance_gate: "pass",
        decision_mode: "Long-Term/Core",
        portfolio_context: { is_held: false },
        journal_context: {
          is_repeat_ticker: false,
          journal_checked: true,
          unresolved_issues: [],
        },
        fundamental_packet: {
          oracle: { piotroski_f_score: 8, altman_z_score: 4.5, roce: 15.0 },
        },
      };

      const options = {
        agentResults: {
          fundamental: { status: "PASS", score: 8.0, mode_fit: "High" },
          technical: { status: "PASS", score: 8.0, mode_fit: "High" },
          macro_flow: { status: "PASS", score: 8.0, mode_fit: "High" },
        },
        riskPlan: {
          stop_loss: 100,
          hard_risk_thb: 5000,
          rr_ratio: 1.99, // Below 2.0
        },
      };

      const result = evaluateDecision(mockPacket, options);
      assert.equal(result.decision_snapshot.verdict, "Wait");
      assert.ok(
        result.adaptive_drilldown.blockers.some((b) =>
          b.includes("R/R >= 1:2"),
        ),
      );
    });

    it("accepts Risk/Reward ratio of 2.00 (passes risk plan blocker)", () => {
      const mockPacket = {
        ticker: "AAPL",
        last_price: 110,
        current_price_acceptance_gate: "pass",
        decision_mode: "Long-Term/Core",
        portfolio_context: { is_held: false },
        journal_context: {
          is_repeat_ticker: false,
          journal_checked: true,
          unresolved_issues: [],
        },
        fundamental_packet: {
          oracle: {
            piotroski_f_score: 8,
            altman_z_score: 4.5,
            roce: 15.0,
            macro: { index_above_ema200: true },
          },
        },
      };

      const options = {
        agentResults: {
          fundamental: { status: "PASS", score: 8.0, mode_fit: "High" },
          technical: { status: "PASS", score: 8.0, mode_fit: "High" },
          macro_flow: { status: "PASS", score: 8.0, mode_fit: "High" },
        },
        riskPlan: {
          stop_loss: 100,
          hard_risk_thb: 5000,
          rr_ratio: 2.0, // Exactly 2.0
        },
      };

      const result = evaluateDecision(mockPacket, options);
      assert.equal(result.decision_snapshot.verdict, "Buy");
      assert.equal(result.decision_snapshot.traffic_light_status, "green");
    });
  });

  describe("Sub-agent Poor Mode Fit Score Cap (Cap at 5.0)", () => {
    it("caps high sub-agent score (8.5) at 5.0 when mode fit is Poor", () => {
      const agentResult = {
        score: 8.5,
        mode_fit: "Poor",
        reason: "Technical indicators ill-fitted for Long-Term Core thesis",
      };

      const capped = capPoorModeFit(agentResult);
      assert.equal(capped.score, 5.0);
      assert.match(capped.score_cap_reason, /caps sub-agent score at 5/i);
    });

    it("does not alter score when mode fit is High or Mixed", () => {
      const agentResult = {
        score: 8.5,
        mode_fit: "High",
      };

      const result = capPoorModeFit(agentResult);
      assert.equal(result.score, 8.5);
    });
  });

  describe("Conviction Score Threshold Verdict Mapping (6.9 vs 7.0 & 4.9 vs 5.0)", () => {
    it("yields Buy for Score >= 7.0 when all hard gates pass", () => {
      const mockPacket = {
        ticker: "MSFT",
        last_price: 100,
        current_price_acceptance_gate: "pass",
        decision_mode: "Long-Term/Core",
        portfolio_context: { is_held: false },
        journal_context: {
          is_repeat_ticker: false,
          journal_checked: true,
          unresolved_issues: [],
        },
        fundamental_packet: {
          oracle: {
            piotroski_f_score: 8,
            altman_z_score: 4.5,
            roce: 15.0,
            macro: { index_above_ema200: true },
          },
        },
      };

      const agentResults = {
        fundamental: { status: "PASS", score: 7.5, mode_fit: "High" },
        technical: { status: "PASS", score: 7.0, mode_fit: "High" },
        macro_flow: { status: "PASS", score: 7.0, mode_fit: "High" },
      };

      const options = {
        agentResults,
        riskPlan: { stop_loss: 90, hard_risk_thb: 2000, rr_ratio: 2.5 },
      };

      const result = evaluateDecision(mockPacket, options);
      assert.equal(result.decision_snapshot.verdict, "Buy");
      assert.equal(result.decision_snapshot.traffic_light_status, "green");
    });

    it("yields Wait for Score 6.9 even when all gates pass", () => {
      const mockPacket = {
        ticker: "MSFT",
        last_price: 100,
        current_price_acceptance_gate: "pass",
        decision_mode: "Long-Term/Core",
        portfolio_context: { is_held: false },
        journal_context: {
          is_repeat_ticker: false,
          journal_checked: true,
          unresolved_issues: [],
        },
        fundamental_packet: {
          oracle: { piotroski_f_score: 8, altman_z_score: 4.5, roce: 15.0 },
        },
      };

      const agentResults = {
        fundamental: { status: "PASS", score: 6.9, mode_fit: "Mixed" },
        technical: { status: "PASS", score: 6.9, mode_fit: "Mixed" },
        macro_flow: { status: "PASS", score: 6.9, mode_fit: "Mixed" },
      };

      const options = {
        agentResults,
        riskPlan: { stop_loss: 90, hard_risk_thb: 2000, rr_ratio: 2.5 },
      };

      const result = evaluateDecision(mockPacket, options);
      assert.equal(result.decision_snapshot.verdict, "Wait");
      assert.equal(result.decision_snapshot.traffic_light_status, "yellow");
    });

    it("yields Avoid for Score < 5.0 on new ticker", () => {
      const mockPacket = {
        ticker: "XYZ",
        last_price: 100,
        current_price_acceptance_gate: "pass",
        decision_mode: "Long-Term/Core",
        portfolio_context: { is_held: false },
        journal_context: {
          is_repeat_ticker: false,
          journal_checked: true,
          unresolved_issues: [],
        },
      };

      const agentResults = {
        fundamental: { status: "PASS", score: 4.5, mode_fit: "Mixed" },
        technical: { status: "PASS", score: 4.5, mode_fit: "Mixed" },
        macro_flow: { status: "PASS", score: 4.5, mode_fit: "Mixed" },
      };

      const result = evaluateDecision(mockPacket, { agentResults });
      assert.equal(result.decision_snapshot.verdict, "Avoid");
      assert.equal(result.decision_snapshot.traffic_light_status, "red");
    });
  });
});
