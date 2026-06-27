# Design Specification: Backend Runtime, Data, and API Hardening (Layered Shield)

This design document outlines the backend hardening plan for MyPortStock. Based on the codebase audit and user choices, we are implementing **Approach A: Layered Shield** in a strict **TDD (Test-Driven Development)** fashion. The focus is to lay a robust production-ready foundation while currently running in a dev/staging local environment.

---

## 🏗️ Architectural Overview

We will harden the backend in three distinct, sequential phases:
1. **Phase 1: Middleware & Structure Refactor** - Split `server.js` into clean, isolated middlewares for Helmet, CORS, Rate Limiting, Request Logging, and Error Sanitization.
2. **Phase 2: Auth & Data Hardening** - Resolve API and WebSocket authentication gaps, remove hardcoded fallback secrets, bind caches, sanitize inputs, and apply database integrity constraints.
3. **Phase 3: Test Gap Fill** - Expand automated test coverage to untested routes and functions.

---

## 🛡️ Detailed Specifications

### Phase 1: Middleware & Structure Refactor

We will reduce `server.js` (currently 755 lines) to a clean bootstrapper of ~200 lines and extract all middleware to a dedicated directory: `backend/src/middleware/`.

#### 1. Files to Create:
- `backend/src/middleware/helmet.js`
- `backend/src/middleware/cors.js`
- `backend/src/middleware/rateLimiter.js`
- `backend/src/middleware/requestLogger.js`
- `backend/src/middleware/errorHandler.js`
- `backend/src/middleware/index.js` (Exports all middlewares)

#### 2. Middleware Configurations:

- **Helmet**:
  - Integrate `helmet` package.
  - Configure Content Security Policy (CSP) to allow `'self'` and TradingView frame sources (`https://*.tradingview.com`).
  - Enable HSTS with `max-age` of 1 year (`31536000` seconds).
- **CORS**:
  - Integrate `cors` package.
  - Support configurable origins using `CORS_ALLOWED_ORIGINS` environment variable (comma-separated).
  - Default fallback in dev to `http://localhost:5173`.
- **Rate Limiter**:
  - Integrate `express-rate-limit` package.
  - Define rate limiting tiers:
    - **Global**: 100 requests per 1 minute per IP.
    - **AI Endpoints** (`/api/analyze`, `/api/chat`): 10 requests per 1 minute per IP.
    - **Quote Endpoints** (`/api/quote/:ticker`, `/api/price/:ticker`): 30 requests per 1 minute per IP.
- **Request Logger**:
  - Structured JSON logs to `stdout`.
  - Log format: `{ timestamp, requestId, method, path, statusCode, durationMs, userId }`.
  - Use `crypto.randomUUID()` to generate a unique `requestId` for each request, attached to `req.id`.
- **Error Handler**:
  - Sanitize all error responses: log full errors with `requestId` and report to Sentry, but return a generic response to clients:
    `{ error: "Internal server error", requestId }`.
  - Do NOT leak `err.message` or stack traces to clients.

#### 3. TDD Strategy (Phase 1):
Prior to modifying `server.js` or implementing middlewares, we will create `backend/tests/middleware.test.js` to assert:
- `429 Too Many Requests` status codes when rate limits are exceeded (for global, AI, and quote routes).
- CORS headers correctly reject unauthorized origins and accept allowed origins.
- Helmet security headers are present in responses.
- Sanitized 500 error response hides original message and includes `requestId`.
- Log format contains JSON metadata.

---

### Phase 2: Auth & Data Hardening

#### 1. Auth Hardening (Security Gaps)
- **`/api/price/:ticker` Auth**:
  - Add Clerk auth check via `getUserId(req)`. Reject with `401 Unauthorized` if auth details are missing.
- **WebSocket Auth**:
  - Harden connection initiation in `backend/src/ws/agentEventBus.js`.
  - Authenticate connections using a JWT token passed via subprotocols or query parameters, validating via Clerk. Reject connection if token is invalid or missing.
- **Remove Hardcoded JWT Fallback**:
  - In `backend/src/db/supabaseClient.js`, delete fallback secret `'default_fallback_secret_for_dev_myportstock_123'`.
  - If `SUPABASE_JWT_SECRET` is missing in non-dev/production environments, throw an initialization error immediately (fail-closed).
- **Sentry PII Masking**:
  - Disable Sentry's default PII collection in `backend/instrument.js` (`sendDefaultPii: false`).

#### 2. Input Validation Hardening
- **`DELETE /api/watchlists/:ticker`**:
  - Validate that `:ticker` matches ticker alphanumeric criteria (`/^[A-Z0-9.-]{1,10}$/`). Reject with `400 Bad Request` if invalid.
- **`DELETE /api/journal/:id`**:
  - Validate that `:id` matches UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). Reject with `400 Bad Request` if invalid.
- **AI Chat Message Sanitization**:
  - Harden `/api/chat` inputs to strip control characters and restrict message length to a maximum of 1000 characters.

#### 3. Cache Bounding (Memory Leak Prevention)
- Build a lightweight `BoundedMap` wrapper in `backend/src/common/BoundedMap.js` (no new dependencies).
- When map size exceeds `maxEntries` (200), evict the oldest key (FIFO/LRU).
- Apply `BoundedMap` to `quoteCache` (in `server.js`) and `sparklineCache` (in `api.js`).

#### 4. Database Schema Migration
Create a SQL migration file (`supabase/migrations/20260621_schema_hardening.sql`) containing:
- `CHECK` constraints on enum columns in `journal` table (`type IN ('BUY', 'SELL', 'ADJUST')` and `status IN ('OPEN', 'CLOSED')`).
- `CHECK` constraints on numeric ranges in `holdings` table (`shares >= 0` and `avg_cost >= 0`).
- Foreign key constraint on `watchlists.import_batch_id` referencing `import_batches(import_batch_id)`.

#### 5. TDD Strategy (Phase 2):
Add tests to existing or new files verifying:
- `/api/price/:ticker` rejects anonymous users with 401.
- WebSocket server closes connections without a valid token.
- Invalid tickers or non-UUID journal IDs are rejected with 400.
- `BoundedMap` correctly limits keys and evicts oldest items.
- SQL schema tests verify constraint existence.

---

### Phase 3: Test Gap Fill

To verify and maintain high stability, we will create the following test files and cover previously untested logic:
- `backend/tests/watchlist.test.js`: Watchlist CRUD endpoints (GET, POST with Zod validation/soft-delete restore, DELETE with ticker validation).
- `backend/tests/journalCrud.test.js`: Journal GET and DELETE (soft-delete, UUID validation).
- `backend/tests/quotePacket.test.js`: Packet construction, multi-source price fetching, caching, and `/api/price/:ticker` auth integration.
- `backend/tests/health.test.js`: `/health` response shape, metrics, and providers.
- `backend/tests/websocket.test.js`: WebSocket connection authentication and analysis kickoff broadcasting events.

---

## 🛠️ Verification & Acceptance Criteria

1. **Test Execution**: `npm run test` passes all tests with zero errors.
2. **Zero Linters & Warnings**: Linter checks (`npm run lint`) output zero warnings on newly refactored files.
3. **Audit Zero Detection**: Impeccable audit tools should run clean.
4. **Security Headers**: `curl -I http://localhost:8080/health` displays Helmet headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.).
