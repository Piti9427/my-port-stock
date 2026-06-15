'use strict';
const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');
const { broadcast } = require('../ws/agentEventBus');
const { z } = require('zod');
const { getAuth } = require('@clerk/express');
const { default: YahooFinance } = require('yahoo-finance2');

const router = express.Router();

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

const { getScopedDb } = require('../db');
const { supabaseConfigured } = require('../db/supabaseClient');
const { normalizeTicker, insufficientData } = require('../common/format');
const { bootstrapUserData } = require('../services/migrationService');

const yahooFinance = new YahooFinance();

// Simple sparkline cache
const sparklineCache = new Map();
const SPARKLINE_TTL = 60 * 60 * 1000; // 1 hour

function runtimeInsufficientData(reason, extras = {}) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: reason,
    ...extras,
  };
}

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

// Zod Validation Schemas
const WatchlistSchema = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.-]{1,10}$/, {
    message: "Ticker must be 1-10 alphanumeric characters, dots, or dashes."
  }),
  name: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  setup: z.string().trim().optional(),
  alert_price: z.number().nullable().optional(),
  alert_type: z.enum(['above', 'below']).optional(),
  ai_signal: z.string().trim().optional(),
  source_note: z.string().trim().optional(),
});

const JournalSchema = z.object({
  date: z.string().optional().transform(val => val ? new Date(val).toISOString() : new Date().toISOString()),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.-]{1,10}$/, {
    message: "Ticker must be 1-10 alphanumeric characters, dots, or dashes."
  }),
  type: z.enum(['BUY', 'SELL', 'ADJUST']),
  mode: z.string().trim().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  shares: z.number().positive("Shares must be positive").optional(),
  price: z.number().nonnegative("Price must be non-negative").optional(),
  entry: z.number().optional(),
  target: z.number().optional(),
  stop_loss: z.number().optional(),
  risk_reward: z.number().optional(),
  profit: z.number().optional(),
  notes: z.string().trim().optional(),
  source_note: z.string().trim().optional(),
});

// Holdings Routes
router.get('/holdings', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(200).json(runtimeInsufficientData("Supabase is not configured", { holdings: [] }));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userDb = getScopedDb(userId);
    let holdings = await userDb.getUserHoldings(userId);

    // Auto-migration check: If empty, bootstrap from markdown files
    if (holdings.length === 0) {
      const migrationResult = await bootstrapUserData(userId);
      if (migrationResult.migrated) {
        holdings = await userDb.getUserHoldings(userId);
      }
    }

    const enriched = await enrichWithMarketData(holdings);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Watchlist Routes
router.get('/watchlists', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(200).json(runtimeInsufficientData("Supabase is not configured", { watchlists: [] }));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userDb = getScopedDb(userId);
    const watchlists = await userDb.getUserWatchlists(userId);
    const enriched = await enrichWithMarketData(watchlists);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/watchlists', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const validated = WatchlistSchema.parse(req.body);
    const { ticker } = validated;

    const scopedSupabase = require('../db/supabaseClient').createScopedClient(userId);
    
    // Check if the ticker already exists for this user (including soft-deleted)
    const { data: existing, error: fetchErr } = await scopedSupabase
      .from('watchlists')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker);

    if (fetchErr) throw fetchErr;

    let result;
    if (existing && existing.length > 0) {
      const { data, error: updateErr } = await scopedSupabase
        .from('watchlists')
        .update({
          ...validated,
          is_deleted: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)
        .select();

      if (updateErr) throw updateErr;
      result = data;
    } else {
      const { data, error: insertErr } = await scopedSupabase
        .from('watchlists')
        .insert([{
          ...validated,
          user_id: userId,
          is_deleted: false
        }])
        .select();

      if (insertErr) throw insertErr;
      result = data;
    }

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/watchlists/:ticker', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const ticker = req.params.ticker.trim().toUpperCase();
    const scopedSupabase = require('../db/supabaseClient').createScopedClient(userId);

    const { data, error } = await scopedSupabase
      .from('watchlists')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .select();

    if (error) throw error;
    res.status(200).json({ message: `${ticker} removed from watchlist`, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Journal Routes
router.get('/journal', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(200).json(runtimeInsufficientData("Supabase is not configured", { trades: [] }));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userDb = getScopedDb(userId);
    let trades = await userDb.getUserJournal(userId);

    // Auto-migration check: If empty, bootstrap from markdown files
    if (trades.length === 0) {
      const migrationResult = await bootstrapUserData(userId);
      if (migrationResult.migrated) {
        trades = await userDb.getUserJournal(userId);
      }
    }

    res.status(200).json({ trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal/:ticker', async (req, res) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) return res.status(400).json({ error: 'Invalid ticker format' });

  if (!supabaseConfigured) {
    return res.status(200).json(runtimeInsufficientData("Supabase is not configured", { trades: [] }));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userDb = getScopedDb(userId);
    const trades = await userDb.getUserJournalByTicker(userId, ticker);
    res.status(200).json({ trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journal', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const validated = JournalSchema.parse(req.body);
    const userDb = getScopedDb(userId);
    const data = await userDb.insertJournalEntry(userId, validated);
    res.status(200).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/journal/:id', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { id } = req.params;
    const scopedSupabase = require('../db/supabaseClient').createScopedClient(userId);

    const { data, error } = await scopedSupabase
      .from('journal')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Journal entry soft-deleted successfully', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Market Price Route
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
