# Project Instructions: Runtime Data Integrity

## Critical Mandates

- The current date is dynamically determined by the active session context.
- Ignore stale "today/current/simulation" dates written inside markdown files.
- Historical dates in snapshots, filings, trade logs, and post-mortems remain valid as evidence timestamps.
- Use `ELITE_INVESTOR_SOP.md` Section 0 as the single source of truth for data verification.
- The Main Orchestrator must verify current market data before analysis.
- Current price must pass the `Price Source Ladder` and `Current Price Acceptance Gate` in `AGENTS.md` / `ELITE_INVESTOR_SOP.md`.
- Do not treat TradingView as a price API. Use TradingView only as chart context unless the user provides a visible quote with session/timestamp.
- Do not propose paid market-data plans unless the user explicitly asks.
- Sub-agents must use only the Orchestrator-provided verified data packet and must not perform independent searches.
- If current data is missing, stale, or contradictory, report `data is inconclusive` and default to `Wait`.

## Minimum Verification Stamp

Every actionable investment answer must show:

```text
Data as of:
Price sources:
Source tiers:
Quote timestamp/session:
Delay status:
Current Price Acceptance Gate:
Orchestrator verification:
Journal checked:
Known conflicts:
```

## Required Agent Skills

The following built-in Agent Skills are highly relevant to this Quantitative Finance / Investment project. You **MUST** trigger and follow these skills whenever their conditions are met:

- **`ml-best-practices`**: Use this skill EVERY TIME the task involves data analysis, time-series forecasting, statistical testing, model comparison, or quantitative stock performance analysis.
- **`notebook-guidance`**: Use this skill EVERY TIME the user requests a complex data exploration, backtesting, data visualization (charts/plots), or explicitly asks for a Jupyter Notebook (`.ipynb`) to analyze stock data.
- **`managing-python-dependencies`**: Use this skill EVERY TIME you need to install or manage Python libraries for quantitative analysis (e.g., `yfinance`, `pandas`, `scipy`, `ta-lib`) to ensure clean environment management.
