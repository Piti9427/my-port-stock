// backend/src/preferences/preferenceRepository.js
'use strict';
const { createScopedClient } = require('../db/supabaseClient');

async function getForUser(userId) {
  const supabase = createScopedClient(userId);
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data || null;
}

async function upsertForUser(userId, values) {
  const supabase = createScopedClient(userId);
  
  // Set updated_at and check if we are completing onboarding
  const now = new Date().toISOString();
  
  // Try to find if user preferences already exist
  const existing = await getForUser(userId);
  const onboarding_completed_at = existing?.onboarding_completed_at || now;

  const payload = {
    ...values,
    user_id: userId,
    onboarding_completed_at,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

module.exports = {
  getForUser,
  upsertForUser,
};
