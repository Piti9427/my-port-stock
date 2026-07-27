---
status: Completed
audience: Human Developer & AI Agent
associated_adr: ../adr/0006-supabase-migrations-source-of-truth.md
primary_tests: npm run check:pr
---

# Enterprise QA & Security Assurance Pipeline

> **Status:** APPROVED FOR IMPLEMENTATION
>
> **Approved:** 2026-07-27
> **Canonical terms:** Merge Gate · Advisory Check · Scheduled Assurance · Break-Glass Merge

## Purpose

MyPortStock uses an assurance-driven pipeline rather than a tool-counting pipeline. A Merge Gate blocks changes when its required evidence is absent. An Advisory Check records evidence without blocking while its baseline is stabilized. Scheduled Assurance runs bounded checks that are too expensive or noisy for every pull request.

## Merge Gates

|   # | Merge Gate                          | Required evidence                                                                    |
| --: | ----------------------------------- | ------------------------------------------------------------------------------------ |
|   1 | Format                              | Prettier check exits successfully without rewriting                                  |
|   2 | Lint                                | Frontend and backend ESLint pass                                                     |
|   3 | Full-repo JavaScript typecheck      | TypeScript 5.9 `allowJs + checkJs + noEmit`; zero diagnostics                        |
|   4 | Production build                    | All workspaces build from a clean install                                            |
|   5 | Node tests                          | Backend Node tests and frontend Vitest tests pass                                    |
|   6 | Python quant tests                  | Tests run with `requirements-ci.txt`                                                 |
|   7 | Financial property tests            | Fail-closed and false-`Buy/Add` invariants pass with reproducible fast-check seeds   |
|   8 | Supabase migration and RLS          | Empty local database applies all migrations and passes pgTAP                         |
|   9 | Deterministic E2E and accessibility | Real Express routes, frontend, WebSocket upgrade, and test providers work end-to-end |
|  10 | Secret scan                         | Gitleaks finds no unapproved secret in PR history                                    |
|  11 | Production dependency security      | `npm audit --omit=dev` reports no high/critical production vulnerability             |

CodeQL and coverage are Advisory Checks. HTTP/WebSocket load testing is Scheduled Assurance.

## CI topology

Pull requests and pushes to `main` and `develop` run six parallel Merge-Gate jobs: `quality`, `tests`, `database`, `e2e`, `secrets`, and `dependency-security`. A non-gating aggregation job uploads `pr-check-report.json` after all six finish. Jobs use concurrency cancellation, explicit timeouts, Node 22.22, Python 3.12, least-privilege permissions, immutable Action SHAs, and no production credentials.

Branch protection must require the six Merge-Gate jobs, an up-to-date branch, and resolved review conversations.

## Implementation contract

### Type safety and local workflow

- Root TypeScript is pinned to 5.9. Frontend, backend, tests, scripts, and Vite/Playwright configuration use separate checkJs configurations.
- `allowJs`, `checkJs`, `noEmit`, and `skipLibCheck` are enabled. Strict mode remains deferred.
- Existing diagnostics are fixed through real props, state types, environment declarations, and JSDoc. Blanket `@ts-nocheck` and pass-only `any` casts are forbidden.
- Pre-commit runs staged Prettier, ESLint, and redacted staged Gitleaks.
- Pre-push runs format, lint, checkJs, unit tests, and property tests.
- `npm run check:pr` remains the local fail-fast orchestrator for all 11 Merge Gates.

### Supabase source of truth

- `supabase/migrations` is executable database truth. `supabase/schema.sql` is a reference snapshot and is never CI input.
- `20260601000000_runtime_base_tables.sql` is the additive baseline required by later migrations. It creates no later policy, rewrites no row, and drops no object.
- CI runs only local `supabase start`, `supabase db reset --local`, and `supabase test db --local`, with cleanup in `finally`.
- pgTAP verifies empty replay, RLS isolation, direct holdings-write denial, grants, constraints, policies, and trigger behavior.
- Applying the baseline to any linked non-production project requires an explicit migration-history comparison and additive dry run. PR CI never connects to a linked or production project.

### Deterministic providers and tests

- fast-check covers the public decision engine and formatter interfaces and prints seed/replay paths on failure.
- Missing/non-finite prices, conflicting quotes, failed price gates, insufficient metrics, invalid R/R, and exceeded hard-risk budgets can never return `Buy` or `Add`.
- Test providers cover quote sources, market oracle, Gemini analysis, and runtime data.
- Fixtures require both `MPS_TEST_MODE=1` and `NODE_ENV=test`; startup rejects unsafe test-mode combinations.
- MSW is limited to frontend Vitest request-boundary tests. Playwright uses real Express routes and the real WebSocket upgrade.
- The deterministic matrix covers valid quotes/decision output, conflicts, provider failure, accepted/rejected WebSocket tickets, per-user isolation, main journeys, and WCAG checks.

### Security and supply chain

- Gitleaks is the only secret scanner. `.gitleaks.toml` extends default rules and contains no broad allowlist.
- High/critical production dependency findings block. Development dependency findings are advisory.
- CodeQL JavaScript/TypeScript stays advisory until a reviewed clean baseline promotes it.
- Dependabot updates npm and GitHub Actions weekly.
- Workflows use full Action commit SHAs and never execute untrusted code through `pull_request_target`.
- Merge Gates have no normal bypass. Break-Glass Merge requires two approvers, a linked incident/issue, and remediation within 24 hours.

### Reports and artifacts

- Local `check-pr.js` records commit SHA, assurance class, required/advisory status, command, duration, result, and a non-sensitive failure summary.
- CI always aggregates and uploads the PR check report.
- Playwright traces/report, coverage, and test outputs are retained as evidence. Playwright reports live under `artifacts/reports/playwright`.
- Coverage has no blocking percentage until a stable baseline is reviewed.

## Scheduled Assurance

Nightly and `workflow_dispatch` load assurance targets loopback fixture services only. It permits one ticker, zero external provider calls, zero retries, at most 50 HTTP clients, 100 WebSocket clients, 60 seconds per scenario, and a five-minute workflow timeout.

It records p50/p95/p99 latency, throughput, errors/non-2xx, WebSocket connection success, RSS growth, and event-delivery correctness. Blocking thresholds require three stable baseline runs and a separate reviewed decision.

## Acceptance

- Deliberate format, lint, type, secret, dependency, migration, RLS, property, and E2E failures fail their owning Merge Gate.
- A clean checkout with the root lockfile, Node 22.22 or newer, Python 3.12, Docker, Gitleaks, and browser prerequisites reproduces required jobs.
- Required PR wall time remains below ten minutes through parallel execution.
- Logs and artifacts contain no credentials or sensitive runtime rows.
- Production/linked Supabase, Yahoo, and Gemini are unreachable from deterministic jobs by construction.

## Verification

```bash
npm run check:format
npm run check:type
npm run check:unit
npm run check:property
npm run check:database
npm run check:e2e
npm run check:pr
```
