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

- **Preferred:** Targeted CDP scripts under `output/` when Playwright MCP unavailable
- **Not default CI gate:** Full browser E2E unless explicitly added to `check:all`

## Workspace gates

| Command | Scope |
|---|---|
| `npm test` | All workspaces |
| `npm run check:all --workspace=frontend` | format → lint → architecture → typecheck → vitest → build |
| `npm run lint --workspace=backend` | Backend lint when configured |

## TDD expectation (code changes)

Per `AGENTS.md` and `docs/PROJECT_SKILLS_WORKFLOW.md`:

1. Define public behavior to protect
2. Write one failing test (RED)
3. Minimal implementation (GREEN)
4. Refactor with tests green

Investment logic changes **must** add fail-closed tests.

## Coverage

No enforced percentage target. Prefer high-signal contract tests over line coverage.

## Docs verification

```bash
docs/skills/docs-context-manager/scripts/docs-audit.sh
```

## Verification

```bash
npm run check:all
npm test
```
