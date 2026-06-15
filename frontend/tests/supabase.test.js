import { expect, test } from 'vitest';
import { createSupabaseClient } from '../src/lib/supabase.js';

test('createSupabaseClient creates a client with the provided token', () => {
  const client = createSupabaseClient('test-token');
  expect(client).toBeDefined();
});
