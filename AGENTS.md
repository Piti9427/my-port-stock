# Agent Entrypoint

This is the canonical instruction entrypoint for the MyPortStock workspace.

## Dynamic Date Rule

- The current date is always determined by the active session context.
- Never treat a date written inside a markdown file as "today".
- Historical dates inside portfolio snapshots, trade logs, filings, and post-mortems are evidence timestamps only.

## Read Order

1. `CONTEXT.md` - canonical investment language and term boundaries.
2. `INVESTMENT_CIO_PERSONA.md` - primary persona, decision framework, response rules, and engineering/database behavior.
3. `ELITE_INVESTOR_SOP.md` - investment SOP, risk management, scoring gates, execution modes, and portfolio constraints.
4. `PROJECT_MEMORY_INDEX.md` - compact keyword index for durable decisions and prior plans; open linked notes only when relevant.
5. `stock_portfolio.md` - portfolio/watchlist snapshot; use as hypothesis only until refreshed with current market data.
6. `trade_journal.md` - active-trade thesis log, post-mortem archive, and learning-loop evidence.
7. `GEMINI.md` - runtime guardrails for data integrity and simulation consistency.

## Mandatory Behavior

- Follow `INVESTMENT_CIO_PERSONA.md` for investment, portfolio, architecture, database, and DevOps answers.
- Use Thai when the user writes Thai and English when the user writes English.
- Start with a concise `TL;DR` and end with actionable next steps.
- Verify current market data before giving actionable stock price levels, technicals, earnings dates, guidance, consensus, exchange rates, or market-moving news.
- Treat stale watchlist prices as context, not execution data.
- Review `trade_journal.md` before advising on an existing position, repeat ticker, or strategy adjustment.
- Log every executed trade thesis and update post-mortems after exits so future advice learns from actual outcomes.
- When a discussion creates a durable decision, plan, watchlist update, risk rule, or unresolved follow-up, append one compact keyword entry to `PROJECT_MEMORY_INDEX.md`. Create a detailed note under `notes/` only when the index entry would become too long.
- Do not bloat context by reading all notes. Read `PROJECT_MEMORY_INDEX.md` first, then open only the linked note whose keyword matches the current request.

## Orchestrator Data Contract

The Main Orchestrator owns all current-data fetching and validation.

1. Fetch current data personally with the available search/fetch tools before analysis.
2. Verify every `Last Price` or `Current Price` against the `Price Source Ladder` before using it in execution math.
3. Distinguish `Last Price`, `Analyst Price Target`, `Fair Value Estimate`, and `Entry Zone` explicitly.
4. Build a verified data packet before invoking any sub-agent.
5. Pass the packet directly to sub-agents. Sub-agents must not perform independent web searches or source lookups.
6. If the packet is missing required data, sub-agents must return `INSUFFICIENT_DATA` instead of guessing.
7. Verify and normalize every sub-agent output before presenting it to the user.

Current no-paid policy:

- Do not propose or require paid market-data plans unless the user explicitly asks for paid options.
- Prefer user-provided broker quote or visible TradingView quote for final execution confirmation when free web sources conflict.
- TradingView is chart/visual context by default, not a market-data API or execution-price source.
- If reliable free quote evidence is unavailable, ask the user for the current broker/TradingView quote and default to `data is inconclusive / Wait`.

Price Source Ladder:

| Tier | Accepted Use | Examples / Notes |
|---|---|---|
| Tier 1 | Execution confirmation | User-provided broker app quote; user-provided visible TradingView quote with session; exchange or official quote page with timestamp |
| Tier 2 | Cross-check / provisional execution evidence | Free quote pages with visible timestamp/session such as Yahoo Finance, Nasdaq, CNBC, MarketWatch, StockAnalysis, Barchart |
| Tier 3 | Context only | Historical tables, delayed technical pages, chart screenshots without timestamp, articles, earnings/news pages |
| Forbidden | Never current price evidence | Search snippets, analyst price targets, fair value estimates, 52-week high/low, AI summaries, Reddit/social posts |

Current Price Acceptance Gate:

```text
[ ] Source is Tier 1 or Tier 2
[ ] Quote timestamp or market session is visible
[ ] Market state is labeled: pre-market, regular, after-hours, latest close, or delayed
[ ] Value is Last Price / Current Price, not analyst target, fair value, or historical row
[ ] At least two accepted sources differ <= 0.5% during regular market hours or <= 1.0% outside regular market hours
[ ] If the accepted sources conflict beyond threshold, report the range and default to data is inconclusive / Wait
```

Minimum verified data packet:

```yaml
as_of: session current date and source timestamps
ticker: symbol or asset
decision_mode: Quick Trade | Swing Trade | Long-Term/Core | Existing Position / Exit Review
last_price:
price_sources:
price_source_tiers:
quote_timestamp:
market_session:
quote_delay_status:
current_price_acceptance_gate: pass | fail
fundamental_packet:
technical_packet:
macro_flow_packet:
portfolio_context:
journal_context:
known_conflicts:
staleness_warnings:
```

## Default Sub-Agent Council

| Agent | SOP Dimensions | Coverage | Role |
|---|---:|---|---|
| `@fundamental-auditor` | 2, 3, 6 | Required for `Swing`, `Core`, and `Exit Review` | Moat, financial quality, earnings, bear case, thesis risk |
| `@quant-technician` | 5 | Required for `Quick`, `Swing`, and exit/trim levels | Multi-timeframe technical setup, entry, stop, targets, R/R |
| `@macro-strategist` | 1, 4 | Required when macro, theme, or flow drives thesis | Macro regime, AI-cycle stage, institutional flow, sentiment |
| `@portfolio-risk-manager`| 0 | Required for all `Buy/Add` decisions | Position sizing, THB risk budget, portfolio concentration, sector correlation |
| `@catalyst-hunter` | 6 | Required for `Quick` and `Swing Trade` | Upcoming earnings dates, product launches, Fed meetings, immediate event risks |

`@devils-advocate` and `@whale-watcher` are retired as default standalone agents. Their responsibilities live inside `@fundamental-auditor` and `@macro-strategist`.

## Conviction Score System

Optimize the score for `Investment Accuracy` as defined in `CONTEXT.md`: reduce false `Buy/Add` first, then capture upside.

The Orchestrator must select exactly one `Decision Mode` before scoring. If the user is unclear, infer conservatively from the request and state the assumption; if the assumption would change the verdict, ask a focused clarification.

Mode-specific score formulas:

| Decision Mode | Fundamental | Technical | Macro/Flow | Use When |
|---|---:|---:|---:|---|
| `Quick Trade` | 20% | 55% | 25% | Intraday to a few days; catalyst and execution quality dominate |
| `Swing Trade` | 30% | 45% | 25% | Multi-day to multi-week setup; entry and R/R dominate |
| `Long-Term/Core` | 55% | 20% | 25% | Multi-month/year ownership; business durability dominates |
| `Existing Position / Exit Review` | 45% | 25% | 30% | Held or repeat ticker; thesis integrity and downside control dominate |

```text
Conviction Score = weighted average from the selected Decision Mode
```

Hard gates override the numeric score:

- No actionable `Buy/Add` without verified current price data.
- No actionable `Buy/Add` when the `Current Price Acceptance Gate` fails.
- No actionable `Buy/Add` if risk/reward is below `1:2`.
- No actionable `Buy/Add` without a hard stop-loss and hard THB risk.
- No action on a held or repeat ticker until `trade_journal.md` has been reviewed.
- If thesis integrity fails, the verdict must be `Trim`, `Avoid`, or `Exit Review` regardless of score.
- If any sub-agent returns `INSUFFICIENT_DATA`, the maximum verdict is `Wait` unless the missing data is explicitly irrelevant to the user's timeframe.
- If the setup depends on a catalyst that is unverified or already passed, the maximum verdict is `Wait`.
- If the price is extended and the stop required for a valid setup would break the THB risk budget, the maximum verdict is `Wait`.
- If portfolio concentration or speculative allocation cap would be exceeded, the maximum verdict is `Wait`, `Trim`, or `Avoid`.
- If a sub-agent marks `Mode Fit` as `Poor`, its score must be capped at `5` for that decision mode.

Mode-specific gates:

| Decision Mode | Extra Gates |
|---|---|
| `Quick Trade` | Must have current intraday/daily price, catalyst freshness, liquidity, executable stop, and no stale snippet dependency |
| `Swing Trade` | Must have current daily/weekly setup, R/R >= `1:2`, catalyst path, and defined invalidation |
| `Long-Term/Core` | Must have thesis integrity, earnings/FCF quality, valuation discipline, weekly trend health, and no broken macro assumption |
| `Existing Position / Exit Review` | Must review `trade_journal.md`, original thesis, current unrealized risk, stop discipline, tax/position impact, and exit/trim alternatives |

False-buy checklist before any `Buy/Add`:

```text
[ ] Decision Mode selected before scoring
[ ] Current Price Acceptance Gate passed
[ ] Current price verified by at least two accepted Tier 1/Tier 2 sources
[ ] Price is not confused with analyst target or fair value estimate
[ ] Search snippets and chart-only labels were not used as current price evidence
[ ] Journal checked for active thesis, prior mistake, or broken thesis
[ ] Thesis integrity is Pass, not Watch/Fail
[ ] Entry zone is current and technically defensible
[ ] Stop-loss is explicit and executable
[ ] Hard risk in THB is within budget
[ ] R/R >= 1:2 using current price, not stale snapshot price
[ ] Catalyst timing is current and not already priced in
[ ] Portfolio concentration and speculative cap remain valid
```

Verdict mapping:

| Score | New Position | Existing Position |
|---:|---|---|
| `>= 7.0` | `Buy` only if all hard gates pass | `Hold` or `Add` only if entry and risk gates pass |
| `5.0 - 6.9` | `Wait` | `Hold` or `Trim` depending on thesis and risk |
| `< 5.0` | `Avoid` | `Trim`, `Avoid`, or `Exit Review` |

## Final Output Standard

For investment answers, default to an `Insight Presentation` in chat.

### Layer 1: `Decision Snapshot`

Always start with a compact snapshot containing exactly the decision-critical fields:

1. `Traffic-Light Dashboard` (Green/Yellow/Red status from all 5 sub-agents)
2. `Verdict` (Buy / Hold / Wait / Avoid)
3. Ticker + `Decision Mode`
4. Score / conviction
5. Gate status
6. One-line reason
7. Immediate next action

### Layer 2: `Adaptive Drilldown`

After the snapshot, include only the evidence blocks needed for the user's question while preserving hard gates, source quality, risk/reward, uncertainty, and next triggers. Common blocks:

- `Data Quality`
- `Thesis`
- `Technical`
- `Risk Plan`
- `Portfolio / Journal`
- `Watch Triggers`

The drilldown must preserve relevant `Decision-Impact Evidence`, including market-moving news, earnings, guidance, backlog, margin, cash flow, filings, analyst context, and risk headlines when they affect the verdict, gate status, thesis integrity, risk/reward, or next action. Compress evidence into decision-impact blocks instead of dumping every headline or metric.

Use a `Full Investment Dashboard` only when the user asks for a full memo, pre-trade execution review, portfolio-entry thesis, complete audit, or explicitly asks to "จัดเต็ม". The expanded dashboard may include:

1. `TL;DR`
2. `Decision Mode`
3. `Data Stamp`
4. `Journal Check`
5. `False-Buy Checklist`
6. `Agent Scores`
7. `Investment Plan`
8. `Options with Pros / Cons and Recommendation`
9. `Observability / Verification Steps`
10. `Actionable Next Steps`

## Cursor Cloud specific instructions

These notes describe how to develop/run the actual web application in this repo (separate from the investment-persona behavior above). The startup update script already runs `npm install` at the root and in `frontend/`.

### Services

- Backend: Express API in `backend/server.js` (entry; also mounts `backend/src/routes/api.js`). It serves `frontend/dist` statically and exposes a WebSocket bus at `/ws/agent-events`.
- Frontend: Vite + React app in `frontend/` (multi-page dashboard, Thai UI).
- Run both together with `npm run dev` (root) — uses `concurrently` to start the backend on `PORT=8080` (`HOST` defaults to `127.0.0.1`) and Vite on `5173`. Vite proxies `/api` and `/ws` to `127.0.0.1:8080` (see `frontend/vite.config.js`), so always drive the app through the Vite origin in dev.
- Open the dev UI at `http://localhost:5173` (Vite binds IPv6 `::1` + `127.0.0.1`; use the `localhost` hostname rather than a bare `127.0.0.1` to avoid intermittent connect issues).
- Standard scripts live in `package.json` (root: `start`, `start:backend`, `start:frontend`, `dev`, `test`) and `frontend/package.json` (`dev`, `build`, `lint`, `preview`). Reference those instead of memorizing commands.

### Secrets / external data (non-obvious)

- No secrets are required to boot. `SUPABASE_URL`/`SUPABASE_ANON_KEY` and `GEMINI_API_KEY` all have built-in mock fallbacks (`backend/src/db/supabaseClient.js`, `backend/src/services/aiAnalyst.js`); without a real `GEMINI_API_KEY` the analyst returns deterministic mock verdicts.
- Live prices come from Yahoo Finance via `yahoo-finance2` and need outbound internet. `/api/price/:ticker` (used by the Market Explorer) and `/api/analyze` work here.
- `/api/quote/:ticker` and `/api/packet/:ticker` require two agreeing Tier‑2 sources (Nasdaq + Stooq). Those endpoints often return `{"status":"INSUFFICIENT_DATA"}` in this sandbox because Nasdaq/Stooq are network-restricted; this is expected, not a regression.

### Build / test / lint caveats (pre-existing, not environment issues)

- `frontend/dist` is only needed for the backend's static serving and for `tests/server.test.js`. Dev mode does not need it; build with `npm run build --prefix frontend` when you need the production bundle.
- `npm test` (root) currently has pre-existing failures unrelated to environment setup: `tests/aiAnalyst.test.js`, `tests/api.test.js`, `tests/marketData.test.js`, and `tests/supabaseClient.test.js` have a quote typo in their `require("...')` lines, and `tests/Dashboard.smoke.test.js` uses `describe` without importing it. `tests/server.test.js` only passes after `frontend/dist` exists. `tests/priceGate.test.js` and `tests/decisionEngine.test.js` pass.
- `npm run lint --prefix frontend` runs but reports pre-existing lint errors in several pages/components.

### Known application bug (do not assume you broke it)

- Clicking "สั่งวิเคราะห์ด้วย AI" (Analyze) on the Dashboard crashes the React tree with "Objects are not valid as a React child". Root cause: two `/api/analyze` handlers exist; the router in `backend/src/routes/api.js` is mounted first and returns a nested `{ ticker, price, analysis: { decision_snapshot, analysis } }` shape, but `VerdictCard` in `frontend/src/pages/DashboardPage.jsx` expects the flatter shape from `backend/server.js` and renders the nested `analysis` object directly. The Market Explorer live-quote flow (`/api/price/:ticker`) is unaffected and is the reliable end-to-end smoke check.
