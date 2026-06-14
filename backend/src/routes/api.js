'use strict';
const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');
const { broadcast } = require('../ws/agentEventBus');

const router = express.Router();

const { requireAuth: clerkRequireAuth, getAuth } = require('@clerk/express');
const requireAuth = () => {
  if (process.env.CLERK_SECRET_KEY) return clerkRequireAuth();
  if (process.env.NODE_ENV !== 'production') {
    return (req, res, next) => {
      if (!req.auth) req.auth = { userId: "dev_mock_user_123" };
      next();
    };
  }
  return clerkRequireAuth();
};

function getUserId(req) {
  if (typeof req.auth === 'function') {
    return getAuth(req).userId;
  }
  return req.auth ? req.auth.userId : null;
}

const { getUserHoldings, getUserWatchlists } = require('../db');
const { default: YahooFinance } = require('yahoo-finance2');

// Simple sparkline cache
const sparklineCache = new Map();
const SPARKLINE_TTL = 60 * 60 * 1000; // 1 hour

async function getSparkline(ticker) {
  const now = Date.now();
  if (sparklineCache.has(ticker)) {
    const cached = sparklineCache.get(ticker);
    if (now - cached.timestamp < SPARKLINE_TTL) return cached.data;
  }
  try {
    const period1 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await YahooFinance.historical(ticker, { period1, interval: '1d' });
    const data = res.map(r => r.close);
    sparklineCache.set(ticker, { timestamp: now, data });
    return data;
  } catch (e) {
    return [0, 0];
  }
}

async function enrichWithMarketData(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const quote = await YahooFinance.quote(item.ticker);
      const spark = await getSparkline(item.ticker);
      return {
        ...item,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePct: quote.regularMarketChangePercent,
        spark
      };
    } catch (e) {
      return { ...item, price: 0, change: 0, changePct: 0, spark: [] };
    }
  }));
}

// Routes
router.get('/holdings', requireAuth(), async (req, res) => {
  try {
    const userId = getUserId(req);
    const holdings = await getUserHoldings(userId);
    const enriched = await enrichWithMarketData(holdings);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/watchlists', requireAuth(), async (req, res) => {
  try {
    const userId = getUserId(req);
    const watchlists = await getUserWatchlists(userId);
    const enriched = await enrichWithMarketData(watchlists);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
