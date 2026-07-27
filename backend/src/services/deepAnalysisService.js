const { broadcast } = require("../ws/agentEventBus");

const DECISION_MODE_AGENT_MAP = {
  "Quick Trade": ["catalyst-hunter", "quant-technician"],
  "Swing Trade": ["fundamental-auditor", "quant-technician", "catalyst-hunter"],
  "Long-Term/Core": [
    "fundamental-auditor",
    "macro-strategist",
    "portfolio-risk-manager",
  ],
  "Existing Position / Exit Review": [
    "fundamental-auditor",
    "quant-technician",
    "macro-strategist",
  ],
};

function getAgentsForMode(decisionMode) {
  return (
    DECISION_MODE_AGENT_MAP[decisionMode] || [
      "fundamental-auditor",
      "quant-technician",
      "macro-strategist",
    ]
  );
}

function getAgentWorkingMessage(agent, ticker) {
  const messages = {
    "fundamental-auditor": `Reviewing ${ticker} fundamentals & earnings...`,
    "quant-technician": `Analyzing ${ticker} RSI, MACD & order flow...`,
    "macro-strategist": `Evaluating macro regime for ${ticker}...`,
    "portfolio-risk-manager": `Calculating position sizing for ${ticker}...`,
    "catalyst-hunter": `Scanning upcoming catalysts for ${ticker}...`,
  };
  return messages[agent] || `Analyzing ${ticker}...`;
}

function runtimeInsufficientData(reason, extras = {}) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: reason,
    ...extras,
  };
}

function buildDeepAnalysisPayload(oracleData = {}, geminiData = {}) {
  return {
    swot: geminiData.swot || {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    },
    financials: Array.isArray(oracleData.financials)
      ? oracleData.financials
      : [],
    balance_sheet: oracleData.balance_sheet || {},
    weekly_technicals: oracleData.weekly_technicals || {},
    daily_technicals: oracleData.daily_technicals || {},
    sentiment: oracleData.sentiment || {},
    trade_plan: geminiData.trade_plan || {
      thesis: "INSUFFICIENT_DATA",
      entry_zone: "INSUFFICIENT_DATA",
      stop_loss: "INSUFFICIENT_DATA",
      target_1: "INSUFFICIENT_DATA",
      target_2: "INSUFFICIENT_DATA",
      rr_ratio: "INSUFFICIENT_DATA",
    },
  };
}

function broadcastAnalyzeKickoff(ticker, agents, totalAgents, userId) {
  broadcast(
    {
      type: "AGENT_STATE_CHANGE",
      agent: "cio",
      state: "TYPING",
      ticker,
      message: `Dispatching ${totalAgents} sub-agents for ${ticker}...`,
    },
    { userId },
  );
  agents.forEach((agent) =>
    broadcast(
      { type: "AGENT_STATE_CHANGE", agent, state: "SPAWNED", ticker },
      { userId },
    ),
  );
  agents.forEach((agent, idx) => {
    setTimeout(
      () =>
        broadcast(
          { type: "AGENT_STATE_CHANGE", agent, state: "WALKING", ticker },
          { userId },
        ),
      idx * 400,
    );
    setTimeout(
      () =>
        broadcast(
          { type: "AGENT_STATE_CHANGE", agent, state: "SITTING", ticker },
          { userId },
        ),
      idx * 400 + 600,
    );
    setTimeout(
      () =>
        broadcast(
          {
            type: "AGENT_STATE_CHANGE",
            agent,
            state: "TYPING",
            ticker,
            message: getAgentWorkingMessage(agent, ticker),
          },
          { userId },
        ),
      idx * 400 + 900,
    );
  });
}

function broadcastAnalyzeCompletion(
  ticker,
  agents,
  totalAgents,
  analysis,
  userId,
) {
  let completed = 0;
  agents.forEach((agent, idx) => {
    setTimeout(
      () => {
        completed++;
        broadcast(
          {
            type: "ANALYSIS_PROGRESS",
            agent,
            ticker,
            payload: { progress: completed, total: totalAgents },
          },
          { userId },
        );
        broadcast(
          { type: "AGENT_STATE_CHANGE", agent, state: "PRESENTING", ticker },
          { userId },
        );
        setTimeout(
          () =>
            broadcast(
              { type: "AGENT_STATE_CHANGE", agent, state: "DONE", ticker },
              { userId },
            ),
          800,
        );
        setTimeout(
          () =>
            broadcast(
              { type: "AGENT_STATE_CHANGE", agent, state: "EXITED", ticker },
              { userId },
            ),
          1500,
        );
      },
      (totalAgents - idx) * 600 + 1000,
    );
  });

  setTimeout(
    () => {
      broadcast(
        {
          type: "ANALYSIS_COMPLETE",
          agent: "cio",
          ticker,
          payload: {
            verdict: analysis.decision_snapshot?.verdict || "Complete",
            analysis,
          },
        },
        { userId },
      );
      broadcast(
        {
          type: "AGENT_STATE_CHANGE",
          agent: "cio",
          state: "PRESENTING",
          ticker,
          message: `Analysis complete for ${ticker}`,
        },
        { userId },
      );
      setTimeout(
        () =>
          broadcast(
            { type: "AGENT_STATE_CHANGE", agent: "cio", state: "IDLE", ticker },
            { userId },
          ),
        2000,
      );
    },
    totalAgents * 600 + 2500,
  );
}

function buildAgentResultsFromGemini(geminiData) {
  if (
    geminiData?.status === "INSUFFICIENT_DATA" ||
    !geminiData?.sub_agent_scores
  ) {
    return null;
  }

  const scores = geminiData.sub_agent_scores;
  return {
    fundamental: {
      status: scores.fundamental ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.fundamental?.score ?? null,
      mode_fit: scores.fundamental?.mode_fit ?? "Mixed",
      reason: scores.fundamental?.reason ?? "",
    },
    technical: {
      status: scores.technical ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.technical?.score ?? null,
      mode_fit: scores.technical?.mode_fit ?? "Mixed",
      reason: scores.technical?.reason ?? "",
    },
    macro_flow: {
      status: scores.macro_flow ? "SUCCESS" : "INSUFFICIENT_DATA",
      score: scores.macro_flow?.score ?? null,
      mode_fit: scores.macro_flow?.mode_fit ?? "Mixed",
      reason: scores.macro_flow?.reason ?? "",
    },
  };
}

function mergeGeminiAnalysis(analysis, geminiData) {
  if (
    geminiData.status !== "INSUFFICIENT_DATA" &&
    geminiData.decision_snapshot
  ) {
    analysis.decision_snapshot.score =
      geminiData.decision_snapshot.score || analysis.decision_snapshot.score;
    if (
      geminiData.decision_snapshot.one_line_reason &&
      !analysis.decision_snapshot.one_line_reason
    ) {
      analysis.decision_snapshot.one_line_reason =
        geminiData.decision_snapshot.one_line_reason;
    }
    analysis.analysis = geminiData.analysis;
    return;
  }

  if (geminiData.status === "INSUFFICIENT_DATA") {
    analysis.adaptive_drilldown.warnings.push(
      geminiData.error_details || "AI analyst unavailable",
    );
  }
}

function buildInsufficientAnalyzeResponse(packet, ticker, decisionMode) {
  return {
    ...packet,
    decision_snapshot: {
      traffic_light_status: "yellow",
      verdict: "Wait",
      ticker,
      decision_mode: decisionMode,
      score: null,
      gate_status: "fail",
      one_line_reason: packet.error_details,
      immediate_next_action:
        "Provide broker/user-visible quote or wait for two accepted Tier 2 sources",
    },
  };
}

module.exports = {
  DECISION_MODE_AGENT_MAP,
  getAgentsForMode,
  getAgentWorkingMessage,
  runtimeInsufficientData,
  buildDeepAnalysisPayload,
  broadcastAnalyzeKickoff,
  broadcastAnalyzeCompletion,
  buildAgentResultsFromGemini,
  mergeGeminiAnalysis,
  buildInsufficientAnalyzeResponse,
};
