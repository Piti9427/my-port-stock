-- MyPortStock runtime schema.
-- No sample rows here. Production data is per-user and must be imported from
-- real portfolio/journal sources or entered through the app.

-- 1. Drop redundant and conflicting tables to ensure clean schema generation
-- Warning: This drops existing tables. Raw data remains safe in markdown files and will auto-migrate.
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.holdings CASCADE;
DROP TABLE IF EXISTS public.watchlists CASCADE;
DROP TABLE IF EXISTS public.journal CASCADE;

-- 2. Create a function to extract the Clerk user ID from the JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT;
$$ LANGUAGE SQL STABLE;

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
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL
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
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- 5. Journal Table
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
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- 6. Partial Unique Indexes (ensuring soft-deleted rows don't block adding back tickers)
DROP INDEX IF EXISTS idx_holdings_user_ticker;
DROP INDEX IF EXISTS idx_watchlists_user_ticker;
CREATE UNIQUE INDEX idx_holdings_user_ticker ON public.holdings(user_id, ticker) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_watchlists_user_ticker ON public.watchlists(user_id, ticker) WHERE is_deleted = false;

-- 7. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON public.journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_ticker ON public.journal(user_id, ticker);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
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

-- 10. Database Function & Trigger to automatically synchronize holdings from journal entries
CREATE OR REPLACE FUNCTION public.recalculate_holdings()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on journal table
DROP TRIGGER IF EXISTS trg_journal_recalculate_holdings ON public.journal;
CREATE TRIGGER trg_journal_recalculate_holdings
AFTER INSERT OR UPDATE OR DELETE ON public.journal
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_holdings();
