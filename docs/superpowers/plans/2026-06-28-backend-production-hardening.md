# Backend Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Before every code task, use `tdd` or `superpowers:test-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Express backend a safe production foundation for multi-user product slices without changing investment decisions or API success payloads.

**Architecture:** Keep one Express process and the existing CommonJS modules. Add one compact HTTP middleware module, one bounded map utility, and an authenticated one-time WebSocket ticket boundary. Use additive database constraints and preserve current Clerk-to-Supabase user isolation.

**Tech Stack:** Express 5.2, Clerk Express, Supabase/Postgres, Zod, `ws`, Sentry, Node test runner, Supertest, `helmet`, `express-rate-limit`.

**Source design:** `docs/superpowers/specs/2026-06-21-backend-hardening-design.md`

**Context7 basis:** Express 5 rejected promises reach the final four-argument error handler automatically; error middleware must be mounted last. Behind one nginx reverse proxy, `trust proxy` must be exactly `1` so rate limiting sees the client IP.

**Implementation status (2026-06-28):** Tasks 0–7 are implemented on `feature/backend-production-hardening`. Local verification passes with 79 backend tests, 130 frontend tests, production build, lint with zero errors, and production-mode loopback smoke. The user accepted this local exit gate for continued development and explicitly deferred Task 8 Steps 3–4 (the OCI/nginx path and confirmed non-production Supabase verification). Those checks remain mandatory before production deployment; this is not a production-readiness claim.

---

## Scope decisions

- Add `helmet` and `express-rate-limit` as the only new production dependencies.
- Do not add `cors`: production and local Vite proxy are same-origin. Add CORS only when a real separate origin is approved.
- Do not split middleware into one file per header. `backend/src/http/appMiddleware.js` owns the small shared HTTP stack.
- Do not add Redis or a distributed limiter for the current one-process deployment.
- Do not pass Clerk JWTs in WebSocket query strings. Use a short-lived, one-time ticket issued through the authenticated HTTP API.
- WebSocket broadcasts are user-scoped. No connection may receive another user's agent events.
- Preserve all successful API response contracts. Only internal error responses, rejected auth, headers, and rate limits change.

## File map

- Modify: `backend/package.json`, `package-lock.json`
- Create: `backend/src/http/appMiddleware.js`
- Create: `backend/src/http/errors.js`
- Create: `backend/src/common/BoundedMap.js`
- Create: `backend/src/ws/wsTicketStore.js`
- Modify: `backend/src/ws/agentEventBus.js`
- Modify: `backend/src/auth/requestAuth.js`
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/services/marketData.js`
- Modify: `backend/server.js`
- Modify: `backend/instrument.js`
- Create: `backend/tests/httpHardening.test.js`
- Create: `backend/tests/boundedMap.test.js`
- Create: `backend/tests/websocketAuth.test.js`
- Modify: `backend/tests/api.test.js`
- Modify: `backend/tests/server.test.js`
- Create: `supabase/migrations/20260628160000_backend_integrity_constraints.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Modify: `backend/tests/schemaContract.test.js`

---

## Task 0: Pin baseline and approve dependencies

- [ ] **Step 1: Run the current backend suite**

Run: `npm test --workspace=backend`

Expected: PASS. Record the actual test count; do not hardcode an older count into later evidence.

- [ ] **Step 2: Confirm the production dependency change**

Install only after user approval:

```bash
npm install --workspace=backend helmet@^8 express-rate-limit@^8
```

Expected: only `helmet` and `express-rate-limit` become new direct backend dependencies.

- [ ] **Step 3: Commit dependency metadata**

```bash
git add backend/package.json package-lock.json
git commit -m "build(backend): add HTTP hardening middleware"
```

## Task 1: Add request identity and sanitized terminal errors

**Files:**

- Create: `backend/src/http/errors.js`
- Create: `backend/src/http/appMiddleware.js`
- Create: `backend/tests/httpHardening.test.js`
- Modify: `backend/server.js`
- Modify: `backend/src/routes/api.js`

- [ ] **Step 1: Write failing HTTP behavior tests**

Add tests proving:

```js
assert.match(response.headers["x-request-id"], /^[0-9a-f-]{36}$/i);
assert.deepEqual(response.body, {
  error: "Internal server error",
  requestId: response.headers["x-request-id"],
});
assert.doesNotMatch(JSON.stringify(response.body), /database|stack|secret/i);
```

The test-only route throws an error containing `database secret detail`. Also prove a supplied arbitrary `X-Request-ID` is not trusted as the server-generated ID.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/httpHardening.test.js`

Expected: FAIL because request IDs and sanitized terminal errors are absent.

- [ ] **Step 3: Implement the error contract**

`backend/src/http/errors.js` exports:

```js
class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: "Not found", requestId: req.id });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status =
    Number.isInteger(error.status) && error.status < 500 ? error.status : 500;
  const message = status < 500 ? error.message : "Internal server error";
  return res.status(status).json({ error: message, requestId: req.id });
}
```

`backend/src/http/appMiddleware.js` generates `req.id = crypto.randomUUID()`, sets `X-Request-ID`, records start time, and writes one JSON completion log on `res.finish`. It must not log authorization headers, request bodies, push endpoints, or key material.

- [ ] **Step 4: Route internal failures to the terminal handler**

Replace the 11 direct `500 { error: err.message }` responses in `backend/server.js` and `backend/src/routes/api.js` with `next(error)` in async handlers. Keep explicit expected `400`, `401`, `404`, `409`, and fail-closed `INSUFFICIENT_DATA` responses unchanged.

- [ ] **Step 5: Mount in correct Express 5 order**

Order in `backend/server.js`:

```text
request ID/log start
-> security/rate middleware
-> body parser/auth
-> API/static/routes
-> SPA catch-all
-> terminal error handler
```

The API 404 handler must run before the SPA catch-all; unknown `/api/*` returns JSON 404, while unknown non-API paths still return `frontend/dist/index.html`.

- [ ] **Step 6: Run GREEN and regression tests**

Run: `npm test --workspace=backend -- tests/httpHardening.test.js tests/api.test.js tests/server.test.js`

Expected: PASS; no success payload changes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/http backend/server.js backend/src/routes/api.js backend/tests/httpHardening.test.js backend/tests/api.test.js backend/tests/server.test.js
git commit -m "feat(backend): sanitize terminal HTTP errors"
```

## Task 2: Add security headers, proxy contract, and bounded rate limits

**Files:**

- Modify: `backend/src/http/appMiddleware.js`
- Modify: `backend/tests/httpHardening.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing header and limiter tests**

Prove:

- `X-Content-Type-Options`, `Content-Security-Policy`, and `Referrer-Policy` exist;
- `X-Powered-By` is absent;
- `RateLimit` exists and legacy `X-RateLimit-*` headers do not;
- `/health` is not blocked by the global limiter;
- quote endpoints receive a stricter limit than ordinary reads;
- AI endpoints receive the strictest limit;
- with `X-Forwarded-For: 203.0.113.10` behind one proxy, requests key on the forwarded client IP.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/httpHardening.test.js`

Expected: FAIL on missing headers and rate limits.

- [ ] **Step 3: Configure one-proxy production behavior**

In production set `app.set('trust proxy', 1)`. In tests and direct local development, leave proxy trust disabled unless the test app explicitly enables it.

Use these initial in-memory limits per five-minute window:

```js
const limiterOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
};

// ordinary /api reads and writes: 300
// /api/quote and /api/packet: 60
// /api/analyze and /api/chat: 20
```

Skip `/health`. Return JSON `{ error: 'Too many requests', requestId }`. These are operational safety defaults, not billing quotas.

Configure Helmet for same-origin application assets, Clerk/Supabase/Sentry connections already required by the deployed app, and the existing TradingView frame boundary. Do not use wildcard `*` sources.

- [ ] **Step 4: Run GREEN**

Run: `npm test --workspace=backend -- tests/httpHardening.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/http/appMiddleware.js backend/server.js backend/tests/httpHardening.test.js
git commit -m "feat(backend): add security headers and rate limits"
```

## Task 3: Bound in-memory caches

**Files:**

- Create: `backend/src/common/BoundedMap.js`
- Create: `backend/tests/boundedMap.test.js`
- Modify: `backend/server.js`
- Modify: `backend/src/routes/api.js`

- [ ] **Step 1: Write the failing utility test**

Test the public behavior:

```js
const cache = new BoundedMap(2);
cache.set("A", 1);
cache.set("B", 2);
cache.get("A");
cache.set("C", 3);
assert.equal(cache.has("A"), true);
assert.equal(cache.has("B"), false);
assert.equal(cache.has("C"), true);
```

Also prove invalid limits throw and overwriting an existing key does not increase size.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/boundedMap.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal LRU map**

Use native `Map`: `get` refreshes recency by delete/set; `set` evicts the first key while size exceeds the limit. Expose only `get`, `set`, `has`, `delete`, `clear`, `size`, and iterator methods actually used by current health/tests.

- [ ] **Step 4: Replace unbounded caches**

- `quoteCache`: maximum 200 tickers.
- `sparklineCache`: maximum 200 tickers.
- Preserve existing TTL behavior and response contracts.

- [ ] **Step 5: Run GREEN and quote regressions**

Run: `npm test --workspace=backend -- tests/boundedMap.test.js tests/priceGate.test.js tests/marketData.test.js tests/api.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/common/BoundedMap.js backend/server.js backend/src/routes/api.js backend/tests/boundedMap.test.js
git commit -m "fix(backend): bound market-data caches"
```

## Task 4: Close route input-validation gaps

**Files:**

- Modify: `backend/src/routes/api.js`
- Modify: `backend/tests/api.test.js`

- [ ] **Step 1: Write failing public route tests**

Prove malformed watchlist ticker paths and journal IDs return `400` before Supabase is called. Prove AI chat rejects control characters and messages over 1,000 characters with a stable `400` response.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/api.test.js`

Expected: FAIL on currently unvalidated paths/messages.

- [ ] **Step 3: Add Zod schemas at the route boundary**

Reuse the existing ticker regex. Use `z.string().uuid()` for journal IDs. Chat messages are trimmed, limited to 1,000 characters, and rejected when they contain C0 controls other than tab/newline.

- [ ] **Step 4: Run GREEN**

Run: `npm test --workspace=backend -- tests/api.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/api.js backend/tests/api.test.js
git commit -m "fix(backend): validate route inputs"
```

## Task 5: Authenticate and user-scope WebSocket events

**Files:**

- Create: `backend/src/ws/wsTicketStore.js`
- Modify: `backend/src/ws/agentEventBus.js`
- Modify: `backend/server.js`
- Modify: `backend/tests/websocketAuth.test.js`
- Modify: `frontend/src/hooks/useAgentEvents.jsx`
- Modify: `frontend/tests/productionDataContract.test.js`

- [ ] **Step 1: Write failing ticket-store tests**

Prove a ticket:

- is generated with `crypto.randomUUID()`;
- expires after 30 seconds using an injected clock;
- is consumed exactly once;
- stores only `userId`, expiry, and ticket ID;
- is bounded to 1,000 pending tickets.

- [ ] **Step 2: Write failing WebSocket isolation tests**

Start an HTTP server on an ephemeral port and prove:

- missing/invalid/expired ticket receives HTTP `401` on upgrade;
- one valid ticket establishes one connection and cannot reconnect;
- broadcasting an event for `user_a` reaches `user_a` only, never `user_b`;
- broadcast without a target user is rejected outside explicit system-health events.

- [ ] **Step 3: Run RED**

Run: `npm test --workspace=backend -- tests/websocketAuth.test.js`

Expected: FAIL because the current event bus accepts anonymous global connections.

- [ ] **Step 4: Add authenticated ticket issuance**

Add `POST /api/ws-ticket`. It uses `getRequestUserId(req)`, returns `{ ticket, expires_in_seconds: 30 }`, and never accepts `user_id` from the body.

Create the WebSocket server with `noServer: true`; handle `/ws/agent-events?ticket=...` upgrades, consume the ticket before `handleUpgrade`, and attach `ws.userId`.

- [ ] **Step 5: Scope every analysis event**

Pass the authenticated request user ID through analysis kickoff/completion helpers and call `broadcast(event, { userId })`. Remove the global default broadcast path for user analysis.

- [ ] **Step 6: Update the frontend connection flow**

Before opening the socket, request a one-time ticket with authenticated `fetchWithAuth`, then connect using the ticket. On close, obtain a new ticket before reconnecting. Never persist the ticket or log its URL.

- [ ] **Step 7: Run GREEN across backend and frontend contracts**

Run: `npm test --workspace=backend -- tests/websocketAuth.test.js tests/devAuthBypass.test.js && npm test --workspace=frontend -- --run tests/productionDataContract.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/ws backend/server.js backend/tests/websocketAuth.test.js frontend/src/hooks/useAgentEvents.jsx frontend/tests/productionDataContract.test.js
git commit -m "fix(realtime): authenticate user-scoped agent events"
```

## Task 6: Add database integrity constraints additively

**Files:**

- Create: `supabase/migrations/20260628160000_backend_integrity_constraints.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Modify: `backend/tests/schemaContract.test.js`

- [ ] **Step 1: Write failing schema contracts**

Prove the migration contains no `DROP TABLE`, uses `ADD CONSTRAINT` inside existence guards, and enforces:

```text
journal.type in BUY, SELL, ADJUST
journal.status in OPEN, CLOSED
holdings.shares >= 0
holdings.avg_cost >= 0
watchlists.alert_type in above, below
```

Do not add the watchlist import foreign key until a preflight query confirms current non-null values reference an existing batch; fail the migration with a clear exception if they do not.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/schemaContract.test.js`

Expected: FAIL because the additive migration does not exist.

- [ ] **Step 3: Create migration and update canonical schema snapshots**

Use named constraints and idempotent `DO $$ ... $$` guards. Never delete or rewrite runtime rows in this migration.

- [ ] **Step 4: Run GREEN**

Run: `npm test --workspace=backend -- tests/schemaContract.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260628160000_backend_integrity_constraints.sql backend/supabase_schema.sql supabase/schema.sql backend/tests/schemaContract.test.js
git commit -m "feat(db): enforce runtime integrity constraints"
```

## Task 7: Reduce observability data exposure and close cleanly

**Files:**

- Modify: `backend/instrument.js`
- Modify: `backend/server.js`
- Modify: `backend/tests/server.test.js`

- [ ] **Step 1: Write failing static/runtime contracts**

Prove:

- Sentry `sendDefaultPii` is `false`;
- traces/profiles are environment-configured and default to `0` outside explicit observability enablement;
- `/health` contains no secrets, DSNs, tokens, user IDs, or raw error messages;
- SIGTERM stops accepting connections, closes WebSocket clients, and closes the HTTP server;
- imported `server.js` creates no listener or signal handler.

- [ ] **Step 2: Run RED**

Run: `npm test --workspace=backend -- tests/server.test.js`

Expected: FAIL on current PII and shutdown behavior.

- [ ] **Step 3: Implement bounded observability and shutdown**

Set `sendDefaultPii: false`. Parse sample rates from environment with range `0..1` and default `0`. Register shutdown only inside `require.main === module`; close WebSocket server first, then HTTP server, with a 10-second forced-exit ceiling.

- [ ] **Step 4: Run GREEN**

Run: `npm test --workspace=backend -- tests/server.test.js`

Expected: PASS with no open-handle warning.

- [ ] **Step 5: Commit**

```bash
git add backend/instrument.js backend/server.js backend/tests/server.test.js
git commit -m "fix(backend): minimize telemetry and close gracefully"
```

## Task 8: Final Gate 0 verification

**Sequencing note (2026-06-28):** Steps 1–2 and loopback production smoke have passed. The user chose to continue with Slice 1 while Steps 3–4 are deferred. Reopen both external checks before the first OCI deployment.

- [ ] **Step 1: Run backend suite**

Run: `npm test --workspace=backend`

Expected: PASS with zero failures and no open handles.

- [ ] **Step 2: Run full workspace checks**

Run: `npm test && npm run build && npm run lint`

Expected: all tests pass, frontend production build succeeds, and lint has no new errors.

- [ ] **Step 3: Run production-mode HTTP smoke**

Verify through the configured nginx path:

```text
/health remains reachable
/api unknown route returns sanitized JSON 404
SPA route returns index.html
security and RateLimit headers are present
client IP is correct behind exactly one proxy
anonymous WebSocket upgrade is rejected
```

- [ ] **Step 4: Verify additive migration only after linked-project confirmation**

Run the repository SQL verification against the explicitly confirmed non-production linked project before production rollout.

- [ ] **Step 5: Update roadmap and memory**

Mark Gate 0 complete in `docs/superpowers/plans/2026-06-28-product-platform-roadmap.md` and add one compact `PROJECT_MEMORY_INDEX.md` entry with test evidence.

## Rollback

- Revert middleware mounting to remove new HTTP headers/limits without changing success routes.
- Disable rate limiting with a production environment kill switch only during incident response; restore it after correcting proxy configuration.
- Revert frontend ticket acquisition and backend upgrade handling together; never leave anonymous global WebSocket broadcasting enabled in production.
- Database constraints are additive. Drop a named constraint only if it rejects a previously valid documented runtime row; do not roll back by deleting data.
