-- SQL Verification Test for Task 1: RLS and Partial Unique Indexes
-- Copy and run this script in the Supabase SQL Editor to verify database rules.

-- Start a transaction
BEGIN;

-- Mimic a logged-in Clerk user 'test-user-123' in JWT claims
SELECT set_config('request.jwt.claims', '{"sub": "test-user-123"}', true);

-- Verification 1: Insert watchlist & journal entries
INSERT INTO public.watchlists (user_id, ticker, name, sector)
VALUES ('test-user-123', 'AAPL', 'Apple Inc.', 'Technology');

INSERT INTO public.journal (user_id, ticker, type, shares, price)
VALUES ('test-user-123', 'AAPL', 'BUY', 10, 150.0);

-- Verification 2: RLS blocks direct INSERT into holdings
-- Standard user should not be able to write to holdings (only SELECT is permitted)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.holdings (user_id, ticker, shares, avg_cost)
    VALUES ('test-user-123', 'AAPL', 10, 150.0);
    RAISE EXCEPTION 'FAIL: Standard user was able to INSERT directly into holdings!';
  EXCEPTION WHEN insufficient_privilege OR security_barrier_violation OR numeric_value_out_of_range THEN
    -- In Supabase RLS, lack of INSERT policy will cause a security violation or insert failure
    RAISE NOTICE '✅ Pass: RLS successfully blocked direct INSERT into holdings!';
  END;
END $$;

-- Verification 3: Unique Constraint blocks active duplicate watchlist entries
DO $$
BEGIN
  BEGIN
    INSERT INTO public.watchlists (user_id, ticker, name, sector)
    VALUES ('test-user-123', 'AAPL', 'Apple Inc. Duplicate', 'Technology');
    RAISE EXCEPTION 'FAIL: Duplicate active ticker AAPL was allowed!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ Pass: Unique index blocked duplicate active watchlist entry!';
  END;
END $$;

-- Verification 4: Soft-deleting allows re-adding the same ticker
UPDATE public.watchlists 
SET is_deleted = true 
WHERE user_id = 'test-user-123' AND ticker = 'AAPL';

-- This insert should succeed because the first row is now is_deleted = true
INSERT INTO public.watchlists (user_id, ticker, name, sector, is_deleted)
VALUES ('test-user-123', 'AAPL', 'Apple Inc. Re-added', 'Technology', false);

-- Query the table to verify there are 2 rows, but only 1 is active (is_deleted = false)
SELECT id, ticker, is_deleted FROM public.watchlists WHERE user_id = 'test-user-123';

-- Roll back all changes so we leave the database clean
ROLLBACK;
