-- Migration to add columns for institutional risk management: cognitive bias tracking and position age.
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS cognitive_bias TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_cognitive_bias'
  ) THEN
    ALTER TABLE public.journal ADD CONSTRAINT chk_cognitive_bias 
      CHECK (cognitive_bias IN ('None', 'FOMO', 'Loss Aversion', 'Anchoring', 'Herd Behavior', 'Herd Mentality'));
  END IF;
END $$;

ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Update recalculate_holdings to populate opened_at dynamically when position starts
CREATE OR REPLACE FUNCTION private.recalculate_holdings()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  t_user_id TEXT;
  t_ticker TEXT;
  current_shares NUMERIC := 0;
  current_avg_cost NUMERIC := 0;
  first_date TIMESTAMPTZ := NULL;
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
      IF current_shares = 0 THEN
        first_date := r.date;
      END IF;
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
        first_date := NULL;
      END IF;

    ELSIF r.type = 'ADJUST' THEN
      IF current_shares = 0 AND r.shares > 0 THEN
        first_date := r.date;
      END IF;
      IF r.shares IS NOT NULL THEN
        current_shares := r.shares;
      END IF;
      IF r.price IS NOT NULL THEN
        current_avg_cost := r.price;
      END IF;
      IF current_shares <= 0 THEN
        current_shares := 0;
        current_avg_cost := 0;
        first_date := NULL;
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
      opened_at = first_date,
      is_deleted = (current_shares <= 0),
      updated_at = timezone('utc'::text, now())
    WHERE user_id = t_user_id AND ticker = t_ticker;
  ELSE
    IF current_shares > 0 THEN
      INSERT INTO public.holdings (user_id, ticker, shares, avg_cost, opened_at, is_deleted)
      VALUES (t_user_id, t_ticker, current_shares, current_avg_cost, first_date, false);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private;
