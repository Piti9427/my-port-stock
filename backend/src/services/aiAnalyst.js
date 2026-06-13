// src/services/aiAnalyst.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || 'mock';
const ai = new GoogleGenAI({ apiKey });

async function analyzeTicker(ticker, portfolioData, oracleData) {
  const getMockData = () => ({
    decision_snapshot: {
      verdict: 'Buy',
      score: 8.5,
      one_line_reason: `Strong fundamentals and technical setup. (Mock Fallback)`
    },
    sub_agent_scores: { fundamental: 8, technical: 9, macro: 7 },
    analysis: `Mock Analysis for ${ticker}. The Gemini API may be experiencing high demand or using an invalid key.`
  });

  if (apiKey === 'mock') {
    return getMockData();
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

  try {
    const apiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // SRE best practice: enforce timeout to prevent request hanging indefinitely
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API request timed out')), 8000)
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    
    // Attempt to parse if the model returned JSON
    const text = response.text.replace(/```json/i, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    // Fallback to mock data so the UI doesn't crash on 503 or 400 errors
    return getMockData();
  }
}

module.exports = { analyzeTicker };
