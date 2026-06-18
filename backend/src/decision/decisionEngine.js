const { normalizeDecisionMode } = require("../common/format");

const SCORE_WEIGHTS = {
  "Quick Trade": {
    fundamental: 0.2,
    technical: 0.55,
    macro_flow: 0.25,
  },
  "Swing Trade": {
    fundamental: 0.3,
    technical: 0.45,
    macro_flow: 0.25,
  },
  "Long-Term/Core": {
    fundamental: 0.55,
    technical: 0.2,
    macro_flow: 0.25,
  },
  "Existing Position / Exit Review": {
    fundamental: 0.45,
    technical: 0.25,
    macro_flow: 0.3,
  },
};

function capPoorModeFit(agentResult) {
  if (!agentResult || typeof agentResult !== "object") {
    return agentResult;
  }

  const modeFit = String(agentResult?.mode_fit ?? agentResult?.["Mode Fit"] ?? "").toLowerCase();
  const score = Number(agentResult.score);

  if (modeFit === "poor" && Number.isFinite(score) && score > 5) {
    return {
      ...agentResult,
      score: 5,
      score_cap_reason: "Mode Fit: Poor caps sub-agent score at 5",
    };
  }

  return agentResult;
}

function hasInsufficientSubAgent(agentResults) {
  return Object.values(agentResults ?? {}).some(
    (result) => result?.status === "INSUFFICIENT_DATA",
  );
}

function calculateConvictionScore(decisionMode, agentResults = {}) {
  const weights = SCORE_WEIGHTS[decisionMode] || SCORE_WEIGHTS["Long-Term/Core"];
  const normalized = {
    fundamental: capPoorModeFit(agentResults.fundamental),
    technical: capPoorModeFit(agentResults.technical),
    macro_flow: capPoorModeFit(agentResults.macro_flow),
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const rawScore = normalized[key]?.score;
    const score =
      rawScore === null || rawScore === undefined || rawScore === ""
        ? Number.NaN
        : Number(rawScore);
    if (Number.isFinite(score)) {
      weightedScore += score * weight;
      totalWeight += weight;
    }
  }

  return {
    score: totalWeight > 0 ? Number((weightedScore / totalWeight).toFixed(1)) : null,
    agent_results: normalized,
  };
}

function buildDefaultAgentResults(packet) {
  const priceGatePass = packet.current_price_acceptance_gate === "pass";

  return {
    fundamental: {
      status: "INSUFFICIENT_DATA",
      score: null,
      mode_fit: "Mixed",
      reason: "No filings, earnings, guidance, or valuation packet available in v1",
    },
    technical: {
      status: priceGatePass ? "PARTIAL_CONTEXT" : "INSUFFICIENT_DATA",
      score: priceGatePass ? 5 : null,
      mode_fit: "Mixed",
      reason: priceGatePass
        ? "Current price verified, but D1/W1 indicators and ATR stop are not available yet"
        : "Current price gate failed",
    },
    macro_flow: {
      status: "INSUFFICIENT_DATA",
      score: null,
      mode_fit: "Mixed",
      reason: "No macro, flow, or sentiment packet available in v1",
    },
  };
}

function isHeldOrRepeatTicker(packet) {
  const portfolio = packet.portfolio_context;
  const journal = packet.journal_context;
  return Boolean(portfolio?.is_held || (portfolio && journal?.is_repeat_ticker));
}

function collectDecisionBlockers(packet, isHeldOrRepeat) {
  const blockers = [];

  if (packet.current_price_acceptance_gate !== "pass") {
    blockers.push("Current Price Acceptance Gate failed");
  }

  if (isHeldOrRepeat && packet.journal_context?.journal_checked !== true) {
    blockers.push("Held/repeat ticker requires journal check");
  }

  if ((packet.journal_context?.unresolved_issues?.length ?? 0) > 0) {
    blockers.push("Journal has unresolved risk plan or thesis verification items");
  }

  return blockers;
}

function hasExecutableRiskPlan(riskPlan) {
  return Boolean(
    riskPlan &&
      Number.isFinite(Number(riskPlan.stop_loss)) &&
      Number.isFinite(Number(riskPlan.hard_risk_thb)) &&
      Number(riskPlan.rr_ratio) >= 2,
  );
}

function thesisBlockerVerdict(decisionMode, blockers) {
  if (!blockers.some((blocker) => /thesis/i.test(blocker))) {
    return null;
  }

  const verdict = decisionMode === "Existing Position / Exit Review" ? "Exit Review" : "Wait";
  return { verdict, trafficLight: verdict === "Exit Review" ? "red" : "yellow" };
}

function lowScoreVerdict(decisionMode, score) {
  if (score === null || score >= 5) {
    return null;
  }

  return {
    verdict: decisionMode === "Existing Position / Exit Review" ? "Trim" : "Avoid",
    trafficLight: "red",
  };
}

function highScoreVerdict(isHeldOrRepeat, blockers, warnings, score, hasRiskPlan) {
  if (score === null || score < 7 || blockers.length > 0 || warnings.length > 0 || !hasRiskPlan) {
    return null;
  }

  return { verdict: isHeldOrRepeat ? "Hold" : "Buy", trafficLight: "green" };
}

function exitReviewVerdict(decisionMode, isHeldOrRepeat, blockers) {
  if (decisionMode !== "Existing Position / Exit Review" || !isHeldOrRepeat) {
    return null;
  }

  return {
    verdict: blockers.length > 0 ? "Exit Review" : "Hold",
    trafficLight: blockers.length > 0 ? "red" : "yellow",
  };
}

function holdWaitTraffic(verdict) {
  if (verdict === "Hold" || verdict === "Wait" || verdict === "Exit Review") {
    return verdict === "Exit Review" ? "red" : "yellow";
  }

  return null;
}

function resolveVerdict({
  decisionMode,
  isHeldOrRepeat,
  blockers,
  warnings,
  score,
  hasRiskPlan,
}) {
  let verdict = "Wait";
  let trafficLight = "yellow";

  const exitVerdict = exitReviewVerdict(decisionMode, isHeldOrRepeat, blockers);
  if (exitVerdict) {
    ({ verdict, trafficLight } = exitVerdict);
  }

  const thesisVerdict = thesisBlockerVerdict(decisionMode, blockers);
  if (thesisVerdict) {
    ({ verdict, trafficLight } = thesisVerdict);
  }

  const weakScoreVerdict = lowScoreVerdict(decisionMode, score);
  if (weakScoreVerdict) {
    ({ verdict, trafficLight } = weakScoreVerdict);
  }

  const trafficOverride = holdWaitTraffic(verdict);
  if (trafficOverride) {
    trafficLight = trafficOverride;
  }

  const strongScoreVerdict = highScoreVerdict(
    isHeldOrRepeat,
    blockers,
    warnings,
    score,
    hasRiskPlan,
  );
  if (strongScoreVerdict) {
    ({ verdict, trafficLight } = strongScoreVerdict);
  }

  return { verdict, trafficLight };
}

function evaluateDecision(packet, options = {}) {
  const decisionMode = normalizeDecisionMode(packet.decision_mode || options.decisionMode);
  const agentResults = options.agentResults || buildDefaultAgentResults(packet);
  const scoreResult = calculateConvictionScore(decisionMode, agentResults);
  const isHeldOrRepeat = isHeldOrRepeatTicker(packet);
  const blockers = collectDecisionBlockers(packet, isHeldOrRepeat);
  const warnings = [];

  if (hasInsufficientSubAgent(agentResults)) {
    warnings.push("At least one sub-agent returned INSUFFICIENT_DATA");
  }

  const riskPlanReady = hasExecutableRiskPlan(options.riskPlan);
  if (!riskPlanReady) {
    warnings.push("No executable stop-loss, R/R >= 1:2, and hard THB risk plan supplied");
  }

  const { verdict: initialVerdict, trafficLight } = resolveVerdict({
    decisionMode,
    isHeldOrRepeat,
    blockers,
    warnings,
    score: scoreResult.score,
    hasRiskPlan: riskPlanReady,
  });
  const verdict =
    packet.current_price_acceptance_gate === "pass" ? initialVerdict : "Wait";

  const gateStatus = blockers.length === 0 ? "pass" : "fail";
  const immediateNextAction =
    blockers[0] ||
    warnings[0] ||
    "Review verified setup and confirm broker quote before execution";

  return {
    decision_snapshot: {
      traffic_light_status: trafficLight,
      verdict,
      ticker: packet.ticker,
      decision_mode: decisionMode,
      score: scoreResult.score,
      gate_status: gateStatus,
      one_line_reason:
        gateStatus === "pass"
          ? "Data gate passed but v1 still requires complete risk and sub-agent packets before Buy/Add"
          : immediateNextAction,
      immediate_next_action: immediateNextAction,
    },
    adaptive_drilldown: {
      data_quality: {
        current_price_acceptance_gate: packet.current_price_acceptance_gate,
        price_sources: packet.price_sources,
        quote_timestamp: packet.quote_timestamp,
        market_session: packet.market_session,
        staleness_warnings: packet.staleness_warnings,
        known_conflicts: packet.known_conflicts,
      },
      portfolio_journal: {
        portfolio_context: packet.portfolio_context,
        journal_context: packet.journal_context,
      },
      risk_plan: options.riskPlan || {
        status: "MISSING",
        requirement: "Need stop-loss, R/R >= 1:2, and hard THB risk before Buy/Add",
      },
      agent_scores: scoreResult.agent_results,
      blockers,
      warnings,
      watch_triggers: [
        "Refresh broker-visible quote before execution",
        "Provide or fetch D1/W1 technical levels before entry math",
        "Resolve journal risk-plan gaps for held/repeat tickers",
      ],
    },
  };
}

module.exports = {
  SCORE_WEIGHTS,
  buildDefaultAgentResults,
  calculateConvictionScore,
  capPoorModeFit,
  evaluateDecision,
};
