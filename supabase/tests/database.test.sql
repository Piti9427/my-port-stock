BEGIN;
SELECT plan(18);

SELECT has_table('public', 'holdings', 'holdings exists after empty-database migration replay');
SELECT has_table('public', 'watchlists', 'watchlists exists after empty-database migration replay');
SELECT has_table('public', 'journal', 'journal exists after empty-database migration replay');
SELECT has_table('public', 'import_batches', 'import_batches exists after empty-database migration replay');
SELECT has_table('public', 'user_preferences', 'user_preferences exists after empty-database migration replay');
SELECT has_function('public', 'requesting_user_id', ARRAY[]::text[], 'requesting_user_id exists');
SELECT has_function('private', 'recalculate_holdings', ARRAY[]::text[], 'private holdings trigger function exists');
SELECT has_trigger('public', 'journal', 'trg_journal_recalculate_holdings', 'journal recalculation trigger exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.holdings'::regclass),
  'holdings has RLS enabled'
);
SELECT ok(
  (SELECT count(*) = 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'holdings' AND cmd = 'SELECT'),
  'holdings exposes only its owner-select policy'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.holdings', 'INSERT'),
  'authenticated users cannot write holdings directly'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.journal', 'INSERT'),
  'authenticated users may write journal rows'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_type_allowed_check'),
  'journal type constraint exists'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlists_import_batch_id_fkey'),
  'watchlist import batch foreign key exists'
);

INSERT INTO public.holdings (user_id, ticker, shares, avg_cost)
VALUES ('user_a', 'AAA', 1, 10), ('user_b', 'BBB', 2, 20);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"user_a"}', true);

SELECT results_eq(
  $$ SELECT ticker FROM public.holdings ORDER BY ticker $$,
  $$ VALUES ('AAA'::text) $$,
  'user A cannot read user B holdings'
);

SELECT throws_ok(
  $$ INSERT INTO public.holdings (ticker, shares, avg_cost) VALUES ('DENIED', 1, 1) $$,
  '42501',
  'permission denied for table holdings',
  'direct holdings writes are denied'
);

SELECT throws_ok(
  $$ INSERT INTO public.watchlists (user_id, ticker) VALUES ('user_b', 'CROSS') $$,
  '42501',
  'new row violates row-level security policy for table "watchlists"',
  'RLS rejects cross-user watchlist writes'
);

INSERT INTO public.journal (ticker, type, status, shares, price)
VALUES ('TRIGGER', 'BUY', 'OPEN', 3, 25);

SELECT results_eq(
  $$ SELECT shares FROM public.holdings WHERE ticker = 'TRIGGER' $$,
  $$ VALUES (3::numeric) $$,
  'journal trigger creates holdings without granting direct holdings writes'
);

SELECT * FROM finish();
ROLLBACK;
