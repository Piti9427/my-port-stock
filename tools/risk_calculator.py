#!/usr/bin/env python3
import sys
import argparse

def calculate_position(entry_price, stop_loss, risk_thb, exchange_rate=35.0):
    if entry_price <= stop_loss:
        print("❌ Error: Entry price must be higher than Stop-Loss for a LONG position.")
        return

    # Calculate risk per share in USD
    risk_per_share_usd = entry_price - stop_loss
    
    # Convert Total Risk Budget from THB to USD
    risk_usd = risk_thb / exchange_rate
    
    # Calculate Position Size (Number of Shares)
    shares = risk_usd / risk_per_share_usd
    
    # Calculate Total Investment required
    total_investment_usd = shares * entry_price
    total_investment_thb = total_investment_usd * exchange_rate
    
    # Calculate Percentage Stop
    stop_pct = (risk_per_share_usd / entry_price) * 100

    print("="*40)
    print(" 🛡️ ELITE POSITION SIZING CALCULATOR 🛡️")
    print("="*40)
    print(f"🔹 Entry Price:     ${entry_price:.2f}")
    print(f"🔹 Stop-Loss:       ${stop_loss:.2f} (-{stop_pct:.2f}%)")
    print(f"🔹 Max Risk Budget: {risk_thb:,.2f} THB (~${risk_usd:.2f})")
    print(f"🔹 Exchange Rate:   {exchange_rate:.2f} THB/USD")
    print("-" * 40)
    print(f"✅ Shares to Buy:   {shares:.4f} shares")
    print(f"💰 Total Capital:   ${total_investment_usd:,.2f} ({total_investment_thb:,.2f} THB)")
    print("="*40)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calculate position size based on hard THB risk.")
    parser.add_argument("--entry", type=float, required=True, help="Entry price in USD")
    parser.add_argument("--stop", type=float, required=True, help="Stop-loss price in USD")
    parser.add_argument("--risk", type=float, required=True, help="Max risk budget in THB")
    parser.add_argument("--fx", type=float, default=36.0, help="USD to THB exchange rate (default: 36.0)")
    
    args = parser.parse_args()
    calculate_position(args.entry, args.stop, args.risk, args.fx)
