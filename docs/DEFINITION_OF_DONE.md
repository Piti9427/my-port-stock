---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0004-unbiased-institutional-quality-gates.md
primary_tests: npm run check:all
---

# Definition of Done

A change is **done** when all applicable items pass.

## All code changes

- [ ] Scope matches the approved plan or user request — no unrelated edits
- [ ] Tests added or updated for behavior changes (RED → GREEN where applicable)
- [ ] `npm test` passes for affected workspaces
- [ ] No secrets, `.env` values, or PII in committed files
- [ ] Lint/format pass for touched workspaces

## Frontend changes

- [ ] `npm run check:all --workspace=frontend` passes (or equivalent subset documented in PR)
- [ ] UI follows [DESIGN.md](DESIGN.md) — dark terminal, accessible landmarks, anti-slop
- [ ] Empty, loading, and error states are explicit (no fake data)
- [ ] Mobile layout checked for touched routes when UI changes

## Backend / API changes

- [ ] `npm test --workspace=backend` passes
- [ ] Zod validation on new inputs; auth on protected routes
- [ ] Fail-closed for missing Supabase / quote / AI services
- [ ] [API_CONTRACT.md](API_CONTRACT.md) updated if routes or shapes change

## Database changes

- [ ] Migration in `supabase/migrations/` with RLS reviewed
- [ ] Schema contract tests updated (`backend/tests/schemaContract.test.js`)
- [ ] ADR or plan reference when decision is architectural

## Investment logic changes

- [ ] False-buy / gate tests updated (`decisionEngine.test.js`, price gate tests)
- [ ] No bypass of orchestrator data contract
- [ ] `trade_journal.md` reviewed when advising held tickers (human process)

## Documentation changes

- [ ] `docs-audit` exit 0
- [ ] `PROJECT_MEMORY_INDEX.md` entry for durable decisions (3–6 lines)
- [ ] Links use repo-relative paths (no broken `file://` to missing paths)

## Release-ready (optional stricter gate)

- [ ] `docs-audit --strict`
- [ ] Manual Clerk signed-in smoke when auth flows change
- [ ] `CHANGELOG.md` updated for user-visible changes

## Verification

```bash
npm run check:all
npm test
docs/skills/docs-context-manager/scripts/docs-audit.sh
```
