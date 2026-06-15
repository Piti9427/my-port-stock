#!/usr/bin/env node
/*
 * Import current markdown snapshot into Supabase runtime tables.
 * Usage: node tools/migration/import-markdown-snapshot.js <clerk_user_id>
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '../..');
const userId = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!userId) {
  console.error('Missing Clerk user id');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey || /mock|placeholder/i.test(`${supabaseUrl} ${supabaseKey}`)) {
  console.error('Supabase config missing or placeholder');
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function parseMoney(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePortfolioHoldings(markdown) {
  const rows = [];
  const tableLine = /^\|\s*\*\*\$(?<ticker>[A-Z0-9.-]+)\*\*\s*\|\s*(?<shares>[0-9.]+)\s*\|\s*\$(?<avgCost>[0-9.,]+)\s*\|/;

  for (const line of markdown.split('\n')) {
    const match = line.match(tableLine);
    if (!match) continue;
    rows.push({
      user_id: userId,
      ticker: match.groups.ticker,
      shares: Number(match.groups.shares),
      avg_cost: parseMoney(match.groups.avgCost),
      source_note: 'Imported from stock_portfolio.md snapshot',
    });
  }

  return rows;
}

function parseJournalTrades(markdown) {
  const rows = [];
  const tableLine = /^\|\s*(?<date>\d{4}-\d{2}-\d{2})\s*\|\s*\$(?<ticker>[A-Z0-9.-]+)\s*\|\s*(?<type>[^|]+)\|\s*\$(?<entry>[0-9.,]+)\s*\|\s*\$(?<stop>[0-9.,]+)\s*\|\s*\$(?<target>[0-9.,]+)\s*\|\s*(?<rr>[^|]+)\|\s*(?<thesis>[^|]+)\|\s*(?<status>[^|]+)\|/;

  for (const line of markdown.split('\n')) {
    const match = line.match(tableLine);
    if (!match) continue;
    rows.push({
      user_id: userId,
      date: `${match.groups.date}T00:00:00.000Z`,
      ticker: match.groups.ticker,
      type: match.groups.type.trim().toUpperCase().includes('BUY') ? 'BUY' : match.groups.type.trim(),
      entry: parseMoney(match.groups.entry),
      stop_loss: parseMoney(match.groups.stop),
      target: parseMoney(match.groups.target),
      risk_reward: parseMoney(match.groups.rr),
      status: match.groups.status.trim().toUpperCase(),
      notes: match.groups.thesis.trim(),
      source_note: 'Imported from trade_journal.md snapshot',
    });
  }

  return rows;
}

async function upsertRows(supabase, table, rows, options = {}) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, options);
  if (error) throw error;
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const holdings = parsePortfolioHoldings(read('stock_portfolio.md'));
  const journal = parseJournalTrades(read('trade_journal.md'));

  await upsertRows(supabase, 'holdings', holdings, { onConflict: 'user_id,ticker' });
  await upsertRows(supabase, 'portfolio', holdings, { onConflict: 'user_id,ticker' });
  await upsertRows(supabase, 'journal', journal);

  console.log(JSON.stringify({ imported: { holdings: holdings.length, journal: journal.length } }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
