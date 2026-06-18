import importlib.util
import pathlib
import unittest

import pandas as pd


MODULE_PATH = pathlib.Path(__file__).with_name("market_oracle.py")
SPEC = importlib.util.spec_from_file_location("market_oracle", MODULE_PATH)
market_oracle = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(market_oracle)


class FakeTicker:
    def __init__(self, symbol):
        self.symbol = symbol
        self.info = {
            "pegRatio": 1.2,
            "forwardPE": 22.5,
            "institutionalOwnership": 0.584,
            "shortPercentOfFloat": 0.011,
            "targetMeanPrice": 310.5,
        }
        self.quarterly_financials = pd.DataFrame(
            {
                pd.Timestamp("2026-03-31"): {
                    "Total Revenue": 1000.0,
                    "Net Income": 120.0,
                },
                pd.Timestamp("2025-12-31"): {
                    "Total Revenue": 900.0,
                    "Net Income": 100.0,
                },
            }
        )
        self.quarterly_cashflow = pd.DataFrame(
            {
                pd.Timestamp("2026-03-31"): {
                    "Operating Cash Flow": 160.0,
                    "Capital Expenditure": -40.0,
                },
                pd.Timestamp("2025-12-31"): {
                    "Operating Cash Flow": 130.0,
                    "Capital Expenditure": -30.0,
                },
            }
        )
        self.balance_sheet = pd.DataFrame(
            {
                pd.Timestamp("2026-03-31"): {
                    "Cash And Cash Equivalents": 500.0,
                    "Total Debt": 250.0,
                    "Stockholders Equity": 1000.0,
                }
            }
        )

    def history(self, period="1y", interval="1d"):
        rows = 260 if interval == "1d" else 220
        dates = pd.date_range("2021-01-01", periods=rows, freq="D")
        close = pd.Series([100.0 + i for i in range(rows)], index=dates)
        return pd.DataFrame(
            {
                "Open": close - 1,
                "High": close + 2,
                "Low": close - 2,
                "Close": close,
                "Volume": [1000 + (i % 20) * 10 for i in range(rows)],
            },
            index=dates,
        )


class FakeYFinance:
    def Ticker(self, symbol):
        return FakeTicker(symbol)


class MarketOracleTest(unittest.TestCase):
    def test_analyze_stock_returns_deep_analysis_schema(self):
        original_yf = market_oracle.yf
        market_oracle.yf = FakeYFinance()
        try:
            result = market_oracle.analyze_stock("AAPL")
        finally:
            market_oracle.yf = original_yf

        self.assertEqual(result["ticker"], "AAPL")
        self.assertIn("financials", result)
        self.assertEqual(result["financials"][0]["free_cash_flow"], 120.0)
        self.assertEqual(result["financials"][0]["fcf_margin"], 0.12)
        self.assertEqual(result["balance_sheet"]["cash"], 500.0)
        self.assertEqual(result["balance_sheet"]["debt_to_equity"], 0.25)
        self.assertIn("ema200", result["weekly_technicals"])
        self.assertTrue(result["weekly_technicals"]["golden_filter_pass"])
        self.assertIn("zvr_ratio", result["daily_technicals"])
        self.assertEqual(result["sentiment"]["institutional_ownership"], 58.4)


if __name__ == "__main__":
    unittest.main()
