"use strict";

const { randomUUID } = require("node:crypto");
const { isTestMode } = require("../providers/testMode");
const helmet = /** @type {typeof import("helmet").default} */ (
  /** @type {unknown} */ (require("helmet"))
);
const { rateLimit } = require("express-rate-limit");

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

function toHttpsOrigin(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function getClerkOrigin(publishableKey) {
  const encoded = publishableKey?.replace(/^pk_(?:test|live)_/, "");
  if (!encoded) return null;

  try {
    const host = Buffer.from(encoded, "base64")
      .toString("utf8")
      .replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}

function compactSources(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildContentSecurityPolicy(env = process.env) {
  const clerkOrigin = getClerkOrigin(
    env.VITE_CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY,
  );
  const supabaseOrigin = toHttpsOrigin(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  );
  const sentryOrigin =
    toHttpsOrigin(env.VITE_SENTRY_DSN || env.SENTRY_DSN) ||
    "https://o4511540696383488.ingest.us.sentry.io";

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc: compactSources([
      "'self'",
      clerkOrigin,
      "https://api.clerk.com",
      supabaseOrigin,
      sentryOrigin,
    ]),
    fontSrc: ["'self'", "data:"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    frameSrc: compactSources([
      "'self'",
      clerkOrigin,
      "https://www.tradingview-widget.com",
    ]),
    imgSrc: compactSources([
      "'self'",
      "data:",
      "blob:",
      clerkOrigin,
      "https://img.clerk.com",
    ]),
    objectSrc: ["'none'"],
    scriptSrc: compactSources(["'self'", clerkOrigin]),
    styleSrc: ["'self'", "'unsafe-inline'"],
    upgradeInsecureRequests: null,
    workerSrc: ["'self'", "blob:"],
  };
}

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: buildContentSecurityPolicy(),
  },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  strictTransportSecurity: false,
});

function requestContext(req, res, next) {
  const startedAt = Date.now();
  req.id = randomUUID();
  res.setHeader("X-Request-ID", req.id);

  res.on("finish", () => {
    if (isTestMode() && process.env.MPS_LOAD_MODE === "1") return;
    console.log(
      JSON.stringify({
        type: "http_request",
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });

  next();
}

function createLimiter({ identifier, limit, windowMs, skip = undefined }) {
  return rateLimit({
    windowMs,
    limit,
    identifier,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
    skip,
    handler(req, res) {
      return res.status(429).json({
        error: "Too many requests",
        requestId: req.id,
      });
    },
  });
}

function createApiRateLimiters(options = {}) {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;

  return {
    ordinary: createLimiter({
      identifier: "ordinary",
      limit: options.ordinaryLimit || 300,
      windowMs,
      skip: (req) => req.path === "/health",
    }),
    quote: createLimiter({
      identifier: "quote",
      limit: options.quoteLimit || 60,
      windowMs,
    }),
    ai: createLimiter({
      identifier: "ai",
      limit: options.aiLimit || 20,
      windowMs,
    }),
  };
}

module.exports = {
  buildContentSecurityPolicy,
  createApiRateLimiters,
  requestContext,
  securityHeaders,
};
