# Backend & Supabase Implementation Plan
**Date:** 2026-06-15
**Source Spec:** `docs/superpowers/plans/2026-06-15-backend-supabase-integration.md`

## Overview
This plan breaks down the Backend & Supabase Integration into sequential, verifiable tasks. Each task has been fully implemented and tested.

---

## Task 1: Database Schema & RLS Hardening (Completed)
**Objective:** Update the database structure, apply soft deletes, and lock down security.

**Steps:**
1. [x] **Drop Portfolio:** Run `DROP TABLE IF EXISTS public.portfolio CASCADE;` to remove the redundant table.
2. [x] **Add Soft Deletion:** Add `is_deleted BOOLEAN DEFAULT FALSE` to `holdings`, `watchlists`, and `journal`.
3. [x] **Partial Unique Indexes:** 
   - Drop existing `UNIQUE(user_id, ticker)` constraints on all tables.
   - Create `CREATE UNIQUE INDEX idx_watchlists_user_ticker ON watchlists(user_id, ticker) WHERE is_deleted = false;` (repeat for `holdings`).
4. [x] **Enable RLS:**
   - Run `ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;`
   - Run `ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;`
   - Run `ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;`
5. [x] **Create Policies:**
   - `watchlists` and `journal`: Create `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies where `user_id = requesting_user_id()`.
   - `holdings`: Create `SELECT` policy ONLY where `user_id = requesting_user_id()`.

**Verification:**
- [x] Run SQL tests in `backend/tests/verify_schema_rls.sql` to verify that a standard authenticated user cannot `INSERT` directly into `holdings`.
- [x] Verify you can soft-delete a watchlist ticker and add the same ticker again without Unique Constraint errors.

---

## Task 2: Event-Sourced Trigger for Holdings (Completed)
**Objective:** Automate portfolio aggregation from the trade journal.

**Steps:**
1. [x] **Create Function:** Write a PostgreSQL function `recalculate_holdings()` using `SECURITY DEFINER`.
   - Logic: When triggered, identify the `user_id` and `ticker`.
   - Query all `journal` entries where `user_id = target_uid`, `ticker = target_ticker`, and `is_deleted = false`.
   - Calculate total `shares` and `avg_cost` from scratch.
   - Upsert the result into the `holdings` table. If `shares` reaches 0, you may optionally set `is_deleted = true` on the `holdings` row to hide it.
2. [x] **Attach Trigger:** Create a trigger `AFTER INSERT OR UPDATE ON public.journal FOR EACH ROW EXECUTE FUNCTION recalculate_holdings();`.

**Verification:**
- [x] Insert a `BUY` of 100 shares at $10 into `journal`. Verify `holdings` shows 100 shares at $10.
- [x] Insert a `BUY` of 100 shares at $20 into `journal`. Verify `holdings` shows 200 shares at $15.
- [x] Update the second trade to `is_deleted = true`. Verify `holdings` reverts to 100 shares at $10.

---

## Task 3: Express Backend Security & Validation (Completed)
**Objective:** Secure the Express endpoints and implement strict Zod validation.

**Steps:**
1. [x] **Install Zod & JWT:** `npm install zod jsonwebtoken` in the `backend` folder.
2. [x] **JWT Injection:** 
   - Modify Express middleware or helper to sign a custom JWT payload containing `sub: clerkUserId` using `SUPABASE_JWT_SECRET` (with a dev fallback).
   - Update API routes to instantiate `createClient(url, anon_key, { global: { headers: { Authorization: 'Bearer ' + customJwt } } })` dynamically per-request.
3. [x] **Endpoint Validation:**
   - Define Zod schemas for `POST /api/journal`, `POST /api/watchlists`, etc.
   - Implement `DELETE` routes that execute `UPDATE ... SET is_deleted = true`.
   - Update all `GET` queries in Express to explicitly append `.eq('is_deleted', false)` (implemented in `db.js` and routes).

**Verification:**
- [x] Post invalid data to an endpoint and verify a `400 Bad Request` with Zod error messages is returned.
- [x] Verify JWT correctly enforces RLS by attempting to query another user's data (should return empty).

---

## Task 4: Auto-Migration Logic (Bootstrap) (Completed)
**Objective:** Seamlessly transition the user from Markdown to Supabase on their first login.

**Steps:**
1. [x] **Detect Empty State:** In the `GET /api/holdings` or `GET /api/journal` route, if the returned array is completely empty, trigger the check.
2. [x] **Parse & Import:** 
   - Execute the logic from `tools/migration/import-markdown-snapshot.js` (refactor it into `migrationService.js` to be callable from Express).
   - Parse `stock_portfolio.md` and `trade_journal.md` (and the watchlists).
   - Insert historical data into the `journal` table (using synthetic compensating entries if trade journal history is incomplete to align holdings with portfolio snapshots).
3. [x] **Prevent Re-import:** Ensure the script flags completion or strictly relies on `journal` being empty to prevent duplicate imports.

**Verification:**
- [x] Wipe the `journal` table for your test user.
- [x] Hit the `/api/holdings` endpoint from the frontend.
- [x] Verify that historical markdown data successfully populates both `journal` and `holdings` tables automatically.
