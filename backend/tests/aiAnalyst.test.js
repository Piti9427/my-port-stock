const test = require("node:test");
const assert = require("node:assert/strict");

test("AI analyst fails closed when Gemini API key is missing", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete require.cache[require.resolve("../src/services/aiAnalyst")];

  const { analyzeTicker } = require("../src/services/aiAnalyst");
  const analysis = await analyzeTicker("AAPL", { shares: 100 }, { last_price: 150.5 });

  assert.equal(analysis.status, "INSUFFICIENT_DATA");
  assert.equal(analysis.reason_code, "AI_ANALYST_UNAVAILABLE");
  assert.notEqual(analysis.decision_snapshot?.verdict, "Buy");

  if (previousKey) {
    process.env.GEMINI_API_KEY = previousKey;
  }
});
