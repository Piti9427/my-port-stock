-- ตารางสำหรับเก็บพอร์ตหุ้น (Portfolio)
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    shares NUMERIC NOT NULL DEFAULT 0,
    avg_cost NUMERIC NOT NULL DEFAULT 0
);

-- ตารางสำหรับเก็บบันทึกการเทรด (Journal)
CREATE TABLE IF NOT EXISTS public.journal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TEXT,
    ticker TEXT NOT NULL,
    type TEXT DEFAULT 'BUY', -- 'BUY' or 'SELL'
    mode TEXT,               -- 'Quick Trade', 'Swing Trade', 'Core', etc.
    status TEXT DEFAULT 'OPEN', -- 'OPEN' or 'CLOSED'
    shares NUMERIC,
    price NUMERIC,           -- Executed price
    entry NUMERIC,           -- Planned entry
    target NUMERIC,
    stop_loss NUMERIC,
    risk_reward NUMERIC,
    profit NUMERIC
);

-- ใส่ข้อมูลตัวอย่าง (Mock Data) ลงในตารางเพื่อทดสอบหน้า UI
INSERT INTO public.portfolio (ticker, name, shares, avg_cost)
VALUES 
    ('AAPL', 'Apple Inc.', 100, 200.50),
    ('NVDA', 'NVIDIA Corp.', 50, 110.25),
    ('PTT.BK', 'PTT PCL', 1000, 33.50);

INSERT INTO public.journal (ticker, type, mode, status, shares, price, profit)
VALUES 
    ('AAPL', 'BUY', 'Swing Trade', 'OPEN', 50, 210.50, NULL),
    ('TSLA', 'SELL', 'Quick Trade', 'CLOSED', 100, 185.20, 450),
    ('NVDA', 'BUY', 'Long-Term/Core', 'OPEN', 20, 115.00, NULL),
    ('PTT.BK', 'BUY', 'Swing Trade', 'OPEN', 1000, 33.50, NULL);
