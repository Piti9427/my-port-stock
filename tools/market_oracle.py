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


def get_statement_val(df, row_names, col):
    if df is None or df.empty or col not in df.columns:
        return None
    for name in row_names:
        if name in df.index:
            try:
                val = df.at[name, col]
                if isinstance(val, (pd.Series, pd.DataFrame)):
                    val = val.iloc[0] if hasattr(val, 'iloc') else val
                if pd.isna(val) or val is None:
                    continue
                return float(val)
            except Exception:
                continue
    return None

def calculate_piotroski_f(financials, balance_sheet, cashflow):
    if financials is None or financials.empty:
        return None
    if balance_sheet is None or balance_sheet.empty:
        return None
    if cashflow is None or cashflow.empty:
        return None
        
    cols = sorted(financials.columns, reverse=True)
    if len(cols) < 2:
        return None
        
    curr_col = cols[0]
    prev_col = cols[1]
    
    net_inc_curr = get_statement_val(financials, ["Net Income", "Net Income Common Stockholders"], curr_col)
    net_inc_prev = get_statement_val(financials, ["Net Income", "Net Income Common Stockholders"], prev_col)
    
    assets_curr = get_statement_val(balance_sheet, ["Total Assets"], curr_col)
    assets_prev = get_statement_val(balance_sheet, ["Total Assets"], prev_col)
    
    cfo_curr = get_statement_val(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"], curr_col)
    
    debt_curr = get_statement_val(balance_sheet, ["Long Term Debt", "Total Debt"], curr_col) or 0.0
    debt_prev = get_statement_val(balance_sheet, ["Long Term Debt", "Total Debt"], prev_col) or 0.0
    
    curr_assets_curr = get_statement_val(balance_sheet, ["Current Assets"], curr_col)
    curr_assets_prev = get_statement_val(balance_sheet, ["Current Assets"], prev_col)
    curr_liab_curr = get_statement_val(balance_sheet, ["Current Liabilities"], curr_col)
    curr_liab_prev = get_statement_val(balance_sheet, ["Current Liabilities"], prev_col)
    
    shares_curr = get_statement_val(financials, ["Diluted Average Shares", "Basic Average Shares"], curr_col)
    shares_prev = get_statement_val(financials, ["Diluted Average Shares", "Basic Average Shares"], prev_col)
    
    gp_curr = get_statement_val(financials, ["Gross Profit"], curr_col)
    gp_prev = get_statement_val(financials, ["Gross Profit"], prev_col)
    rev_curr = get_statement_val(financials, ["Total Revenue", "Operating Revenue"], curr_col)
    rev_prev = get_statement_val(financials, ["Total Revenue", "Operating Revenue"], prev_col)
    
    points = {}
    
    # 1. ROA > 0
    if net_inc_curr is not None and assets_curr and assets_curr > 0:
        roa_curr = net_inc_curr / assets_curr
        points["roa_positive"] = 1 if roa_curr > 0 else 0
    else:
        points["roa_positive"] = 0
        
    # 2. CFO > 0
    points["cfo_positive"] = 1 if cfo_curr and cfo_curr > 0 else 0
    
    # 3. Change in ROA
    if net_inc_curr is not None and assets_curr and assets_curr > 0 and net_inc_prev is not None and assets_prev and assets_prev > 0:
        roa_curr = net_inc_curr / assets_curr
        roa_prev = net_inc_prev / assets_prev
        points["roa_increase"] = 1 if roa_curr > roa_prev else 0
    else:
        points["roa_increase"] = 0
        
    # 4. Accruals (CFO > Net Income)
    points["accruals"] = 1 if cfo_curr is not None and net_inc_curr is not None and cfo_curr > net_inc_curr else 0
    
    # 5. Change in Leverage
    if assets_curr and assets_curr > 0 and assets_prev and assets_prev > 0:
        lev_curr = debt_curr / assets_curr
        lev_prev = debt_prev / assets_prev
        points["leverage_decrease"] = 1 if lev_curr < lev_prev or (lev_curr == 0 and lev_prev == 0) else 0
    else:
        points["leverage_decrease"] = 0
        
    # 6. Change in Liquidity
    if curr_assets_curr is not None and curr_liab_curr and curr_liab_curr > 0 and curr_assets_prev is not None and curr_liab_prev and curr_liab_prev > 0:
        cr_curr = curr_assets_curr / curr_liab_curr
        cr_prev = curr_assets_prev / curr_liab_prev
        points["liquidity_increase"] = 1 if cr_curr > cr_prev else 0
    else:
        points["liquidity_increase"] = 0
        
    # 7. No share dilution
    points["no_share_dilution"] = 1 if shares_curr is not None and shares_prev is not None and shares_curr <= shares_prev else 0
    
    # 8. Change in Gross Margin
    if gp_curr is not None and rev_curr and rev_curr > 0 and gp_prev is not None and rev_prev and rev_prev > 0:
        gm_curr = gp_curr / rev_curr
        gm_prev = gp_prev / rev_prev
        points["margin_increase"] = 1 if gm_curr > gm_prev else 0
    else:
        points["margin_increase"] = 0
        
    # 9. Change in Asset Turnover
    if rev_curr is not None and assets_curr and assets_curr > 0 and rev_prev is not None and assets_prev and assets_prev > 0:
        at_curr = rev_curr / assets_curr
        at_prev = rev_prev / assets_prev
        points["turnover_increase"] = 1 if at_curr > at_prev else 0
    else:
        points["turnover_increase"] = 0
        
    f_score = sum(points.values())
    return f_score

def calculate_altman_z(financials, balance_sheet, info, last_price, col):
    working_capital = get_statement_val(balance_sheet, ["Working Capital"], col)
    current_assets = get_statement_val(balance_sheet, ["Current Assets"], col)
    current_liab = get_statement_val(balance_sheet, ["Current Liabilities"], col)
    if working_capital is None and current_assets is not None and current_liab is not None:
        working_capital = current_assets - current_liab
        
    total_assets = get_statement_val(balance_sheet, ["Total Assets"], col)
    retained_earnings = get_statement_val(balance_sheet, ["Retained Earnings"], col)
    ebit = get_statement_val(financials, ["EBIT", "Operating Income"], col)
    total_liab = get_statement_val(balance_sheet, ["Total Liabilities Net Minority Interest", "Total Liabilities"], col)
    revenue = get_statement_val(financials, ["Total Revenue", "Operating Revenue"], col)
    
    market_cap = info.get("marketCap")
    if not market_cap:
        shares = get_statement_val(balance_sheet, ["Ordinary Shares Number", "Share Issued"], col)
        if shares and last_price:
            market_cap = shares * last_price
            
    if None in (working_capital, total_assets, retained_earnings, ebit, total_liab, revenue, market_cap):
        return None
        
    if total_assets == 0 or total_liab == 0:
        return None
        
    x1 = working_capital / total_assets
    x2 = retained_earnings / total_assets
    x3 = ebit / total_assets
    x4 = market_cap / total_liab
    x5 = revenue / total_assets
    
    z_score = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5
    return z_score

def calculate_roce(financials, balance_sheet, col):
    ebit = get_statement_val(financials, ["EBIT", "Operating Income"], col)
    total_assets = get_statement_val(balance_sheet, ["Total Assets"], col)
    current_liab = get_statement_val(balance_sheet, ["Current Liabilities"], col)
    if None in (ebit, total_assets, current_liab):
        return None
    capital_employed = total_assets - current_liab
    if capital_employed <= 0:
        return None
    return ebit / capital_employed

def get_latest_past_earnings_date(ticker):
    try:
        import datetime
        import pytz
        df = ticker.earnings_dates
        if df is None or df.empty:
            return None
            
        now = datetime.datetime.now(pytz.utc)
        past_dates = []
        for idx in df.index:
            dt = idx.to_pydatetime()
            if dt.tzinfo is not None:
                dt = dt.astimezone(pytz.utc)
            else:
                dt = pytz.utc.localize(dt)
            if dt < now:
                past_dates.append(dt)
                
        if not past_dates:
            return None
            
        return max(past_dates)
    except Exception:
        return None

def calculate_anchored_vwap(history, anchor_date):
    if history is None or history.empty or anchor_date is None:
        return None
        
    hist = history.copy()
    hist.index = pd.to_datetime(hist.index).tz_localize(None)
    anchor_dt = pd.to_datetime(anchor_date).tz_localize(None)
    
    filtered = hist[hist.index >= anchor_dt]
    if filtered.empty:
        return None
        
    typical_price = (filtered["High"] + filtered["Low"] + filtered["Close"]) / 3
    pv = typical_price * filtered["Volume"]
    cum_pv = pv.sum()
    cum_vol = filtered["Volume"].sum()
    
    if cum_vol == 0:
        return None
        
    return clean_number(cum_pv / cum_vol)

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
        
        financials = getattr(t, "financials", None)
        if financials is None or financials.empty:
            financials = getattr(t, "quarterly_financials", None)
        if financials is None or financials.empty:
            financials = getattr(t, "income_stmt", None)
        if financials is None or financials.empty:
            financials = getattr(t, "quarterly_income_stmt", None)

        balance_sheet = getattr(t, "balance_sheet", None)
        if balance_sheet is None or balance_sheet.empty:
            balance_sheet = getattr(t, "quarterly_balance_sheet", None)

        cashflow = getattr(t, "cashflow", None)
        if cashflow is None or cashflow.empty:
            cashflow = getattr(t, "quarterly_cashflow", None)

        cols = sorted(financials.columns, reverse=True) if financials is not None and not financials.empty else []
        curr_col = cols[0] if cols else None

        f_score = calculate_piotroski_f(financials, balance_sheet, cashflow)
        z_score = calculate_altman_z(financials, balance_sheet, info, last_price, curr_col) if curr_col else None
        roce = calculate_roce(financials, balance_sheet, curr_col) if curr_col else None
        
        latest_past_earnings_date = get_latest_past_earnings_date(t)
        avwap = calculate_anchored_vwap(hist, latest_past_earnings_date)
        
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
            "piotroski_f_score": f_score,
            "altman_z_score": clean_number(z_score, 4),
            "roce": clean_number(roce, 4),
            "anchored_vwap": clean_number(avwap, 2),
            "latest_past_earnings_date": latest_past_earnings_date.date().isoformat() if hasattr(latest_past_earnings_date, "date") else (latest_past_earnings_date.isoformat() if latest_past_earnings_date else None),
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
