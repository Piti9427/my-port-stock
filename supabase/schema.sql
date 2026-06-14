-- Supabase + Clerk Integration Schema

-- 1. Create a function to extract the Clerk user ID from the JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT;
$$ LANGUAGE SQL STABLE;

-- 2. Portfolios Table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  name TEXT NOT NULL,
  total_invested NUMERIC,
  total_cost_basis NUMERIC,
  total_unrealized_pl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own portfolios" 
ON portfolios FOR ALL 
USING (requesting_user_id() = user_id) 
WITH CHECK (requesting_user_id() = user_id);

-- 3. Holdings Table
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  ticker TEXT NOT NULL,
  shares NUMERIC NOT NULL,
  avg_cost NUMERIC NOT NULL,
  snapshot_price NUMERIC,
  snapshot_value NUMERIC,
  pl_percent TEXT,
  verdict TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own holdings" 
ON holdings FOR ALL 
USING (requesting_user_id() = user_id) 
WITH CHECK (requesting_user_id() = user_id);

-- 4. Watchlists Table
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  category TEXT NOT NULL, -- 'tactical', 'quality', 'growth', 'expansion'
  ticker TEXT NOT NULL,
  sector TEXT,
  conditional_entry TEXT,
  risk_line TEXT,
  target_price TEXT,
  hypothesis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own watchlists" 
ON watchlists FOR ALL 
USING (requesting_user_id() = user_id) 
WITH CHECK (requesting_user_id() = user_id);

-- 5. Trades Table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  entry_date DATE,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  target NUMERIC,
  rr_ratio TEXT,
  thesis TEXT,
  status TEXT DEFAULT 'Active', -- 'Active', 'Closed'
  outcome TEXT,
  post_mortem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trades" 
ON trades FOR ALL 
USING (requesting_user_id() = user_id) 
WITH CHECK (requesting_user_id() = user_id);

-- 6. Trade Backlog Table
CREATE TABLE IF NOT EXISTS trade_backlog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  theme TEXT NOT NULL,
  recorded_date DATE,
  tickers TEXT[],
  thesis TEXT,
  required_verification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trade_backlog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trade backlog" 
ON trade_backlog FOR ALL 
USING (requesting_user_id() = user_id) 
WITH CHECK (requesting_user_id() = user_id);
