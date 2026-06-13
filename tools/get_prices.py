import yfinance as yf

tickers = ["NVDA", "AMZN", "MSFT", "GOOGL", "VRT", "CRWD", "NOW", "PANW"]
for ticker in tickers:
    t = yf.Ticker(ticker)
    info = t.info
    hist = t.history(period="5d")
    if not hist.empty:
        last_price = hist["Close"].iloc[-1]
        vol = hist["Volume"].iloc[-1]
        peg = info.get("pegRatio", "N/A")
        fwd_pe = info.get("forwardPE", "N/A")
        print(f"{ticker}: Last={last_price:.2f}, Vol={vol}, PEG={peg}, FwdPE={fwd_pe}")
    else:
        print(f"{ticker}: No data")
