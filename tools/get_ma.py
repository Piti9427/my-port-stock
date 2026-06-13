import yfinance as yf
import pandas as pd

tickers = ["NVDA", "VRT", "MSFT"]
for ticker in tickers:
    t = yf.Ticker(ticker)
    hist = t.history(period="6mo")
    if not hist.empty:
        last_price = hist["Close"].iloc[-1]
        ma50 = hist["Close"].rolling(window=50).mean().iloc[-1]
        ma200 = hist["Close"].rolling(window=200).mean().iloc[-1] if len(hist) >= 200 else "N/A"
        print(f"{ticker}: Last={last_price:.2f}, 50MA={ma50:.2f}, 200MA={ma200}")
