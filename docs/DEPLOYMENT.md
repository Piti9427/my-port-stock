---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0005-pwa-first-ts-migration-vite-stack.md
primary_tests: npm run build
---

# Deployment

## Environments

| Environment | Branch / trigger | Notes |
|---|---|---|
| Local | developer machine | `npm run dev` — Vite + backend `8080` |
| Production | TBD per host | `npm run build` then `npm start` (Express serves API + `frontend/dist`) |

> Staging/UAT: frontend supports `check:uat` scripts — see `frontend/package.json`.

## Build

```bash
npm install
npm run build              # all workspaces
npm run build:prod --workspace=frontend   # no source maps in bundle
```

Backend expects built assets at `frontend/dist/`.

## Run production locally

```bash
npm run build
npm start
```

Set `PORT` and production Clerk/Supabase keys in `backend/.env`.

## Environment injection

- **Backend:** `backend/.env` — see [ENVIRONMENT.md](ENVIRONMENT.md)
- **Frontend build-time:** `VITE_*` variables baked at build — rebuild after changes
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `CLERK_SECRET_KEY` to the client

## Database

Apply migrations before deploy:

```bash
# Using Supabase CLI (example)
supabase db push
```

Migration files: `supabase/migrations/`.

## Rollback

1. Revert application deploy to previous build artifact
2. If schema migration is backward-compatible, no DB rollback needed
3. If migration is destructive, restore from Supabase backup — avoid destructive migrations without ADR

## PWA / alerts (planned)

Slice 3 PWA and Web Push are specified in [plans/2026-06-28-webapp-pwa-implementation-plan.md](plans/2026-06-28-webapp-pwa-implementation-plan.md) — not required for current Express static deploy.

## Verification

```bash
npm run build
npm start
curl -s http://127.0.0.1:${PORT:-3000}/health
```
