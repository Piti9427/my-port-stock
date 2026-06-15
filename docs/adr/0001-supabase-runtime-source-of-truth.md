# ADR 0001: Supabase Is Runtime Source Of Truth

## Status

Accepted

## Context

MyPortStock has markdown portfolio and journal snapshots plus React/Express runtime screens. Several runtime paths previously fell back to mock/sample rows when Supabase or external services were unavailable. For investment workflows, that can create false confidence and false `Buy/Add` behavior.

## Decision

Supabase is the runtime source of truth for user-owned portfolio, journal, watchlist, and operational application data. Markdown files remain historical context sources for dated snapshots, theses, and post-mortems.

Runtime services must fail closed when Supabase, market data, or AI services are unavailable. They must return empty/insufficient-data states instead of sample rows, mock saves, or optimistic investment verdicts.

## Consequences

- Runtime data must be scoped by Clerk `user_id`.
- Seed/sample SQL cannot be used as production data.
- Markdown import is a migration/bootstrap step, not an ongoing runtime fallback.
- UI screens may show empty or insufficient-data states until real Supabase rows exist.
