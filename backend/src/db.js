const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://placeholder', 
  supabaseKey || 'placeholder'
);

async function getUserHoldings(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data || [];
}

async function getUserWatchlists(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data || [];
}

module.exports = {
  getUserHoldings,
  getUserWatchlists
};
