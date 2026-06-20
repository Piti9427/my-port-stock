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

### 2026-06-17 - Markdown Runtime Redaction

- Keywords: `markdown-redaction`, `supabase-runtime`, `personal-data`, `per-user-data`
- Decision: Personal runtime numeric data now lives in Supabase per Clerk `user_id`; markdown files keep only historical/context material.
- Action: Redacted holdings, watchlist alert rows, and active trade transaction rows after live import verification.
- Source: `stock_portfolio.md`, `trade_journal.md`, `backend/tests/verify_schema_rls.sql`

### 2026-06-17 - Per-User Markdown Runtime Data Task Plan

- Keywords: `supabase-runtime`, `per-user-data`, `task-plan`, `markdown-redaction`, `rls`
- Decision: Finish Supabase runtime migration through an additive task plan, not direct destructive schema application. Runtime rows must stay per Clerk `user_id`; second user starts empty.
- Action: Created implementation task plan for additive migration, RLS/user isolation tests, frontend empty states, live verification, and markdown redaction.
- Source: `docs/superpowers/plans/2026-06-17-per-user-markdown-runtime-data.md`

### 2026-06-17 - Owner-Only Supabase Markdown Import

- Keywords: `supabase-runtime`, `owner-import`, `markdown-redaction`, `per-user-data`, `import-batches`
- Decision: Personal portfolio markdown must never auto-bootstrap into every empty user account. Runtime numeric data imports are owner-only through `MARKDOWN_IMPORT_OWNER_USER_ID`, with import audit metadata and no ambiguous synthetic BUY rows.
- Action: Added owner-only dry-run/write importer, `import_batches` audit schema, explicit Data API grants, private trigger function, and regression tests blocking normal API auto-import. Redact `stock_portfolio.md` and `trade_journal.md` only after live Supabase import verification succeeds.
- Source: `backend/src/services/migrationService.js`, `backend/scripts/import-markdown-snapshot.js`, `backend/supabase_schema.sql`

### 2026-06-16 - Deep Analysis SOP Skill Gate

- Keywords: `deep-analysis-sop`, `skill-workflow`, `find-skills`, `quant-audit`, `frontend-verification`
- Decision: The deep 7-dimension SOP implementation should use all relevant tools/skills as an orchestration workflow, not a literal inventory. The Main Orchestrator remains the only current-data owner; sub-agents consume verified packets and fail closed with `INSUFFICIENT_DATA`.
- Action: Updated `docs/superpowers/specs/2026-06-16-deep-analysis-sop-design.md` with phase-based tool/skill orchestration, Parallel Agent Council contract, optional Skills CLI candidates, explicit do-not-use constraints, and final verification expectations.
- Source: `docs/superpowers/specs/2026-06-16-deep-analysis-sop-design.md`

### 2026-06-16 - Deep Analysis Runtime Contract

- Keywords: `deep-analysis-runtime`, `market-oracle`, `deep_analysis`, `swot-tabs`, `fail-closed`
- Decision: Deep analysis runtime now uses a normalized contract from Python oracle fundamentals/technicals/sentiment into Express `deep_analysis`, then shared React tabs for Dashboard and Command Center.
- Action: Added tests for oracle schema, backend payload mapping, AI shape validation, and frontend production data contract.
- Source: `tools/market_oracle.py`, `backend/server.js`, `frontend/src/components/DeepAnalysisTabs.jsx`

### 2026-06-16 - Dev UI Auth Bypass

- Keywords: `dev-auth-bypass`, `ui-testing`, `clerk`, `dev:ui`, `frontend-verification`
- Decision: Local UI implementation can bypass the signed-in Clerk surface only in Vite dev mode with explicit `VITE_DEV_AUTH_BYPASS=true`; production builds keep Clerk auth enforced.
- Action: Added `frontend/src/auth/devAuth.js`, `frontend/src/auth/clerkAdapter.jsx`, gated `App.jsx` shell rendering, and `frontend` script `dev:ui` for auth-bypassed visual testing without requiring a Clerk publishable key.
- Source: `frontend/src/App.jsx`, `frontend/src/auth/devAuth.js`, `frontend/src/auth/clerkAdapter.jsx`, `frontend/package.json`

### 2026-06-16 - Responsive Command Center Contract

- Keywords: `responsive-ui`, `command-center`, `mobile-layout`, `canvas-scaling`, `frontend-verification`
- Decision: Command Center should use class-based responsive grid layout instead of fixed inline pane widths; mobile/tablet must stack panels and keep Pixi canvas/table content within explicit scroll or scale boundaries.
- Action: Added responsive layout contracts and CSS breakpoints for Command Center feed/main/actions, AI floor summary, Pixi canvas scaling, table overflow, and drawer/form stacking.
- Source: `frontend/src/pages/CommandCenterPage.jsx`, `frontend/src/index.css`, `frontend/tests/productionDataContract.test.js`

### 2026-06-15 - Impeccable Critique UI Remediation Plan

- Keywords: `impeccable-critique`, `ui-remediation`, `dark-terminal`, `anti-slop`, `frontend-ux`
- Decision: Treat all existing Impeccable critique files as one remediation backlog; fix trust/data UX first, power-user efficiency second, and visual anti-slop cleanup third.
- Action: Saved implementation plan with audit matrix, current detector baseline, route-by-route tasks, regression tests, and browser verification gates.
- Source: `docs/superpowers/plans/2026-06-15-impeccable-critique-ui-remediation.md`

### 2026-06-15 - Supabase Runtime Source Of Truth

- Keywords: `supabase-runtime`, `fail-closed`, `mock-removal`, `per-user-data`, `markdown-context`
- Decision: Supabase is the runtime source of truth for user-owned portfolio, journal, and watchlist data; markdown remains historical context only.
- Action: Runtime endpoints must fail closed instead of returning sample rows, mock saves, or AI mock `Buy`; initial data should be imported from current markdown snapshots into per-user Supabase rows.
- Source: `docs/adr/0001-supabase-runtime-source-of-truth.md`

### 2026-06-14 - Verify Before Mutating (Code Injection Post-Mortem)

- Keywords: `blind-injection`, `test-failure`, `duplicate-declaration`, `view_file`, `post-mortem`
- Decision: Never inject or replace code blocks based solely on automated test failure output without inspecting the file's current state first.
- Action: If a test fails on an expected configuration object, verify if the object exists and modify it, rather than blindly appending a duplicate. Logged as a learning loop.
- Detail: `notes/2026-06-14-blind-code-injection-error.md`

### 2026-06-14 - TDD Gate Before Code

- Keywords: `tdd-gate`, `agent-workflow`, `test-first`, `code-change`, `red-green`
- Decision: Any code change must start with a TDD plan and one behavior-focused failing test through a public interface unless automation is not practical and manual verification is defined first.
- Action: Updated `AGENTS.md` skill workflow to require `tdd` or `superpowers:test-driven-development` before coding.
- Source: `AGENTS.md`

### 2026-06-14 - Dark Terminal Product UI Canonical Theme

- Keywords: `dark-terminal`, `product-ui`, `design-system`, `readability`, `impeccable`
- Decision: Make Dark Terminal Product UI the canonical visual language for MyPortStock: dark-first black/zinc surfaces, sparse emerald accent, flat bordered panels, high-contrast text, and monospace financial readouts.
- Action: Added UI glossary terms to `CONTEXT.md`; replaced the older glass/blue/glow `docs/DESIGN.md`; made `docs/DESIGN.md` the single source of truth and reduced `frontend/DESIGN.md` to a frontend checklist that points back to it.
- Source: `CONTEXT.md`, `docs/DESIGN.md`, `frontend/DESIGN.md`, `PRODUCT.md`

### 2026-06-14 - Agent Skill Workflow Guide

- Keywords: `skill-workflow`, `agent-skills`, `superpowers`, `impeccable`, `frontend-verification`, `workflow-gate`
- Decision: Added a repo-level skill selection matrix to keep agents using skills as workflow helpers while preserving Orchestrator ownership of current market data and investment gates.
- Action: Updated `AGENTS.md` with required/preferred skills by task type plus guardrails for market data, Impeccable UI critique/polish/harden work, frontend verification, security, and autonomous scans.
- Source: `AGENTS.md`

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

### 2026-06-12 - Dashboard UI Quality & Anti-Slop Fixes

- Keywords: `dashboard`, `ui-ux`, `impeccable-critique`, `color-contrast`, `mobile-accessibility`
- Decision: Applied impeccable critique fixes to remove "AI Slop" neon halation, fix mobile card deletion, and harden search inputs.
- Action: Updated `index.css` colors to deep graphite, adjusted hover states for touch screens, and improved search regex in `Dashboard.jsx`.
- Detail: `notes/2026-06-12-dashboard-ui-critique-fixes.md`

### 2026-06-15 - Impeccable Critique UI Remediation Plan

- Keywords: `impeccable-critique`, `ui-remediation`, `dark-terminal`, `anti-slop`, `frontend-ux`
- Decision: Treat all existing Impeccable critique files as one remediation backlog; fix trust/data UX first, power-user efficiency second, and visual anti-slop cleanup third.
- Action: Saved implementation plan with audit matrix, current detector baseline, route-by-route tasks, regression tests, and browser verification gates.
- Source: `docs/superpowers/plans/2026-06-15-impeccable-critique-ui-remediation.md`

### 2026-06-15 - Supabase Runtime Source Of Truth

- Keywords: `supabase-runtime`, `fail-closed`, `mock-removal`, `per-user-data`, `markdown-context`
- Decision: Supabase is the runtime source of truth for user-owned portfolio, journal, and watchlist data; markdown remains historical context only.
- Action: Runtime endpoints must fail closed instead of returning sample rows, mock saves, or AI mock `Buy`; initial data should be imported from current markdown snapshots into per-user Supabase rows.
- Source: `docs/adr/0001-supabase-runtime-source-of-truth.md`

### 2026-06-15 - Database Schema & Trigger Hardening (Task 1 & 2)

- Keywords: `database-schema`, `soft-delete`, `rls`, `partial-unique-index`, `event-sourced-trigger`
- Decision: Drop redundant `portfolio` table; utilize `is_deleted` column for soft deletions; create partial unique indexes; enforce Clerk JWT-based RLS; implement event-sourced `recalculate_holdings` trigger to eliminate float drift.
- Action: Updated `backend/supabase_schema.sql` and `supabase/schema.sql` with the new schema, policies, triggers, and created verification script `backend/tests/verify_schema_rls.sql`. Updated `backend/src/db.js` and tests.
- Source: `docs/superpowers/plans/2026-06-15-backend-supabase-implementation-plan.md`

### 2026-06-16 - Deep 7-Dimension SOP & SWOT Stock Analysis Design

- Keywords: `deep-analysis`, `sop-audit`, `swot-matrix`, `yfinance-fundamentals`, `tabbed-ui`
- Decision: Restore real fundamental, technical, and SWOT audits under the 7-dimension SOP. Update Python oracle to pull quarterly financial statements and W1/D1 technical metrics; modify Express backend to map AI sub-agent scores to the decision engine; design a premium tabbed React UI containing SWOT accordions, quarterly tables, W1 checklist badges, and a monospace Trade Ticket.
- Action: Saved design spec to `docs/superpowers/specs/2026-06-16-deep-analysis-sop-design.md` and created implementation plan.
- Source: `docs/superpowers/specs/2026-06-16-deep-analysis-sop-design.md`

### 2026-06-19 - Dynamic Scoping and Ticker Discovery

- Keywords: `dynamic-scoping`, `ticker-discovery`, `grill-me`, `rule-update`, `interactive-flow`
- Decision: Replaced the static watchlist scan behavior for broad queries with an interactive scoping flow. The agent must now ask clarifying questions (using the `ask_question` tool) to narrow down target timeframes, sectors, and risk profiles before scanning or discovering new tickers.
- Action: Updated `AGENTS.md` and `GEMINI.md` mandatory behaviors with the new Dynamic Scoping & Discovery rules.
- Source: User feedback on broad recommendation queries.

### 2026-06-20 - UX/UI Runtime Contract Scope

- Keywords: `ux-ui-refactor`, `runtime-contract`, `per-user-analysis`, `ticker-drilldown`, `production-hardening`
- Decision: Expand `docs/plans/ux_ui_refactor_plan.md` from frontend-only UX/UI work into UX/UI plus runtime data contract hardening, limited to auth, per-user analysis context, and API response shape. No schema redesign or theme redesign.
- Action: Added Phase 0 contract hardening, moved ticker drilldown to early execution priority, corrected tool/version assumptions, verified live Supabase schema/advisors, and updated verification/rollback gates.
- Source: `docs/plans/ux_ui_refactor_plan.md`
