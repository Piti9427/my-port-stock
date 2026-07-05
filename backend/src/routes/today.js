// backend/src/routes/today.js
'use strict';

const express = require('express');
const { getRequestUserId } = require('../auth/requestAuth');
const { getScopedDb } = require('../db');
const { supabaseConfigured } = require('../db/supabaseClient');
const { enrichWithMarketData } = require('../services/quoteEnricher');
const { getForUser: getPrefsForUser } = require('../preferences/preferenceRepository');
const { isSpeculative, getSpeculativeWeightPct } = require('../common/portfolio');

const router = express.Router();

const DEFAULT_MAX_DRAWDOWN_PCT = 15;
const DEFAULT_MAX_POSITION_PCT = 10;
const DEFAULT_MAX_SECTOR_PCT = 35;
const DEFAULT_MAX_SPECULATIVE_PCT = 20;
const STOP_PROXIMITY_BUFFER = 0.025; // 2.5% above stop
const EARNINGS_WARN_DAYS = 7;
const SWING_TIME_STOP_DAYS = 15;
const QUICK_TIME_STOP_DAYS = 5;
const MISTAKE_TAGS = ['#fomo', '#chasing', '#revenge', '#failed', '#broken'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function daysUntil(ts) {
  if (!ts) return null;
  const diff = ts * 1000 - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function hasThesisFailure(notes) {
  if (!notes) return false;
  const lower = String(notes).toLowerCase();
  return lower.includes('#failed') || lower.includes('#broken');
}

function hasMistakeTags(notes) {
  if (!notes) return false;
  const lower = String(notes).toLowerCase();
  return MISTAKE_TAGS.some((tag) => lower.includes(tag));
}

function isEmptyNotes(notes) {
  return !notes || String(notes).trim().length < 20;
}

// ─── Portfolio pulse ─────────────────────────────────────────────────────────

function buildPulse(enrichedHoldings, prefs, thbRate = 35.0) {
  const maxDrawdownPct = num(prefs?.max_portfolio_drawdown_pct) || DEFAULT_MAX_DRAWDOWN_PCT;

  let totalCost = 0;
  let totalValue = 0;
  let totalWeightedBeta = 0;

  for (const h of enrichedHoldings) {
    const shares = num(h.shares);
    const avgCost = num(h.avg_cost);
    const price = num(h.price) || avgCost;
    const beta = num(h.beta) || 1.0;

    const isUsd = !String(h.ticker || '').toUpperCase().endsWith('.BK');
    const rate = isUsd ? thbRate : 1.0;

    totalCost += shares * avgCost * rate;
    totalValue += shares * price * rate;
    totalWeightedBeta += beta * shares * price * rate;
  }

  const totalPl = totalValue - totalCost;
  const drawdownPct =
    totalCost > 0 && totalPl < 0 ? (Math.abs(totalPl) / totalCost) * 100 : 0;
  const portfolioBeta = totalValue > 0 ? totalWeightedBeta / totalValue : 1.0;
  const speculativeWeightPct = getSpeculativeWeightPct(enrichedHoldings, totalValue);

  // Sector map
  const sectorMap = new Map();
  for (const h of enrichedHoldings) {
    const sector = h.sector || 'Unknown';
    const isUsd = !String(h.ticker || '').toUpperCase().endsWith('.BK');
    const rate = isUsd ? thbRate : 1.0;
    const val = num(h.shares) * (num(h.price) || num(h.avg_cost)) * rate;
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + val);
  }
  const sectorBreaches = [];
  for (const [sector, val] of sectorMap) {
    const weight = totalValue > 0 ? (val / totalValue) * 100 : 0;
    if (weight > DEFAULT_MAX_SECTOR_PCT) {
      sectorBreaches.push({ sector, weight: +weight.toFixed(1) });
    }
  }

  return {
    totalValue: +totalValue.toFixed(2),
    totalCost: +totalCost.toFixed(2),
    totalPl: +totalPl.toFixed(2),
    drawdownPct: +drawdownPct.toFixed(2),
    portfolioBeta: +portfolioBeta.toFixed(2),
    speculativeWeightPct: +speculativeWeightPct.toFixed(2),
    missingStopCount: 0, // set by queue logic
    sectorBreaches,
    maxDrawdownPct,
  };
}

// ─── Queue builders ──────────────────────────────────────────────────────────

function buildProtectItems(enrichedHoldings, journalEntries, pulse) {
  const items = [];
  const openByTicker = new Map();
  for (const j of journalEntries) {
    if (String(j.status || '').toUpperCase() === 'OPEN') {
      openByTicker.set(String(j.ticker || '').toUpperCase(), j);
    }
  }

  let missingStopCount = 0;

  for (const h of enrichedHoldings) {
    const ticker = String(h.ticker || '').toUpperCase();
    const price = num(h.price) || num(h.avg_cost);
    const openTrade = openByTicker.get(ticker);
    const stopLoss = openTrade ? num(openTrade.stop_loss) : null;
    const hasValidStop = stopLoss && stopLoss > 0;

    // Thesis failure
    if (openTrade && hasThesisFailure(openTrade.notes)) {
      items.push({
        category: 'protect',
        type: 'thesis_failure',
        ticker,
        reason: `Thesis failure detected for ${ticker} — review or exit this position`,
        cta: 'Review Journal',
        ctaRoute: '/journal',
        evidence: { notes: openTrade.notes },
      });
    }

    // Missing stop
    if (!openTrade || !hasValidStop) {
      missingStopCount++;
      items.push({
        category: 'protect',
        type: 'missing_stop',
        ticker,
        reason: `${ticker} has no stop-loss defined — new buy decisions blocked until a stop is set`,
        cta: 'Log Stop-Loss',
        ctaRoute: '/journal',
        evidence: { price },
      });
      continue; // stop proximity doesn't apply without a stop
    }

    // Stop proximity
    if (price > 0 && price <= stopLoss * (1 + STOP_PROXIMITY_BUFFER)) {
      items.push({
        category: 'protect',
        type: 'stop_proximity',
        ticker,
        reason: `${ticker} is within 2.5% of stop-loss (price ${price.toFixed(2)}, stop ${stopLoss.toFixed(2)}) — consider exit or review`,
        cta: 'Analyze',
        ctaRoute: `/command-center?ticker=${ticker}`,
        evidence: { price, stop_loss: stopLoss, distancePct: +(((price - stopLoss) / price) * 100).toFixed(2) },
      });
    }
  }

  // Portfolio drawdown breach
  if (pulse.drawdownPct >= pulse.maxDrawdownPct) {
    items.push({
      category: 'protect',
      type: 'drawdown_limit',
      ticker: null,
      reason: `Portfolio drawdown ${pulse.drawdownPct.toFixed(1)}% has reached the ${pulse.maxDrawdownPct}% circuit-breaker — new buys suspended`,
      cta: 'View Risk',
      ctaRoute: '/risk',
      evidence: { drawdownPct: pulse.drawdownPct, maxDrawdownPct: pulse.maxDrawdownPct },
    });
  }

  // Concentration breach (per position)
  const totalValue = pulse.totalValue;
  for (const h of enrichedHoldings) {
    const ticker = String(h.ticker || '').toUpperCase();
    const val = num(h.shares) * (num(h.price) || num(h.avg_cost));
    const posWeight = totalValue > 0 ? (val / totalValue) * 100 : 0;
    if (posWeight > DEFAULT_MAX_POSITION_PCT) {
      items.push({
        category: 'protect',
        type: 'concentration_breach',
        ticker,
        reason: `${ticker} is ${posWeight.toFixed(1)}% of portfolio — exceeds the 10% single-position limit`,
        cta: 'View Risk',
        ctaRoute: '/risk',
        evidence: { posWeight: +posWeight.toFixed(1), limit: DEFAULT_MAX_POSITION_PCT },
      });
    }
  }

  // Speculative cap breach
  if (pulse.speculativeWeightPct > DEFAULT_MAX_SPECULATIVE_PCT) {
    items.push({
      category: 'protect',
      type: 'speculative_cap',
      ticker: null,
      reason: `Speculative names are ${pulse.speculativeWeightPct.toFixed(1)}% of portfolio — exceeds the 20% speculative allocation cap`,
      cta: 'View Risk',
      ctaRoute: '/risk',
      evidence: { speculativeWeightPct: pulse.speculativeWeightPct, limit: DEFAULT_MAX_SPECULATIVE_PCT },
    });
  }

  // Sector breaches
  for (const breach of pulse.sectorBreaches) {
    items.push({
      category: 'protect',
      type: 'sector_breach',
      ticker: null,
      reason: `${breach.sector} sector is ${breach.weight}% of portfolio — exceeds the 35% sector concentration limit`,
      cta: 'View Risk',
      ctaRoute: '/risk',
      evidence: breach,
    });
  }

  return { items, missingStopCount };
}

function buildPrepareItems(enrichedHoldings, journalEntries) {
  const items = [];
  const openByTicker = new Map();
  for (const j of journalEntries) {
    if (String(j.status || '').toUpperCase() === 'OPEN') {
      openByTicker.set(String(j.ticker || '').toUpperCase(), j);
    }
  }

  for (const h of enrichedHoldings) {
    const ticker = String(h.ticker || '').toUpperCase();
    const openTrade = openByTicker.get(ticker);
    const mode = (openTrade?.mode || h.mode || '').trim();

    // Earnings proximity
    const earningsTs = h.earningsTimestamp;
    const daysToEarnings = daysUntil(earningsTs);
    if (daysToEarnings !== null && daysToEarnings >= 0 && daysToEarnings <= EARNINGS_WARN_DAYS) {
      items.push({
        category: 'prepare',
        type: 'upcoming_earnings',
        ticker,
        reason: `${ticker} reports earnings in ${daysToEarnings} day${daysToEarnings === 1 ? '' : 's'} — consider sizing down or reviewing thesis`,
        cta: 'Analyze',
        ctaRoute: `/command-center?ticker=${ticker}`,
        evidence: { daysToEarnings, earningsTimestamp: earningsTs },
      });
    }

    // Time stop
    if (openTrade) {
      const ageDays = daysSince(openTrade.opened_at || h.opened_at);
      const isSwing = mode === 'Swing Trade';
      const isQuick = mode === 'Quick Trade';
      const limit = isSwing ? SWING_TIME_STOP_DAYS : isQuick ? QUICK_TIME_STOP_DAYS : null;
      if (limit && ageDays > limit) {
        items.push({
          category: 'prepare',
          type: 'time_stop',
          ticker,
          reason: `${ticker} (${mode}) has been held ${ageDays} days — exceeds the ${limit}-day time stop. Exit or re-evaluate thesis`,
          cta: 'Review Journal',
          ctaRoute: '/journal',
          evidence: { ageDays, limit, mode },
        });
      }
    }
  }

  return items;
}

function buildOpportunityItems(enrichedWatchlists) {
  const items = [];
  for (const w of enrichedWatchlists) {
    const ticker = String(w.ticker || '').toUpperCase();
    const price = num(w.price);
    const alertPrice = num(w.alert_price);
    const alertType = String(w.alert_type || '').toLowerCase();

    if (!alertPrice || !alertType || !price) continue;

    const triggered =
      (alertType === 'above' && price >= alertPrice) ||
      (alertType === 'below' && price <= alertPrice);

    if (triggered) {
      items.push({
        category: 'opportunity',
        type: 'watchlist_alert',
        ticker,
        reason: `${ticker} has crossed your alert at ${alertPrice} (${alertType}) — current price ${price.toFixed(2)}`,
        cta: 'Analyze',
        ctaRoute: `/ticker/${ticker}`,
        evidence: { price, alertPrice, alertType },
      });
    }
  }
  return items;
}

function buildLearnItems(journalEntries) {
  const items = [];
  for (const j of journalEntries) {
    if (String(j.status || '').toUpperCase() !== 'CLOSED') continue;
    const ticker = String(j.ticker || '').toUpperCase();
    const notes = String(j.notes || '');

    if (isEmptyNotes(notes)) {
      items.push({
        category: 'learn',
        type: 'post_mortem_missing',
        ticker,
        reason: `${ticker} trade closed with no post-mortem — capture the lesson before it fades`,
        cta: 'Write Post-Mortem',
        ctaRoute: '/journal',
        evidence: { ticker },
      });
    } else if (hasMistakeTags(notes)) {
      items.push({
        category: 'learn',
        type: 'mistake_pattern',
        ticker,
        reason: `${ticker} trade contains a mistake tag — review this entry to break the pattern`,
        cta: 'Review Journal',
        ctaRoute: '/journal',
        evidence: { ticker, tags: MISTAKE_TAGS.filter((t) => notes.toLowerCase().includes(t)) },
      });
    }
  }
  return items;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  const userId = getRequestUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabaseConfigured) {
    return res.status(200).json({ queue: [], pulse: buildPulse([], null) });
  }

  try {
    const userDb = getScopedDb(userId);

    const [rawHoldings, allJournal, rawWatchlists, prefs] = await Promise.all([
      userDb.getUserHoldings(userId),
      userDb.getUserJournal(userId),
      userDb.getUserWatchlists(userId),
      getPrefsForUser(userId).catch(() => null),
    ]);

    const { getUsdThbRate } = require('../services/marketData');
    const [enrichedHoldings, enrichedWatchlists, thbRate] = await Promise.all([
      enrichWithMarketData(rawHoldings),
      enrichWithMarketData(rawWatchlists),
      getUsdThbRate(),
    ]);

    const pulse = buildPulse(enrichedHoldings, prefs, thbRate);
    const { items: protectItems, missingStopCount } = buildProtectItems(enrichedHoldings, allJournal, pulse);
    pulse.missingStopCount = missingStopCount;

    const prepareItems = buildPrepareItems(enrichedHoldings, allJournal);
    const opportunityItems = buildOpportunityItems(enrichedWatchlists);
    const learnItems = buildLearnItems(allJournal);

    const queue = [...protectItems, ...prepareItems, ...opportunityItems, ...learnItems];

    return res.status(200).json({ queue, pulse });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
