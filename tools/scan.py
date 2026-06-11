import yfinance as yf
import pandas as pd
import numpy as np

tickers = ['VRT', 'ANET', 'CRWD', 'NOW', 'DDOG', 'PLTR', 'NVDA', 'TSM', 'RKLB', 'ASTS', 'V', 'ISRG', 'NET', 'ASML', 'PANW']
print("Fetching data...")

results = []

for ticker in tickers:
    try:
        # Fetch daily and weekly data
        df = yf.download(ticker, period='2y', interval='1d', progress=False)
        if df.empty:
            continue
            
        df_w = yf.download(ticker, period='3y', interval='1wk', progress=False)
        
        # Calculate W1 metrics
        close_w = df_w['Close'].squeeze()
        w1_50_ma = close_w.rolling(window=50).mean()
        w1_20_ema = close_w.ewm(span=20, adjust=False).mean()
        w1_200_ema = close_w.ewm(span=200, adjust=False).mean()
        
        last_close_w = close_w.iloc[-1]
        last_w1_50_ma = w1_50_ma.iloc[-1]
        last_w1_20_ema = w1_20_ema.iloc[-1]
        last_w1_200_ema = w1_200_ema.iloc[-1]
        
        # W1 rules
        w1_pass_200 = last_close_w > last_w1_200_ema
        w1_pass_50 = last_close_w > last_w1_50_ma
        w1_pass_20 = last_close_w > last_w1_20_ema
        w1_slope = (last_w1_20_ema > last_w1_50_ma) and (last_w1_50_ma > last_w1_200_ema)
        
        w1_pass = w1_pass_200 and w1_pass_50 and w1_pass_20 and w1_slope
        
        # Calculate D1 metrics
        close_d = df['Close'].squeeze()
        vol_d = df['Volume'].squeeze()
        d1_20_ema = close_d.ewm(span=20, adjust=False).mean()
        d1_50_ma = close_d.rolling(window=50).mean()
        vol_20_ma = vol_d.rolling(window=20).mean()
        
        last_close_d = float(close_d.iloc[-1])
        last_vol_d = float(vol_d.iloc[-1])
        last_vol_20_ma = float(vol_20_ma.iloc[-1])
        last_d1_20_ema = float(d1_20_ema.iloc[-1])
        last_d1_50_ma = float(d1_50_ma.iloc[-1])
        
        # RSI 14
        delta = close_d.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        last_rsi = float(rsi.iloc[-1])
        
        # Pullback check (within 2% of 20 EMA or 50 MA)
        near_20 = abs(last_close_d - last_d1_20_ema) / last_d1_20_ema < 0.02
        near_50 = abs(last_close_d - last_d1_50_ma) / last_d1_50_ma < 0.02
        pullback = near_20 or near_50
        
        zvr_pass = last_vol_d > (last_vol_20_ma * 1.5)
        rsi_pass = last_rsi < 50
        
        d1_signals = sum([pullback, zvr_pass, rsi_pass])
        
        results.append({
            'Ticker': ticker,
            'Price': round(last_close_d, 2),
            'W1_Pass': w1_pass,
            'D1_Pullback': pullback,
            'D1_RSI': round(last_rsi, 2),
            'D1_ZVR': zvr_pass,
            'D1_Signals': d1_signals
        })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

df_res = pd.DataFrame(results)
print("\n--- SCAN RESULTS ---")
print(df_res.to_string(index=False))
