// src/services/aiAnalyst.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || 'mock';
const ai = new GoogleGenAI({ apiKey });

async function analyzeTicker(ticker, portfolioData, livePrice) {
  const getMockData = () => ({
    decision_snapshot: {
      verdict: 'Buy',
      score: 8.5,
      one_line_reason: `Strong fundamentals and technical setup at $${livePrice}. (Mock Fallback)`
    },
    analysis: `Mock Analysis for ${ticker}. The Gemini API may be experiencing high demand or using an invalid key.`
  });

  if (apiKey === 'mock') {
    return getMockData();
  }

  const prompt = `Act as Elite Investor CIO. 
Ticker: ${ticker}
Verified Live Price: ${livePrice}
Portfolio Context: ${JSON.stringify(portfolioData)}

Provide a concise decision snapshot (Hold/Buy/Sell), Conviction Score, and brief reason based on Elite Investor SOP. Ensure you return a JSON object with decision_snapshot { verdict, score, one_line_reason } and analysis properties.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
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
