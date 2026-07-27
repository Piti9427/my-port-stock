"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertLoopbackRequest,
  assertTestModeIsSafe,
  isTestMode,
  requireLoopbackUrl,
} = require("../src/providers/testMode");
const { createQuoteProvider } = require("../src/providers/testProviders");
const { buildTwoSourceQuotePacket } = require("../src/gates/priceGate");

test("test fixtures require both MPS_TEST_MODE=1 and NODE_ENV=test", () => {
  assert.equal(isTestMode({ MPS_TEST_MODE: "1", NODE_ENV: "test" }), true);
  assert.equal(
    isTestMode({ MPS_TEST_MODE: "1", NODE_ENV: "production" }),
    false,
  );
  assert.throws(
    () => assertTestModeIsSafe({ MPS_TEST_MODE: "1", NODE_ENV: "production" }),
    /NODE_ENV=test/,
  );
});

test("deterministic quote provider covers valid, conflict, and failure scenarios", async () => {
  const asOf = new Date("2026-07-27T14:30:00.000Z");
  const valid = buildTwoSourceQuotePacket(
    "NVDA",
    await createQuoteProvider("valid").fetchQuoteSources("NVDA"),
    asOf,
  );
  const conflict = buildTwoSourceQuotePacket(
    "NVDA",
    await createQuoteProvider("conflict").fetchQuoteSources("NVDA"),
    asOf,
  );
  const failure = buildTwoSourceQuotePacket(
    "NVDA",
    await createQuoteProvider("provider-failure").fetchQuoteSources("NVDA"),
    asOf,
  );

  assert.equal(valid.current_price_acceptance_gate, "pass");
  assert.equal(conflict.status, "INSUFFICIENT_DATA");
  assert.match(conflict.error_details, /differ/);
  assert.equal(failure.status, "INSUFFICIENT_DATA");
});

test("deterministic targets reject non-loopback hosts", () => {
  assert.equal(
    requireLoopbackUrl("http://127.0.0.1:8080", "target").hostname,
    "127.0.0.1",
  );
  assert.throws(
    () => requireLoopbackUrl("https://api.gemini.com", "target"),
    /loopback/,
  );
  assert.throws(
    () => assertLoopbackRequest("https://finance.yahoo.com"),
    /loopback/,
  );
});
