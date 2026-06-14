# MyPortStock: Command Center Redesign
**Date:** 2026-06-14
**Status:** Approved for Implementation

## 1. Core Architecture (The Command Center)
The system will transition from a single-input chat box to a professional dual-pane Command Center.
* **Left Pane (Live Data Feed):** Dedicated to displaying real-time or last-known market data, charts, fundamental metrics, and the current price. 
* **Right Pane (AI Floor):** Dedicated to the AI Sub-agents analyzing the data on the left.
* **Bottom Bar:** Action buttons (e.g., "Add to Portfolio", "Log Trade", "Ignore") that activate only after the AI verdict is delivered.

## 2. AI Strictness (Hybrid Display)
The AI must prove it adheres to the **Elite Investor SOP**:
* **Traffic-Light Dashboard:** A compact UI at the top of the AI Floor showing which SOP gates passed/failed (e.g., Green/Yellow/Red status).
* **Agent Dialogue:** The Pixel Agents (@quant-technician, @fundamental-auditor) will explicitly reference the SOP limits and specific metrics from the Left Pane in their chat messages (e.g., "P/E is 25, exceeding the limit of 20").

## 3. Handling Data Gaps & Real-Time Constraints
* **Soft Warning + Provisional Status:** If price data is delayed, the system displays a yellow warning banner and tags the resulting analysis as "PROVISIONAL".
* **Manual Override (Tier 1 Source):** The Left Pane will include an input field allowing the user to manually enter the exact live price from their broker (e.g., Streaming app). Entering this upgrades the data to "Tier 1" and removes the provisional tag.
* **Finnhub API Integration:** We will integrate Finnhub as a primary/fallback price source. 
  * *Note on Finnhub:* Finnhub provides excellent real-time data for US stocks on the free tier. However, for Thai (SET) stocks, it typically requires a premium API key or provides heavily delayed/EOD data. For Thai stocks, we will likely rely on the Manual Override heavily.

## Next Steps for Implementation
1. Refactor `/api/analyze` to separate Data Fetching from AI Analysis.
2. Build the Dual-Pane UI in React (`AIFloorPage.jsx` or a new `CommandCenter.jsx`).
3. Implement the Manual Price Override logic.
