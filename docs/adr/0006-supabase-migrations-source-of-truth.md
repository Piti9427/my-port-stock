---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0006-supabase-migrations-source-of-truth.md
primary_tests: npm run check:database
---

# ADR 0006: Supabase Migrations Are Executable Database Truth

## Status

Accepted — 2026-07-27

## Context

`supabase/schema.sql` is a destructive snapshot and the prior migration chain assumed base tables already existed. CI therefore could not prove that a clean database was deployable or that RLS and trigger behavior survived replay.

## Decision

`supabase/migrations` is the only executable schema input. An additive baseline dated `20260601000000` creates only objects required by later migrations. Later migrations own RLS, grants, integrity constraints, and trigger evolution. `supabase/schema.sql` remains a human reference snapshot and must not be used by CI or deployment automation.

PR assurance starts a local Supabase stack, resets an empty database, runs every migration, executes pgTAP, and always stops the stack. It removes remote database credentials from the child process and never uses linked-project commands.

Before the baseline is applied outside CI, operators must compare non-production migration history and perform an additive dry run. Production application requires a separately reviewed rollout and rollback plan.

## Consequences

- Empty-database replay failures block merge.
- RLS isolation and holdings-write denial are executable tests, not regex assertions.
- Schema snapshot drift is documentation drift, not migration input.
- Existing linked environments need history reconciliation before receiving the baseline.

## Verification

```bash
npm run check:database
```
