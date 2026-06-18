const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../../..');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

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

function withImportMetadata(rows, metadata) {
  return rows.map((row) => ({
    ...row,
    import_batch_id: metadata.importBatchId,
    source_file: metadata.sourceFile,
    source_section: metadata.sourceSection,
    source_hash: sha256(`${metadata.sourceFile}|${metadata.sourceSection}|${row.ticker}|${JSON.stringify(row)}`),
    imported_at: metadata.importedAt,
  }));
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

function assertMarkdownImportOwner(userId, env = process.env) {
  const ownerUserId = env.MARKDOWN_IMPORT_OWNER_USER_ID;
  if (!ownerUserId) {
    throw new Error('MARKDOWN_IMPORT_OWNER_USER_ID is required for markdown import');
  }
  if (userId !== ownerUserId) {
    throw new Error('refusing markdown import for non-owner user');
  }
}

function buildMarkdownImportPayload({
  userId,
  portfolioMarkdown,
  journalMarkdown,
  importedAt = new Date().toISOString(),
}) {
  const portfolioHash = sha256(portfolioMarkdown);
  const journalHash = sha256(journalMarkdown);
  const importBatchId = sha256(`${userId}|${portfolioHash}|${journalHash}`);
  const holdings = parsePortfolioHoldings(portfolioMarkdown, userId);
  const journalTrades = withImportMetadata(parseJournalTrades(journalMarkdown, userId), {
    importBatchId,
    sourceFile: 'trade_journal.md',
    sourceSection: 'Active Trades',
    importedAt,
  });
  const watchlistItems = withImportMetadata(parseWatchlist(portfolioMarkdown, userId), {
    importBatchId,
    sourceFile: 'stock_portfolio.md',
    sourceSection: 'Tactical Watchlist',
    importedAt,
  });
  const finalJournalEntries = [...journalTrades];

  for (const holding of holdings) {
    const matchingTrades = journalTrades.filter((trade) => trade.ticker === holding.ticker);
    const tradeShares = matchingTrades.reduce((sum, trade) => {
      if (trade.type === 'BUY') return sum + trade.shares;
      if (trade.type === 'SELL') return sum - trade.shares;
      return sum;
    }, 0);

    if (Math.abs(tradeShares - holding.shares) > 0.0001) {
      finalJournalEntries.push({
        user_id: userId,
        date: new Date('2026-05-28T12:00:00Z').toISOString(),
        ticker: holding.ticker,
        type: 'ADJUST',
        shares: holding.shares,
        price: holding.avg_cost,
        entry: holding.avg_cost,
        status: 'OPEN',
        notes: 'Startup balance import from stock_portfolio.md',
        source_note: 'startup_balance_import',
        is_deleted: false,
        import_batch_id: importBatchId,
        source_file: 'stock_portfolio.md',
        source_section: 'Holdings Snapshot',
        source_hash: sha256(`stock_portfolio.md|Holdings Snapshot|${holding.ticker}|${JSON.stringify(holding)}`),
        imported_at: importedAt,
      });
    }
  }

  return {
    batch: {
      import_batch_id: importBatchId,
      user_id: userId,
      source_hash: sha256(`${portfolioHash}|${journalHash}`),
      source_files: ['stock_portfolio.md', 'trade_journal.md'],
      imported_at: importedAt,
      status: 'pending',
    },
    journalEntries: finalJournalEntries,
    watchlistItems,
  };
}

async function importMarkdownSnapshotForOwner(userId) {
  assertMarkdownImportOwner(userId);
  const { createScopedClient } = require('../db/supabaseClient');
  const scopedSupabase = createScopedClient(userId);
  if (!scopedSupabase) {
    return { migrated: false, error: 'Supabase not configured' };
  }

  let portfolioMarkdown = '';
  let journalMarkdown = '';
  try {
    portfolioMarkdown = fs.readFileSync(path.join(root, 'stock_portfolio.md'), 'utf8');
    journalMarkdown = fs.readFileSync(path.join(root, 'trade_journal.md'), 'utf8');
  } catch (err) {
    console.error('Error reading markdown files for bootstrap:', err.message);
    return { migrated: false, error: 'Markdown source files not found' };
  }

  const payload = buildMarkdownImportPayload({ userId, portfolioMarkdown, journalMarkdown });
  const { data: existingBatch, error: checkErr } = await scopedSupabase
    .from('import_batches')
    .select('import_batch_id')
    .eq('user_id', userId)
    .eq('import_batch_id', payload.batch.import_batch_id)
    .limit(1);

  if (checkErr) return { migrated: false, error: checkErr.message };
  if (existingBatch && existingBatch.length > 0) {
    return { migrated: false, reason: 'Import batch already exists', import_batch_id: payload.batch.import_batch_id };
  }

  let insertedJournal = 0;
  let insertedWatchlists = 0;

  try {
    const { error: batchErr } = await scopedSupabase
      .from('import_batches')
      .insert([{ ...payload.batch, status: 'running' }]);
    if (batchErr) throw batchErr;

    if (payload.journalEntries.length > 0) {
      const { data, error: insertJournalErr } = await scopedSupabase
        .from('journal')
        .insert(payload.journalEntries)
        .select();
      if (insertJournalErr) throw insertJournalErr;
      insertedJournal = data ? data.length : 0;
    }

    if (payload.watchlistItems.length > 0) {
      const { data, error: insertWatchErr } = await scopedSupabase
        .from('watchlists')
        .insert(payload.watchlistItems)
        .select();
      if (insertWatchErr) throw insertWatchErr;
      insertedWatchlists = data ? data.length : 0;
    }

    const { error: updateBatchErr } = await scopedSupabase
      .from('import_batches')
      .update({ status: 'succeeded', inserted_journal: insertedJournal, inserted_watchlists: insertedWatchlists })
      .eq('import_batch_id', payload.batch.import_batch_id);
    if (updateBatchErr) throw updateBatchErr;

    return {
      migrated: true,
      journal: insertedJournal,
      watchlist: insertedWatchlists,
      import_batch_id: payload.batch.import_batch_id,
    };
  } catch (err) {
    return { migrated: false, error: err.message };
  }
}

module.exports = {
  assertMarkdownImportOwner,
  buildMarkdownImportPayload,
  importMarkdownSnapshotForOwner,
  parsePortfolioHoldings,
  parseJournalTrades,
  parseWatchlist
};
