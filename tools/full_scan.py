import yfinance as yf
import pandas as pd
import re
import warnings
warnings.filterwarnings('ignore')

with open('/Users/nopparuj/my-agents/MyPortStock/stock_portfolio.md', 'r') as f:
    text = f.read()

tickers = list({m.group(1) for m in re.finditer(r'\$([A-Z]+)', text)})
print(f"Found {len(tickers)} unique tickers. Scanning...")

results = []
try:
    df_prices = yf.download(tickers, period='3mo', progress=False)
    if 'Close' in df_prices.columns.names or 'Price' in df_prices.columns.names or isinstance(df_prices.columns, pd.MultiIndex):
        closes = df_prices['Close']
    else:
        closes = df_prices
except Exception as e:
    print(f"Download error: {e}")
    exit(1)

valid_tickers = [t for t in tickers if t in closes.columns]

for t in valid_tickers:
    try:
        c = closes[t].dropna()
        if len(c) < 50:
            continue
        
        last_price = float(c.iloc[-1])
        ma50 = float(c.rolling(50).mean().iloc[-1])
        dist_50ma = (last_price - ma50) / ma50 * 100
        
        # Only interested in pullback zone -4% to +4%
        if -4 <= dist_50ma <= 4:
            info = yf.Ticker(t).info
            peg = info.get('pegRatio')
            fcf = info.get('freeCashflow')
            fwd_pe = info.get('forwardPE')
            
            # Additional RSI calculation for 14 days
            delta = c.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = float((100 - (100 / (1 + rs))).iloc[-1])
            
            results.append({
                'Ticker': t,
                'Price': round(last_price, 2),
                'Dist_50MA(%)': round(dist_50ma, 2),
                'RSI': round(rsi, 2),
                'PEG': peg,
                'FCF_Positive': 'Yes' if fcf and fcf > 0 else ('No' if fcf else 'N/A'),
                'Fwd_PE': round(fwd_pe, 2) if fwd_pe else None
            })
    except Exception as e:
        pass

if len(results) > 0:
    results_df = pd.DataFrame(results)
    # Sort by distance to 50MA
    results_df.sort_values(by='Dist_50MA(%)', inplace=True)
    print(results_df.to_string(index=False))
else:
    print("No tickers found in the exact pullback zone (-4% to +4% of 50MA).")
