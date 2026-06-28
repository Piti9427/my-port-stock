-- MyPortStock runtime schema.
-- No sample rows here. Production data is per-user and must be imported from
-- real portfolio/journal sources or entered through the app.

-- 1. Drop redundant and conflicting tables to ensure clean schema generation
-- Warning: This drops existing tables. Personal markdown data must be imported with the owner-only importer.
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.holdings CASCADE;
DROP TABLE IF EXISTS public.watchlists CASCADE;
DROP TABLE IF EXISTS public.journal CASCADE;
DROP TABLE IF EXISTS public.import_batches CASCADE;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- 2. Create a function to extract the Clerk user ID from the JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT;
$$ LANGUAGE SQL STABLE;

REVOKE ALL ON FUNCTION public.requesting_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requesting_user_id() TO authenticated, service_role;

-- 3. Holdings Table
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    shares NUMERIC NOT NULL DEFAULT 0,
    avg_cost NUMERIC NOT NULL DEFAULT 0,
    sector TEXT,
    notes TEXT,
    source_note TEXT,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT holdings_shares_nonnegative_check CHECK (shares >= 0),
    CONSTRAINT holdings_avg_cost_nonnegative_check CHECK (avg_cost >= 0)
);

-- 4. Watchlists Table
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    sector TEXT,
    setup TEXT,
    alert_price NUMERIC,
    alert_type TEXT DEFAULT 'above',
    ai_signal TEXT DEFAULT 'monitor',
    source_note TEXT,
    import_batch_id TEXT,
    source_file TEXT,
    source_section TEXT,
    source_hash TEXT,
    imported_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT watchlists_alert_type_allowed_check CHECK (alert_type IN ('above', 'below'))
);

-- 5. Import Batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    import_batch_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    source_hash TEXT NOT NULL,
    source_files TEXT[] NOT NULL DEFAULT '{}',
    imported_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    inserted_journal INTEGER DEFAULT 0 NOT NULL,
    inserted_watchlists INTEGER DEFAULT 0 NOT NULL
);

ALTER TABLE public.watchlists
    ADD CONSTRAINT watchlists_import_batch_id_fkey
    FOREIGN KEY (import_batch_id)
    REFERENCES public.import_batches(import_batch_id);

-- 6. Journal Table
CREATE TABLE IF NOT EXISTS public.journal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT requesting_user_id(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    type TEXT DEFAULT 'BUY',
    mode TEXT,
    status TEXT DEFAULT 'OPEN',
    shares NUMERIC,
    price NUMERIC,
    entry NUMERIC,
    target NUMERIC,
    stop_loss NUMERIC,
    risk_reward NUMERIC,
    profit NUMERIC,
    notes TEXT,
    source_note TEXT,
    import_batch_id TEXT REFERENCES public.import_batches(import_batch_id),
    source_file TEXT,
    source_section TEXT,
    source_hash TEXT,
    imported_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT journal_type_allowed_check CHECK (type IN ('BUY', 'SELL', 'ADJUST')),
    CONSTRAINT journal_status_allowed_check CHECK (status IN ('OPEN', 'CLOSED'))
);

-- 7. Partial Unique Indexes (ensuring soft-deleted rows don't block adding back tickers)
DROP INDEX IF EXISTS idx_holdings_user_ticker;
DROP INDEX IF EXISTS idx_watchlists_user_ticker;
CREATE UNIQUE INDEX idx_holdings_user_ticker ON public.holdings(user_id, ticker) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_watchlists_user_ticker ON public.watchlists(user_id, ticker) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_journal_user_source_hash ON public.journal(user_id, source_hash) WHERE source_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_watchlists_user_source_hash ON public.watchlists(user_id, source_hash) WHERE source_hash IS NOT NULL AND is_deleted = false;

-- 8. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON public.journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_ticker ON public.journal(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON public.import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_import_batch_id ON public.watchlists(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_import_batch_id ON public.journal(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Users can SELECT their own holdings (read-only for user, updated via trigger)
DROP POLICY IF EXISTS "Users can view their own holdings" ON public.holdings;
CREATE POLICY "Users can view their own holdings"
ON public.holdings FOR SELECT
USING (requesting_user_id() = user_id);

-- Users can manage (ALL) their own watchlists
DROP POLICY IF EXISTS "Users can manage their own watchlists" ON public.watchlists;
CREATE POLICY "Users can manage their own watchlists"
ON public.watchlists FOR ALL
USING (requesting_user_id() = user_id)
WITH CHECK (requesting_user_id() = user_id);

-- Users can manage (ALL) their own journal entries
DROP POLICY IF EXISTS "Users can manage their own journal entries" ON public.journal;
CREATE POLICY "Users can manage their own journal entries"
ON public.journal FOR ALL
USING (requesting_user_id() = user_id)
WITH CHECK (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own import batches" ON public.import_batches;
CREATE POLICY "Users can manage their own import batches"
ON public.import_batches FOR ALL
USING (requesting_user_id() = user_id)
WITH CHECK (requesting_user_id() = user_id);

-- 11. Explicit Data API Grants
REVOKE ALL ON TABLE public.holdings FROM anon, authenticated;
REVOKE ALL ON TABLE public.watchlists FROM anon, authenticated;
REVOKE ALL ON TABLE public.journal FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_batches FROM anon, authenticated;
GRANT SELECT ON TABLE public.holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journal TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holdings, public.watchlists, public.journal, public.import_batches TO service_role;

-- 12. Database Function & Trigger to automatically synchronize holdings from journal entries
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
  -- Determine target user_id and ticker (supporting DELETE/UPDATE as well)
  IF (TG_OP = 'DELETE') THEN
    t_user_id := OLD.user_id;
    t_ticker := OLD.ticker;
  ELSE
    t_user_id := NEW.user_id;
    t_ticker := NEW.ticker;
  END IF;

  -- Replay all non-deleted journal entries for this user & ticker in chronological order
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
      -- If ADJUST transaction contains values, apply them directly
      IF r.shares IS NOT NULL THEN
        current_shares := r.shares;
      END IF;
      IF r.price IS NOT NULL THEN
        current_avg_cost := r.price;
      END IF;
    END IF;
  END LOOP;

  -- Check if holdings entry already exists
  SELECT EXISTS(
    SELECT 1 FROM public.holdings WHERE user_id = t_user_id AND ticker = t_ticker
  ) INTO has_holdings;

  IF has_holdings THEN
    -- Update existing holding
    UPDATE public.holdings
    SET 
      shares = current_shares,
      avg_cost = current_avg_cost,
      is_deleted = (current_shares <= 0),
      updated_at = timezone('utc'::text, now())
    WHERE user_id = t_user_id AND ticker = t_ticker;
  ELSE
    -- Insert new holding (only if shares > 0)
    IF current_shares > 0 THEN
      INSERT INTO public.holdings (user_id, ticker, shares, avg_cost, is_deleted)
      VALUES (t_user_id, t_ticker, current_shares, current_avg_cost, false);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;

REVOKE ALL ON FUNCTION private.recalculate_holdings() FROM PUBLIC;

-- Create Trigger on journal table
DROP TRIGGER IF EXISTS trg_journal_recalculate_holdings ON public.journal;
CREATE TRIGGER trg_journal_recalculate_holdings
AFTER INSERT OR UPDATE OR DELETE ON public.journal
FOR EACH ROW
EXECUTE FUNCTION private.recalculate_holdings();
