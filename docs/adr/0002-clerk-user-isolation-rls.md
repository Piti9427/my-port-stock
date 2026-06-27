# ADR 0002: Clerk User Isolation and Row Level Security in Supabase

## Status

Accepted

## Context

MyPortStock is migrating user-owned portfolio state, watchlists, and transaction journals from historical markdown files to a multi-tenant Supabase PostgreSQL database. We need to guarantee that:
1. Users can only read and write their own data, preventing cross-tenant leakage.
2. The portfolio holdings state (shares held and average cost per ticker) remains mathematically consistent with the journal transactions, preventing state drifts.
3. Authentication setup remains decoupled and simple without requiring heavy JWKS federation configuration between Clerk and Supabase.

## Decision

1. **Backend Trusted Token Signing (Trusted Intermediary):** The Node.js Express backend validates user requests via Clerk authentication, extracts the `userId`, and signs a short-lived Supabase JWT locally using `SUPABASE_JWT_SECRET` with the subject set to the Clerk `userId`. This scoped Supabase client is then used for database interactions.
2. **Row Level Security (RLS) Enforcement:** Every table (`holdings`, `watchlists`, `journal`, `import_batches`) has RLS enabled with select/all policies ensuring `requesting_user_id() = user_id`.
3. **Database-Level Event-Sourced Holdings:** The `holdings` table is read-only for authenticated users. Instead of writing directly to `holdings`, users insert transactions into the `journal` table. A database trigger (`trg_journal_recalculate_holdings` executing `private.recalculate_holdings()`) automatically replays non-deleted journal entries in chronological order to update the user's holdings state.

## Consequences

- The backend must securely manage the `SUPABASE_JWT_SECRET` environment variable.
- Any manual database changes, markdown imports, or REST API calls consistently trigger holdings recalculation, removing the risk of data drift.
- Modifying calculation logic for portfolio averages requires database migrations (updating the trigger function) instead of Express application redeployments.
- Standard authenticated API queries cannot update `holdings` directly, failing closed on direct manipulation attempts.
