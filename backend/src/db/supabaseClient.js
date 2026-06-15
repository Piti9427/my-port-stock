const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

function isUsableSupabaseConfig(url, key) {
  return Boolean(
    url &&
      key &&
      !/mock|placeholder/i.test(url) &&
      !/mock|placeholder/i.test(key)
  );
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseConfigured = isUsableSupabaseConfig(supabaseUrl, supabaseKey);
const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = {
  isUsableSupabaseConfig,
  supabase,
  supabaseConfigured,
  supabaseKey,
  supabaseUrl,
};
