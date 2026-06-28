# MyPortStock Product Platform Delivery Roadmap

> **For agentic workers:** This file coordinates vertical slices. Execute only the currently approved detailed plan with `superpowers:executing-plans`; do not implement later slices directly from this roadmap.

**Goal:** Deliver the approved MyPortStock product platform as independently releasable vertical slices without duplicating completed work or creating stale plans.

**Architecture:** Keep the React/Vite and Express modular monolith. Each slice owns its user outcome, data contract, UI, tests, observability, and rollback. Detailed plans are written just before execution so their file paths and contracts reflect the codebase produced by prior slices.

**Tech Stack:** React 19, Vite 8, Express 5, Clerk, Supabase/Postgres, Zod, Node test runner, Vitest.

**Product spec:** `docs/superpowers/specs/2026-06-28-myportstock-product-platform-design.md`

---

## Planning rule

Do not write detailed plans for all remaining slices at once. A later plan that assumes today's routes, schema, or component boundaries will be wrong after earlier slices change them. At the end of each slice:

1. verify the released behavior;
2. update this roadmap status;
3. inspect the resulting repository;
4. write the next slice's detailed TDD plan;
5. obtain review before implementation.

## Existing work to reuse

| Capability                                                     | Source                                                                                                                  | State                                                      |
| :------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| Per-user Supabase runtime data and RLS                         | `docs/superpowers/plans/2026-06-17-per-user-markdown-runtime-data.md`                                                   | Implemented; preserve                                      |
| Dark-terminal component system, responsive shell, route states | `docs/plans/ux_ui_refactor_plan.md`                                                                                     | Implemented; reuse components and tests                    |
| Verified price packet and hard decision gates                  | `backend/src/gates/priceGate.js`, `backend/src/packets/verifiedDataPacket.js`, `backend/src/decision/decisionEngine.js` | Implemented; do not bypass                                 |
| Command Center / deep analysis                                 | `docs/superpowers/specs/2026-06-16-deep-analysis-sop-design.md`                                                         | Implemented baseline; Slice 4 reshapes workflow            |
| Backend hardening                                              | `docs/superpowers/specs/2026-06-21-backend-hardening-design.md`                                                         | Design only; Gate 0 required                               |
| PWA and verified alerts                                        | `docs/plans/webapp-pwa-implementation-plan.md`                                                                          | Detailed Slice 3 plan revised to the approved product spec |

## Delivery sequence

### Gate 0: Backend production hardening

**Outcome:** The current Express backend has authenticated HTTP/WebSocket boundaries, sanitized errors, bounded caches, basic security middleware, schema constraints, and actionable health telemetry.

**Detailed plan:** `docs/superpowers/plans/2026-06-28-backend-production-hardening.md`

**Exit gate:** Backend suite passes; anonymous protected requests and WebSocket connections are rejected; no raw internal error is returned; caches are bounded; schema migration is additive.

### Slice 1: Per-user onboarding and preferences

**Outcome:** New users choose reporting currency and disclosure level once; preferences sync across devices and Settings no longer claims durable per-user values are browser-only.

**Detailed plan:** Write after Gate 0 against the hardened route/error structure.

**Scope:** UX preferences only. Canonical investment hard gates remain server policy and cannot be weakened by user settings.

### Slice 2: Today and Portfolio Risk

**Outcome:** `/` becomes the deterministic Today queue ordered Protect → Prepare → Opportunity → Learn, with a compact portfolio pulse and direct review actions.

**Detailed plan:** Write after Slice 1.

**Reuse:** Existing Dashboard, Risk, Journal, `DataStamp`, `StatusBadge`, `MetricCard`, loading/error/empty states, and responsive shell.

### Slice 3: PWA and Alert Inbox

**Outcome:** Installable static-only PWA, explicit multiple alert rules per ticker, verified edge-triggered evaluation, Inbox, redacted Web Push, and one degraded-data push after two consecutive quote-verification failures.

**Detailed plan:** `docs/plans/webapp-pwa-implementation-plan.md`

**Dependencies:** Gate 0, Slice 1 identity/preferences, and Slice 2 Inbox/Today integration points.

### Slice 4: Analyze to Plan

**Outcome:** Guided Intent → Verify → Decide → Inspect → Act flow with one verdict-specific action and persisted risk plans.

**Detailed plan:** Write after Slice 3.

**Reuse:** Existing Command Center, verified packet, decision engine, deep-analysis tabs, Scenario Planner, and alert-rule API.

### Slice 5: Discover

**Outcome:** US stock/ETF search, explainable market context, curated screeners, event calendar, and research overview hand ticker/mode/context to Analyze.

**Detailed plan:** Write after Slice 4.

**Constraint:** No infinite news feed, unverified price label, or new paid market-data requirement.

### Slice 6: Journal Learning

**Outcome:** Manual execution confirmation, full decision lifecycle, post-mortem, process mistake tags, and deterministic learning evidence returned to Today.

**Detailed plan:** Write after Slice 5.

**Constraint:** Journal evidence may explain or remind; it cannot invent a hard gate without a separate durable rule decision.

## Cross-slice release gates

Every slice must prove:

- one failing public-behavior test before implementation;
- per-user isolation for new operational data;
- loading, empty, error, stale, unauthorized, and insufficient-data behavior where relevant;
- no new path around the Current Price Acceptance Gate;
- desktop and 390px mobile behavior;
- keyboard/focus/text alternatives and browser zoom;
- structured failure telemetry without secrets or PII;
- an explicit kill switch or rollback path for background behavior;
- full affected test suites and production build pass.

## Roadmap status

| Item                  | Status                                                       |
| :-------------------- | :----------------------------------------------------------- |
| Master product design | Complete — commit `08a0035`                                  |
| Gate 0 detailed plan  | Implemented locally; pending nginx and Supabase verification |
| Slice 1 detailed plan | Pending Gate 0 environment verification                      |
| Slice 2 detailed plan | Pending Slice 1 completion                                   |
| Slice 3 detailed plan | Revised to approved product contract; pending dependencies   |
| Slice 4 detailed plan | Pending Slice 3 completion                                   |
| Slice 5 detailed plan | Pending Slice 4 completion                                   |
| Slice 6 detailed plan | Pending Slice 5 completion                                   |

## Deferred scope

Thai equities, options, crypto, commodities, broker execution, social/community, billing, LINE Messaging API, full TypeScript migration, and horizontal scheduler scaling remain governed by the activation triggers in the master product spec.
