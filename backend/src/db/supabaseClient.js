const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

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

/**
 * Creates a scoped Supabase client authenticated as the specified user.
 * Locally signs a JWT containing sub = userId using SUPABASE_JWT_SECRET.
 */
function createScopedClient(userId) {
  if (!supabaseConfigured) {
    return null;
  }
  if (!userId) {
    throw new Error('User ID is required to create a scoped Supabase client');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_JWT_SECRET is required in production');
    }
    console.warn('[supabaseClient] SUPABASE_JWT_SECRET not set — scoped client cannot be created in dev mode');
    return null;
  }

  const token = jwt.sign(
    {
      sub: userId,
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
    },
    jwtSecret,
    { algorithm: 'HS256' }
  );

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    }
  });
}

module.exports = {
  isUsableSupabaseConfig,
  supabase,
  supabaseConfigured,
  supabaseKey,
  supabaseUrl,
  createScopedClient,
};
