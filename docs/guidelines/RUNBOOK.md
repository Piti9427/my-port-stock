---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0001-supabase-runtime-source-of-truth.md
primary_tests: npm run check:all
---

# Runbook

Operational guide for running and verifying MyPortStock locally.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Supabase project with migrations applied (`supabase/migrations/`)
- Clerk application keys for authenticated flows
- Optional: Python 3 for `tools/market_oracle.py` (analysis subprocess)

## First-time setup

```bash
npm install
```

Copy environment templates and fill values locally (never commit secrets):

- `backend/.env` — server, Supabase, Clerk, optional Finnhub
- `frontend/.env` or `frontend/.env.local` — `VITE_CLERK_PUBLISHABLE_KEY`, API proxy targets

See [ENVIRONMENT.md](ENVIRONMENT.md) for the full variable list.

Apply database migrations via Supabase CLI or dashboard before expecting runtime data.

## Development

Start backend (port **8080** in dev script) and frontend (Vite, proxies `/api` → `8080`):

```bash
npm run dev
```

Workspace-only:

```bash
npm run dev --workspace=backend    # PORT=8080
npm run dev --workspace=frontend # Vite dev server
```

Frontend-only UI bypass (local visual testing, non-production):

```bash
npm run dev:ui --workspace=frontend
```

Requires `DEV_UI_AUTH_BYPASS=true` on backend when using the dev auth token pattern.

## Test & quality gates

```bash
npm test                  # all workspaces
npm run lint              # all workspaces
npm run build             # all workspaces
npm run check:all         # frontend: format, lint, architecture, typecheck, vitest, build
```

Focused examples:

```bash
npm test --workspace=backend
npm test --workspace=frontend -- --run tests/endToEndUserFlows.test.jsx
```

## Docs audit

```bash
docs/skills/docs-context-manager/scripts/docs-audit.sh
docs/skills/docs-context-manager/scripts/docs-audit.sh --strict
```

## Health checks

Backend health (adjust port if needed):

```bash
curl http://127.0.0.1:8080/health
```

Quote gate sample (Tier 2 adapter):

```bash
curl http://127.0.0.1:8080/api/quote/NVDA
```

## Markdown import (bootstrap / migration)

Import historical markdown snapshots into Supabase (dry-run first):

```bash
npm run import:markdown --workspace=backend
npm run import:markdown:write --workspace=backend
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `MARKDOWN_IMPORT_OWNER_USER_ID` — see [ENVIRONMENT.md](ENVIRONMENT.md).

## Troubleshooting

| Symptom | Check |
|---|---|
| Frontend 401 on API | Clerk keys, signed-in state, dev bypass flags |
| Empty portfolio/journal | Supabase RLS + `user_id`; not markdown fallback |
| Quote `INSUFFICIENT_DATA` | Two Tier-2 sources; see `AGENTS.md` price ladder |
| Vite proxy errors | Backend running on `8080`; `frontend/vite.config.js` proxy |
| Clerk middleware warning | `CLERK_SECRET_KEY` missing → dev mock user only |

## Production start

```bash
npm run build
npm start    # backend serves frontend/dist + API
```

Default production port follows `PORT` in `backend/.env` (often `3000`).

## Verification

```bash
npm run dev
curl http://127.0.0.1:8080/health
npm run check:all
docs/skills/docs-context-manager/scripts/docs-audit.sh
```
