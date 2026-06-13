import yfinance as yf
import pandas as pd

ticker = "AVGO"
t = yf.Ticker(ticker)
info = t.info
hist = t.history(period="6mo")

if not hist.empty:
    last_price = hist["Close"].iloc[-1]
    vol = hist["Volume"].iloc[-1]
    peg = info.get("pegRatio", "N/A")
    fwd_pe = info.get("forwardPE", "N/A")
    ma50 = hist["Close"].rolling(window=50, min_periods=50).mean().iloc[-1]
    
    # Calculate ATR
    high_low = hist["High"] - hist["Low"]
    high_close = (hist["High"] - hist["Close"].shift()).abs()
    low_close = (hist["Low"] - hist["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = tr.rolling(14, min_periods=1).mean().iloc[-1]
    stop = last_price - (1.5 * atr)
    
    print(f"{ticker}: Last={last_price:.2f}, Vol={vol}")
    print(f"PEG={peg}, FwdPE={fwd_pe}")
    print(f"50MA(approx)={ma50:.2f}, ATR={atr:.2f}, Stop(1.5xATR)={stop:.2f}")
else:
    print(f"{ticker}: No data")
