# MyPortStock PWA, Verified Alerts, and Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `tdd` or `superpowers:test-driven-development` for every code task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MyPortStock installable as a PWA and deliver fail-closed, verified price alerts through Web Push without caching private API data or weakening the Current Price Acceptance Gate.

**Architecture:** Keep the existing React 19 + Vite 8 frontend and Express 5 backend. The service worker precaches only the application shell. A single-process, standard-library scheduler evaluates existing watchlist and active-journal thresholds only after the existing two-source quote gate passes, persists edge-triggered events in Supabase, and hands them to Web Push delivery.

**Tech Stack:** React, Vite, `vite-plugin-pwa`, Express, Supabase/Postgres, existing `yahoo-finance2`/Nasdaq/Stooq quote sources, `web-push`, Node test runner, Vitest.

**ADR:** [`docs/adr/0005-pwa-first-ts-migration-vite-stack.md`](../adr/0005-pwa-first-ts-migration-vite-stack.md)

**Status:** Approved after review — ready for task-by-task execution

---

## Scope and invariants

### In scope

1. Installable PWA shell with a custom service worker.
2. Static asset precaching only; no `/api/*` response caching.
3. US and Thai market-hour-aware polling every 15 minutes by default.
4. Existing threshold sources only:
   - `watchlists.alert_price` + `watchlists.alert_type`
   - active `journal.stop_loss` and `journal.target`
5. Current price accepted only from the existing verified two-source quote packet.
6. Edge-triggered alert events and Web Push delivery.
7. One VPS process controlled by systemd; scheduler disabled by default until production configuration enables it.

### Explicitly out of scope

- Full JavaScript-to-TypeScript migration. Reconsider as a separate technical-debt project after measured need.
- LINE Notify, which ended service on 2025-03-31. LINE Messaging API requires a separate product/onboarding decision.
- Capacitor, App Store, Play Store, biometrics, background native execution.
- Offline portfolio, journal, watchlist, quote, or analysis data.
- Streaming or real-time alerts. Delivery target is one successful polling interval plus push-provider latency.
- Multiple backend replicas. Add a distributed lease only before horizontal scaling.
- New production market-data subscriptions.

### Fail-closed rules

- Never evaluate a threshold unless `current_price_acceptance_gate === "pass"`.
- Never fall back to a single Yahoo quote for an alert.
- Never cache authenticated `/api/*` responses in the service worker.
- Never derive `user_id` from request bodies; use authenticated Clerk identity.
- Never start the scheduler without `ALERT_SCHEDULER_ENABLED=true`, Supabase service-role configuration, and a valid poll interval.
- Never send a notification as an investment recommendation. Payloads report condition, observed price, threshold, session, and verification timestamp only.

---

## File map

### PWA shell

- Modify: `frontend/package.json`, `package-lock.json`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/index.html`
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/sw.js`
- Create: `frontend/public/pwa-192x192.png`
- Create: `frontend/public/pwa-512x512.png`
- Create: `frontend/public/maskable-512x512.png`
- Create: `frontend/public/apple-touch-icon.png`
- Create: `frontend/tests/pwaContract.test.js`

### Verified alert engine

- Create: `backend/src/services/verifiedQuotes.js`
- Modify: `backend/server.js`
- Create: `backend/src/alerts/alertRules.js`
- Create: `backend/src/alerts/alertRepository.js`
- Create: `backend/src/alerts/alertScheduler.js`
- Create: `backend/src/db/supabaseAdmin.js`
- Create: `supabase/migrations/20260628170000_alert_events.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Create: `backend/tests/verifiedQuotes.test.js`
- Create: `backend/tests/alertRules.test.js`
- Create: `backend/tests/alertScheduler.test.js`
- Modify: `backend/tests/schemaContract.test.js`, `backend/tests/server.test.js`

### Web Push

- Modify: `backend/package.json`, `package-lock.json`
- Create: `backend/src/routes/push.js`
- Create: `backend/src/services/pushDelivery.js`
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/alerts/alertScheduler.js`
- Create: `supabase/migrations/20260628171000_push_subscriptions.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Create: `backend/tests/pushRoutes.test.js`
- Create: `backend/tests/pushDelivery.test.js`
- Create: `frontend/src/lib/push.js`
- Modify: `frontend/src/components/config/ConfigSectionContent.jsx`
- Modify: `frontend/src/sw.js`
- Modify: `frontend/tests/configPage.test.jsx`, `frontend/tests/pwaContract.test.js`

---

## Stage 0: Pin the baseline

### Task 0: Verify the existing worktree without changing it

- [ ] Run the backend suite.

Run: `npm test --workspace=backend`

Expected: 53 tests pass, or record the new baseline if unrelated user changes have legitimately changed the count.

- [ ] Run the frontend suite and production build.

Run: `npm test --workspace=frontend -- --run && npm run build --workspace=frontend`

Expected: 129 tests pass and the Vite production build succeeds, or record the new baseline before implementation.

- [ ] Confirm no task below overwrites unrelated dirty-worktree changes.

Run: `git status --short`

Expected: existing user changes remain visible and are not reverted.

---

## Stage 1: PWA shell with static-only caching

### Task 1: Add a failing PWA configuration contract

**Files:**

- Create: `frontend/tests/pwaContract.test.js`

- [ ] Write a Vitest contract that reads `vite.config.js`, `index.html`, and `src/sw.js` and asserts:
  - `VitePWA` is configured with `strategies: 'injectManifest'`.
  - manifest includes `name`, `short_name`, `start_url`, `scope`, `display`, matching theme/background colors, 192/512 icons, and a dedicated maskable icon.
  - no Workbox `runtimeCaching` rule matches `/api`.
  - the service worker contains `precacheAndRoute(self.__WB_MANIFEST)`, `push`, and `notificationclick` handlers.
  - `index.html` contains `viewport-fit=cover` but not `maximum-scale` or `user-scalable=no`.

- [ ] Run the test and confirm RED.

Run: `npm test --workspace=frontend -- --run tests/pwaContract.test.js`

Expected: FAIL because `VitePWA` and `frontend/src/sw.js` do not exist.

### Task 2: Configure the minimal custom service worker

**Files:**

- Modify: `frontend/package.json`, `package-lock.json`
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/sw.js`
- Modify: `frontend/src/main.jsx`

- [ ] Install the minimal PWA build dependencies. `workbox-precaching` is direct because `src/sw.js` imports it directly.

Run: `npm install --workspace=frontend --save-dev vite-plugin-pwa@^1.3.0 workbox-precaching@^7.4.1`

Expected: `frontend/package.json` and root `package-lock.json` include exactly these two new direct dev dependencies.

- [ ] Configure `VitePWA` in `frontend/vite.config.js` with this contract:

```js
VitePWA({
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.js",
  registerType: "prompt",
  injectRegister: false,
  includeAssets: ["favicon.svg", "apple-touch-icon.png"],
  manifest: {
    id: "/",
    name: "MyPortStock",
    short_name: "MPS",
    description: "Private portfolio decision and risk workspace",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#0a0a0a",
    background_color: "#0a0a0a",
    icons: [
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
});
```

- [ ] Create `frontend/src/sw.js` using Workbox precache APIs only. Do not register any runtime route for `/api/*`. Include no-op-safe `push` and `notificationclick` handlers that ignore malformed payloads and open a same-origin URL.

- [ ] Register the service worker from `frontend/src/main.jsx` with `virtual:pwa-register`; expose an update prompt only when a new worker is waiting. Do not add an install-promotion banner.

- [ ] Run the focused test.

Run: `npm test --workspace=frontend -- --run tests/pwaContract.test.js`

Expected: remaining failures concern missing icons or HTML metadata only.

### Task 3: Add manifest assets and accessible metadata

**Files:**

- Create: PWA icon files listed in the file map
- Modify: `frontend/index.html`

- [ ] Generate the four PNG files from the existing favicon with transparent-safe padding. Keep the maskable artwork inside the central safe zone.

- [ ] Update `frontend/index.html`:
  - set `<html lang="th">`;
  - set title to `MyPortStock`;
  - use `width=device-width, initial-scale=1, viewport-fit=cover`;
  - add matching `theme-color` and `apple-touch-icon` metadata;
  - do not disable pinch zoom.

- [ ] Run PWA contract, frontend suite, and build.

Run: `npm test --workspace=frontend -- --run tests/pwaContract.test.js && npm test --workspace=frontend -- --run && npm run build --workspace=frontend`

Expected: all commands pass; `frontend/dist/manifest.webmanifest` and `frontend/dist/sw.js` exist.

- [ ] Commit Stage 1.

```bash
git add frontend/package.json package-lock.json frontend/vite.config.js frontend/index.html frontend/src/main.jsx frontend/src/sw.js frontend/public frontend/tests/pwaContract.test.js
git commit -m "feat(pwa): add installable static-only app shell"
```

### Stage 1 manual gate

- Serve the production build over HTTPS.
- Verify Chromium DevTools Application shows a valid manifest and active service worker.
- Install on desktop Chrome and Android Chrome.
- On iOS/iPadOS 16.4+, add the app to Home Screen, launch it in standalone mode, and confirm normal authenticated navigation.
- Disconnect the network and confirm only the shell loads; private portfolio/quote screens must show their existing error or insufficient-data state, never cached user data.

---

## Stage 2: Verified, edge-triggered alert engine

### Task 4: Extract the existing verified quote service without behavior change

**Files:**

- Create: `backend/src/services/verifiedQuotes.js`
- Create: `backend/tests/verifiedQuotes.test.js`
- Modify: `backend/server.js`

- [ ] Write a failing test proving the extracted service:
  - uses existing source fetchers and `buildTwoSourceQuotePacket`;
  - falls back to Stooq only when fewer than two valid sources exist;
  - caches only accepted packets;
  - returns `INSUFFICIENT_DATA` unchanged when the gate fails.

- [ ] Run RED.

Run: `npm test --workspace=backend -- tests/verifiedQuotes.test.js`

Expected: FAIL because `backend/src/services/verifiedQuotes.js` does not exist.

- [ ] Move `quoteCache`, `getCachedQuote`, and `getQuotePacket` from `backend/server.js` into the new module. Preserve exports used by existing tests and routes. Do not change thresholds or source ordering.

- [ ] Run focused and existing quote tests.

Run: `npm test --workspace=backend -- tests/verifiedQuotes.test.js tests/priceGate.test.js tests/server.test.js`

Expected: PASS with no API response-shape change.

### Task 5: Define pure alert evaluation rules

**Files:**

- Create: `backend/src/alerts/alertRules.js`
- Create: `backend/tests/alertRules.test.js`

- [ ] Write table-driven tests for:
  - watchlist `above`: false below threshold, true at/above threshold;
  - watchlist `below`: false above threshold, true at/below threshold;
  - active journal stop loss: true at/below stop;
  - active journal target: true at/above target;
  - invalid/non-finite price or threshold: `INSUFFICIENT_DATA`;
  - previous matched state `true`: no new event;
  - transition `false -> true`: exactly one event.

- [ ] Run RED.

Run: `npm test --workspace=backend -- tests/alertRules.test.js`

Expected: FAIL because the module does not exist.

- [ ] Implement only pure functions `buildAlertCandidates(rows)` and `evaluateAlertCandidate(candidate, verifiedPacket, previousState)`. Require an accepted gate and finite `last_price`. Return a factual event payload without recommendation text.

- [ ] Run GREEN.

Run: `npm test --workspace=backend -- tests/alertRules.test.js`

Expected: PASS.

### Task 6: Add additive alert event/state schema

**Files:**

- Create: `supabase/migrations/20260628170000_alert_events.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Modify: `backend/tests/schemaContract.test.js`

- [ ] Add failing schema assertions for:
  - additive migration only: no `DROP TABLE`;
  - `alert_states` unique key on `(user_id, source_type, source_id, condition_type)`;
  - `alert_events.idempotency_key` unique;
  - source price, threshold, quote timestamp/session, source list, and gate status are persisted;
  - RLS enabled with authenticated owner-only read/update and service-role scheduler grants;
  - authenticated users cannot insert synthetic events.

- [ ] Run RED.

Run: `npm test --workspace=backend -- tests/schemaContract.test.js`

Expected: FAIL because the migration is absent.

- [ ] Create the migration and mirror its resulting canonical table definitions, indexes, policies, and grants into both schema snapshots. Use `alert_states` for edge state and `alert_events` for immutable facts; do not create a separate `alert_rules` table.

- [ ] Run GREEN.

Run: `npm test --workspace=backend -- tests/schemaContract.test.js`

Expected: PASS.

### Task 7: Add an explicit server-only Supabase admin boundary

**Files:**

- Create: `backend/src/db/supabaseAdmin.js`
- Modify: `backend/tests/supabaseClient.test.js`

- [ ] Write tests proving `createSupabaseAdmin()` requires both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, never falls back to the anon key, disables session persistence, and throws a sanitized configuration error.

- [ ] Implement the smallest client factory satisfying the tests. Never export the service-role key or return it in health output.

- [ ] Run tests.

Run: `npm test --workspace=backend -- tests/supabaseClient.test.js`

Expected: PASS.

### Task 8: Implement bounded scheduler cycles

**Files:**

- Create: `backend/src/alerts/alertRepository.js`
- Create: `backend/src/alerts/alertScheduler.js`
- Create: `backend/tests/alertScheduler.test.js`

- [ ] Write scheduler tests with injected clock, repository, and quote loader proving:
  - disabled scheduler makes zero database/network calls;
  - only active, non-deleted watchlist and journal thresholds are loaded;
  - tickers are deduplicated before quote fetching;
  - maximum 25 tickers are processed per cycle;
  - gate failure writes state as unevaluated and emits no event;
  - only `false -> true` creates an event;
  - repeated matched cycles do not duplicate events;
  - no cycle overlaps a still-running cycle;
  - failures are recorded in status and the next cycle remains scheduled;
  - `stop()` clears the pending timer.

- [ ] Run RED.

Run: `npm test --workspace=backend -- tests/alertScheduler.test.js`

Expected: FAIL because scheduler modules do not exist.

- [ ] Implement a recursive `setTimeout` scheduler; do not add `node-cron`. Parse these bounds:
  - `ALERT_SCHEDULER_ENABLED=false` by default;
  - `ALERT_POLL_INTERVAL_MS=900000`, minimum `300000`;
  - `ALERT_MAX_TICKERS_PER_CYCLE=25`, range `1..100`.

- [ ] Use `Intl.DateTimeFormat` with `America/New_York` and `Asia/Bangkok`; never hardcode ICT conversions. Skip weekends and quotes outside accepted regular/extended sessions. Exchange-holiday perfection is deferred; closed-session quote metadata must still prevent evaluation.

- [ ] Run GREEN.

Run: `npm test --workspace=backend -- tests/alertScheduler.test.js`

Expected: PASS.

### Task 9: Wire lifecycle and sanitized health state

**Files:**

- Modify: `backend/server.js`
- Modify: `backend/tests/server.test.js`

- [ ] Add failing tests proving the scheduler starts only inside `require.main === module`, stops on `SIGTERM`/`SIGINT`, and `/health` exposes only `enabled`, `running`, `last_cycle_at`, `last_success_at`, and a boolean `degraded`.

- [ ] Wire scheduler start after the HTTP server begins listening and stop it before closing the server. Do not start timers when `server.js` is imported by tests.

- [ ] Run backend suite.

Run: `npm test --workspace=backend`

Expected: all backend tests pass without open-handle warnings.

- [ ] Commit Stage 2.

```bash
git add backend/src/services/verifiedQuotes.js backend/src/alerts backend/src/db/supabaseAdmin.js backend/server.js backend/tests supabase/migrations/20260628170000_alert_events.sql backend/supabase_schema.sql supabase/schema.sql
git commit -m "feat(alerts): evaluate verified price thresholds"
```

---

## Stage 3: Web Push delivery

### Task 10: Add push subscription storage and RLS

**Files:**

- Create: `supabase/migrations/20260628171000_push_subscriptions.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`
- Modify: `backend/tests/schemaContract.test.js`

- [ ] Add failing schema assertions for `push_subscriptions` with owner-scoped RLS, service-role delivery access, unique endpoint, `p256dh`, `auth`, `created_at`, `updated_at`, and `is_deleted`. Authenticated users may manage only their own rows.

- [ ] Create the additive migration and update canonical snapshots.

- [ ] Run schema tests.

Run: `npm test --workspace=backend -- tests/schemaContract.test.js`

Expected: PASS.

### Task 11: Add authenticated subscription endpoints

**Files:**

- Modify: `backend/package.json`, `package-lock.json`
- Create: `backend/src/routes/push.js`
- Modify: `backend/src/routes/api.js`
- Create: `backend/tests/pushRoutes.test.js`

- [ ] Install `web-push`.

Run: `npm install --workspace=backend web-push@^3.6.7`

- [ ] Write route tests proving:
  - anonymous requests receive `401`;
  - `POST /api/push/subscribe` accepts only an HTTPS endpoint and non-empty `p256dh`/`auth` keys;
  - `user_id` always comes from authenticated request context;
  - repeat subscription upserts rather than duplicates;
  - `DELETE /api/push/unsubscribe` soft-deletes only the authenticated user's endpoint;
  - `POST /api/push/test` is unavailable in production.

- [ ] Run RED, implement routes using the existing scoped Supabase pattern, then run GREEN.

Run: `npm test --workspace=backend -- tests/pushRoutes.test.js`

Expected: PASS.

### Task 12: Add explicit permission UI and subscription client

**Files:**

- Create: `frontend/src/lib/push.js`
- Modify: `frontend/src/components/config/ConfigSectionContent.jsx`
- Modify: `frontend/tests/configPage.test.jsx`

- [ ] Write tests proving notification permission is requested only after an explicit button click, unsupported browsers show a factual disabled state, denied permission is not re-prompted automatically, and successful subscriptions are sent through authenticated `fetchWithAuth`.

- [ ] Run RED.

Run: `npm test --workspace=frontend -- --run tests/configPage.test.jsx`

Expected: FAIL because push controls do not exist.

- [ ] Implement `urlBase64ToUint8Array`, subscribe/unsubscribe functions, and one Settings control. Do not add a global prompt, banner, modal, or background permission request.

- [ ] Run GREEN.

Run: `npm test --workspace=frontend -- --run tests/configPage.test.jsx`

Expected: PASS.

### Task 13: Deliver factual push notifications

**Files:**

- Create: `backend/src/services/pushDelivery.js`
- Create: `backend/tests/pushDelivery.test.js`
- Modify: `backend/src/alerts/alertScheduler.js`
- Modify: `frontend/src/sw.js`
- Modify: `frontend/tests/pwaContract.test.js`

- [ ] Write backend tests proving:
  - missing VAPID configuration fails closed without marking delivery successful;
  - one event is sent to all active subscriptions for its owner;
  - HTTP 404/410 subscriptions are soft-deleted;
  - other failures are logged without exposing endpoint/key material;
  - successful delivery timestamps the event;
  - payload contains ticker, condition, threshold, observed price, quote timestamp/session, and same-origin URL only.

- [ ] Write service-worker contract assertions that malformed push data does not throw and `notificationclick` accepts only same-origin paths.

- [ ] Implement delivery and connect it after event persistence. Event creation remains successful even if push delivery fails; a later cycle may retry undelivered events with a bounded retry count of 3.

- [ ] Run focused suites.

Run: `npm test --workspace=backend -- tests/pushDelivery.test.js tests/alertScheduler.test.js && npm test --workspace=frontend -- --run tests/pwaContract.test.js`

Expected: PASS.

- [ ] Commit Stage 3.

```bash
git add backend/package.json package-lock.json backend/src/routes/push.js backend/src/routes/api.js backend/src/services/pushDelivery.js backend/src/alerts/alertScheduler.js backend/tests supabase/migrations/20260628171000_push_subscriptions.sql backend/supabase_schema.sql supabase/schema.sql frontend/src/lib/push.js frontend/src/components/config/ConfigSectionContent.jsx frontend/src/sw.js frontend/tests
git commit -m "feat(push): deliver verified alert notifications"
```

---

## Stage 4: Final verification and deployment handoff

### Task 14: Run automated gates

- [ ] Run the full workspace checks.

Run: `npm test && npm run build && npm run lint`

Expected: all suites pass, production build succeeds, and lint reports no new errors.

- [ ] Verify migrations are additive and RLS checks pass against the linked Supabase project only after explicit deployment approval.

Run: `npx supabase db query --linked --file backend/tests/verify_schema_rls.sql`

Expected: all SQL assertions pass. Do not run this command against production without confirming the linked project.

### Task 15: Verify production behavior

- [ ] Configure server-only secrets through systemd `EnvironmentFile`:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
  - `ALERT_SCHEDULER_ENABLED=true`

- [ ] Confirm nginx serves `manifest.webmanifest` as `application/manifest+json`, serves the app over HTTPS, redirects HTTP to HTTPS, and proxies `/api` and `/ws` without caching.

- [ ] Trigger one controlled test threshold and verify this chain:

```text
verified two-source packet passes
-> false-to-true threshold transition
-> one alert_event row
-> one push delivery per active subscription
-> repeated matched cycle creates no duplicate event
```

- [ ] Confirm scheduler health becomes degraded on a forced quote failure, emits no alert, and recovers on the next successful cycle.

- [ ] Confirm iOS push only after the user adds MyPortStock to Home Screen and enables notifications from the Settings control.

---

## Rollback

1. Set `ALERT_SCHEDULER_ENABLED=false` and restart the backend. This is the primary kill switch.
2. Disable push from the Settings control or remove VAPID configuration; alert event persistence continues without delivery.
3. Remove service-worker registration and deploy a build that unregisters the old worker if PWA caching causes a regression.
4. Leave additive Supabase tables in place during application rollback; dropping them risks deleting audit history and subscriptions.

## Deferred decision triggers

- **TypeScript migration:** reconsider when type-related production defects or refactor friction justify a separate migration.
- **LINE Messaging API:** reconsider only if Web Push coverage is insufficient and LINE Official Account onboarding/quota is accepted.
- **Capacitor:** reconsider only when App Store distribution or native-only APIs are required.
- **Distributed scheduler lease:** required before running more than one backend replica.
- **Exchange calendar dependency:** required if closed-market metadata proves insufficient around exchange holidays.
