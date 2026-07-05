# Slice 3: PWA, Alert Inbox, and Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` task-by-task. Before every code task, use `tdd` or `superpowers:test-driven-development`.

**Goal:** Make MyPortStock installable and deliver private, verified, duplicate-safe US stock/ETF alerts through an authenticated Inbox and redacted Web Push.

**Architecture:** Keep Vite + Express. A custom service worker precaches only static application assets. Users explicitly manage multiple alert rules per ticker. A bounded single-process scheduler evaluates rules only from the accepted two-source quote packet, persists edge-triggered events, and delivers redacted Web Push.

**Tech Stack:** React 19, Vite 8, `vite-plugin-pwa`, Workbox, Express 5, Supabase/Postgres RLS, existing quote gate, `web-push`, Node test runner, Vitest.

**Product spec:** `docs/superpowers/specs/2026-06-28-myportstock-product-platform-design.md`

**Roadmap:** Slice 3 in `docs/superpowers/plans/2026-06-28-product-platform-roadmap.md`

**ADR:** `docs/adr/0005-pwa-first-ts-migration-vite-stack.md`

**Status:** Approved contract; execute only after Gate 0 and Slices 1–2 pass.

---

## Scope and invariants

### In scope

- Installable static-only PWA.
- Explicit `alert_rules` with multiple `above`, `below`, or `zone` rules per US ticker/ETF.
- Manual rule CRUD and authenticated Inbox acknowledgement.
- Fifteen-minute default polling during applicable US sessions.
- Existing two-source Current Price Acceptance Gate.
- Edge-triggered events: send once until the condition resets.
- One degraded-data event after two consecutive verification failures; success resets the counter.
- Redacted push; details require opening the authenticated app.

### Out of scope

- Thai equities or Thai market sessions.
- Journal/Plan auto-sync. Slice 4 may prefill a form, but users still confirm explicitly.
- Broker orders or claims that alerts replace broker stops.
- Offline private data, LINE, email, SMS, native wrappers, multiple replicas, or paid data.

### Fail-closed rules

- Never evaluate unless `current_price_acceptance_gate === "pass"` and `last_price` is finite.
- Never fall back to one Yahoo quote or runtime-cache `/api/*`.
- Never accept `user_id` from clients.
- Never put price, threshold, position value, verdict, or recommendation on the lock screen.
- Never overlap scheduler cycles or exceed the ticker cap.
- Never run without `ALERT_SCHEDULER_ENABLED=true` and valid service-role configuration.

## File map

### PWA

- Modify: `frontend/package.json`, `package-lock.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/main.jsx`
- Create: `frontend/src/sw.js`, four PWA PNG icons, `frontend/tests/pwaContract.test.js`

### Rules and Inbox

- Create: `supabase/migrations/20260628170000_alert_rules_events.sql`
- Modify: `backend/supabase_schema.sql`, `supabase/schema.sql`, `backend/tests/schemaContract.test.js`
- Create: `backend/src/alerts/alertRules.js`, `backend/src/alerts/alertRepository.js`, `backend/src/routes/alerts.js`
- Modify: `backend/src/routes/api.js`
- Create: `backend/tests/alertRules.test.js`, `backend/tests/alertRoutes.test.js`
- Create: `frontend/src/pages/InboxPage.jsx`, `frontend/src/components/alerts/AlertRuleForm.jsx`, `frontend/src/hooks/useAlerts.js`
- Modify: `frontend/src/App.jsx`, `frontend/src/lib/api.js`
- Create: `frontend/tests/inboxPage.test.jsx`

### Scheduler and push

- Create: `backend/src/services/verifiedQuotes.js`, `backend/src/db/supabaseAdmin.js`, `backend/src/alerts/alertScheduler.js`
- Create: `backend/src/services/pushDelivery.js`, `backend/src/routes/push.js`
- Modify: `backend/server.js`, `backend/package.json`, `package-lock.json`
- Create: `backend/tests/verifiedQuotes.test.js`, `backend/tests/alertScheduler.test.js`, `backend/tests/pushRoutes.test.js`, `backend/tests/pushDelivery.test.js`
- Create: `supabase/migrations/20260628171000_push_subscriptions.sql`
- Create: `frontend/src/lib/push.js`
- Modify: `frontend/src/components/config/ConfigSectionContent.jsx`, `frontend/src/sw.js`
- Modify: `frontend/tests/configPage.test.jsx`, `frontend/tests/pwaContract.test.js`

---

## Task 0: Verify dependencies and baseline

- [ ] Confirm Gate 0 and Slices 1–2 are complete in the roadmap.
- [ ] Run `npm test && npm run build && npm run lint`; record actual counts.
- [ ] Run `git status --short`; preserve unrelated work.

## Task 1: Add a static-only PWA shell

- [ ] Write `frontend/tests/pwaContract.test.js` first. Assert `injectManifest`, required manifest fields/icons, no `/api` runtime cache, `precacheAndRoute(self.__WB_MANIFEST)`, same-origin notification clicks, and zoom-safe metadata.
- [ ] Run RED: `npm test --workspace=frontend -- --run tests/pwaContract.test.js`.
- [ ] After dependency approval, run:

```bash
npm install --workspace=frontend --save-dev vite-plugin-pwa@^1.3.0 workbox-precaching@^7.4.1
```

- [ ] Configure `VitePWA` with `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.js'`, `registerType: 'prompt'`, and no API runtime cache.
- [ ] Create `src/sw.js` with static precache and malformed-payload-safe `push`/`notificationclick` handlers.
- [ ] Register through `virtual:pwa-register`; show only an update prompt, not an install banner.
- [ ] Generate 192, 512, maskable 512, and Apple touch PNGs from the existing favicon.
- [ ] Set Thai document language, `MyPortStock` title, matching theme metadata, and zoom-safe viewport.
- [ ] Run GREEN, full frontend tests, and build.
- [ ] Commit: `feat(pwa): add static-only installable shell`.

## Task 2: Add explicit multi-rule schema

- [ ] Write RED schema tests requiring additive SQL, owner RLS, service-role scheduler grants, and these entities:

```text
alert_rules: id, user_id, ticker, condition_type, threshold_min,
             threshold_max, label, enabled, timestamps, is_deleted
alert_states: rule_id, user_id, matched, consecutive_verification_failures,
              degraded_notified_at, last_price, last_quote_at, last_evaluated_at
alert_events: id, user_id, rule_id, ticker, event_type, observed_price,
              threshold_snapshot, quote metadata, gate, idempotency_key,
              acknowledged_at, push_delivered_at, push_retry_count
```

- [ ] Require checks: condition in `above|below|zone`; valid US ticker; above/below have one threshold; zone has ordered min/max; event in `price_triggered|data_quality`; retry count `0..3`.
- [ ] Authenticated users manage their rules and acknowledge their events but cannot insert states/events.
- [ ] Add unique `(user_id, rule_id)` state and unique `idempotency_key` event indexes.
- [ ] Update canonical schema snapshots and run `npm test --workspace=backend -- tests/schemaContract.test.js`.
- [ ] Commit: `feat(db): add explicit alert rules and events`.

## Task 3: Add rule and Inbox API

- [ ] Write failing Supertest contracts for:

```text
GET/POST              /api/alerts/rules
PATCH/DELETE          /api/alerts/rules/:id
GET                   /api/alerts/events
POST                  /api/alerts/events/:id/acknowledge
```

- [ ] Prove `401` for anonymous access, user isolation, rejected client `user_id`, validated ticker/thresholds, bounded pagination, soft delete, and no public event insertion.
- [ ] Run RED: `npm test --workspace=backend -- tests/alertRoutes.test.js`.
- [ ] Implement Zod boundaries and scoped Supabase queries.
- [ ] Run GREEN plus existing API tests.
- [ ] Commit: `feat(alerts): add rule and inbox API`.

## Task 4: Add manual rule management and Inbox UI

- [ ] Test first: multiple rules per ticker, conditional fields, retained input on failure, enable/disable/delete, acknowledgement, loading/empty/error/partial states, and 44px mobile controls.
- [ ] Run RED: `npm test --workspace=frontend -- --run tests/inboxPage.test.jsx`.
- [ ] Implement `/inbox` with authenticated `fetchWithAuth`; keep creation manual and do not mutate Journal/Plan.
- [ ] Add global Inbox count without displacing the approved five-item mobile navigation.
- [ ] Run GREEN, navigation tests, frontend suite, and build.
- [ ] Commit: `feat(alerts): add rule management and inbox`.

## Task 5: Extract the verified quote service

- [ ] Write a failing unit contract preserving source order, Stooq fallback, TTL, accepted-packet-only cache, and `INSUFFICIENT_DATA`.
- [ ] Move `quoteCache`, `getCachedQuote`, and `getQuotePacket` from `server.js` without changing success payloads or thresholds.
- [ ] Run verified-quote, price-gate, server, and API tests.
- [ ] Commit: `refactor(quotes): share verified quote service`.

## Task 6: Evaluate rule transitions purely

- [ ] Write table-driven tests for above, below, inclusive zone entry, invalid thresholds, gate failure, `false -> true`, continuously true suppression, and true-to-false reset.
- [ ] Implement `evaluateAlertRule(rule, verifiedPacket, previousState)` returning next state separately from an optional event candidate.
- [ ] Gate failure returns no price event.
- [ ] Run GREEN and commit: `feat(alerts): evaluate explicit rule transitions`.

## Task 7: Add bounded US scheduling and degraded-data state

- [ ] Test with injected clock/repository/quote loader:

```text
disabled => zero work; active US rules only; deduplicated tickers; cap 25
no overlap; 15-minute default; 5-minute hard minimum; stop() clears timer
outside accepted US session => no evaluation
first gate failure => counter 1, no event
second consecutive failure => one data_quality event
continued failure => no duplicate; success => reset counter
false-to-true match => one event; continued match => no duplicate
```

- [ ] Require `SUPABASE_SERVICE_ROLE_KEY`; never fall back to anon.
- [ ] Use recursive `setTimeout`, `America/New_York`, and quote-session metadata.
- [ ] Bound env values: scheduler disabled by default, interval `900000`, maximum 25 tickers.
- [ ] Start only after HTTP listen and stop during graceful shutdown; expose sanitized health only.
- [ ] Run scheduler/server tests and commit: `feat(alerts): schedule verified US rule evaluation`.

## Task 8: Add push subscriptions and explicit permission UI

- [ ] Add additive `push_subscriptions` schema with owner RLS, service-role access, unique endpoint, separate keys, timestamps, and soft delete.
- [ ] After approval, install `web-push@^3.6.7`.
- [ ] Test authenticated subscribe/upsert/unsubscribe, HTTPS endpoint validation, owner isolation, and production-disabled test route.
- [ ] Test permission only after explicit click plus unsupported/denied states.
- [ ] Implement one Settings control; remove obsolete LINE/email toggles from the active UI.
- [ ] Run focused backend/frontend suites and commit: `feat(push): manage explicit subscriptions`.

## Task 9: Deliver redacted, retry-bounded push

- [ ] Test missing VAPID, owner subscriptions, 404/410 removal, secret-safe logging, successful timestamp, and maximum three retries.
- [ ] Assert payload title is ticker and body is only `Price alert triggered` or `Market data unavailable`.
- [ ] Assert payload excludes price, threshold, holdings, verdict, and recommendations.
- [ ] Persist the event before delivery; delivery failure cannot lose or duplicate it.
- [ ] Run push, scheduler, and PWA tests.
- [ ] Commit: `feat(push): deliver redacted alert events`.

## Task 10: Final Slice 3 verification

- [ ] Run `npm test && npm run build && npm run lint`.
- [ ] Run linked Supabase RLS verification only after target confirmation.
- [ ] Verify HTTPS installation and confirm `/api` never enters Cache Storage.
- [ ] Verify desktop/Android installation and iOS 16.4+ Home Screen installation.
- [ ] Exercise above, below, zone, reset/retrigger, two-cycle degradation, duplicate suppression, acknowledgement, and 404/410 subscription cases.
- [ ] Confirm lock-screen content stays redacted and detail requires authentication.
- [ ] Mark Slice 3 complete in the roadmap and append compact evidence to memory.

## Rollback

1. Set `ALERT_SCHEDULER_ENABLED=false` and restart.
2. Remove VAPID configuration to disable delivery while retaining Inbox events.
3. Deploy a worker-unregister build if static precaching regresses loading.
4. Leave additive rule/event/subscription tables in place to preserve audit history.
