const { normalizeDecisionMode } = require("../common/format");
const { isSpeculative } = require("../common/portfolio");


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

  if (packet.current_price_acceptance_gate !== "pass" && packet.current_price_acceptance_gate !== "pass_manual_override") {
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
  // 1. Decision Mode Auto-Resolution
  let rawMode = packet.decision_mode || options.decisionMode;
  if (!rawMode) {
    if (packet.portfolio_context?.is_held) {
      rawMode = "Existing Position / Exit Review";
    } else {
      rawMode = "Long-Term/Core";
    }
  }
  const decisionMode = normalizeDecisionMode(rawMode);
  
  const agentResults = options.agentResults || buildDefaultAgentResults(packet);
  const scoreResult = calculateConvictionScore(decisionMode, agentResults);
  const isHeldOrRepeat = isHeldOrRepeatTicker(packet);
  const blockers = collectDecisionBlockers(packet, isHeldOrRepeat);
  const warnings = [];

  const oracle = packet.fundamental_packet?.oracle;
  const piotroski = oracle?.piotroski_f_score;
  const altman = oracle?.altman_z_score;
  const roce = oracle?.roce;
  const zvr = oracle?.daily_technicals?.zvr_ratio;

  // 2. Portfolio Drawdown Circuit Breaker (Hard Gate)
  const maxDrawdown = Number(options.maxPortfolioDrawdownPct ?? packet.portfolio_context?.maxPortfolioDrawdownPct ?? 15);
  const currentDrawdown = Number(options.currentPortfolioDrawdownPct ?? packet.portfolio_context?.currentPortfolioDrawdownPct ?? 0);
  if (currentDrawdown >= maxDrawdown) {
    blockers.push(`Portfolio drawdown limit exceeded (Drawdown Circuit Breaker active: ${currentDrawdown}% >= ${maxDrawdown}%)`);
  }

  // 3. Sector Concentration Limit (Soft Block & Warning)
  const holdingsRows = packet.portfolio_context?.holdings_rows || [];
  const candidateSector = packet.portfolio_context?.sector || oracle?.balance_sheet?.sector || options.sector || null;
  if (candidateSector && holdingsRows.length > 0) {
    let totalPortfolioValue = 0;
    let sectorValue = 0;
    for (const row of holdingsRows) {
      const rowVal = (row.shares || 0) * (row.avg_cost || 0);
      totalPortfolioValue += rowVal;
      if (row.sector === candidateSector) {
        sectorValue += rowVal;
      }
    }
    const sectorAllocationPct = totalPortfolioValue > 0 ? (sectorValue / totalPortfolioValue) * 100 : 0;
    if (sectorAllocationPct > 30) {
      warnings.push(`Sector concentration limit (30%) exceeded: ${candidateSector} is ${sectorAllocationPct.toFixed(1)}% of portfolio`);
      if (scoreResult.score > 5.0) {
        scoreResult.score = 5.0;
      }
    }
  }

  // 4. Macro Market Regime Filter (Dynamic Risk Budgeting - reduce risk by 50%) - Prep Plan First
  let finalRiskPlan = options.riskPlan ? { ...options.riskPlan } : null;

  if (!finalRiskPlan && isHeldOrRepeat) {
    const activeTrades = packet.journal_context?.active_trade_rows || [];
    if (activeTrades.length > 0) {
      const lastActive = activeTrades[0];
      const entry = lastActive.entry || lastActive.price || packet.last_price;
      const stopLoss = lastActive.stop_loss;
      const target = lastActive.target;
      const shares = lastActive.shares || 0;
      const hardRiskThb = lastActive.shares && lastActive.entry && lastActive.stop_loss
        ? Number((lastActive.shares * (lastActive.entry - lastActive.stop_loss)).toFixed(2))
        : null;
      const rr = lastActive.risk_reward || (target && entry && stopLoss && (entry - stopLoss > 0)
        ? Number(((target - entry) / (entry - stopLoss)).toFixed(2))
        : null);

      finalRiskPlan = {
        entry,
        stop_loss: stopLoss,
        target,
        shares,
        hard_risk_thb: hardRiskThb,
        rr_ratio: rr,
        source: "database_journal"
      };
    }
  }

  // 3.5 Speculative Allocation Cap Check (Hard Block - 15%)
  const isCandidateSpeculative = isSpeculative(packet.ticker);
  if (isCandidateSpeculative && holdingsRows.length > 0) {
    let totalPortfolioValue = 0;
    let specValue = 0;
    for (const row of holdingsRows) {
      const rowVal = (row.shares || 0) * (row.avg_cost || row.avgCost || 0);
      totalPortfolioValue += rowVal;
      if (isSpeculative(row.ticker)) {
        specValue += rowVal;
      }
    }
    
    // Add the candidate position value if we are buying/adding
    let candidateVal = 0;
    if (finalRiskPlan && finalRiskPlan.shares && finalRiskPlan.entry) {
      candidateVal = finalRiskPlan.shares * finalRiskPlan.entry;
    }
    
    const nextTotalValue = totalPortfolioValue + candidateVal;
    const nextSpecValue = specValue + candidateVal;
    const specAllocationPct = nextTotalValue > 0 ? (nextSpecValue / nextTotalValue) * 100 : 0;
    
    if (specAllocationPct > 15) {
      blockers.push(`Speculative allocation cap limit (15%) exceeded: speculative names would be ${specAllocationPct.toFixed(1)}% of portfolio`);
    }
  }

  const isAboveEMA200 = oracle?.macro?.index_above_ema200;
  if (isAboveEMA200 === false && finalRiskPlan && finalRiskPlan.hard_risk_thb) {
    finalRiskPlan.original_hard_risk_thb = finalRiskPlan.hard_risk_thb;
    finalRiskPlan.hard_risk_thb = finalRiskPlan.hard_risk_thb / 2;
    warnings.push("Macro bearish regime - individual trade risk limit halved");
  } else if (isAboveEMA200 !== true) {
    warnings.push("Macro regime unavailable - verify index trend before sizing risk");
  }

  // 5. Earnings Proximity Gate (Cap position size if earnings <= 5 days away)
  const nextEarningsStr = oracle?.next_earnings_date;
  if (nextEarningsStr) {
    const nextEarningsDate = new Date(nextEarningsStr);
    const today = new Date();
    const diffTime = nextEarningsDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 5) {
      warnings.push(`Earnings proximity gate: Next earnings in ${diffDays} days (≤ 5 days). Position size capped to ไม้ 1 (30% max).`);
    }
  }

  // 6. Trailing Stop Calculation (ATR-based dynamic stop loss after Target 1 is hit)
  const atr = oracle?.atr_14 || oracle?.daily_technicals?.atr_14;
  const lastPrice = packet.last_price || oracle?.last_price;
  let calculatedTrailingStop = null;
  if (lastPrice && atr && finalRiskPlan && finalRiskPlan.stop_loss) {
    const entry = finalRiskPlan.entry || finalRiskPlan.price || lastPrice;
    const stopLoss = finalRiskPlan.stop_loss;
    const riskPerShare = entry - stopLoss;
    const t1Target = entry + 2 * riskPerShare;
    if (lastPrice >= t1Target) {
      calculatedTrailingStop = Number((lastPrice - (atr * 1.5)).toFixed(2));
    }
  }

  if (decisionMode === "Long-Term/Core") {
    if (piotroski === null || piotroski === undefined) {
      blockers.push("Piotroski F-Score data unavailable");
    } else if (piotroski < 7) {
      blockers.push(`Piotroski F-Score ${piotroski}/9 is below required 7/9 for Core`);
    }

    if (altman === null || altman === undefined) {
      blockers.push("Altman Z-Score data unavailable");
    } else if (altman <= 2.99) {
      blockers.push(`Altman Z-Score ${altman} is below required 2.99 for Core`);
    }

    if (roce === null || roce === undefined) {
      blockers.push("ROCE data unavailable");
    } else if (roce <= 0) {
      blockers.push(`ROCE ${roce} is non-positive, must be positive for Core`);
    }
  } else if (decisionMode === "Swing Trade") {
    if (piotroski === null || piotroski === undefined) {
      blockers.push("Piotroski F-Score data unavailable");
    } else if (piotroski < 5) {
      blockers.push(`Piotroski F-Score ${piotroski}/9 is below required 5/9 for Swing`);
    }

    if (zvr === null || zvr === undefined) {
      blockers.push("ZVR data unavailable");
    } else if (zvr < 1.5) {
      blockers.push(`ZVR ratio ${zvr} is below required 1.5 for Swing Daily Confluence`);
    }
  }

  if (hasInsufficientSubAgent(agentResults)) {
    blockers.push("At least one sub-agent returned INSUFFICIENT_DATA (fail-closed analysis active)");
  }

  const riskPlanReady = hasExecutableRiskPlan(finalRiskPlan);
  if (!riskPlanReady) {
    blockers.push("No executable stop-loss, R/R >= 1:2 (Reward >= 2x Risk), and hard THB risk plan supplied");
  }

  let { verdict: initialVerdict, trafficLight } = resolveVerdict({
    decisionMode,
    isHeldOrRepeat,
    blockers,
    warnings,
    score: scoreResult.score,
    hasRiskPlan: riskPlanReady,
  });

  if (decisionMode === "Long-Term/Core" && altman !== null && altman !== undefined && altman < 1.81) {
    initialVerdict = isHeldOrRepeat ? "Trim" : "Avoid";
    trafficLight = "red";
  }

  const verdict =
    (packet.current_price_acceptance_gate === "pass" || packet.current_price_acceptance_gate === "pass_manual_override") ? initialVerdict : "Wait";

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
      risk_plan: finalRiskPlan || {
        status: "MISSING",
        requirement: "Need stop-loss, R/R >= 1:2, and hard THB risk before Buy/Add",
      },
      calculated_trailing_stop: calculatedTrailingStop,
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
