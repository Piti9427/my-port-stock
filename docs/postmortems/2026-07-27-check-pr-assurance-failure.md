# Post-mortem: `npm run check:pr` Failed on E2E and Dependency Security

**Date:** 2026-07-27  
**Affected workflow:** Local Enterprise QA & Security Assurance Pipeline  
**Introduced/exposed by:** `cc1e304` (`feat(ci): add enterprise assurance pipeline`)  
**Fixed by:** `9cad9d3beedcbb57a174158f1a92ce0c7e4b7bcb` (`fix(ci): make PR assurance reproducible`)  
**Tracking:** No JIRA ticket or pull request was recorded for this fix.

## Summary

`npm run check:pr` could not complete the required Merge Gates after the enterprise assurance pipeline landed. Deterministic E2E startup used ports that collided with local services, Vite served an outdated optimized React Router dependency after the dependency migration, and the production dependency gate correctly rejected a High-severity React Router advisory already present in the dependency baseline. Commit `9cad9d3` moved E2E to dedicated ports, forced dependency re-optimization, migrated the frontend to the patched unified React Router package, aligned the Node runtime requirement across local and CI environments, and added a regression test for the E2E server contract.

## Symptom

Running:

```bash
npm run check:pr
```

produced three concrete failures during diagnosis:

1. The E2E web server could not bind backend port `8180`, which was already published by the local `mdm-apache-hop` Docker container. Frontend port `4173` also had a transient stale listener during the initial run.
2. After the router dependency migration, Playwright reached a blank frontend page while Vite logged `504 Outdated Optimize Dep` for `react-router.js`.
3. `npm audit --omit=dev --audit-level=high` rejected React Router advisory `GHSA-qwww-vcr4-c8h2`.

The failures prevented the local assurance orchestrator from producing an all-PASS report even though earlier format, lint, typecheck, build, and test gates succeeded.

## Root cause

The failure had three independent mechanisms.

### 1. E2E ports were deterministic but not isolated

The pipeline implementation in `cc1e304` added the root `serve:e2e` script with fixed ports:

- Express backend: `8180`
- Vite frontend: `4173`

`frontend/playwright.config.ts` used `http://127.0.0.1:4173` and correctly set `reuseExistingServer: false`. That prevented Playwright from silently accepting an unrelated process, but it also made the collision fail immediately. Port `8180` was not dedicated to this repository on the development machine; Docker already exposed it for `mdm-apache-hop`.

The pipeline therefore depended on local machine state despite being designed as deterministic, isolated assurance.

### 2. Vite reused an optimized dependency from before the router migration

The dependency remediation changed frontend imports from `react-router-dom` to `react-router`. The existing Vite dependency optimization cache still referenced the prior graph. Starting the E2E dev server without forcing re-optimization made Vite respond with `504 Outdated Optimize Dep` for `react-router.js`.

Express and Playwright were running, but the frontend module graph did not load. Playwright consequently observed blank pages and downstream journey assertions failed.

### 3. The new security gate exposed an incompatible dependency baseline

Before the assurance pipeline, the frontend depended on `react-router-dom` 7.x and no required production audit gate blocked the repository. The new `check:dependencies` command correctly ran:

```bash
npm audit --omit=dev --audit-level=high
```

That command found `GHSA-qwww-vcr4-c8h2` in the installed React Router line. The gate was not flaky and did not need a bypass; the dependency baseline did not satisfy the newly declared Merge Gate.

The patched unified `react-router` 8.3.0 package requires Node `>=22.22.0` and React/ReactDOM `>=19.2.7`. Updating only the router package without aligning those runtime and peer requirements would have replaced the audit failure with an unsupported dependency configuration.

## Why It Produced the Symptom

`scripts/check-pr.js` is intentionally fail-fast. It runs the same root Merge Gate commands used by CI and stops after an owning gate fails.

The port collision prevented Playwright's configured `webServer` from becoming ready. Once the ports were moved, the stale Vite dependency graph allowed the server health check to succeed while application modules still failed to load, so failures moved from server startup to browser assertions. After E2E was repaired, the production dependency audit still returned a non-zero exit code because the High advisory remained.

All three causes had to be resolved for `check:pr` to pass. Changing the ports alone would not repair the blank page or security gate, and weakening the audit threshold would only hide the dependency defect.

## Fix

Commit `9cad9d3` made the following changes:

1. Updated `serve:e2e` in `package.json`:
   - backend port `8180` → `48180`;
   - frontend port `4173` → `43173`;
   - `MPS_BACKEND_URL` now targets `http://127.0.0.1:48180`;
   - Vite starts with `--force --strictPort`.
2. Updated `frontend/playwright.config.ts` to use `http://127.0.0.1:43173` while retaining `reuseExistingServer: false`.
3. Added `frontend/tests/e2ePortContract.test.js`. The test asserts the dedicated backend/frontend ports, backend URL wiring, forced Vite optimization, Playwright URL alignment, and absence of the old ports.
4. Migrated all frontend and test imports from `react-router-dom` to the unified `react-router` package.
5. Upgraded:
   - `react-router` to `8.3.0`;
   - `react` and `react-dom` to `19.2.7`;
   - the declared Node engine and GitHub Actions runtime to `22.22.0` or newer.
6. Updated the root lockfile, developer prerequisites, canonical assurance plan, and project memory entry to match the supported dependency and runtime baseline.

The fix removes the environmental collision, invalidates the stale Vite graph on each deterministic E2E run, and replaces the vulnerable router dependency instead of suppressing the security finding.

## How It Was Found

The reliable reproducer was the root command `npm run check:pr`.

The debugging path was:

1. Followed the fail-fast gate output to the first E2E startup failure.
2. Inspected listeners and Docker port mappings. This confirmed that `8180` belonged to `mdm-apache-hop`, rejecting the hypothesis that Express itself was failing during initialization.
3. Added `frontend/tests/e2ePortContract.test.js` first and confirmed it failed against the original `4173`/`8180` configuration.
4. Moved the ports and reran a focused Journal Playwright scenario. The server then started, but the browser remained blank.
5. Inspected the Playwright trace and Vite console. `504 Outdated Optimize Dep` for `react-router.js` isolated the second mechanism.
6. Added the `--force` expectation to the regression test, observed it fail, then updated `serve:e2e`; the focused scenario and full E2E suite passed.
7. Ran the production audit independently. The React Router advisory reproduced outside the orchestrator, confirming it was a real dependency finding rather than a `check-pr.js` reporting defect.
8. Migrated to the patched router/runtime baseline and reran the audit and full assurance suite.

## Why It Slipped Through

Three coverage gaps aligned:

- The E2E configuration selected fixed ports without checking collision risk against common local services, and no test treated the server command plus Playwright URLs as one contract.
- Unit and build tests did not exercise Vite's persisted optimized-dependency cache after a router package migration. That failure only appeared in a real browser-backed dev-server run.
- The High React Router advisory predated the required dependency-security Merge Gate. Adding the gate correctly converted existing security debt into a blocking failure; the initial pipeline implementation did not first bring the dependency baseline to green.

This was a pipeline readiness gap, not an individual review failure. Each component was locally reasonable, but the end-to-end assurance command had not yet been proven against the actual workstation and dependency baseline.

## Validation

The original reproducer passed on fix commit `9cad9d3beedcbb57a174158f1a92ce0c7e4b7bcb`:

```bash
npm run check:pr
```

The generated `artifacts/reports/pr-check-report.json` recorded `overallResult: "PASS"` with all 11 required Merge Gates passing:

- format, lint, full-repo checkJs, and production build;
- 157 backend Node tests and 181 frontend Vitest tests;
- 1 Python quant test;
- 9 financial property tests;
- 20 Supabase migration/RLS pgTAP tests;
- 11 Playwright E2E/accessibility scenarios;
- Gitleaks over 142 commits with no leaks;
- production dependency audit with no High or Critical finding.

Additional focused validation:

- `frontend/tests/e2ePortContract.test.js`: passed after reproducing RED against both the original port contract and the missing `--force` flag;
- focused Journal E2E scenario: passed;
- full Playwright suite: 11/11 passed;
- `npm audit --omit=dev --audit-level=high`: exited successfully.

Validation covered the local macOS development environment, Node 22.22+, local Supabase containers, and Chromium through Playwright. GitHub-hosted CI had not been rerun or observed as part of this local fix session.

The audit still reports four Moderate transitive findings under `@hono/node-server` / `@modelcontextprotocol/sdk`. They do not violate the current High/Critical production dependency Merge Gate and are not part of this failure.

## Action Items / Follow-ups

None outstanding — the fix includes the regression test, runtime/CI alignment, dependency remediation, and documentation updates required for this class of failure. The next normal workflow step is to push `9cad9d3` and verify the same six-job assurance workflow on GitHub Actions.
