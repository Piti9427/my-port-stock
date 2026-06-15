-- MyPortStock runtime schema.
-- No sample rows here. Production data is per-user and must be imported from
-- real portfolio/journal sources or entered through the app.

CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    shares NUMERIC NOT NULL DEFAULT 0,
    avg_cost NUMERIC NOT NULL DEFAULT 0,
    sector TEXT,
    notes TEXT,
    source_note TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    shares NUMERIC NOT NULL DEFAULT 0,
    avg_cost NUMERIC NOT NULL DEFAULT 0,
    sector TEXT,
    notes TEXT,
    source_note TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
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
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS public.journal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMPTZ,
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
    source_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON public.journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_ticker ON public.journal(user_id, ticker);
