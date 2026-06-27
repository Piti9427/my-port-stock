---
status: Stable
audience: Human Developer & AI Agent
associated_adr: file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0004-unbiased-institutional-quality-gates.md
primary_tests: "npm test --workspace=backend"
---

# ADR 0004: Unbiased Institutional Quality Gates and Distress Overrides

## Status

Accepted

## Context

To evolve the AI assistant into an objective, institutional-grade advisor, we needed to establish rigorous fundamental and technical filters. Previously, the decision engine relied on weighted sub-agent scores without hard gates for business quality or financial distress. This created a risk of recommending trades in structurally weak or distressed companies due to short-term momentum or sentiment spikes. 

We needed a system that programmatically enforces quality gates, calculates financial health, checks execution confluences (such as Anchored VWAP and volume confirmations), and fails closed if these requirements are not satisfied.

## Decision

1. **Upgraded Market Oracle (`tools/market_oracle.py`):**
   * Fetch annual/quarterly financial statements dynamically to calculate **Piotroski F-Score** (9-point financial strength checklist), **Altman Z-Score** (credit/bankruptcy risk assessment), and **ROCE** (capital deployment efficiency).
   * Calculate **Anchored VWAP (AVWAP)** starting from the latest historical earnings date.

2. **Programmatic Decision Gates (`backend/src/decision/decisionEngine.js`):**
   * **Long-Term/Core Buy/Add Gate:** Strictly requires Piotroski F-Score $\ge 7/9$, Altman Z-Score $> 2.99$, and positive ROCE ($> 0$).
   * **Swing Trade Buy/Add Gate:** Strictly requires Piotroski F-Score $\ge 5/9$ and Zanger Volume Ratio (ZVR) $\ge 1.5$.
   * **Altman Distress Override:** Any stock in Core mode with an Altman Z-Score $< 1.81$ (Distress Zone) is immediately downgraded to `Avoid` (for new positions) or `Trim` (for existing held positions), overriding any positive sub-agent scores.

3. **Debate and Expectation Gap Hardening:**
   * Require exactly 3 bear-case points (Devil's Advocate rule) and calculate the Expectation Gap (actual vs. consensus) in AI prompts.

4. **Frontend Visualization:**
   * Render Piotroski F-Score, Altman Z-Score (highlighting distress zones), ROCE, and AVWAP as premium metric cards on the Ticker Detail screen.

## Consequences

* **Fails Closed on Low Quality:** The system blocks `Buy/Add` actions for any stock that does not meet the mode's quality thresholds or has incomplete financial records.
* **Objective Risk Management:** Emotional buy decisions are constrained by strict mathematical checks (Altman distress, ROCE efficiency, and ZVR volume confirmation).
* **Consensus Comparison:** By auditing the Expectation Gap against consensus, the system tracks consensus trends rather than single-source analyst estimates.

## Verification

To verify that the decision engine behaves according to these gates:

```bash
npm test --workspace=backend
```
