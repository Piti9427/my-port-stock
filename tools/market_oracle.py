import yfinance as yf
import pandas as pd
import argparse
import json

def analyze_stock(ticker_symbol):
    try:
        t = yf.Ticker(ticker_symbol)
        info = t.info
        hist = t.history(period="1y")
        
        # Fallback for SET (Thai) stocks if no data
        if hist.empty and "." not in ticker_symbol:
            ticker_symbol = f"{ticker_symbol}.BK"
            t = yf.Ticker(ticker_symbol)
            info = t.info
            hist = t.history(period="1y")

        if hist.empty:
            return {"error": f"No data found for {ticker_symbol}"}
            
        last_price = hist["Close"].iloc[-1]
        
        # Fundamentals
        peg = info.get("pegRatio")
        fwd_pe = info.get("forwardPE")
        
        # Technicals
        ma50 = hist["Close"].rolling(window=50, min_periods=50).mean().iloc[-1]
        ma200 = hist["Close"].rolling(window=200, min_periods=200).mean().iloc[-1] if len(hist) >= 200 else None
        # RSI (14 period)
        delta = hist["Close"].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(com=13, adjust=False).mean()
        avg_loss = loss.ewm(com=13, adjust=False).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        # ATR (14 period)
        high_low = hist["High"] - hist["Low"]
        high_close = (hist["High"] - hist["Close"].shift()).abs()
        low_close = (hist["Low"] - hist["Close"].shift()).abs()
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(14, min_periods=1).mean().iloc[-1]
        
        # SOP specific calculations
        stop_loss = last_price - (1.5 * atr)
        risk_per_share = last_price - stop_loss
        t1_target = last_price + (2 * risk_per_share) # 1:2 R/R
        
        # Gate Checks
        pass_peg = "Pass" if peg is not None and peg < 1.5 else ("Fail" if peg is not None else "N/A")
        price_vs_50ma = "Above" if last_price > ma50 else "Below"
        
        return {
            "ticker": ticker_symbol,
            "last_price": round(last_price, 2),
            "peg_ratio": peg,
            "fwd_pe": fwd_pe,
            "ma50": round(ma50, 2),
            "ma200": round(ma200, 2) if ma200 else "N/A",
            "rsi_14": round(rsi, 2),
            "atr_14": round(atr, 2),
            "stop_loss_1_5x": round(stop_loss, 2),
            "target_t1_1_2_rr": round(t1_target, 2),
            "gates": {
                "peg_gate": pass_peg,
                "trend_50ma": price_vs_50ma
            }
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Market Oracle: Stock SOP Analyzer")
    parser.add_argument("tickers", nargs="+", help="Stock tickers to analyze")
    args = parser.parse_args()
    
    results = {}
    for ticker in args.tickers:
        results[ticker] = analyze_stock(ticker)
        
    print(json.dumps(results, indent=2))
