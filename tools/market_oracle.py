import yfinance as yf
import pandas as pd
import argparse
import json

def clean_number(value, digits=2):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None

def statement_value(frame, column, aliases):
    if frame is None or frame.empty or column is None:
        return None
    for alias in aliases:
        if alias in frame.index:
            return clean_number(frame.at[alias, column])
    return None

def latest_column(frame):
    if frame is None or frame.empty or len(frame.columns) == 0:
        return None
    return sorted(frame.columns, reverse=True)[0]

def calculate_rsi(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    value = 100 - (100 / (1 + rs)).iloc[-1]
    return clean_number(value)

def calculate_atr(history, period=14):
    high_low = history["High"] - history["Low"]
    high_close = (history["High"] - history["Close"].shift()).abs()
    low_close = (history["Low"] - history["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return clean_number(tr.rolling(period, min_periods=1).mean().iloc[-1])

def calculate_macd_state(close):
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    if macd.iloc[-1] > signal.iloc[-1]:
        return "bullish"
    if macd.iloc[-1] < signal.iloc[-1]:
        return "bearish"
    return "neutral"

def build_financials(ticker):
    income = getattr(ticker, "quarterly_financials", None)
    if income is None or income.empty:
        income = getattr(ticker, "quarterly_income_stmt", None)
    cashflow = getattr(ticker, "quarterly_cashflow", None)

    if income is None or income.empty:
        return []

    rows = []
    for column in sorted(income.columns, reverse=True)[:4]:
        revenue = statement_value(income, column, ["Total Revenue", "Revenue"])
        net_income = statement_value(income, column, ["Net Income", "Net Income Common Stockholders"])
        operating_cash_flow = statement_value(
            cashflow,
            column,
            ["Operating Cash Flow", "Total Cash From Operating Activities"],
        )
        capital_expenditure = statement_value(
            cashflow,
            column,
            ["Capital Expenditure", "Capital Expenditures", "Capital Expenditure Reported"],
        )
        free_cash_flow = None
        if operating_cash_flow is not None and capital_expenditure is not None:
            free_cash_flow = clean_number(operating_cash_flow + capital_expenditure)

        fcf_margin = None
        if revenue not in (None, 0) and free_cash_flow is not None:
            fcf_margin = clean_number(free_cash_flow / revenue, 4)

        rows.append(
            {
                "date": column.date().isoformat() if hasattr(column, "date") else str(column),
                "revenue": revenue,
                "net_income": net_income,
                "operating_cash_flow": operating_cash_flow,
                "capital_expenditure": capital_expenditure,
                "free_cash_flow": free_cash_flow,
                "fcf_margin": fcf_margin,
            }
        )
    return rows

def build_balance_sheet(ticker):
    balance = getattr(ticker, "balance_sheet", None)
    if balance is None or balance.empty:
        balance = getattr(ticker, "quarterly_balance_sheet", None)
    column = latest_column(balance)

    cash = statement_value(
        balance,
        column,
        [
            "Cash And Cash Equivalents",
            "Cash Cash Equivalents And Short Term Investments",
            "Cash And Short Term Investments",
        ],
    )
    total_debt = statement_value(balance, column, ["Total Debt", "Long Term Debt"])
    equity = statement_value(
        balance,
        column,
        ["Stockholders Equity", "Total Stockholder Equity", "Common Stock Equity"],
    )
    debt_to_equity = None
    if total_debt is not None and equity not in (None, 0):
        debt_to_equity = clean_number(total_debt / equity, 4)

    return {
        "cash": cash,
        "total_debt": total_debt,
        "debt_to_equity": debt_to_equity,
    }

def build_weekly_technicals(history):
    close = history["Close"]
    current_close = close.iloc[-1]
    ema200 = close.ewm(span=200, adjust=False).mean()
    ema20 = close.ewm(span=20, adjust=False).mean()
    ma50 = close.rolling(window=50, min_periods=1).mean()
    ema20_slope = ema20.iloc[-1] - ema20.iloc[-4] if len(ema20) >= 4 else None
    ma50_slope = ma50.iloc[-1] - ma50.iloc[-4] if len(ma50) >= 4 else None
    golden_filter_pass = bool(
        current_close > ema200.iloc[-1] and current_close > ma50.iloc[-1] and current_close > ema20.iloc[-1]
    )

    return {
        "close": clean_number(current_close),
        "ema200": clean_number(ema200.iloc[-1]),
        "ma50": clean_number(ma50.iloc[-1]),
        "ema20": clean_number(ema20.iloc[-1]),
        "ema20_slope": clean_number(ema20_slope, 4),
        "ma50_slope": clean_number(ma50_slope, 4),
        "golden_filter_pass": golden_filter_pass,
    }

def build_daily_technicals(history):
    close = history["Close"]
    last_price = close.iloc[-1]
    ema20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
    ma50 = close.rolling(window=50, min_periods=1).mean().iloc[-1]
    avg_volume_20 = history["Volume"].rolling(window=20, min_periods=1).mean().iloc[-1]
    current_volume = history["Volume"].iloc[-1]
    zvr_ratio = current_volume / avg_volume_20 if avg_volume_20 else None

    pullback_active = bool(
        last_price >= ma50 and min(abs(last_price - ema20), abs(last_price - ma50)) / last_price <= 0.03
    )

    return {
        "close": clean_number(last_price),
        "pullback_active": pullback_active,
        "ema20": clean_number(ema20),
        "ma50": clean_number(ma50),
        "zvr_ratio": clean_number(zvr_ratio, 4),
        "rsi_14": calculate_rsi(close),
        "macd": calculate_macd_state(close),
        "atr_14": calculate_atr(history),
    }

def build_sentiment(info):
    institutional_ownership = info.get("institutionalOwnership")
    if institutional_ownership is not None:
        institutional_ownership = institutional_ownership * 100
    short_percent = info.get("shortPercentOfFloat")
    if short_percent is not None:
        short_percent = short_percent * 100

    return {
        "institutional_ownership": clean_number(institutional_ownership, 2),
        "short_percent_of_float": clean_number(short_percent, 2),
        "consensus_price_target": clean_number(info.get("targetMeanPrice")),
    }

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

        weekly_hist = t.history(period="5y", interval="1wk")
        if weekly_hist.empty:
            weekly_hist = hist.resample("W").agg(
                {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
            ).dropna()

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
            "last_price": clean_number(last_price),
            "financials": build_financials(t),
            "balance_sheet": build_balance_sheet(t),
            "weekly_technicals": build_weekly_technicals(weekly_hist),
            "daily_technicals": build_daily_technicals(hist),
            "sentiment": build_sentiment(info),
            "peg_ratio": peg,
            "fwd_pe": fwd_pe,
            "ma50": clean_number(ma50),
            "ma200": clean_number(ma200) if ma200 is not None else "N/A",
            "rsi_14": clean_number(rsi),
            "atr_14": clean_number(atr),
            "stop_loss_1_5x": clean_number(stop_loss),
            "target_t1_1_2_rr": clean_number(t1_target),
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
