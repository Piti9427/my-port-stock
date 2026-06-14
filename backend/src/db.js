import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function getUserHoldings(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
}

export async function getUserWatchlists(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
}
