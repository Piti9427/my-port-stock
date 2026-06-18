CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT;
$$ LANGUAGE SQL STABLE;

REVOKE ALL ON FUNCTION public.requesting_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requesting_user_id() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.import_batches (
  import_batch_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT public.requesting_user_id(),
  source_hash TEXT NOT NULL,
  source_files TEXT[] NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  inserted_journal INTEGER DEFAULT 0 NOT NULL,
  inserted_watchlists INTEGER DEFAULT 0 NOT NULL
);

ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_section TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_section TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'journal_import_batch_id_fkey'
  ) THEN
    ALTER TABLE public.journal
      ADD CONSTRAINT journal_import_batch_id_fkey
      FOREIGN KEY (import_batch_id)
      REFERENCES public.import_batches(import_batch_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_user_source_hash
  ON public.journal(user_id, source_hash)
  WHERE source_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlists_user_source_hash
  ON public.watchlists(user_id, source_hash)
  WHERE source_hash IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_import_batches_user_id
  ON public.import_batches(user_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own holdings" ON public.holdings;
CREATE POLICY "Users can view their own holdings"
ON public.holdings FOR SELECT
TO authenticated
USING (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own watchlists" ON public.watchlists;
CREATE POLICY "Users can manage their own watchlists"
ON public.watchlists FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own journal entries" ON public.journal;
CREATE POLICY "Users can manage their own journal entries"
ON public.journal FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own import batches" ON public.import_batches;
CREATE POLICY "Users can manage their own import batches"
ON public.import_batches FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

REVOKE ALL ON TABLE public.holdings FROM anon, authenticated;
REVOKE ALL ON TABLE public.watchlists FROM anon, authenticated;
REVOKE ALL ON TABLE public.journal FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_batches FROM anon, authenticated;

GRANT SELECT ON TABLE public.holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journal TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holdings, public.watchlists, public.journal, public.import_batches TO service_role;

DROP FUNCTION IF EXISTS public.recalculate_holdings();
CREATE OR REPLACE FUNCTION private.recalculate_holdings()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  t_user_id TEXT;
  t_ticker TEXT;
  current_shares NUMERIC := 0;
  current_avg_cost NUMERIC := 0;
  has_holdings BOOLEAN := false;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    t_user_id := OLD.user_id;
    t_ticker := OLD.ticker;
  ELSE
    t_user_id := NEW.user_id;
    t_ticker := NEW.ticker;
  END IF;

  FOR r IN
    SELECT type, shares, price, date, created_at
    FROM public.journal
    WHERE user_id = t_user_id AND ticker = t_ticker AND is_deleted = false
    ORDER BY date ASC, created_at ASC
  LOOP
    IF r.type = 'BUY' THEN
      IF (current_shares + r.shares) > 0 THEN
        current_avg_cost := ((current_shares * current_avg_cost) + (r.shares * r.price)) / (current_shares + r.shares);
      ELSE
        current_avg_cost := 0;
      END IF;
      current_shares := current_shares + r.shares;

    ELSIF r.type = 'SELL' THEN
      current_shares := current_shares - r.shares;
      IF current_shares <= 0 THEN
        current_shares := 0;
        current_avg_cost := 0;
      END IF;

    ELSIF r.type = 'ADJUST' THEN
      IF r.shares IS NOT NULL THEN
        current_shares := r.shares;
      END IF;
      IF r.price IS NOT NULL THEN
        current_avg_cost := r.price;
      END IF;
    END IF;
  END LOOP;

  SELECT EXISTS(
    SELECT 1 FROM public.holdings WHERE user_id = t_user_id AND ticker = t_ticker
  ) INTO has_holdings;

  IF has_holdings THEN
    UPDATE public.holdings
    SET
      shares = current_shares,
      avg_cost = current_avg_cost,
      is_deleted = (current_shares <= 0),
      updated_at = timezone('utc'::text, now())
    WHERE user_id = t_user_id AND ticker = t_ticker;
  ELSE
    IF current_shares > 0 THEN
      INSERT INTO public.holdings (user_id, ticker, shares, avg_cost, is_deleted)
      VALUES (t_user_id, t_ticker, current_shares, current_avg_cost, false);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

REVOKE ALL ON FUNCTION private.recalculate_holdings() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_journal_recalculate_holdings ON public.journal;
CREATE TRIGGER trg_journal_recalculate_holdings
AFTER INSERT OR UPDATE OR DELETE ON public.journal
FOR EACH ROW
EXECUTE FUNCTION private.recalculate_holdings();
