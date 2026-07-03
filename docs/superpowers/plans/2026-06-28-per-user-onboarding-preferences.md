# Slice 1: Per-User Onboarding and Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` task-by-task. Before every code task, use `tdd` or `superpowers:test-driven-development`.

**Goal:** Require each signed-in user to choose a reporting currency and default disclosure level, persist those preferences per Clerk user in Supabase, and make Settings accurately separate account preferences, device-only preferences, and immutable server investment policy.

**Architecture:** Keep the React/Vite and Express modular monolith. Add one owner-scoped `user_preferences` row per Clerk user, expose it only through authenticated Express routes, load it once at the authenticated shell boundary, and share it through a small React context. Supabase remains the durable source of truth; localStorage remains only for harmless device presentation choices. Missing or unavailable Supabase fails closed with a retry state instead of silently creating browser-only account preferences.

**Tech Stack:** React 19, Vite 8, Express 5, Clerk Express, Supabase/Postgres RLS, Zod, Node test runner, Vitest/Testing Library.

**Product spec:** `docs/superpowers/specs/2026-06-28-myportstock-product-platform-design.md`

**Roadmap:** Slice 1 in `docs/superpowers/plans/2026-06-28-product-platform-roadmap.md`

**Current-doc basis:** Supabase RLS guidance recommends owner predicates on every operation, `USING` plus `WITH CHECK` for updates, an index on the owner column, and explicit Data API grants. The April 2026 Supabase change means new tables may not be exposed automatically, so this slice grants only the required authenticated operations explicitly. This repository uses Clerk string IDs through `requesting_user_id()` rather than a UUID foreign key to `auth.users`.

**Status:** Ready for review. Do not implement until this plan is approved.

---

## Scope and invariants

### In scope

- First signed-in visit asks for `THB` or `USD` reporting currency.
- First signed-in visit asks for `beginner` or `advanced` disclosure level.
- Preferences sync across browsers and devices for the same Clerk user.
- Settings allows later edits to both account preferences.
- Beginner mode keeps advanced evidence collapsed behind an explicit control; advanced mode opens it by default.
- Existing harmless interface density and preferred-mode ordering may remain device-local and are labeled as such.
- Existing canonical risk rules are shown as server policy, not editable browser settings.

### Out of scope

- Changing conviction weights, Current Price Acceptance Gate, R/R minimum, stop requirements, speculative cap, or any other investment hard gate.
- Persisting API keys, broker credentials, holdings, or notification subscriptions in preferences.
- PWA, Web Push, alert rules, Today queue, Plans, or Discover behavior.
- Applying or verifying migrations against live Supabase in this slice without explicit target confirmation.
- OCI/nginx deployment verification; it remains a separate pre-deployment gate.

### Preference contract

```json
{
  "reporting_currency": "THB",
  "disclosure_level": "beginner",
  "onboarding_completed": true,
  "updated_at": "2026-06-28T00:00:00.000Z"
}
```

- Allowed currency: `THB | USD`.
- Allowed disclosure: `beginner | advanced`.
- `user_id` is always derived from authenticated Clerk context.
- Absence of a row returns defaults with `onboarding_completed: false`; it does not write until the user confirms.
- A configured-but-unavailable database returns `503`/`INSUFFICIENT_DATA`; it does not fall back to localStorage.
- Updating preferences cannot accept or alter any investment-policy field.

## File map

### Database and backend

- Create through `supabase migration new user_preferences`: `supabase/migrations/<generated>_user_preferences.sql`
- Modify: `backend/supabase_schema.sql`
- Modify: `supabase/schema.sql`
- Modify: `backend/tests/schemaContract.test.js`
- Modify: `backend/tests/verify_schema_rls.sql`
- Create: `backend/src/preferences/preferenceModel.js`
- Create: `backend/src/preferences/preferenceRepository.js`
- Create: `backend/src/routes/preferences.js`
- Modify: `backend/src/routes/api.js`
- Create: `backend/tests/preferencesRoutes.test.js`

### Frontend

- Create: `frontend/src/preferences/preferencesModel.js`
- Create: `frontend/src/preferences/PreferencesContext.jsx`
- Create: `frontend/src/hooks/usePreferences.js`
- Create: `frontend/src/pages/OnboardingPage.jsx`
- Create: `frontend/src/components/preferences/ProgressiveDisclosure.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/ConfigPage.jsx`
- Modify: `frontend/src/components/config/configModel.js`
- Modify: `frontend/src/components/config/ConfigSidebar.jsx`
- Modify: `frontend/src/components/config/ConfigSectionContent.jsx`
- Modify: `frontend/src/pages/CommandCenterPage.jsx`
- Modify: `frontend/tests/configPage.test.jsx`
- Modify: `frontend/tests/commandCenterPage.test.jsx`
- Modify: `frontend/tests/endToEndUserFlows.test.jsx`
- Create: `frontend/tests/onboardingPreferences.test.jsx`
- Create: `frontend/tests/progressiveDisclosure.test.jsx`

### Documentation

- Modify: `docs/superpowers/plans/2026-06-28-product-platform-roadmap.md`
- Modify: `PROJECT_MEMORY_INDEX.md`

---

## Task 0: Pin the baseline and deployment boundary

- [ ] Run `git status --short` and preserve unrelated user changes.
- [ ] Run `npm test && npm run build && npm run lint` and record actual counts.
- [ ] Confirm the work continues in an isolated branch/worktree.
- [ ] Record that the OCI/nginx and live Supabase checks are deferred, not passed.
- [ ] Do not add production dependencies in this slice.

## Task 1: Add the owner-scoped preference schema

### RED

- [ ] Extend `backend/tests/schemaContract.test.js` first. Require an additive migration with:

```text
public.user_preferences
  user_id TEXT PRIMARY KEY DEFAULT requesting_user_id()
  reporting_currency TEXT NOT NULL DEFAULT 'THB'
  disclosure_level TEXT NOT NULL DEFAULT 'beginner'
  onboarding_completed_at TIMESTAMPTZ NULL
  created_at TIMESTAMPTZ NOT NULL
  updated_at TIMESTAMPTZ NOT NULL
```

- [ ] Assert checks restrict currency to `THB|USD` and disclosure to `beginner|advanced`.
- [ ] Assert RLS is enabled and separate `SELECT`, `INSERT`, and `UPDATE` policies target `authenticated`.
- [ ] Assert `UPDATE` has both owner `USING` and `WITH CHECK` predicates using `requesting_user_id()`.
- [ ] Assert explicit grants are limited to `SELECT, INSERT, UPDATE`; `anon` receives none.
- [ ] Assert the migration has no `DROP TABLE`, destructive data rewrite, trigger, or `SECURITY DEFINER` function.
- [ ] Run RED:

```bash
npm test --workspace=backend -- tests/schemaContract.test.js
```

Expected: FAIL because the table and migration do not exist.

### GREEN

- [ ] Run `npx supabase --help` and `npx supabase migration new user_preferences`; use the filename produced by the CLI in the schema contract.
- [ ] Implement the additive table, constraints, RLS policies, and explicit grants.
- [ ] Use the `user_id` primary key as the owner lookup index; do not add a redundant second index.
- [ ] Mirror the final table and policies into both canonical schema snapshots.
- [ ] Extend `backend/tests/verify_schema_rls.sql` with transactional checks proving owner read/write, cross-user invisibility, invalid enum rejection, and user-id reassignment rejection.
- [ ] Run GREEN plus schema regressions.
- [ ] Commit: `feat(db): add per-user experience preferences`.

## Task 2: Add authenticated preference API contracts

### RED

- [ ] Create `backend/tests/preferencesRoutes.test.js` using an isolated router and injected repository.
- [ ] Prove these public behaviors:

```text
GET /api/preferences
  anonymous -> 401
  no row -> 200 defaults + onboarding_completed false
  existing row -> 200 normalized preferences
  unconfigured/unavailable Supabase -> 503 INSUFFICIENT_DATA

PUT /api/preferences
  anonymous -> 401
  valid body -> owner-scoped upsert and normalized result
  unknown key or user_id -> 400
  invalid currency/disclosure -> 400
  database failure -> sanitized terminal error with requestId
```

- [ ] Prove request bodies containing risk-policy fields such as `minRR`, `maxSpeculativePct`, or `minConvictionScore` are rejected by a strict Zod schema.
- [ ] Run RED:

```bash
npm test --workspace=backend -- tests/preferencesRoutes.test.js
```

Expected: FAIL because the route does not exist.

### GREEN

- [ ] Implement `preferenceModel.js` with defaults, strict Zod input, and one response normalizer.
- [ ] Implement `preferenceRepository.js` with `getForUser(userId)` and `upsertForUser(userId, values)` against a scoped Supabase client.
- [ ] Upsert on `user_id`, set `onboarding_completed_at` on first confirmed save, and update `updated_at` server-side.
- [ ] Keep `user_id` out of accepted input and always source it from `getRequestUserId(req)`.
- [ ] Mount the route under `/api/preferences` before the API 404 boundary.
- [ ] Run focused tests, `backend/tests/api.test.js`, and `backend/tests/httpHardening.test.js`.
- [ ] Commit: `feat(api): add authenticated preference endpoint`.

## Task 3: Gate the authenticated shell with first-run onboarding

### RED

- [ ] Create `frontend/tests/onboardingPreferences.test.jsx` and mock only `fetchWithAuth` plus auth state.
- [ ] Prove:
  - loading does not flash the Dashboard or onboarding form;
  - missing preference row opens onboarding with `THB` and `beginner` selected;
  - save sends only `reporting_currency` and `disclosure_level`;
  - successful save opens the normal authenticated shell;
  - returning users skip onboarding;
  - failed save preserves selections and exposes retryable error text;
  - unavailable load shows an explicit service-unavailable retry state, not local defaults;
  - controls are keyboard-operable, labeled, and at least 44px on the 390px layout contract.
- [ ] Run RED:

```bash
npm test --workspace=frontend -- --run tests/onboardingPreferences.test.jsx
```

Expected: FAIL because no preference provider or onboarding gate exists.

### GREEN

- [ ] Add a single `PreferencesContext` at the authenticated workspace boundary; do not fetch preferences separately in each page.
- [ ] Keep `getToken` in a ref or otherwise follow the stable-auth-hook pattern already used by `useApi` to prevent request loops.
- [ ] Expose only `preferences`, `loading`, `error`, `savePreferences`, and `refetch` from `usePreferences`.
- [ ] Render `OnboardingPage` before `AuthenticatedShell` until `onboarding_completed` is true.
- [ ] Preserve form state across failed saves and disable duplicate submissions.
- [ ] Use existing dark-terminal tokens and semantic controls; add no new design dependency.
- [ ] Run GREEN, app-shell navigation tests, and the frontend suite.
- [ ] Commit: `feat(onboarding): collect synced account preferences`.

## Task 4: Make Settings storage boundaries truthful

### RED

- [ ] Update `frontend/tests/configPage.test.jsx` first to prove:
  - General shows account-synced reporting currency and disclosure level;
  - saving General calls the preference API and updates shared context;
  - failed save keeps dirty state and user input;
  - device-only density/mode ordering is labeled and stored locally;
  - localStorage never contains account preferences, API keys, or risk-policy fields;
  - Risk Parameters is read-only server policy with no slider or save action;
  - reset affects device preferences only and does not call the account preference API;
  - Data Management labels Preferences as Supabase-synced and device presentation as localStorage.
- [ ] Run RED:

```bash
npm test --workspace=frontend -- --run tests/configPage.test.jsx
```

Expected: FAIL on the current local-only labels and editable risk sliders.

### GREEN

- [ ] Replace the broad localStorage object with an explicit allowlist for harmless device settings only.
- [ ] Ignore legacy stored risk/account keys on load so old browser state cannot continue to imply policy control.
- [ ] Bind account fields to `usePreferences`; keep unsaved and error behavior section-local.
- [ ] Replace editable risk sliders with a concise read-only summary that points to canonical server policy and states that users may not weaken it.
- [ ] Rename reset copy to `Reset device preferences` and keep account values unchanged.
- [ ] Do not change API key behavior beyond ensuring it is never persisted.
- [ ] Run GREEN and relevant CSS/accessibility contract tests.
- [ ] Commit: `fix(settings): separate account preferences from server policy`.

## Task 5: Apply progressive disclosure to analysis evidence

### RED

- [ ] Create `frontend/tests/progressiveDisclosure.test.jsx` and update `frontend/tests/commandCenterPage.test.jsx`.
- [ ] Prove:
  - beginner default shows Decision Snapshot and core quote/controls without automatically exposing sub-agent/deep-analysis evidence;
  - beginner can open and close advanced evidence explicitly;
  - advanced default renders evidence expanded;
  - the preference changes presentation only and does not alter the analyze request, selected Decision Mode, score, verdict, gate, or risk math;
  - disclosure uses a real button with `aria-expanded` and an associated region.
- [ ] Run RED:

```bash
npm test --workspace=frontend -- --run tests/progressiveDisclosure.test.jsx tests/commandCenterPage.test.jsx
```

Expected: FAIL because Command Center always exposes agent/deep-analysis panels.

### GREEN

- [ ] Implement `ProgressiveDisclosure` as a controlled presentation primitive with `beginner` collapsed and `advanced` expanded initial state.
- [ ] Wrap `AgentResults` and `DeepAnalysisTabs` in Command Center; leave Quote, Intent/Decision Mode, gate state, and Decision Snapshot visible.
- [ ] Do not alter backend analysis payloads or decision logic.
- [ ] Reset disclosure state deterministically when the account preference changes; do not mirror it through an effect if it can be keyed/derived.
- [ ] Run focused tests, Command Center architecture contracts, and frontend suite.
- [ ] Commit: `feat(ui): apply account disclosure preference`.

## Task 6: Complete local verification and handoff

- [ ] Run:

```bash
npm test
npm run build
npm run lint
```

- [ ] Run the migration against a local Supabase instance if available. If not available, report schema-contract verification separately and keep live RLS verification pending.
- [ ] Verify in a browser at desktop and 390px:
  - new-user onboarding;
  - returning-user bypass;
  - Settings account save and device reset;
  - beginner evidence toggle;
  - advanced evidence default;
  - load/save failure and retry;
  - keyboard focus and 200% zoom.
- [ ] Confirm a second mocked user gets `onboarding_completed: false` and no first user's values.
- [ ] Confirm API logs contain request IDs but no preference body, token, or PII.
- [ ] Update the roadmap with actual evidence and append one compact memory entry.
- [ ] Keep OCI/nginx and explicitly confirmed live Supabase verification listed as pending before deployment.

## Deployment order

1. Apply the additive `user_preferences` migration to the explicitly confirmed target.
2. Verify grants, policies, and owner isolation.
3. Deploy backend routes.
4. Deploy frontend onboarding gate.
5. Run one new-user and one returning-user smoke test.

Deploying the frontend before the migration/backend would intentionally fail closed and block the authenticated shell, so this order is mandatory.

## Rollback

1. Roll back the frontend to remove the onboarding gate while leaving stored preferences intact.
2. Roll back the preference route if necessary; the additive table may remain without affecting existing runtime tables.
3. Do not drop `user_preferences` during incident rollback because it contains user-owned state.
4. Existing hard investment gates remain unchanged throughout rollback.
