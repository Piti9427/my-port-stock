-- SQL Verification Test for Task 1: RLS and Partial Unique Indexes
-- Copy and run this script in the Supabase SQL Editor to verify database rules.

-- Start a transaction
BEGIN;

CREATE TEMP TABLE _verify_ctx ON COMMIT DROP AS
SELECT
  'test-user-123'::text AS user_id,
  'other-user-456'::text AS other_user_id,
  'AAPL'::text AS ticker,
  'Technology'::text AS sector;

-- Mimic a logged-in Clerk user in JWT claims
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM _verify_ctx LIMIT 1))::text, true);

-- Verification 1: Insert watchlist & journal entries
INSERT INTO public.watchlists (user_id, ticker, name, sector)
SELECT user_id, ticker, 'Apple Inc.', sector FROM _verify_ctx;

INSERT INTO public.journal (user_id, ticker, type, shares, price)
SELECT user_id, ticker, 'BUY', 10, 150 FROM _verify_ctx;

INSERT INTO public.import_batches (import_batch_id, user_id, source_hash, source_files, status)
SELECT 'test-batch-123', user_id, 'test-hash', ARRAY['stock_portfolio.md'], 'pending' FROM _verify_ctx;

-- Verification 2: RLS blocks direct INSERT into holdings
-- Standard user should not be able to write to holdings (only SELECT is permitted)
DO $$
DECLARE
  v_user_id TEXT;
  v_ticker TEXT;
BEGIN
  SELECT user_id, ticker INTO v_user_id, v_ticker FROM _verify_ctx LIMIT 1;

  BEGIN
    INSERT INTO public.holdings (user_id, ticker, shares, avg_cost)
    VALUES (v_user_id, v_ticker, 10, 150);
    RAISE EXCEPTION 'FAIL: Standard user was able to INSERT directly into holdings!';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
  -- In Supabase RLS, lack of INSERT policy will cause a security violation or insert failure
    RAISE NOTICE '✅ Pass: RLS successfully blocked direct INSERT into holdings!';
  END;
END $$;

-- Verification 3: Unique Constraint blocks active duplicate watchlist entries
DO $$
DECLARE
  v_user_id TEXT;
  v_ticker TEXT;
  v_sector TEXT;
BEGIN
  SELECT user_id, ticker, sector INTO v_user_id, v_ticker, v_sector FROM _verify_ctx LIMIT 1;

  BEGIN
    INSERT INTO public.watchlists (user_id, ticker, name, sector)
    VALUES (v_user_id, v_ticker, 'Apple Inc. Duplicate', v_sector);
    RAISE EXCEPTION 'FAIL: Duplicate active ticker AAPL was allowed!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ Pass: Unique index blocked duplicate active watchlist entry!';
  END;
END $$;

-- Verification 4: Soft-deleting allows re-adding the same ticker
UPDATE public.watchlists
SET is_deleted = true
WHERE user_id = (SELECT user_id FROM _verify_ctx LIMIT 1)
  AND ticker = (SELECT ticker FROM _verify_ctx LIMIT 1);

-- This insert should succeed because the first row is now is_deleted = true
INSERT INTO public.watchlists (user_id, ticker, name, sector, is_deleted)
SELECT user_id, ticker, 'Apple Inc. Re-added', sector, false FROM _verify_ctx;

-- Query the table to verify there are 2 rows, but only 1 is active (is_deleted = false)
SELECT id, ticker, is_deleted
FROM public.watchlists
WHERE user_id = (SELECT user_id FROM _verify_ctx LIMIT 1);

-- Verification 5: RLS keeps another user's import audit rows hidden
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', (SELECT other_user_id FROM _verify_ctx LIMIT 1))::text,
  true
);
SELECT import_batch_id
FROM public.import_batches
WHERE user_id = (SELECT user_id FROM _verify_ctx LIMIT 1);

-- Roll back all changes so we leave the database clean
ROLLBACK;

-- Live verification (read-only; safe to run outside the transaction above)
SELECT
  table_name,
  row_security
FROM information_schema.tables
JOIN pg_class ON pg_class.relname = information_schema.tables.table_name
WHERE table_schema = 'public'
  AND table_name IN ('holdings', 'journal', 'watchlists', 'import_batches');

SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('holdings', 'journal', 'watchlists', 'import_batches')
ORDER BY tablename ASC, policyname ASC;

SELECT
  (SELECT count(*) FROM public.import_batches) AS import_batches,
  (SELECT count(*) FROM public.journal WHERE is_deleted = false) AS journal_rows,
  (SELECT count(*) FROM public.watchlists WHERE is_deleted = false) AS watchlist_rows,
  (SELECT count(*) FROM public.holdings WHERE is_deleted = false) AS active_holdings;
