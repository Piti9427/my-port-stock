import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to bypass RLS for migration
const USER_ID = process.env.CLERK_USER_ID; // The target user's Clerk ID

if (!supabaseUrl || !supabaseKey || !USER_ID) {
  console.error("Missing environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLERK_USER_ID");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Basic Markdown Table Parser
function parseMarkdownTable(filePath, startMarker, endMarkerOrNextSection) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let inSection = false;
  let inTable = false;
  const rows = [];
  
  for (const line of lines) {
    if (line.includes(startMarker)) {
      inSection = true;
      continue;
    }
    
    if (inSection && endMarkerOrNextSection && line.startsWith('## ') && !line.includes(startMarker)) {
      break; // Reached next section
    }

    if (inSection && line.trim().startsWith('|')) {
      if (!inTable) {
        // Skip header and separator rows
        if (line.includes('---')) continue;
        if (line.includes('Ticker') || line.includes('Action')) continue; // Very basic header skip
        inTable = true;
      } else if (line.includes('---')) {
        continue;
      }
      
      const columns = line.split('|').map(c => c.trim()).filter(c => c !== '');
      if (columns.length > 0) {
        rows.push(columns);
      }
    }
  }
  return rows;
}

function cleanNumber(str) {
  if (!str) return null;
  const num = parseFloat(str.replace(/[^0-9.-]+/g,""));
  return isNaN(num) ? null : num;
}

function cleanTicker(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}

async function migrate() {
  console.log('Starting Migration...');

  // 1. Create Portfolio
  const { data: portfolio, error: portError } = await supabase
    .from('portfolios')
    .insert({ user_id: USER_ID, name: 'Main Portfolio' })
    .select()
    .single();
    
  if (portError) throw portError;
  const portfolioId = portfolio.id;

  // 2. Parse Holdings
  const stockFile = path.resolve(__dirname, '../../stock_portfolio.md');
  const holdingsData = parseMarkdownTable(stockFile, '## Holdings Snapshot');
  
  const holdingInserts = holdingsData.map(cols => ({
    portfolio_id: portfolioId,
    user_id: USER_ID,
    ticker: cleanTicker(cols[0]),
    shares: cleanNumber(cols[1]),
    avg_cost: cleanNumber(cols[2]),
    snapshot_price: cleanNumber(cols[3]),
    snapshot_value: cleanNumber(cols[5]),
    pl_percent: cols[6],
    verdict: cols[7]
  }));

  if (holdingInserts.length > 0) {
    const { error } = await supabase.from('holdings').insert(holdingInserts);
    if (error) console.error('Error inserting holdings:', error);
    else console.log(`Inserted ${holdingInserts.length} holdings.`);
  }

  // 3. Parse Active Trades
  const tradeFile = path.resolve(__dirname, '../../trade_journal.md');
  const tradeData = parseMarkdownTable(tradeFile, '## Active Trades');

  const tradeInserts = tradeData.map(cols => ({
    user_id: USER_ID,
    entry_date: cols[0],
    ticker: cleanTicker(cols[1]),
    action: cols[2],
    entry_price: cleanNumber(cols[3]),
    stop_loss: cleanNumber(cols[4]),
    target: cleanNumber(cols[5]),
    rr_ratio: cols[6],
    thesis: cols[7],
    status: cols[8]
  }));

  if (tradeInserts.length > 0) {
    const { error } = await supabase.from('trades').insert(tradeInserts);
    if (error) console.error('Error inserting trades:', error);
    else console.log(`Inserted ${tradeInserts.length} trades.`);
  }

  console.log('Migration Completed! (Note: Additional watchlists can be parsed similarly)');
}

migrate().catch(console.error);
