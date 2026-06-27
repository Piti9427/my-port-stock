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

| Keyword             | Meaning                                                                          | Primary File                                                        |
| :------------------ | :------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `portfolio-review`  | Full held-portfolio health review                                                | `stock_portfolio.md`, `trade_journal.md`                            |
| `space-data-center` | Orbital compute / space data center theme from BT beartai clip                   | `stock_portfolio.md`, `notes/2026-05-30-space-data-center-theme.md` |
| `theme-watchlist`   | Research/watchlist additions, not executed trades                                | `stock_portfolio.md`                                                |
| `risk-plan-missing` | Holdings or active trades missing stop/R/R/hard THB risk                         | `trade_journal.md`                                                  |
| `ANET-conflict`     | [Resolved 2026-06-01] ANET limit order was never filled; trade journal corrected | `trade_journal.md`                                                  |
| `no-chase`          | Avoid buying extended momentum names without pullback/R/R                        | `ELITE_INVESTOR_SOP.md`                                             |
| `skills-workflow`   | Project developer workflow using integrated Agent Skills                         | `docs/PROJECT_SKILLS_WORKFLOW.md`                                   |
| `clerk-isolation`   | Clerk user data isolation and Supabase database RLS architecture                 | `docs/adr/0002-clerk-user-isolation-rls.md`                          |
| `autonomous-search` | Sub-agent contextual search and hybrid oracle contract architecture               | `docs/adr/0003-subagent-autonomous-search.md`                       |

## Durable Entries

### 2026-06-27 - Clerk User Isolation and RLS in Supabase (ADR 0002)

- Keywords: `clerk-isolation`, `supabase`, `rls`, `jwt`, `holdings-trigger`
- Decision: Confirmed the multi-tenant architecture where user identity is mapped via locally-signed Supabase JWTs with subject set to Clerk's `userId`, enforced by table-level RLS policies, and holdings state is dynamically derived using DB-level triggers (event sourcing) on journal transactions.
- Action: Created [0002-clerk-user-isolation-rls.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0002-clerk-user-isolation-rls.md).
- Source: [0002-clerk-user-isolation-rls.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0002-clerk-user-isolation-rls.md)

### 2026-06-27 - Sub-Agent Autonomous Search and Hybrid Data Contract (ADR 0003)

- Keywords: `autonomous-search`, `data-contract`, `search-caching`, `ai-council`
- Decision: Established a hybrid model allowing sub-agents to search for qualitative context (headlines, FCF context) but strictly binding all calculations (Last Price, risk) to the Orchestrator's verified packet. Redundant searches are mitigated via a 1-hour backend cache layer and a 3-search limit.
- Action: Created [0003-subagent-autonomous-search.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0003-subagent-autonomous-search.md).
- Source: [0003-subagent-autonomous-search.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0003-subagent-autonomous-search.md)

### 2026-06-27 - Project Skills Workflow Integration

- Keywords: `skills-workflow`, `agent-skills`, `planning-workflow`, `tdd`, `supabase`, `qa`
- Decision: Formulated a project-wide developer workflow by mapping and integrating existing Agent Skills (Supabase, TDD, React best practices, security, QA) with the MyPortStock technology stack.
- Action: Created the canonical developer guide at [PROJECT_SKILLS_WORKFLOW.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/PROJECT_SKILLS_WORKFLOW.md).
- Source: [PROJECT_SKILLS_WORKFLOW.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/PROJECT_SKILLS_WORKFLOW.md)

### 2026-06-21 - UX/UI Refactor Manual Gate Scope

- Keywords: `ux-ui-refactor`, `voiceover`, `live-clerk`, `acceptance-scope`, `manual-gates`
- Decision: VoiceOver manual testing and live Clerk signed-in new/returning flows are intentionally skipped for this acceptance pass by user direction; automated AX-tree, dev-auth E2E, and live signed-out Clerk boundary smoke remain the evidence.
- Action: Updated `docs/plans/ux_ui_refactor_plan.md` Phase 12.2/12.3 so these items no longer block completion.
- Source: `docs/plans/ux_ui_refactor_plan.md`, `output/ux-ui-browser-verification.mjs`, `output/live-clerk-signed-out-smoke.mjs`

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

### 2026-06-20 - Phase 0 Runtime Contract + Ticker Drilldown Slice Implemented

- Keywords: `phase-0`, `runtime-contract`, `supabase-context`, `fetchWithAuth`, `useApi`, `domain-hooks`, `ui-primitives`, `ticker-drilldown`, `app-shell-navigation`
- Decision: `GET /api/packet/:ticker` and `POST /api/analyze` must build portfolio/journal context from authenticated per-user Supabase rows or fail closed; markdown remains historical warning only.
- Action: Added backend contract tests and helper exports for Supabase-scoped analysis context, added `historical_context_warning` to verified packets, expanded `fetchWithAuth`, created domain hooks and shared primitives, added `/ticker/:symbol` with Dashboard/Watchlist/Journal/Market/Command Center entry points, added Cmd+K Command Palette ticker navigation, and reorganized the authenticated app shell with grouped navigation, collapsible sidebar, config utility link, and route-aware page header.
- Source: `backend/server.js`, `backend/tests/runtimeData.test.js`, `frontend/src/lib/api.js`, `frontend/src/hooks/`, `frontend/src/components/ui/`, `frontend/src/pages/TickerDetailPage.jsx`, `frontend/src/components/CommandPalette.jsx`, `frontend/src/App.jsx`

### 2026-06-20 - Dev UI Auth Bypass Contract Hardened

- Keywords: `dev-ui-auth-bypass`, `dev-ui-user`, `clerk`, `supabase-runtime`, `production-fail-closed`
- Decision: Local visual testing may use `Authorization: Bearer dev-ui-auth-bypass` only when `DEV_UI_AUTH_BYPASS=true` and `NODE_ENV` is not production; production must reject the bypass token and require Clerk-backed identity.
- Action: Added a shared backend request auth resolver, wired both `server.js` and runtime API routes to it, enabled the flag only in backend `npm run dev`, and added backend tests for enabled/disabled/production cases.
- Source: `backend/src/auth/requestAuth.js`, `backend/tests/devAuthBypass.test.js`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-20 - CSS Architecture Foundation Split

- Keywords: `css-architecture`, `style-modules`, `anti-slop`, `dark-terminal-ui`, `frontend-tests`
- Decision: `frontend/src/index.css` is now a thin style entrypoint that imports planned modules under `frontend/src/styles/`; tests that assert CSS selectors or tokens must read the imported bundle, not only the entry file.
- Action: Added `cssArchitectureContract` tests, split the large stylesheet into `tokens`, `base`, `layout`, `components`, `pages`, `utilities`, and `animations`, and enforced no Inter remnants, no transition-width, and no decorative box shadows outside focus rings.
- Source: `frontend/src/index.css`, `frontend/src/styles/`, `frontend/tests/cssArchitectureContract.test.js`

### 2026-06-21 - Dashboard North Star Decomposition

- Keywords: `dashboard-decomposition`, `portfolio-summary`, `holdings-table`, `scenario-planner`, `command-center-prefill`, `route-scroll-reset`
- Decision: Keep Dashboard as a composition-only operational overview backed by authenticated domain hooks; detailed analysis stays in Command Center and planned scenarios must not mutate journal/holdings until the user enters the trade workflow.
- Action: Extracted Dashboard panels and Scenario Planner, added flat responsive overview grids, wired ticker drilldown and `?ticker=` analysis handoff, added deterministic route scroll reset, and verified desktop/390px layouts with contract and browser tests.
- Source: `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/dashboard/`, `frontend/src/components/ScenarioPlanner.jsx`, `frontend/src/components/RouteScrollReset.jsx`, `frontend/tests/dashboard*.test.*`

### 2026-06-21 - Command Center Authenticated Analysis Flow

- Keywords: `command-center`, `authenticated-analysis`, `api-chat`, `supabase-context`, `quote-panel`, `runtime-contract`
- Decision: Command Center should be a component-composed analysis workspace; any analysis/chat answer that uses portfolio or journal context must go through authenticated Supabase-scoped verified packets and fail closed when AI/current data is unavailable.
- Action: Extracted Command Center panels and orchestration hook, added `/api/chat` on the verified packet path, kept schema unchanged, normalized quote delay metadata rendering, and verified desktop/mobile/browser/API behavior.
- Source: `frontend/src/pages/CommandCenterPage.jsx`, `frontend/src/components/command-center/`, `frontend/src/hooks/useCommandCenter.js`, `backend/server.js`, `backend/src/services/aiAnalyst.js`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - Journal Decision Loop Slice

- Keywords: `journal-page`, `decision-loop`, `url-filters`, `trade-drawer`, `post-mortem`, `supabase-journal`, `dev-auth-loop`
- Decision: Trade Journal Phase 5.1 stays schema-stable on the existing Supabase `journal` table; closed-trade thesis/post-mortem UX uses `notes` and `source_note` rather than adding new columns.
- Action: Extracted Journal filters/table/drawer components, added URL-persisted filters, sortable rows, expandable trade detail, risk-aware Log Trade drawer, stable dev auth bypass state, and a regression test for unstable `getToken` function identity.
- Source: `frontend/src/pages/JournalPage.jsx`, `frontend/src/components/journal/`, `frontend/tests/journalPage.test.jsx`, `frontend/src/auth/clerkAdapter.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - Analytics Closed-Trade Decision Loop

- Keywords: `analytics-page`, `closed-trades`, `equity-curve`, `metric-card`, `url-filters`, `supabase-journal`, `ponytail`
- Decision: Analytics Phase 5.2 should derive performance metrics from existing closed Supabase `journal` rows only; no chart dependency, API change, or schema migration is needed for the current plan.
- Action: Rebuilt Analytics around `useJournal`, native URL-persisted filters, shared `MetricCard` KPI cards, a minimal SVG cumulative P/L curve, and no-data vs no-match empty states with regression tests.
- Source: `frontend/src/pages/AnalyticsPage.jsx`, `frontend/src/components/analytics/`, `frontend/tests/analyticsPage.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - Portfolio Risk Holdings-Only Hardening

- Keywords: `portfolio-risk`, `risk-budget`, `missing-stop-loss`, `supabase-holdings`, `ponytail`
- Decision: Portfolio Risk Phase 6.1 stays on the existing Supabase `holdings` API shape; stop-loss data is optional/future-compatible and missing stops must render as unknown risk rather than inferred risk.
- Action: Refactored Risk page to use `usePortfolio`, accessible sector buttons, position-level risk rows, known-risk budget gauge, missing stop-loss highlighting, and a regression test blocking unstable auth fetch loops.
- Source: `frontend/src/pages/PortfolioRiskPage.jsx`, `frontend/src/components/risk/riskCalculations.js`, `frontend/tests/portfolioRiskPage.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - Market Explorer Display-Only Hardening

- Keywords: `market-explorer`, `display-quote-only`, `quick-analyze`, `sector-overview`, `theme-watchlists`, `ponytail`
- Decision: Market Explorer Phase 6.2 remains a discovery/display surface; it must not present static coverage as verified sector performance or execution-ready price data.
- Action: Added display-only quote warnings, static market/sector/theme overview, Space Data Center tickers in the local universe, row/theme Quick analyze handoff to Command Center, and preserved `/ticker/:symbol` drilldown through an Open detail action.
- Source: `frontend/src/pages/MarketExplorerPage.jsx`, `frontend/tests/marketExplorerPage.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - Config Local-Only Settings Restructure

- Keywords: `config-page`, `settings-sidebar`, `api-key-masking`, `per-section-save`, `localstorage`, `ponytail`
- Decision: Config Phase 7.1 is a frontend-local settings organization slice only; it must not change backend env/secret behavior or pretend local preferences configure Supabase runtime data.
- Action: Split Config into extracted config model/sidebar/section components, added General/API Keys/Risk Parameters/Notifications/Data Management sections, per-section dirty save, masked API key handling that excludes secrets from localStorage, and a page-size regression test.
- Source: `frontend/src/pages/ConfigPage.jsx`, `frontend/src/components/config/`, `frontend/tests/configPage.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - First-Run Empty States Without Sample Data

- Keywords: `first-run-empty-state`, `dashboard`, `journal`, `analytics`, `risk`, `supabase-empty`, `ponytail`
- Decision: First-run UX must guide empty Supabase accounts without sample rows, markdown runtime fallback, or schema changes.
- Action: Added first-run copy/actions for Dashboard, Journal, Analytics, and Risk; Dashboard routes to Journal, Journal opens Log Trade, Analytics requires a closed trade, and Risk explains the holdings requirement.
- Source: `frontend/src/components/dashboard/HoldingsTable.jsx`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/pages/JournalPage.jsx`, `frontend/src/pages/AnalyticsPage.jsx`, `frontend/src/pages/PortfolioRiskPage.jsx`, `frontend/tests/firstRunEmptyStates.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Hardening Automated Pass

- Keywords: `ux-ui-refactor`, `anti-slop`, `mobile-bottom-nav`, `stale-data`, `focus-visible`, `motion`, `phase-12`, `ponytail`
- Decision: Finish the production hardening slice with automated/static contracts only; do not add browser dependencies or unused live-update animation hooks.
- Action: Added CSS anti-slop contracts, stale-data indicator timing/display, mobile bottom-nav CSS, global focus-visible fallback, reduced-motion-safe drawer/toast/skeleton/route motion, and recorded that browser/VoiceOver/E2E smoke remains manual pending.
- Source: `frontend/tests/cssArchitectureContract.test.js`, `frontend/tests/appShellNavigation.test.jsx`, `frontend/tests/productionDataContract.test.js`, `frontend/src/styles/`, `frontend/src/hooks/useApi.js`, `frontend/src/components/ui/DataStamp.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Refactor Phase 12 Browser Evidence

- Keywords: `ux-ui-refactor`, `phase-12`, `cdp-browser-qa`, `impeccable-critique`, `contrast`, `keyboard-flow`, `voiceover-pending`
- Decision: Use clean headless Chrome CDP as the production browser-verification fallback when Playwright MCP is unavailable; do not add Playwright/Puppeteer just for this plan.
- Action: Verified route matrix `32/32`, contrast `4/4`, malformed quote state checks `2/2`, Cmd+K/keyboard focus flow, and saved desktop/mobile Dashboard/Market screenshots. Wrote Impeccable snapshot `.impeccable/critique/2026-06-21T07-19-12Z__frontend-src.md` with trend `28 -> 38`. Manual VoiceOver and full signed-in Clerk flows remain explicit pending items.
- Source: `docs/plans/ux_ui_refactor_plan.md`, `.impeccable/critique/2026-06-21T07-19-12Z__frontend-src.md`, `artifacts/screenshots/ux-ui-refactor-dashboard-desktop-cdp.png`, `artifacts/screenshots/ux-ui-refactor-market-mobile-cdp.png`

### 2026-06-21 - UX/UI Refactor Dev-Auth Flow Contracts

- Keywords: `ux-ui-refactor`, `phase-12`, `end-to-end-flow`, `dev-auth`, `new-user-flow`, `returning-user-flow`, `clerk-pending`
- Decision: Use RTL/App-shell dev-auth flow contracts as automated evidence for Phase 12.3 while keeping live Clerk sign-in verification as a separate manual gate; do not add browser E2E dependencies for this plan.
- Action: Added `frontend/tests/endToEndUserFlows.test.jsx` covering empty-account analyze/log/journal/analytics/risk flow and returning-user dashboard/ticker-detail/analysis/scenario-planner/journal append flow. Focused command passed: `npm test --workspace=frontend -- --run tests/endToEndUserFlows.test.jsx`.
- Source: `frontend/tests/endToEndUserFlows.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Refactor Accessibility Landmark Hardening

- Keywords: `ux-ui-refactor`, `phase-12`, `accessibility-tree`, `single-main-landmark`, `screen-reader`, `voiceover-pending`
- Decision: `App.jsx` owns the authenticated product `main` landmark; route pages must not add nested `<main>` landmarks. CDP Accessibility Tree smoke is useful automated evidence but does not replace manual VoiceOver verification.
- Action: Added an app-shell regression for nested main landmarks, converted authenticated page wrappers/panels from `main` to `div`/`section`, and verified 8 routes through Chrome CDP Accessibility Tree with one DOM/AX main landmark, one h1, named main navigation, and no unlabeled interactive controls.
- Source: `frontend/tests/appShellNavigation.test.jsx`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/pages/CommandCenterPage.jsx`, `frontend/src/pages/ConfigPage.jsx`, `frontend/src/pages/MarketExplorerPage.jsx`, `frontend/src/pages/TickerDetailPage.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Refactor Zero-Warning Quality Gate

- Keywords: `ux-ui-refactor`, `phase-12`, `zero-warning-lint`, `react-compiler`, `websocket-reconnect`, `scenario-planner-reset`, `prettier`
- Decision: Close the production quality gate with the smallest behavior-preserving fixes: remove unused exports, stabilize effect callbacks, use narrow documented lint suppressions for intentional lifecycle/provider patterns, and avoid file-splitting or new dependencies solely for Fast Refresh.
- Action: Reduced frontend lint warnings from 19 to 0, added a regression proving `ScenarioPlanner` clears draft levels after close/reopen, and formatted the refactor workspace. Verified with `npm run check:all --workspace=frontend`, `npm run lint --workspace=frontend -- --max-warnings=0`, and 45/45 backend tests.
- Source: `frontend/src/components/ScenarioPlanner.jsx`, `frontend/src/components/PixelTradingFloor.jsx`, `frontend/src/hooks/useAgentEvents.jsx`, `frontend/src/pages/WatchlistPage.jsx`, `frontend/tests/dashboardComponents.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Refactor CDP Matrix and Final Gate Refresh

- Keywords: `ux-ui-refactor`, `phase-12`, `cdp-browser-matrix`, `contrast-audit`, `mobile-ticker-detail`, `manual-voiceover-pending`
- Decision: Treat clean headless Chrome CDP plus automated dev-auth flows as the current production-style browser evidence, while keeping manual VoiceOver and live Clerk sign-in flows explicitly pending.
- Action: Added a one-off dependency-free CDP verifier under `output/`, fixed mobile Ticker Detail intrinsic overflow at 390px, reran route matrix `32/32`, contrast `8/8`, state matrix, keyboard flow, new-user browser flow, and returning-user browser flow. Full gates passed: frontend 27 files / 124 tests, lint, placeholder typecheck, architecture, build, backend 46 tests, Impeccable detector `[]`.
- Source: `output/ux-ui-browser-verification.mjs`, `frontend/src/styles/pages.css`, `frontend/tests/appShellNavigation.test.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-21 - UX/UI Refactor Live Clerk Boundary Smoke

- Keywords: `ux-ui-refactor`, `phase-12`, `clerk-signed-out`, `sign-in-surface`, `live-clerk-pending`
- Decision: Live Clerk verification can safely prove the signed-out boundary and sign-in surface without credentials, but signed-in new/returning flows still require user login and remain manual gates.
- Action: Added `output/live-clerk-signed-out-smoke.mjs` and verified `npm run dev --workspace=frontend` renders Landing instead of authenticated shell, has no missing publishable-key state, and opens the Clerk sign-in surface from Sign In.
- Source: `output/live-clerk-signed-out-smoke.mjs`, `frontend/src/auth/clerkAdapter.jsx`, `frontend/src/main.jsx`, `docs/plans/ux_ui_refactor_plan.md`

### 2026-06-27 - Unbiased Institutional CIO Upgrade & AI Documentation Map

- Keywords: `institutional-cio`, `piotroski-f-score`, `altman-z-score`, `roce`, `anchored-vwap`, `zvr-ratio`, `documentation-map`, `typography-compliance`
- Decision: Implemented the institutional-grade upgrade by adding F-Score, Z-Score, ROCE, and Anchored VWAP calculations to the Python market oracle, enforcing their thresholds in the backend decision engine, and displaying them as metric cards on the frontend ticker detail page. Created a dedicated AI Agent documentation map and formatted ADR 0004 with YAML frontmatter/runnable verifications to align with repo standards. Performed a UI/UX audit using Vercel Web Interface Guidelines, fixing loading states and placeholders to use the standard horizontal ellipsis (`…`) character instead of straight periods (`...`).
- Action: Updated `tools/market_oracle.py`, `backend/src/decision/decisionEngine.js`, `frontend/src/pages/TickerDetailPage.jsx`, created `docs/DOCUMENTATION_MAP.md`, updated `docs/adr/0004-unbiased-institutional-quality-gates.md`, modified 6 frontend files to fix ellipsis typography, created `docs/plans/institutional_risk_refactor_plan.md` containing the approved design options, and validated using Vitest/Node test runner (182 total checks pass).
- Source: `plan.md`, `tools/market_oracle.py`, `backend/src/decision/decisionEngine.js`, `frontend/src/pages/TickerDetailPage.jsx`, `docs/DOCUMENTATION_MAP.md`, `docs/adr/0004-unbiased-institutional-quality-gates.md`, `frontend/src/Dashboard.jsx`, `frontend/src/components/command-center/TickerInput.jsx`, `frontend/src/components/command-center/TradeTicket.jsx`, `frontend/src/components/journal/TradeLogDrawer.jsx`, `frontend/src/components/command-center/ChatPanel.jsx`, `frontend/src/components/command-center/AnalysisControls.jsx`, `docs/plans/institutional_risk_refactor_plan.md`

### 2026-06-27 - Institutional Portfolio Risk Upgrades

- Keywords: `drawdown-breaker`, `sector-limit`, `time-stop`, `trailing-stop`, `exchange-rate`, `cognitive-bias`
- Decision: Implemented institutional risk rules including: 15% drawdown breaker, 30% sector concentration cap, weekly S&P 500 EMA200 macro filter, next earnings proximity size cap, daily trailing stop lock levels, position time stops (5 days Quick, 15 days Swing), USD/THB exchange rates, and cognitive bias logging.
- Action: Updated codebases. Ran CodeRabbit review and applied fixes: normalized local midnight timezone calculations on earnings date check in `TickerDetailPage.jsx`, resolved S&P 500 macro and FX rate hardcoded default value leaks in `market_oracle.py`, secured strict 3-state macro risk validation and corrected the trailing stop activation math in `decisionEngine.js`, and standardized cognitive bias naming. Verified that all 182 test cases pass and build compiles cleanly.
- Source: `docs/plans/institutional_risk_refactor_plan.md`
