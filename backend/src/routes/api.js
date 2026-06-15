'use strict';
const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');
const { broadcast } = require('../ws/agentEventBus');

const router = express.Router();

const { getAuth } = require('@clerk/express');

const requireAuth = () => {
  return (req, res, next) => {
    if (req.auth?.userId) {
      return next();
    }
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return next();
    } catch (err) {
      console.error('Auth error:', err.message);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
};

function getUserId(req) {
  if (req.auth?.userId) {
    return req.auth.userId;
  }
  try {
    return getAuth(req).userId;
  } catch (err) {
    console.error('Error getting userId:', err.message);
    return null;
  }
}

const { getUserHoldings, getUserWatchlists } = require('../db');
const { default: YahooFinance } = require('yahoo-finance2');
const yahooFinance = new YahooFinance();

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
    const res = await yahooFinance.historical(ticker, { period1, interval: '1d' });
    const data = res.map(r => r.close);
    sparklineCache.set(ticker, { timestamp: now, data });
    return data;
  } catch (e) {
    console.error(`Error fetching sparkline for ${ticker}:`, e.message);
    return [0, 0];
  }
}

async function enrichWithMarketData(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const quote = await yahooFinance.quote(item.ticker);
      const spark = await getSparkline(item.ticker);
      return {
        ...item,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePct: quote.regularMarketChangePercent,
        spark
      };
    } catch (e) {
      console.error(`Error enriching market data for ${item.ticker}:`, e.message);
      return { ...item, price: null, change: null, changePct: null, spark: [] };
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
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(200).json([]);
    }
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
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(200).json([]);
    }
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
    const { getUsdThbRate } = require('../services/marketData');
    const quote = await yahooFinance.quote(ticker);
    
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
    console.error(`Error fetching price for ${ticker}:`, error.message);
    res.status(404).json({ error: `Could not fetch price for ${ticker}` });
  }
});

module.exports = router;
