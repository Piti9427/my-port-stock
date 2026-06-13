'use strict';
const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');
const { broadcast } = require('../ws/agentEventBus');

const router = express.Router();

const DECISION_MODE_AGENT_MAP = {
  'Quick Trade': ['catalyst-hunter', 'quant-technician'],
  'Swing Trade': ['fundamental-auditor', 'quant-technician', 'catalyst-hunter'],
  'Long-Term/Core': ['fundamental-auditor', 'macro-strategist', 'portfolio-risk-manager'],
  'Existing Position / Exit Review': ['fundamental-auditor', 'quant-technician', 'macro-strategist'],
};

function getAgentsForMode(decisionMode) {
  return DECISION_MODE_AGENT_MAP[decisionMode] || ['fundamental-auditor', 'quant-technician', 'macro-strategist'];
}

// Mock /analyze route removed, actual implementation is now in server.js

router.get('/price/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    const { getLivePrice, getUsdThbRate } = require('../services/marketData');
    const { default: YahooFinance } = require('yahoo-finance2');
    const yf = new YahooFinance();
    const quote = await yf.quote(ticker);
    
    const thbRate = await getUsdThbRate();
    const isUsd = quote.currency === 'USD';
    const rate = isUsd ? thbRate : 1;

    res.json({
      ticker,
      price: quote.regularMarketPrice * rate,
      change: quote.regularMarketChange * rate,
      changePct: quote.regularMarketChangePercent,
      high: quote.regularMarketDayHigh ? quote.regularMarketDayHigh * rate : null,
      low: quote.regularMarketDayLow ? quote.regularMarketDayLow * rate : null,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap ? quote.marketCap * rate : null,
      currency: 'THB'
    });
  } catch (error) {
    res.status(404).json({ error: `Could not fetch price for ${ticker}` });
  }
});

module.exports = router;
