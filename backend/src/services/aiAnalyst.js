// src/services/aiAnalyst.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || 'mock';
const ai = new GoogleGenAI({ apiKey });

function unavailableAnalysis(reason) {
  return {
    status: 'INSUFFICIENT_DATA',
    reason_code: 'AI_ANALYST_UNAVAILABLE',
    error_details: reason,
    decision_snapshot: {
      verdict: 'Wait',
      score: null,
      one_line_reason: reason,
    },
    sub_agent_scores: {},
    analysis: null,
  };
}

function validateAnalysisShape(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Gemini response is not a JSON object');
  }

  const verdict = value.decision_snapshot?.verdict;
  if (!verdict || typeof verdict !== 'string') {
    throw new Error('Gemini response missing decision_snapshot.verdict');
  }

  return value;
}

async function analyzeTicker(ticker, portfolioData, oracleData) {
  if (apiKey === 'mock') {
    return unavailableAnalysis('Gemini API key is missing');
  }

  const prompt = `Act as Elite Investor CIO. 
Ticker: ${ticker}
Oracle Technicals/Fundamentals: ${JSON.stringify(oracleData)}
Portfolio Context: ${JSON.stringify(portfolioData)}

Provide a concise decision snapshot (Hold/Buy/Sell), Conviction Score, and brief reason based on Elite Investor SOP. 
Evaluate the data from the 3 dimensions (Fundamental, Technical, Macro) and assign a score out of 10 for each.
Ensure you return a JSON object ONLY, with the following properties:
{
  "decision_snapshot": { "verdict": "Hold", "score": 7.5, "one_line_reason": "reason" },
  "sub_agent_scores": { "fundamental": 7, "technical": 8, "macro": 6 },
  "analysis": "detailed analysis..."
}`;

  let timeoutId;
  try {
    const apiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // SRE best practice: enforce timeout to prevent request hanging indefinitely
    const timeoutPromise = new Promise((_, reject) =>
      timeoutId = setTimeout(() => reject(new Error('Gemini API request timed out')), 8000)
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    
    // Attempt to parse if the model returned JSON
    const text = response.text.replace(/```json/i, '').replace(/```/g, '').trim();
    return validateAnalysisShape(JSON.parse(text));
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    return unavailableAnalysis(`Gemini API unavailable: ${error.message}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

module.exports = { analyzeTicker, unavailableAnalysis, validateAnalysisShape };
