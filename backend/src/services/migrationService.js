const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');

function parseMoney(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePortfolioHoldings(markdown, userId) {
  const rows = [];
  const tableLine = /^\|\s*\*\*\$(?<ticker>[A-Z0-9.-]+)\*\*\s*\|\s*(?<shares>[0-9.]+)\s*\|\s*\$(?<avgCost>[0-9.,]+)\s*\|/;

  for (const line of markdown.split('\n')) {
    const match = line.match(tableLine);
    if (!match) continue;
    rows.push({
      user_id: userId,
      ticker: match.groups.ticker.toUpperCase(),
      shares: Number(match.groups.shares),
      avg_cost: parseMoney(match.groups.avgCost),
      source_note: 'Imported from stock_portfolio.md snapshot',
    });
  }

  return rows;
}

function parseJournalTrades(markdown, userId) {
  const rows = [];
  const tableLine = /^\|\s*(?<date>\d{4}-\d{2}-\d{2})\s*\|\s*\$(?<ticker>[A-Z0-9.-]+)\s*\|\s*(?<type>[^|]+)\|\s*\$(?<entry>[0-9.,]+)\s*\|\s*\$(?<stop>[0-9.,]+)\s*\|\s*\$(?<target>[0-9.,]+)\s*\|\s*(?<rr>[^|]+)\|\s*(?<thesis>[^|]+)\|\s*(?<status>[^|]+)\|/;

  for (const line of markdown.split('\n')) {
    const match = line.match(tableLine);
    if (!match) continue;
    
    // Parse action type
    let type = match.groups.type.trim().toUpperCase();
    if (type.includes('BUY')) {
      type = 'BUY';
    } else if (type.includes('SELL')) {
      type = 'SELL';
    } else {
      type = 'BUY'; // Default fallback
    }

    // Try to parse dynamic shares if specified in thesis, default to 1
    let shares = 1;
    const sharesMatch = match.groups.thesis.match(/\$?[0-9.,]+\s*\/\s*(?<qty>[0-9.]+)\s*shares?/i);
    if (sharesMatch) {
      shares = Number(sharesMatch.groups.qty);
    }

    rows.push({
      user_id: userId,
      date: `${match.groups.date}T12:00:00.000Z`,
      ticker: match.groups.ticker.toUpperCase(),
      type: type,
      shares: shares,
      price: parseMoney(match.groups.entry),
      entry: parseMoney(match.groups.entry),
      stop_loss: parseMoney(match.groups.stop),
      target: parseMoney(match.groups.target),
      risk_reward: parseMoney(match.groups.rr),
      status: match.groups.status.trim().toUpperCase() === 'ACTIVE' ? 'OPEN' : 'CLOSED',
      notes: match.groups.thesis.trim(),
      source_note: 'Imported from trade_journal.md snapshot',
      is_deleted: false
    });
  }

  return rows;
}

function parseWatchlist(markdown, userId) {
  const rows = [];
  const tableLine = /^\|\s*\*\*\$(?<ticker>[A-Z0-9.-]+)\*\*\s*\|\s*(?<sector>[^|]+)\|\s*(?<entryZone>[^|]+)\|\s*(?<target>[^|]+)\|\s*(?<hypothesis>[^|]+)\|/;

  // Extract only the Tactical Watchlist section to prevent pulling from holdings snapshot
  const sections = markdown.split(/^##\s+/m);
  const watchlistSection = sections.find(s => s.trim().startsWith('Tactical Watchlist'));
  
  if (!watchlistSection) return rows;

  for (const line of watchlistSection.split('\n')) {
    const match = line.match(tableLine);
    if (!match) continue;
    
    // Skip table header
    if (match.groups.ticker.toUpperCase() === 'TICKER') continue;

    rows.push({
      user_id: userId,
      ticker: match.groups.ticker.trim().toUpperCase(),
      name: match.groups.ticker.trim().toUpperCase(),
      sector: match.groups.sector.trim(),
      setup: match.groups.hypothesis.trim(),
      alert_price: parseMoney(match.groups.target), // use target as provisional alert price
      alert_type: 'above',
      ai_signal: 'monitor',
      source_note: 'Imported from stock_portfolio.md watchlist',
      is_deleted: false
    });
  }
  return rows;
}

/**
 * Checks if the user has database records. If not, parses stock_portfolio.md
 * and trade_journal.md and populates the database for this user.
 */
async function bootstrapUserData(userId) {
  const { createScopedClient } = require('../db/supabaseClient');
  const scopedSupabase = createScopedClient(userId);
  if (!scopedSupabase) {
    return { migrated: false, error: 'Supabase not configured' };
  }

  // 1. Check if user already has data in journal
  const { data: existingJournal, error: checkErr } = await scopedSupabase
    .from('journal')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkErr) {
    console.error('Error checking user data existence:', checkErr.message);
    return { migrated: false, error: checkErr.message };
  }

  if (existingJournal && existingJournal.length > 0) {
    return { migrated: false, reason: 'User already has database records' };
  }

  console.log(`Bootstrapping data for user: ${userId}...`);

  // 2. Read markdown files
  let portfolioMarkdown = '';
  let journalMarkdown = '';
  try {
    portfolioMarkdown = fs.readFileSync(path.join(root, 'stock_portfolio.md'), 'utf8');
    journalMarkdown = fs.readFileSync(path.join(root, 'trade_journal.md'), 'utf8');
  } catch (err) {
    console.error('Error reading markdown files for bootstrap:', err.message);
    return { migrated: false, error: 'Markdown source files not found' };
  }

  // 3. Parse data
  const holdings = parsePortfolioHoldings(portfolioMarkdown, userId);
  const journalTrades = parseJournalTrades(journalMarkdown, userId);
  const watchlistItems = parseWatchlist(portfolioMarkdown, userId);

  // 4. Combine and generate final journal entries
  // To preserve actual holdings amount, for each holding in stock_portfolio.md,
  // we check if there are matching trades in journal.
  // If the shares from the trades don't match the portfolio holdings shares, 
  // or if there are no trades for that ticker at all (e.g. ASTS, TSM),
  // we append a synthetic 'BUY' transaction to the journal to make the calculated holdings match.
  const finalJournalEntries = [...journalTrades];

  for (const holding of holdings) {
    const matchingTrades = journalTrades.filter(t => t.ticker === holding.ticker);
    
    // Sum of shares in parsed trades for this ticker
    let tradeShares = 0;
    for (const t of matchingTrades) {
      if (t.type === 'BUY') tradeShares += t.shares;
      else if (t.type === 'SELL') tradeShares -= t.shares;
    }

    // If there's a difference or no trades, insert a synthetic BUY to align shares and avg cost
    if (Math.abs(tradeShares - holding.shares) > 0.0001) {
      const neededShares = holding.shares - tradeShares;
      if (neededShares > 0) {
        finalJournalEntries.push({
          user_id: userId,
          date: new Date('2026-05-28T12:00:00Z').toISOString(), // Last execution update date
          ticker: holding.ticker,
          type: 'BUY',
          shares: neededShares,
          price: holding.avg_cost,
          entry: holding.avg_cost,
          status: 'OPEN',
          notes: 'Simulated startup balance import from stock_portfolio.md',
          source_note: 'Imported from stock_portfolio.md snapshot',
          is_deleted: false
        });
      }
    }
  }

  // 5. Insert into Supabase
  let insertedJournal = 0;
  let insertedWatchlists = 0;

  try {
    if (finalJournalEntries.length > 0) {
      const { data, error: insertJournalErr } = await scopedSupabase
        .from('journal')
        .insert(finalJournalEntries)
        .select();
      if (insertJournalErr) throw insertJournalErr;
      insertedJournal = data ? data.length : 0;
    }

    if (watchlistItems.length > 0) {
      const { data, error: insertWatchErr } = await scopedSupabase
        .from('watchlists')
        .insert(watchlistItems)
        .select();
      if (insertWatchErr) throw insertWatchErr;
      insertedWatchlists = data ? data.length : 0;
    }

    console.log(`✅ Bootstrapped ${insertedJournal} journal entries and ${insertedWatchlists} watchlists for ${userId}`);
    return {
      migrated: true,
      journal: insertedJournal,
      watchlist: insertedWatchlists
    };
  } catch (err) {
    console.error('Failed to insert bootstrapped rows:', err.message);
    return { migrated: false, error: err.message };
  }
}

module.exports = {
  bootstrapUserData,
  parsePortfolioHoldings,
  parseJournalTrades,
  parseWatchlist
};
