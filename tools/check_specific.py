import yfinance as yf
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

tickers = ['AVGO', 'ASTS', 'PLTR', 'RKLB', 'CEG', 'NOW', 'IONQ']
res = []

try:
    df = yf.download(tickers, period='1y', progress=False)
    if 'Close' in df.columns.names or 'Price' in df.columns.names or isinstance(df.columns, pd.MultiIndex):
        closes = df['Close']
    else:
        closes = df
except Exception as e:
    print(f"Error: {e}")
    exit(1)

for t in tickers:
    try:
        if t not in closes.columns: continue
        c = closes[t].dropna()
        if len(c) < 50:
            continue
        price = float(c.iloc[-1])
        ma50 = float(c.rolling(50).mean().iloc[-1])
        ma20 = float(c.rolling(20).mean().iloc[-1])
        dist_50ma = (price - ma50)/ma50 * 100
        dist_20ma = (price - ma20)/ma20 * 100
        
        info = yf.Ticker(t).info
        peg = info.get('pegRatio')
        fcf = info.get('freeCashflow')
        
        res.append({
            'Ticker': t, 
            'Price': round(price, 2), 
            'Dist_50MA(%)': round(dist_50ma, 2),
            'Dist_20MA(%)': round(dist_20ma, 2),
            'PEG': peg, 
            'FCF': fcf
        })
    except Exception as e:
        print(t, e)

print(pd.DataFrame(res).to_string(index=False))
