const test = require("node:test");
const assert = require("node:assert/strict");
const fc = require("fast-check");
const { evaluateDecision } = require("../src/decision/decisionEngine");

const PASSING_AGENTS = {
  fundamental: { status: "PASS", score: 8, mode_fit: "Good" },
  technical: { status: "PASS", score: 8, mode_fit: "Good" },
  macro_flow: { status: "PASS", score: 8, mode_fit: "Good" },
};

function validPacket(overrides = {}) {
  return {
    ticker: "NVDA",
    decision_mode: "Swing Trade",
    last_price: 100,
    current_price_acceptance_gate: "pass",
    price_sources: ["Yahoo Finance", "Nasdaq"],
    quote_timestamp: "2026-07-27T14:30:00.000Z",
    market_session: "Regular",
    staleness_warnings: [],
    known_conflicts: [],
    portfolio_context: { is_held: false, holdings_rows: [] },
    journal_context: {
      journal_checked: true,
      is_repeat_ticker: false,
      unresolved_issues: [],
    },
    fundamental_packet: {
      oracle: {
        piotroski_f_score: 7,
        daily_technicals: { zvr_ratio: 1.8 },
        macro: { index_above_ema200: true },
      },
    },
    ...overrides,
  };
}

function verdictFor(
  packet,
  riskPlan = { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
) {
  return evaluateDecision(packet, {
    agentResults: PASSING_AGENTS,
    maxHardRiskThb: 1_000,
    riskPlan,
  }).decision_snapshot.verdict;
}

function assertNeverBuyAdd(verdict) {
  assert.ok(
    !["Buy", "Add"].includes(verdict),
    `Fail-closed property returned ${verdict}`,
  );
}

test("missing and non-finite prices never return Buy/Add", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(undefined, null, Number.NaN, Infinity, -Infinity, 0, -1),
      (lastPrice) => {
        assertNeverBuyAdd(verdictFor(validPacket({ last_price: lastPrice })));
      },
    ),
    { verbose: true },
  );
});

test("failed price gates and conflicting quotes never return Buy/Add", () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1 }), (conflict) => {
      assertNeverBuyAdd(
        verdictFor(validPacket({ known_conflicts: [conflict] })),
      );
      assertNeverBuyAdd(
        verdictFor(validPacket({ current_price_acceptance_gate: "fail" })),
      );
    }),
    { verbose: true },
  );
});

test("invalid R/R never returns Buy/Add when every other risk input is valid", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.double({ min: -10_000, max: 1.999, noNaN: true }),
        fc.constant(Number.NaN),
        fc.constant(Infinity),
        fc.constant(-Infinity),
      ),
      (rrRatio) => {
        assertNeverBuyAdd(
          verdictFor(validPacket(), {
            stop_loss: 90,
            hard_risk_thb: 500,
            rr_ratio: rrRatio,
          }),
        );
      },
    ),
    { verbose: true },
  );
});

test("exceeded hard-risk budgets never return Buy/Add when R/R is valid", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 1_000.01, max: 1_000_000, noNaN: true }),
      (hardRiskThb) => {
        assertNeverBuyAdd(
          verdictFor(validPacket(), {
            stop_loss: 90,
            hard_risk_thb: hardRiskThb,
            rr_ratio: 2.5,
          }),
        );
      },
    ),
    { verbose: true },
  );
});

test("insufficient required metrics never return Buy/Add", () => {
  fc.assert(
    fc.property(fc.constantFrom("piotroski", "zvr", "agent"), (missing) => {
      const packet = validPacket();
      const agents = { ...PASSING_AGENTS };
      if (missing === "piotroski")
        packet.fundamental_packet.oracle.piotroski_f_score = undefined;
      if (missing === "zvr")
        packet.fundamental_packet.oracle.daily_technicals.zvr_ratio = undefined;
      if (missing === "agent")
        agents.fundamental = {
          status: "INSUFFICIENT_DATA",
          score: null,
          mode_fit: "Mixed",
        };
      const verdict = evaluateDecision(packet, {
        agentResults: agents,
        riskPlan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
      }).decision_snapshot.verdict;
      assertNeverBuyAdd(verdict);
    }),
    { verbose: true },
  );
});
