---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0004-unbiased-institutional-quality-gates.md
primary_tests: npm run lint
---

# Coding Rules

Shared conventions for MyPortStock. Investment-specific gates remain in `AGENTS.md` / `ELITE_INVESTOR_SOP.md`.

## General

- Match existing style in the file you edit; avoid drive-by refactors
- Prefer small vertical slices with tests
- Never commit secrets, PII, or live API keys
- Use `TIMESTAMPTZ` for Postgres timestamps

## Frontend (`frontend/`)

- **Modules:** ES modules (`import` / `export`)
- **React 19:** Functional components; Clerk `<Show when="signed-in">` pattern (not deprecated `<SignedIn>`)
- **Styling:** CSS variables from `tokens.css`; follow [DESIGN.md](DESIGN.md) — no ad-hoc glassmorphism/glow
- **Components:** Shared UI under `components/ui/`; page composition in `pages/`
- **Data:** Authenticated hooks only; show stale/insufficient-data states explicitly
- **Lint:** ESLint + Prettier; `lint-staged` on commit

## Backend (`backend/`)

- **Modules:** CommonJS (`require`)
- **Validation:** Zod at route boundaries; ticker regex `^[A-Za-z0-9.-]{1,10}$`
- **Subprocess:** `execFile` / `spawn` only — **never** `exec` with string interpolation
- **Auth:** `getRequestUserId` from `requestAuth.js`; fail closed in production
- **Errors:** Central `errorHandler`; no stack traces to clients in production

## Investment / market data

- Orchestrator owns current price verification
- Sub-agents receive packets only — no independent web price lookups
- Distinguish `Last Price` vs analyst targets / fair value in all UI copy

## Documentation

- Plans/handoffs: `YYYY-MM-DD-kebab-case-description.md`
- ADRs: `NNNN-title.md`
- `docs/` files: YAML frontmatter per [FILE_ORGANIZATION.md](FILE_ORGANIZATION.md)
- Run `docs-audit` before closing doc tasks

## Verification

```bash
npm run lint
npm run format:check --workspace=frontend
docs/skills/docs-context-manager/scripts/docs-audit.sh
```
