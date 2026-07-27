"use strict";

const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

function parseSampleRate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0;
  return parsed;
}

const tracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE);
const profileSessionSampleRate = parseSampleRate(
  process.env.SENTRY_PROFILES_SAMPLE_RATE,
);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  integrations:
    profileSessionSampleRate > 0 ? [nodeProfilingIntegration()] : [],
  tracesSampleRate,
  profileSessionSampleRate,
  profileLifecycle: "trace",
});

module.exports = { parseSampleRate };
