// src/services/aiAnalyst.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock' });

async function analyzeTicker(ticker, portfolioData, livePrice) {
  const prompt = `Act as Elite Investor CIO. 
Ticker: ${ticker}
Verified Live Price: ${livePrice}
Portfolio Context: ${JSON.stringify(portfolioData)}

Provide a concise decision snapshot (Hold/Buy/Sell), Conviction Score, and brief reason based on Elite Investor SOP.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  return response.text;
}

module.exports = { analyzeTicker };
