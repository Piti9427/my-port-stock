import yfinance as yf
tickers = ['MSFT', 'GOOGL', 'UNH', 'V']
df = yf.download(tickers, period='3mo', progress=False)
for t in tickers:
    c = df['Close'][t].dropna()
    if len(c) >= 50:
        ma50 = c.rolling(50).mean().iloc[-1]
        last_c = c.iloc[-1]
        print(f"{t}: Close={last_c:.2f}, 50MA={ma50:.2f}, Dist={(last_c-ma50)/ma50*100:.2f}%")
    else:
        print(f"{t}: Not enough data")
