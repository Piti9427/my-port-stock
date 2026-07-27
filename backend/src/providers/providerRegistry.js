"use strict";

const { isTestMode } = require("./testMode");
const {
  createGeminiProvider,
  createMarketOracleProvider,
  createQuoteProvider,
  createRuntimeDataProvider,
} = require("./testProviders");

let cachedScenario = null;
let cachedProviders = null;

function getTestProviders() {
  if (!isTestMode()) return null;
  const scenario = process.env.MPS_TEST_SCENARIO || "valid";
  if (cachedProviders && cachedScenario === scenario) return cachedProviders;
  cachedScenario = scenario;
  cachedProviders = {
    gemini: createGeminiProvider(),
    marketOracle: createMarketOracleProvider(),
    quote: createQuoteProvider(),
    runtimeData: createRuntimeDataProvider(),
  };
  return cachedProviders;
}

module.exports = { getTestProviders };
