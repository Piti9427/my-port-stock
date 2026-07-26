# Contributing Guide

## Branch Strategy

- **`main`** — stable; deployable
- **Feature branches** — `feat/short-description`, `fix/short-description`, `docs/short-description`
- Keep branches short-lived; rebase or merge from `main` frequently

## Commit Message Convention

[Conventional Commits](https://www.conventionalcommits.org/) preferred:

```text
feat(frontend): add today page empty state
fix(backend): fail closed when quote gate misses
docs(runbook): document dev ports
test(decision): block false buy when Z-Score in distress
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`.

## Pull Request Process

1. Branch from updated `main`
2. Implement with tests per [docs/DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md)
3. Run `npm run check:all` and `npm test` for affected workspaces
4. Run `docs/skills/docs-context-manager/scripts/docs-audit.sh` if docs changed
5. Open PR with: summary, test evidence, screenshots for UI changes
6. Address review; no force-push to `main`

## Code Review Checklist

- [ ] Behavior matches plan/ADR; no scope creep
- [ ] Tests cover fail-closed paths for investment/API changes
- [ ] No secrets or PII in diff
- [ ] Auth + RLS implications reviewed for data changes
- [ ] UI follows `docs/DESIGN.md` when touching frontend
- [ ] `PROJECT_MEMORY_INDEX.md` updated for durable decisions

## Verification

```bash
npm run check:all
npm test
docs/skills/docs-context-manager/scripts/docs-audit.sh
```
