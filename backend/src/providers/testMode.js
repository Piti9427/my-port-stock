"use strict";

let networkGuardInstalled = false;

function isTestMode(env = process.env) {
  return env.MPS_TEST_MODE === "1" && env.NODE_ENV === "test";
}

function assertTestModeIsSafe(env = process.env) {
  if (env.MPS_TEST_MODE === "1" && env.NODE_ENV !== "test") {
    throw new Error(
      "MPS_TEST_MODE fixtures are allowed only when NODE_ENV=test",
    );
  }
}

function requireLoopbackUrl(value, label) {
  const url = new URL(value);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error(
      `${label} must target a loopback host in deterministic test mode`,
    );
  }
  return url;
}

/** @param {string|URL|Request} input */
function assertLoopbackRequest(input) {
  const value =
    typeof input === "string" || input instanceof URL ? input : input.url;
  return requireLoopbackUrl(value, "Deterministic outbound request");
}

function installOutboundNetworkGuard(env = process.env) {
  if (!isTestMode(env) || networkGuardInstalled) return;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    assertLoopbackRequest(input);
    return originalFetch(input, init);
  };
  networkGuardInstalled = true;
}

module.exports = {
  assertLoopbackRequest,
  assertTestModeIsSafe,
  installOutboundNetworkGuard,
  isTestMode,
  requireLoopbackUrl,
};
