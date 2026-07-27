-- Additive baseline required for replaying every later migration from an empty database.
-- This migration intentionally contains no RLS policies or data rewrites; later dated
-- migrations remain responsible for policies, grants, integrity constraints, and triggers.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::TEXT;
$$ LANGUAGE SQL STABLE;

CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT public.requesting_user_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ticker TEXT NOT NULL,
  name TEXT,
  shares NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  sector TEXT,
  notes TEXT,
  source_note TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT public.requesting_user_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ticker TEXT NOT NULL,
  name TEXT,
  sector TEXT,
  setup TEXT,
  alert_price NUMERIC,
  alert_type TEXT DEFAULT 'above',
  ai_signal TEXT DEFAULT 'monitor',
  source_note TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT public.requesting_user_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
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
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_user_ticker
  ON public.holdings(user_id, ticker)
  WHERE is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlists_user_ticker
  ON public.watchlists(user_id, ticker)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON public.journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_ticker ON public.journal(user_id, ticker);
