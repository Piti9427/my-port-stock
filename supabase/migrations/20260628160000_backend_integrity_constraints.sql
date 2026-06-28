DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_type_allowed_check'
      AND conrelid = 'public.journal'::regclass
  ) THEN
    ALTER TABLE public.journal
      ADD CONSTRAINT journal_type_allowed_check
      CHECK (type IN ('BUY', 'SELL', 'ADJUST'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_status_allowed_check'
      AND conrelid = 'public.journal'::regclass
  ) THEN
    ALTER TABLE public.journal
      ADD CONSTRAINT journal_status_allowed_check
      CHECK (status IN ('OPEN', 'CLOSED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'holdings_shares_nonnegative_check'
      AND conrelid = 'public.holdings'::regclass
  ) THEN
    ALTER TABLE public.holdings
      ADD CONSTRAINT holdings_shares_nonnegative_check
      CHECK (shares >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'holdings_avg_cost_nonnegative_check'
      AND conrelid = 'public.holdings'::regclass
  ) THEN
    ALTER TABLE public.holdings
      ADD CONSTRAINT holdings_avg_cost_nonnegative_check
      CHECK (avg_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'watchlists_alert_type_allowed_check'
      AND conrelid = 'public.watchlists'::regclass
  ) THEN
    ALTER TABLE public.watchlists
      ADD CONSTRAINT watchlists_alert_type_allowed_check
      CHECK (alert_type IN ('above', 'below'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.watchlists AS watchlist
    WHERE watchlist.import_batch_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.import_batches AS batch
        WHERE batch.import_batch_id = watchlist.import_batch_id
      )
  ) THEN
    RAISE EXCEPTION 'Cannot add watchlists import batch foreign key: orphaned import_batch_id values exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'watchlists_import_batch_id_fkey'
      AND conrelid = 'public.watchlists'::regclass
  ) THEN
    ALTER TABLE public.watchlists
      ADD CONSTRAINT watchlists_import_batch_id_fkey
      FOREIGN KEY (import_batch_id)
      REFERENCES public.import_batches(import_batch_id);
  END IF;
END $$;
