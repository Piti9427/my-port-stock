"use strict";
const express = require("express");
const { z } = require("zod");
const { getRequestUserId } = require("../auth/requestAuth");
const { isTestMode } = require("../providers/testMode");
const { enrichWithMarketData } = require("../services/quoteEnricher");

const router = express.Router();

function getUserId(req) {
  return getRequestUserId(req);
}

const { getScopedDb } = require("../db");
const { supabaseConfigured } = require("../db/supabaseClient");
const { normalizeTicker } = require("../common/format");

function runtimeInsufficientData(reason, extras = {}) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: reason,
    ...extras,
  };
}

// Zod Validation Schemas
const WatchlistSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.-]{1,10}$/, {
      message: "Ticker must be 1-10 alphanumeric characters, dots, or dashes.",
    }),
  name: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  setup: z.string().trim().optional(),
  alert_price: z.number().nullable().optional(),
  alert_type: z.enum(["above", "below"]).optional(),
  ai_signal: z.string().trim().optional(),
  source_note: z.string().trim().optional(),
});

const JournalSchema = z.object({
  date: z
    .string()
    .optional()
    .transform((val) =>
      val ? new Date(val).toISOString() : new Date().toISOString(),
    ),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.-]{1,10}$/, {
      message: "Ticker must be 1-10 alphanumeric characters, dots, or dashes.",
    }),
  type: z.enum(["BUY", "SELL", "ADJUST"]),
  mode: z.string().trim().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  shares: z.number().positive("Shares must be positive").optional(),
  price: z.number().nonnegative("Price must be non-negative").optional(),
  entry: z.number().optional(),
  target: z.number().optional(),
  stop_loss: z.number().optional(),
  risk_reward: z.number().optional(),
  profit: z.number().optional(),
  notes: z.string().trim().optional(),
  source_note: z.string().trim().optional(),
  cognitive_bias: z.string().trim().nullable().optional(),
});
const JournalIdSchema = z.string().uuid();

// Holdings Routes
router.get("/holdings", async (req, res, next) => {
  if (!supabaseConfigured && !isTestMode()) {
    return res.status(200).json([]);
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { getUsdThbRate } = require("../services/marketData");
    const userDb = getScopedDb(userId);
    const [holdings, trades] = await Promise.all([
      userDb.getUserHoldings(userId),
      userDb.getUserJournal(userId),
    ]);
    const enriched = await enrichWithMarketData(holdings);

    const thbRate = await getUsdThbRate();

    const openTradesByTicker = {};
    for (const trade of trades || []) {
      const status = String(trade.status || "")
        .trim()
        .toUpperCase();
      if (status === "OPEN" || status === "ACTIVE") {
        const ticker = String(trade.ticker || "").toUpperCase();
        openTradesByTicker[ticker] = trade;
      }
    }

    const finalHoldings = enriched.map((item) => {
      const price = item.price || item.avg_cost || 0;
      const shares = item.shares || 0;
      const costValueUsd = shares * (item.avg_cost || 0);
      const currentValueUsd = shares * price;

      // Beta calculation
      const beta = item.beta || 1.0;

      // P/L calculations
      const plUsd = currentValueUsd - costValueUsd;
      const isUsd = !item.ticker.endsWith(".BK");
      const rate = isUsd ? thbRate : 1.0;

      // Position Age & Time Stop check
      let ageDays = 0;
      if (item.opened_at) {
        const opened = new Date(item.opened_at);
        const today = new Date();
        const diff = today.getTime() - opened.getTime();
        ageDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      const tickerKey = String(item.ticker || "").toUpperCase();
      const activeTrade = openTradesByTicker[tickerKey];
      const mode = activeTrade?.mode || item.mode || "Long-Term/Core";
      const isSwing = mode === "Swing Trade";
      const isQuick = mode === "Quick Trade";
      const timeStopLimit = isSwing ? 15 : isQuick ? 5 : 9999;
      const timeStopHit = ageDays > timeStopLimit;

      return {
        ...item,
        mode,
        beta,
        fx_rate: rate,
        value_usd: isUsd ? currentValueUsd : currentValueUsd / thbRate,
        value_thb: isUsd ? currentValueUsd * thbRate : currentValueUsd,
        cost_usd: isUsd ? costValueUsd : costValueUsd / thbRate,
        cost_thb: isUsd ? costValueUsd * thbRate : costValueUsd,
        day_pl_usd: isUsd
          ? shares * (item.change || 0)
          : (shares * (item.change || 0)) / thbRate,
        day_pl_thb: isUsd
          ? shares * (item.change || 0) * thbRate
          : shares * (item.change || 0),
        current_value_usd: currentValueUsd,
        pl_usd: plUsd,
        pl_thb: plUsd * rate,
        fx_impact_thb: 0.0, // Static exchange rate assumed
        age_days: ageDays,
        time_stop_hit: timeStopHit,
      };
    });

    res.json({
      holdings: finalHoldings,
      usd_thb_rate: thbRate,
    });
  } catch (err) {
    next(err);
  }
});

// Watchlist Routes
router.get("/watchlists", async (req, res, next) => {
  if (!supabaseConfigured) {
    return res.status(200).json(
      runtimeInsufficientData("Supabase is not configured", {
        watchlists: [],
      }),
    );
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userDb = getScopedDb(userId);
    const watchlists = await userDb.getUserWatchlists(userId);
    const enriched = await enrichWithMarketData(watchlists);
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

router.post("/watchlists", async (req, res, next) => {
  if (!supabaseConfigured) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const validated = WatchlistSchema.parse(req.body);
    const { ticker } = validated;

    const scopedSupabase = require("../db/supabaseClient").createScopedClient(
      userId,
    );

    // Check if the ticker already exists for this user (including soft-deleted)
    const { data: existing, error: fetchErr } = await scopedSupabase
      .from("watchlists")
      .select("*")
      .eq("user_id", userId)
      .eq("ticker", ticker);

    if (fetchErr) throw fetchErr;

    let result;
    if (existing && existing.length > 0) {
      const { data, error: updateErr } = await scopedSupabase
        .from("watchlists")
        .update({
          ...validated,
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)
        .select();

      if (updateErr) throw updateErr;
      result = data;
    } else {
      const { data, error: insertErr } = await scopedSupabase
        .from("watchlists")
        .insert([
          {
            ...validated,
            user_id: userId,
            is_deleted: false,
          },
        ])
        .select();

      if (insertErr) throw insertErr;
      result = data;
    }

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: err.issues.map((e) => e.message).join(", ") });
    }
    next(err);
  }
});

router.delete("/watchlists/:ticker", async (req, res, next) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker format" });

  if (!supabaseConfigured) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const scopedSupabase = require("../db/supabaseClient").createScopedClient(
      userId,
    );

    const { data, error } = await scopedSupabase
      .from("watchlists")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("ticker", ticker)
      .select();

    if (error) throw error;
    res.status(200).json({ message: `${ticker} removed from watchlist`, data });
  } catch (err) {
    next(err);
  }
});

// Journal Routes
router.get("/journal", async (req, res, next) => {
  if (!supabaseConfigured && !isTestMode()) {
    return res
      .status(200)
      .json(
        runtimeInsufficientData("Supabase is not configured", { trades: [] }),
      );
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userDb = getScopedDb(userId);
    const trades = await userDb.getUserJournal(userId);
    res.status(200).json({ trades });
  } catch (err) {
    next(err);
  }
});

router.get("/journal/:ticker", async (req, res, next) => {
  const ticker = normalizeTicker(req.params.ticker);
  if (!ticker) return res.status(400).json({ error: "Invalid ticker format" });

  if (!supabaseConfigured && !isTestMode()) {
    return res
      .status(200)
      .json(
        runtimeInsufficientData("Supabase is not configured", { trades: [] }),
      );
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userDb = getScopedDb(userId);
    const trades = await userDb.getUserJournalByTicker(userId, ticker);
    res.status(200).json({ trades });
  } catch (err) {
    next(err);
  }
});

router.post("/journal", async (req, res, next) => {
  if (!supabaseConfigured && !isTestMode()) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const validated = JournalSchema.parse(req.body);
    const userDb = getScopedDb(userId);
    const data = await userDb.insertJournalEntry(userId, validated);
    res.status(200).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: err.issues.map((e) => e.message).join(", ") });
    }
    next(err);
  }
});

router.delete("/journal/:id", async (req, res, next) => {
  const parsedId = JournalIdSchema.safeParse(req.params.id);
  if (!parsedId.success)
    return res.status(400).json({ error: "Invalid journal ID" });

  if (!supabaseConfigured) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const id = parsedId.data;
    const scopedSupabase = require("../db/supabaseClient").createScopedClient(
      userId,
    );

    const { data, error } = await scopedSupabase
      .from("journal")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .select();

    if (error) throw error;
    res
      .status(200)
      .json({ message: "Journal entry soft-deleted successfully", data });
  } catch (err) {
    next(err);
  }
});

// Watchlist Scanner Route
router.get("/watchlist/scan", async (req, res, next) => {
  if (!supabaseConfigured) {
    return res
      .status(200)
      .json(
        runtimeInsufficientData("Supabase is not configured", { alerts: [] }),
      );
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userDb = getScopedDb(userId);
    const watchlists = await userDb.getUserWatchlists(userId);
    const enriched = await enrichWithMarketData(watchlists);

    const alerts = enriched.map((item) => {
      const lastPrice = item.price;
      const alertPrice = item.alert_price;
      let triggered = false;

      if (lastPrice && alertPrice) {
        const pctDiff = Math.abs(lastPrice - alertPrice) / alertPrice;
        if (pctDiff <= 0.01) {
          triggered = true;
        }
      }

      return {
        id: item.id,
        ticker: item.ticker,
        last_price: lastPrice,
        alert_price: alertPrice,
        triggered,
      };
    });

    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

// Market Price Route
router.get("/price/:ticker", async (req, res) => {
  const { ticker } = req.params;
  try {
    const { getUsdThbRate } = require("../services/marketData");
    const { default: YahooFinance } = require("yahoo-finance2");
    const yahooFinance = new YahooFinance();

    const [rawQuote, thbRate] = await Promise.all([
      yahooFinance.quote(ticker),
      getUsdThbRate(),
    ]);
    const quote = /** @type {{
     * regularMarketPrice?: number, currency?: string, regularMarketChange?: number,
     * regularMarketChangePercent?: number, regularMarketDayHigh?: number,
     * regularMarketDayLow?: number, regularMarketVolume?: number, marketCap?: number
     * }} */ (rawQuote);

    if (!quote || !quote.regularMarketPrice) {
      return res
        .status(404)
        .json({ error: `No price data found for ${ticker}` });
    }

    const isUsd = quote.currency === "USD";
    const rate = isUsd ? thbRate : 1;

    res.json({
      ticker,
      price: quote.regularMarketPrice * rate,
      change: quote.regularMarketChange
        ? quote.regularMarketChange * rate
        : null,
      changePct: quote.regularMarketChangePercent ?? null,
      high: quote.regularMarketDayHigh
        ? quote.regularMarketDayHigh * rate
        : null,
      low: quote.regularMarketDayLow ? quote.regularMarketDayLow * rate : null,
      volume: quote.regularMarketVolume ?? null,
      marketCap: quote.marketCap ? quote.marketCap * rate : null,
      currency: "THB",
    });
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error.message);
    res.status(404).json({ error: `Could not fetch price for ${ticker}` });
  }
});

router.use("/preferences", require("./preferences"));
router.use("/today", require("./today"));

module.exports = router;
module.exports.getUserId = getUserId;
