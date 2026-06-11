# MyPortStock Investment Agent + Dashboard Implementation Plan

## TL;DR

Build MyPortStock as a local-first Investment Decision OS. Start with data integrity, risk gates, journal/thesis checks, and explainable decision output before any autonomous or execution behavior.

## Scope

Implemented v1 targets:

- Orchestrator-owned quote validation.
- `Verified Data Packet` construction.
- Journal and portfolio context reading.
- Decision engine with hard-gate behavior.
- Local dashboard with pixel-agent presentation state.

Explicitly out of scope for v1:

- Auto-trading or order execution.
- Paid market data.
- TradingView scraping as a price API.
- Crypto wallet automation.
- Sub-agent independent source lookup.

## Backend Design

The backend keeps Express and splits the original quote API into focused CommonJS modules:

- `src/sources/quoteSources.js` fetches and normalizes Yahoo, Nasdaq, and Stooq quote sources.
- `src/gates/priceGate.js` enforces the two-source acceptance gate and fail-closed behavior.
- `src/packets/verifiedDataPacket.js` builds the minimum v1 packet contract.
- `src/journal/journalReader.js` reads `trade_journal.md` and `stock_portfolio.md` as context only.
- `src/decision/decisionEngine.js` produces the Decision Snapshot and Adaptive Drilldown.

## API Surface

- `GET /api/quote/:ticker`
- `GET /api/packet/:ticker?mode=Swing%20Trade`
- `POST /api/analyze`
- `GET /api/portfolio`
- `GET /api/journal/:ticker`

## Data Contract

The minimum packet includes:

- `as_of`
- `ticker`
- `decision_mode`
- `last_price`
- `price_sources`
- `price_source_tiers`
- `quote_timestamp`
- `market_session`
- `quote_delay_status`
- `current_price_acceptance_gate`
- `fundamental_packet`
- `technical_packet`
- `macro_flow_packet`
- `portfolio_context`
- `journal_context`
- `known_conflicts`
- `staleness_warnings`

## Hard Rules

- No entry/stop/R/R math when `current_price_acceptance_gate` is not `pass`.
- Held or repeat tickers require journal context.
- Missing sub-agent packets cap verdict at `Wait` unless irrelevant to timeframe.
- No `Buy/Add` without stop-loss, R/R >= `1:2`, and hard THB risk.
- Portfolio and watchlist markdown prices are stale context, not execution evidence.

## Dashboard v1

The dashboard is a static Express-served interface:

- Decision Snapshot
- Data Quality
- Risk Plan
- Journal Status
- Watch Triggers
- Pixel state: green/yellow/red as presentation only

## Test Plan

Backend tests cover:

- Invalid ticker fail-closed behavior.
- One-source quote failure.
- Two-source conflict threshold failure.
- Regular and extended threshold selection.
- Price-target fields not accepted as last price.
- Successful quote packet metadata.

Decision tests cover:

- Buy blocked when price gate fails.
- Buy blocked without risk plan.
- Held/repeat ticker journal constraints.
- Sub-agent `INSUFFICIENT_DATA` handling.
- `Mode Fit: Poor` score cap.

UI verification covers:

- Dashboard renders fail-closed state clearly.
- Data Quality is visually separate from verdict.
- Pixel state matches verdict/gate status.
- Mobile layout avoids text overlap.
