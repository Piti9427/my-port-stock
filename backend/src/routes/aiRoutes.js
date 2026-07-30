"use strict";
const express = require("express");
const { z } = require("zod");
const { getRequestUserId } = require("../auth/requestAuth");
const {
  normalizeTicker,
  normalizeDecisionMode,
  insufficientData,
} = require("../common/format");
const {
  chatWithVerifiedContext,
  analyzeTicker,
} = require("../services/aiAnalyst");
const { runMarketOracle } = require("../services/marketOracleService");
const {
  getAgentsForMode,
  buildDeepAnalysisPayload,
  broadcastAnalyzeKickoff,
  broadcastAnalyzeCompletion,
  buildAgentResultsFromGemini,
  mergeGeminiAnalysis,
  buildInsufficientAnalyzeResponse,
} = require("../services/deepAnalysisService");
const {
  getVerifiedPacket,
  buildManualVerifiedPacket,
} = require("../services/analysisContextService");
const { evaluateDecision } = require("../decision/decisionEngine");
const { broadcast } = require("../ws/agentEventBus");

const router = express.Router();

function normalizeResponseLanguage(value) {
  return value === "en" ? "en" : "th";
}

function containsDisallowedControlCharacter(message) {
  // Intentionally reject non-whitespace C0 control characters in user prompts.
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message);
}

const ChatMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((message) => !containsDisallowedControlCharacter(message));

router.post("/chat", async (req, res, next) => {
  const ticker = normalizeTicker(req.body?.ticker);
  const language = normalizeResponseLanguage(req.body?.language);
  if (!ticker) {
    return res.status(200).json({
      language,
      ...insufficientData("Invalid ticker format"),
    });
  }

  const parsedMessage = ChatMessageSchema.safeParse(req.body?.message);
  if (!parsedMessage.success) {
    return res.status(400).json({ error: "Message must be 1-1000 characters" });
  }
  const message = parsedMessage.data;

  const userId = getRequestUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decisionMode = normalizeDecisionMode(req.body?.decision_mode);

  try {
    const packet = await getVerifiedPacket(ticker, decisionMode, { userId });
    if (packet.status === "INSUFFICIENT_DATA") {
      return res.status(200).json({
        as_of: new Date().toISOString(),
        ticker,
        decision_mode: decisionMode,
        language,
        ...packet,
        message: packet.error_details,
      });
    }

    const chat = await chatWithVerifiedContext({
      ticker,
      message,
      decisionMode,
      packet,
      language,
    });

    return res.status(200).json({
      as_of: new Date().toISOString(),
      ticker,
      decision_mode: decisionMode,
      language,
      ...chat,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/analyze", async (req, res, next) => {
  const ticker = normalizeTicker(req.body?.ticker);
  const language = normalizeResponseLanguage(req.body?.language);
  if (!ticker) {
    return res.status(200).json({
      language,
      ...insufficientData("Invalid ticker format"),
    });
  }

  const decisionMode = normalizeDecisionMode(req.body.decision_mode);
  const agents = getAgentsForMode(decisionMode);
  const totalAgents = agents.length;
  const userId = getRequestUserId(req);

  try {
    broadcastAnalyzeKickoff(ticker, agents, totalAgents, userId);
    const manualPrice = req.body.manual_price
      ? Number.parseFloat(req.body.manual_price)
      : null;
    const packet =
      manualPrice &&
      !Number.isNaN(manualPrice) &&
      manualPrice > 0 &&
      manualPrice < 1000000
        ? await buildManualVerifiedPacket(ticker, manualPrice, decisionMode, {
            userId,
          })
        : await getVerifiedPacket(ticker, decisionMode, { userId });

    if (packet.status === "INSUFFICIENT_DATA") {
      broadcast(
        { type: "AGENT_STATE_CHANGE", agent: "cio", state: "IDLE", ticker },
        { userId },
      );
      return res.status(200).json({
        language,
        ...buildInsufficientAnalyzeResponse(packet, ticker, decisionMode),
      });
    }

    const oracleData = await runMarketOracle(ticker);
    const geminiData = await analyzeTicker(
      ticker,
      packet.portfolio_context,
      oracleData,
      language,
    );

    packet.fundamental_packet = {
      ...packet.fundamental_packet,
      gemini_scores: geminiData,
      oracle: oracleData,
    };

    const agentResults = buildAgentResultsFromGemini(geminiData);
    const analysis = evaluateDecision(packet, {
      riskPlan: req.body.risk_plan,
      agentResults: agentResults || undefined,
    });

    mergeGeminiAnalysis(analysis, geminiData);
    analysis.deep_analysis = buildDeepAnalysisPayload(oracleData, geminiData);

    broadcastAnalyzeCompletion(ticker, agents, totalAgents, analysis, userId);

    return res.status(200).json({
      as_of: new Date().toISOString(),
      language,
      packet,
      ...analysis,
    });
  } catch (error) {
    broadcast(
      { type: "AGENT_STATE_CHANGE", agent: "cio", state: "IDLE", ticker },
      { userId },
    );
    return next(error);
  }
});

router.get("/market-oracle/:ticker", async (req, res, next) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) {
    return res.status(400).json({ error: "Invalid ticker format" });
  }

  try {
    const data = await runMarketOracle(ticker);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
