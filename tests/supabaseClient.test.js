// tests/supabaseClient.test.js
const { supabase } = require("../backend/src/db/supabaseClient');

describe('Supabase Client', () => {
  it('should initialize the supabase client with mock env vars', () => {
    expect(supabase).toBeDefined();
    expect(supabase.supabaseUrl).toBe('https://mock.supabase.co');
  });
});
