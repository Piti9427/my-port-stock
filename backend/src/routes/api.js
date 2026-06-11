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

router.post('/analyze', async (req, res) => {
  const { ticker, portfolioData, decision_mode: decisionMode = 'Swing Trade' } = req.body;
  const agents = getAgentsForMode(decisionMode);
  const totalAgents = agents.length;
  let completed = 0;

  try {
    // CIO begins
    broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'TYPING', ticker, message: `Dispatching ${totalAgents} sub-agents for ${ticker}...` });

    // Spawn all agents
    agents.forEach((agent) => {
      broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SPAWNED', ticker });
    });

    // Simulate sequential walking & working (in parallel with analysis)
    const agentAnimDelay = (agent, idx) => {
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'WALKING', ticker }), idx * 400);
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'SITTING', ticker }), idx * 400 + 600);
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'TYPING', ticker, message: getAgentWorkingMessage(agent, ticker) }), idx * 400 + 900);
    };
    agents.forEach(agentAnimDelay);

    // Run actual analysis
    const price = await getLivePrice(ticker);
    const analysis = await analyzeTicker(ticker, portfolioData, price);

    // Signal completion for each agent with stagger
    agents.forEach((agent, idx) => {
      setTimeout(() => {
        completed++;
        broadcast({ type: 'ANALYSIS_PROGRESS', agent, ticker, payload: { progress: completed, total: totalAgents } });
        broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'PRESENTING', ticker });
        setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'DONE', ticker }), 800);
        setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent, state: 'EXITED', ticker }), 1500);
      }, (totalAgents - idx) * 600 + 1000);
    });

    // CIO presents final verdict
    setTimeout(() => {
      broadcast({
        type: 'ANALYSIS_COMPLETE',
        agent: 'cio',
        ticker,
        payload: { verdict: 'Analysis Complete', price, analysis },
      });
      broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'PRESENTING', ticker, message: `Analysis complete for ${ticker}` });
      setTimeout(() => broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker }), 2000);
    }, totalAgents * 600 + 2500);

    res.json({ ticker, price, analysis });
  } catch (error) {
    broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'IDLE', ticker });
    res.status(500).json({ error: error.message });
  }
});

function getAgentWorkingMessage(agent, ticker) {
  const messages = {
    'fundamental-auditor': `Reviewing ${ticker} fundamentals & earnings...`,
    'quant-technician': `Analyzing ${ticker} RSI, MACD & order flow...`,
    'macro-strategist': `Evaluating macro regime for ${ticker}...`,
    'portfolio-risk-manager': `Calculating position sizing for ${ticker}...`,
    'catalyst-hunter': `Scanning upcoming catalysts for ${ticker}...`,
  };
  return messages[agent] || `Analyzing ${ticker}...`;
}

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
