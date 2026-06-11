# Project Memory Index

> Lightweight keyword index for durable MyPortStock decisions, plans, and watchlist updates. This file is intentionally compact. Read this first, then open only the linked note or source file that matches the user's current question.

## Memory Hygiene Rules

- Do not paste full conversations here.
- Add one compact entry only when a discussion creates a durable decision, plan, watchlist, risk rule, or unresolved follow-up.
- Keep each entry to 3-6 lines: date, keywords, decision, action, and source/link.
- Use `notes/` for detail only when the index entry would become too long.
- Treat prices and market data in memory as historical evidence only. Re-verify current market data before execution.
- Prefer updating existing canonical files when the item belongs there:
  - Portfolio/watchlists: `stock_portfolio.md`
  - Executed trades and active thesis: `trade_journal.md`
  - Framework/rules: `ELITE_INVESTOR_SOP.md` or `AGENTS.md`

## Keyword Map

| Keyword | Meaning | Primary File |
| :--- | :--- | :--- |
| `portfolio-review` | Full held-portfolio health review | `stock_portfolio.md`, `trade_journal.md` |
| `space-data-center` | Orbital compute / space data center theme from BT beartai clip | `stock_portfolio.md`, `notes/2026-05-30-space-data-center-theme.md` |
| `theme-watchlist` | Research/watchlist additions, not executed trades | `stock_portfolio.md` |
| `risk-plan-missing` | Holdings or active trades missing stop/R/R/hard THB risk | `trade_journal.md` |
| `ANET-conflict` | [Resolved 2026-06-01] ANET limit order was never filled; trade journal corrected | `trade_journal.md` |
| `no-chase` | Avoid buying extended momentum names without pullback/R/R | `ELITE_INVESTOR_SOP.md` |

## Durable Entries

### 2026-06-05 - MyPortStock Skill Scope Matrix

- Keywords: `skill-scope`, `find-skills`, `agent-skills`, `dashboard`, `risk-gate`
- Decision: Use skills as scoped workflow helpers, not investment-decision authority; keep Orchestrator as sole current-data owner and treat external finance skills as experimental unless reviewed.
- Action: Created skill selection matrix for v1/v2 work covering data gates, backend/API, dashboard UI, E2E, agent orchestration, security, and cost guardrails.
- Detail: `notes/2026-06-05-myportstock-skill-scope.md`

### 2026-06-05 - File Organization Convention

- Keywords: `file-organization`, `artifacts`, `tools`, `screenshots`, `generated-output`
- Decision: Keep root limited to canonical project context, runtime entrypoints, and investment source-of-truth markdown; move generated outputs into `artifacts/` and helper scripts into `tools/`.
- Action: Added `docs/FILE_ORGANIZATION.md`, `.gitignore`, and organized screenshots, reports, PDFs, Playwright traces, and PDF helper script.
- Source: `docs/FILE_ORGANIZATION.md`

### 2026-06-05 - AVGO Post-Earnings Watchlist Reset

- Keywords: `AVGO`, `AI-custom-ASIC`, `post-earnings-reset`, `no-chase`
- Decision: Treat AVGO as a high-quality AI infrastructure watchlist name, but not an immediate buy after the Q2 FY2026 expectation-gap selloff.
- Action: Wait for base-building or reclaim confirmation after the June 4, 2026 high-volume gap-down; require fresh dual-source price, stop, R/R >= 1:2, and hard THB risk before entry.
- Source: Broadcom Q2 FY2026 release/transcript; StockAnalysis and Stooq current-price checks.

### 2026-06-01 - Resolution of ANET Discrepancy

- Keywords: `ANET-conflict`, `portfolio-review`
- Decision: User confirmed $ANET was never filled due to limit order execution failure.
- Action: Removed $ANET from Active Trades in [trade_journal.md](file:///Users/nopparuj/my-agents/MyPortStock/trade_journal.md). Conflict resolved.

### 2026-05-30 - Portfolio Review / Current Held Positions

- Keywords: `portfolio-review`, `risk-plan-missing`, `no-chase`
- Decision: Portfolio was green but fragile; profit was concentrated in `ASTS`, while `NFLX`, `ORCL`, and missing stop plans were the main risk controls to fix.
- Action: Hold / no add until broker holdings, cash, stop-loss, R/R, and hard THB risk are confirmed.
- Source: `stock_portfolio.md`, `trade_journal.md`

### 2026-05-30 - Space Data Center / Orbital Compute Theme

- Keywords: `space-data-center`, `theme-watchlist`, `orbital-compute`, `AI-infrastructure`, `space-stocks`
- Decision: Treat the theme as long-term watchlist, not immediate execution. Core exposure: `NVDA`, `TSM`, `ASML`, `GOOGL`, `ANET`; speculative exposure: `RKLB`, `PL`, `LUNR`, `BKSY`, `IRDM`, `GSAT`.
- Action: Added `Space Data Center / Orbital Compute Theme Watchlist` to `stock_portfolio.md`; require fresh price, catalyst proof, stop-loss, R/R >= 1:2, and hard THB risk before buy/add.
- Detail: `notes/2026-05-30-space-data-center-theme.md`

### 2026-05-30 - Memory / Context Control Protocol

- Keywords: `memory-index`, `context-control`, `keyword-system`, `durable-decisions`
- Decision: Use this index as the first-pass memory layer. Keep it compact and open detailed notes only when the user's topic matches a keyword.
- Action: Future durable updates should append one short entry here and, if needed, create a note under `notes/`.
- Source: `PROJECT_MEMORY_INDEX.md`

### 2026-06-01 - Enhanced Analysis & Entry Workflow (D1/W1 Logic)

- Keywords: `enhanced-workflow`, `d1-w1-framework`, `multi-confluence`, `atr-stop`, `theme-first-scan`
- Decision: Agreed 5-step top-down workflow → (1) Theme/Sector Scan, (2) W1 Golden Filter, (3) D1 Multi-Confluence 3+ Signals, (4) ATR×1.5 Stop + Tiered T1/T2/Trailing, (5) Catalyst/News Gate.
- H1/H4 banned as structural reference. D1/W1 only. Entry: Multi-Confluence Zone-Based with Limit Order.
- Stop: ATR×1.5 only — no round %. Take-profit: T1=2:1 R/R (50% off), T2=Fib 1.618×, Trailing after T1.
- Nightly scan starts with Theme-First (leading Sector), then W1 filter, then D1 confirmation.
- Action: Written as permanent Section 11 in [ELITE_INVESTOR_SOP.md](file:///Users/nopparuj/my-agents/MyPortStock/ELITE_INVESTOR_SOP.md).

### 2026-06-04 - Current Portfolio / Watchlist Review

- Keywords: `portfolio-review`, `watchlist-scan`, `exit-review`, `conditional-entry`, `current-data`
- Decision: Treat `ASTS`, `TSM`, and `NVDA` as hold/risk-manage; put `CEG`, `NFLX`, and `ORCL` under exit-review / no-add until thesis and stops are fixed.
- Action: Shortlist watch candidates from current scan: quality/risk-adjusted focus on `AMZN`, `TLN`, `VRT`, `SNPS`, `ANET`, `RKLB`, `LUNR`; avoid chasing extended AI beta and require fresh dual-source price confirmation before execution.
- Source: 2026-06-04 Yahoo Finance + Stooq current scan; `stock_portfolio.md`, `trade_journal.md`

### 2026-06-09 - Added Fundamental Valuation Gate (PEG & FCF)

- Keywords: `valuation-gate`, `peg-ratio`, `free-cash-flow`, `sop-update`
- Decision: Integrated PEG Ratio (< 1.5) and Free Cash Flow Margin checks into the Master SOP to validate Growth/AI stocks.
- Action: Updated `ELITE_INVESTOR_SOP.md` (Dimension 3 and Nightly Scan Protocol) to include Fundamental Valuation Gate before technical checks.
- Source: Conversation regarding DCF/PEG modeling.
