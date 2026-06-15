const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const {
  isUsableSupabaseConfig,
  supabase: configuredSupabase,
  createScopedClient,
} = require('./db/supabaseClient');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = configuredSupabase || (isUsableSupabaseConfig(supabaseUrl, supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null);

function requireSupabase(client = supabase) {
  if (!client) {
    const error = new Error('Supabase is not configured');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }
  return client;
}

function createPortfolioDb(client) {
  const queryByUser = async (table, userId) => {
    if (!userId) throw new Error('User ID is required');
    const { data, error } = await requireSupabase(client)
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw error;
    return data || [];
  };

  return {
    getUserHoldings(userId) {
      return queryByUser('holdings', userId);
    },
    getUserPortfolio(userId) {
      // Map to holdings table since portfolio table is dropped
      return queryByUser('holdings', userId);
    },
    getUserWatchlists(userId) {
      return queryByUser('watchlists', userId);
    },
    getUserJournal(userId) {
      return queryByUser('journal', userId);
    },
    getUserJournalByTicker(userId, ticker) {
      if (!userId) throw new Error('User ID is required');
      return requireSupabase(client)
        .from('journal')
        .select('*')
        .eq('user_id', userId)
        .eq('ticker', ticker)
        .eq('is_deleted', false)
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        });
    },
    insertJournalEntry(userId, entry) {
      if (!userId) throw new Error('User ID is required');
      return requireSupabase(client)
        .from('journal')
        .insert([{ ...entry, user_id: userId }])
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        });
    },
  };
}

const portfolioDb = createPortfolioDb(supabase);

async function getUserHoldings(userId) {
  return portfolioDb.getUserHoldings(userId);
}

async function getUserPortfolio(userId) {
  return portfolioDb.getUserPortfolio(userId);
}

async function getUserWatchlists(userId) {
  return portfolioDb.getUserWatchlists(userId);
}

async function getUserJournal(userId) {
  return portfolioDb.getUserJournal(userId);
}

async function getUserJournalByTicker(userId, ticker) {
  return portfolioDb.getUserJournalByTicker(userId, ticker);
}

async function insertJournalEntry(userId, entry) {
  return portfolioDb.insertJournalEntry(userId, entry);
}

function getScopedDb(userId) {
  const client = createScopedClient(userId);
  return createPortfolioDb(client);
}

module.exports = {
  createPortfolioDb,
  getScopedDb,
  getUserJournal,
  getUserJournalByTicker,
  getUserHoldings,
  getUserPortfolio,
  getUserWatchlists,
  insertJournalEntry,
  requireSupabase,
  supabase,
};
