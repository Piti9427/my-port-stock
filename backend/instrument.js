const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://a20fde685ef8f9a1b59bcb5d0351d451@o4511540696383488.ingest.us.sentry.io/4511564078645248",

  sendDefaultPii: true,

  integrations: [
    nodeProfilingIntegration(),
  ],

  // Tracing
  tracesSampleRate: 1.0,

  // Profiling
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",
});
