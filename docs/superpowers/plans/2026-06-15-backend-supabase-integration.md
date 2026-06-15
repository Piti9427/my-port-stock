# Backend & Supabase Integration Plan
**Date:** 2026-06-15
**Goal:** Implement fully robust, secure, and automated backend data infrastructure as defined in `ADR-0001: Supabase Is Runtime Source Of Truth` and the `/grill-me` decisions.

## 1. Security Architecture (Clerk-to-Supabase JWT & RLS)
**Decision:** Full Row Level Security (RLS) with Clerk-to-Supabase Auth Handshake.
*   **Database:** Enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) on `holdings`, `portfolio`, `watchlists`, and `journal`.
*   **Policies:** Create RLS policies ensuring that users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `user_id = auth.uid()` for `watchlists` and `journal`. For the `holdings` table, users are granted `SELECT` ONLY.
*   **Backend JWT Generation (Manual in Express):** Express will verify the incoming Clerk token, then locally sign a custom JWT using the `SUPABASE_JWT_SECRET`. To prevent JWT leakage across concurrent user requests, Express MUST instantiate a new `createClient` (with the custom JWT injected) per API request.

## 2. Deletion Strategy (Soft Delete)
**Decision:** Soft Delete via `is_deleted` column.
*   **Schema Update:** 
    *   Drop the redundant `portfolio` table entirely (consolidating all aggregated views into `holdings`).
    *   Add `is_deleted BOOLEAN DEFAULT FALSE` to `holdings`, `watchlists`, and `journal`. 
    *   Drop the existing `UNIQUE(user_id, ticker)` constraints and replace them with **Partial Unique Indexes** (`CREATE UNIQUE INDEX idx_watchlists_user_ticker ON watchlists(user_id, ticker) WHERE is_deleted = false;`). This prevents soft-deleted rows from blocking users.
*   **Endpoints & Validation:** Implement new `POST`, `PUT`, and `DELETE` routes in `backend/src/routes/api.js`. Use the **Zod** library to strictly validate all incoming payloads before touching the database (preventing garbage data). `DELETE` routes will set `is_deleted = true` instead of dropping the row.
*   **Query Updates:** Modify all `GET` routes and RLS policies to strictly filter for `is_deleted = false`.

## 3. Data Migration (Auto-import on Login)
**Decision:** Intelligent first-time auto-import from Markdown.
*   **Logic:** Build a mechanism in the Express server to detect when a user signs in. If their `holdings` and `journal` tables are completely empty, trigger an automated import.
*   **Parser:** Use the existing parser in `tools/migration/import-markdown-snapshot.js` to read `stock_portfolio.md` and `trade_journal.md`, injecting the historical snapshot data into Supabase bound to their new `user_id`.

## 4. Portfolio vs Journal Synchronization (Event-Sourced)
**Decision:** Auto-Sync via Database Triggers.
*   **Concept:** The `journal` acts as the source of truth for transactions. The `holdings` table acts as the single aggregated, **strictly Read-Only** view from the user's perspective.
*   **Implementation (Full Recalculation Trigger):** Write Supabase PostgreSQL Triggers (`AFTER INSERT OR UPDATE ON journal`). The trigger MUST be defined as `SECURITY DEFINER` so it has the elevated permissions required to `INSERT` or `UPDATE` the read-only `holdings` table. To guarantee 100% mathematical accuracy and avoid floating-point drift, the trigger will perform a "Full Recalculation": whenever a trade is added, modified, or soft-deleted, it will read all remaining `is_deleted = false` journal entries for that ticker and compute the exact `shares` and `avg_cost` from scratch, then overwrite the `holdings` row.
*   **Manual Edits (Adjustments):** Because `holdings` is read-only, if a user wants to manually correct their `shares` or `avg_cost`, they must submit a special `ADJUST` transaction to the `journal` via the UI. This ensures the Event-Sourced history always perfectly matches the portfolio outcome.
*   **Validation:** Ensure that selling a stock correctly deducts the shares or removes it from active view if shares hit `0`.

---
**Next Steps for Implementation:**
1. Execute schema updates (adding RLS, Policies, and `is_deleted` column).
2. Set up the Clerk-to-Supabase Auth integration.
3. Implement Express endpoints (`POST`, `PUT`, `DELETE`).
4. Write and test PostgreSQL sync triggers.
