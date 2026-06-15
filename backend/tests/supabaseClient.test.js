const test = require("node:test");
const assert = require("node:assert/strict");

const { isUsableSupabaseConfig } = require("../src/db/supabaseClient");

test("Supabase config rejects mock and placeholder values", () => {
  assert.equal(isUsableSupabaseConfig("https://mock.supabase.co", "mock_key"), false);
  assert.equal(isUsableSupabaseConfig("https://placeholder", "placeholder"), false);
});
