# ⚰️ POST-MORTEM: REAL-TIME DATA INTEGRITY FAILURE
**Incident Date:** May 18, 2026
**Tickers Involved:** $TMDX, $IONQ

---

### 1. Diagnosis / Root Cause
- **Failure:** Sub-agent (`quant-technician`) reported $TMDX at $145 (Real: $67.02) and $IONQ at $28 (Real: $49.36).
- **Cause:** The sub-agent utilized outdated search snippets or confused "Price Targets" with "Last Price" during an independent search. 
- **System Weakness:** The Main Orchestrator allowed the sub-agent to perform independent price verification instead of providing a pre-verified data packet.

---

### 2. Corrective Actions Taken
- **SOP Update:** Updated `ELITE_INVESTOR_SOP.md` Section 0 with the **Multi-Source Verification (Hard Rule)**.
- **Agent Mandate:** Updated `AGENTS.md` to strictly forbid sub-agents from independent price searching.
- **Validation Protocol:** Implemented a mandatory **Data Recency Stamp** for all price reports.

---

### 3. Prevention Guidance
- **Main Agent Rule:** NEVER pass a prompt to a sub-agent that asks them to "search for price." Always search first, verify across 2 sources (e.g., Google + Finviz), and then pass the literal price to the sub-agent for analysis.
- **Conflict Check:** If $TMDX is seen as $145 in one snippet and $67 in another, do not report until the discrepancy is resolved via deep `web_fetch` of an exchange-direct page.

---
*Signed: Main Orchestrator (Gemini CLI)*
