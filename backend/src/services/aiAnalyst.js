// src/services/aiAnalyst.js
require("dotenv").config();
const { getTestProviders } = require("../providers/providerRegistry");

const apiKey = process.env.GEMINI_API_KEY || "mock";
let aiClientPromise;

async function getAiClient() {
  if (!aiClientPromise) {
    aiClientPromise = import("@google/genai").then(
      ({ GoogleGenAI }) => new GoogleGenAI({ apiKey }),
    );
  }
  return aiClientPromise;
}

function unavailableAnalysis(reason) {
  return {
    status: "INSUFFICIENT_DATA",
    reason_code: "AI_ANALYST_UNAVAILABLE",
    error_details: reason,
    decision_snapshot: {
      verdict: "Wait",
      score: null,
      one_line_reason: reason,
    },
    sub_agent_scores: {},
    analysis: null,
  };
}

function validateAnalysisShape(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini response is not a JSON object");
  }

  const verdict = value.decision_snapshot?.verdict;
  if (!verdict || typeof verdict !== "string") {
    throw new Error("Gemini response missing decision_snapshot.verdict");
  }

  const swot = value.swot;
  if (!swot || typeof swot !== "object") {
    throw new Error("Gemini response missing swot structured section");
  }

  for (const key of ["strengths", "weaknesses", "opportunities", "threats"]) {
    if (!Array.isArray(swot[key])) {
      throw new Error(`Gemini response missing swot.${key}`);
    }
  }

  if (!value.trade_plan || typeof value.trade_plan !== "object") {
    throw new Error("Gemini response missing trade_plan structured section");
  }

  return value;
}

function unavailableChat(reason) {
  return {
    status: "INSUFFICIENT_DATA",
    reason_code: "AI_CHAT_UNAVAILABLE",
    error_details: reason,
    message: reason,
  };
}

async function generateContentWithTimeout(prompt) {
  let timeoutId;
  try {
    const ai = await getAiClient();
    const apiCall = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const timeoutPromise = new Promise(
      (_, reject) =>
        (timeoutId = setTimeout(
          () => reject(new Error("Gemini API request timed out")),
          8000,
        )),
    );

    return await Promise.race([apiCall, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function responseLanguage(language) {
  return language === "en" ? "English" : "Thai";
}

function analysisOutline(language) {
  if (language === "en") {
    return `=========================================
7-Dimension Master SOP Audit
=========================================
[Dimension 1 - Megatrend & Global Macro]
- AI Cycle Stage / Bottleneck Wave: ...
- Macro Alignment: ...

[Dimension 2 & 6 - SWOT Analysis]
- Strengths: ...
- Opportunities: ...
- Weaknesses - Devil's Advocate, exactly 3 points/blindspots:
  1. ...
  2. ...
  3. ...
- Threats: ...

[Dimension 3 - Financials & Earnings Quality]
- PEG Ratio Gate: ...
- Expectation Gap & Guidance: ...
- FCF Margin / Earnings Quality: ...

[Dimension 4 - Sentiment & Whale Flow]
- Institutional & Option Flow: ...

[Dimension 5 - Technical Setup & W1 Golden Filter]
- W1 Golden Filter Status: ...
- D1 Entry & Support Levels: ...
- Anchored VWAP Level: ...

[Dimension 7 - Master Trading Plan & R/R Challenge]
- Thesis & Invalidation: ...
- Entry Zone: ...
- Stop-Loss: ...
- Target 1 / Target 2: ...
- R/R Ratio & Emotional Challenge: ...`;
  }

  return `=========================================
วิเคราะห์เชิงลึก 7 มิติ (7-Dimension Master SOP Audit)
=========================================
[Dimension 1 - Megatrend & Global Macro]
- AI Cycle Stage / Bottleneck Wave: ...
- Macro Alignment: ...

[Dimension 2 & 6 - SWOT Analysis]
- Strengths (จุดแข็ง): ...
- Opportunities (โอกาส): ...
- Weaknesses (จุดอ่อน - Devil's Advocate 3 points/blindspots):
  1. ...
  2. ...
  3. ...
- Threats (อุปสรรค): ...

[Dimension 3 - Financials & Earnings Quality]
- PEG Ratio Gate: ...
- Expectation Gap & Guidance: ...
- FCF Margin / Earnings Quality: ...

[Dimension 4 - Sentiment & Whale Flow]
- Institutional & Option Flow: ...

[Dimension 5 - Technical Setup & W1 Golden Filter]
- W1 Golden Filter Status: ...
- D1 Entry & Support Levels: ...
- Anchored VWAP Level: ...

[Dimension 7 - Master Trading Plan & R/R Challenge]
- Thesis & Invalidation: ...
- Entry Zone: ...
- Stop-Loss: ...
- Target 1 / Target 2: ...
- R/R Ratio & Emotional Challenge: ...`;
}

function buildChatPrompt({
  ticker,
  message,
  decisionMode,
  packet,
  language = "th",
}) {
  const languageName = responseLanguage(language);
  return `Act as Elite Investor CIO for MyPortStock.
Answer in concise ${languageName}.

Rules:
- Use only the verified packet below and the user's question.
- Do not invent current price, portfolio state, journal state, catalyst timing, stop-loss, target, or execution advice.
- If the verified packet is insufficient for the question, return INSUFFICIENT_DATA and explain what is missing.
- Do not recommend Buy/Add unless the packet's current price acceptance gate and risk rules support it.

Ticker: ${ticker}
Decision Mode: ${decisionMode}
User question: ${message}
Verified packet JSON: ${JSON.stringify(packet)}

Return plain ${languageName} text only.`;
}

function buildAnalysisPrompt(
  ticker,
  portfolioData,
  oracleData,
  language = "th",
) {
  const languageName = responseLanguage(language);
  return `Act as Elite Investor CIO.
Ticker: ${ticker}
Oracle Technicals/Fundamentals: ${JSON.stringify(oracleData)}
Portfolio Context: ${JSON.stringify(portfolioData)}

Perform a deep analysis of ${ticker} according to the Elite Investor 7-Dimension Master SOP and SWOT framework from the SOP.
Analyze the following dimensions in detail:
1. Megatrend & Global Macro: Megatrend alignment, Fed/inflation macro regime, AI Super Cycle Stage (Stage 1-4), AI Bottleneck Rotation Wave (Wave 1-8).
2. Fundamental Moat & Industry SWOT (Strengths & Opportunities): Moat strength, pricing power, industry strengths & opportunities.
3. Financials & Earnings Report Intelligence: PEG ratio (SOP gate: PEG < 1.5), Free Cash Flow Margin (positive/negative), earnings quality. Compare actual earnings/revenue against Wall Street consensus (calculate the Expectation Gap) and track forward guidance revisions. Cite at least two distinct institutional financial sources for validation.
4. Sentiment & Whale Intelligence: Institutional flow (13F holdings), dark pool blocks, options flow.
5. Advanced Technical Analysis: Weekly structural trend (W1 Golden Filter: Price vs W1 200 EMA/50 MA/20 EMA), Daily pullback to dynamic support (EMA 20/MA 50), ATR-based stop-loss, and Anchored VWAP (AVWAP) from the latest earnings date.
6. Devil's Advocate & Industry SWOT (Weaknesses & Threats): Identify exactly 3 high-conviction bear-case points / blindspots (Internal weaknesses like debt/burn rate, external threats like competition/displacement).
7. Master Trading Plan & Thesis Integrity: Investment thesis, entry zone, stop-loss, Target 1, Target 2, Risk/Reward ratio. Provide a dynamic Risk/Reward challenge serving as an emotional brake.

Write every human-readable value in ${languageName}.
Format the 'analysis' property as clean, highly readable markdown structured exactly as follows:
${analysisOutline(language)}

Ensure you return a JSON object ONLY, with the following properties:
{
  "decision_snapshot": {
    "verdict": "Buy" | "Hold" | "Wait" | "Avoid",
    "score": number (0 to 10),
    "one_line_reason": "concise reason in ${languageName}"
  },
  "sub_agent_scores": {
    "fundamental": {
      "score": number (0 to 10),
      "mode_fit": "Good" | "Mixed" | "Poor",
      "reason": "short fundamental status"
    },
    "technical": {
      "score": number (0 to 10),
      "mode_fit": "Good" | "Mixed" | "Poor",
      "reason": "short technical status"
    },
    "macro_flow": {
      "score": number (0 to 10),
      "mode_fit": "Good" | "Mixed" | "Poor",
      "reason": "short macro/flow status"
    }
  },
  "swot": {
    "strengths": ["1-3 concise bullets"],
    "weaknesses": ["1-3 concise bullets"],
    "opportunities": ["1-3 concise bullets"],
    "threats": ["1-3 concise bullets"]
  },
  "trade_plan": {
    "thesis": "short thesis or INSUFFICIENT_DATA",
    "entry_zone": "entry zone or Wait",
    "stop_loss": "hard stop or INSUFFICIENT_DATA",
    "target_1": "target 1 or INSUFFICIENT_DATA",
    "target_2": "target 2 or INSUFFICIENT_DATA",
    "rr_ratio": "risk/reward or INSUFFICIENT_DATA"
  },
  "analysis": "${languageName} detailed analysis text..."
}`;
}

async function chatWithVerifiedContext({
  ticker,
  message,
  decisionMode,
  packet,
  language = "th",
}) {
  const testProvider = getTestProviders()?.gemini;
  if (testProvider)
    return testProvider.analyze({
      ticker,
      message,
      decisionMode,
      packet,
      language,
    });
  if (apiKey === "mock") {
    return unavailableChat("Gemini API key is missing");
  }

  if (!packet || packet.status === "INSUFFICIENT_DATA") {
    return unavailableChat(
      packet?.error_details || "Verified packet is unavailable",
    );
  }

  const prompt = buildChatPrompt({
    ticker,
    message,
    decisionMode,
    packet,
    language,
  });

  try {
    const response = await generateContentWithTimeout(prompt);
    const text = String(response.text || "").trim();
    return {
      status: text ? "READY" : "INSUFFICIENT_DATA",
      message: text || "Gemini response was empty",
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error.message);
    return unavailableChat(`Gemini API unavailable: ${error.message}`);
  }
}

async function analyzeTicker(
  ticker,
  portfolioData,
  oracleData,
  language = "th",
) {
  const testProvider = getTestProviders()?.gemini;
  if (testProvider)
    return testProvider.analyze({
      ticker,
      portfolioData,
      oracleData,
      language,
    });
  if (apiKey === "mock") {
    return unavailableAnalysis("Gemini API key is missing");
  }

  const prompt = buildAnalysisPrompt(
    ticker,
    portfolioData,
    oracleData,
    language,
  );

  try {
    const response = await generateContentWithTimeout(prompt);

    // Attempt to parse if the model returned JSON
    const text = response.text
      .replace(/```json/i, "")
      .replace(/```/g, "")
      .trim();
    return validateAnalysisShape(JSON.parse(text));
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return unavailableAnalysis(`Gemini API unavailable: ${error.message}`);
  }
}

module.exports = {
  analyzeTicker,
  buildAnalysisPrompt,
  buildChatPrompt,
  chatWithVerifiedContext,
  unavailableAnalysis,
  unavailableChat,
  validateAnalysisShape,
};
