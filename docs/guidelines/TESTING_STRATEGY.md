---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0004-unbiased-institutional-quality-gates.md
primary_tests: npm run check:all
---

# Testing Strategy

## Goals

- Prevent false `Buy/Add` and mock-data regressions in investment paths
- Lock API contracts and auth fail-closed behavior
- Guard UI architecture (CSS tokens, shell landmarks, data contracts)

## Test levels

### Unit & component (frontend)

- **Runner:** Vitest + React Testing Library
- **Location:** `frontend/tests/`
- **Focus:** Page behavior, hooks, formatters, accessibility landmarks, empty states
- **Contract tests:** `*Contract.test.js` — CSS architecture, auth bypass, production data shape

```bash
npm test --workspace=frontend
npm test --workspace=frontend -- --run tests/endToEndUserFlows.test.jsx
```

### Unit & integration (backend)

- **Runner:** Node built-in test runner (`node --test`)
- **Location:** `backend/tests/`
- **Focus:** Decision engine gates, price gate, RLS/schema contracts, HTTP hardening, preferences/today routes

```bash
npm test --workspace=backend
```

### Analysis tooling

- **Runner:** Invoked via backend subprocess (`tools/market_oracle.py`)
- **Verification:** `backend/tests/deepAnalysisPayload.test.js`, decision engine tests

### End-to-end / browser

- **Runner:** Playwright against real Express and WebSocket routes
- **Providers:** deterministic backend fixtures; never browser-side MSW
- **Accessibility:** axe WCAG 2.1 A/AA checks

### Database

- **Runner:** local Supabase CLI + pgTAP
- **Source:** `supabase/migrations`; `supabase/schema.sql` is reference-only
- **Evidence:** empty replay, RLS user isolation, grants/constraints, direct holdings-write denial, journal trigger

## Workspace gates

| Command                                  | Scope                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `npm test`                               | All workspaces                                                   |
| `npm run check:type`                     | TypeScript 5.9 checkJs across source, tests, scripts, and config |
| `npm run check:property`                 | Financial fail-closed and formatter property tests               |
| `npm run check:database`                 | Empty local Supabase replay and pgTAP                            |
| `npm run check:e2e`                      | Deterministic Express/WebSocket/browser/WCAG assurance           |
| `npm run check:pr`                       | All 11 local Merge Gates, fail-fast                              |
| `npm run check:all --workspace=frontend` | format → lint → architecture → typecheck → vitest → build        |
| `npm run lint --workspace=backend`       | Backend lint when configured                                     |

## TDD expectation (code changes)

Per `AGENTS.md` and `docs/PROJECT_SKILLS_WORKFLOW.md`:

1. Define public behavior to protect
2. Write one failing test (RED)
3. Minimal implementation (GREEN)
4. Refactor with tests green

Investment logic changes **must** add fail-closed tests.

## Coverage

Coverage is an Advisory Check with no enforced percentage target until a stable baseline is reviewed.

## Docs verification

```bash
docs/skills/docs-context-manager/scripts/docs-audit.sh
```

## Verification

```bash
npm run check:all
npm test
```
