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

## Skill Workflow Guide

Use skills as scoped workflow helpers, not as replacements for this repo's investment rules. Before choosing a skill, follow the read order above and classify the task. If a skill touches prices, investment advice, portfolio decisions, or market-moving data, it must stay under the Orchestrator Data Contract, Current Price Acceptance Gate, and journal review rules below.

### Skill Selection Matrix

| Task Type | Required / Preferred Skills | Use When |
|---|---|---|
| Start any non-trivial repo task | `superpowers:using-superpowers` | Select the right workflow before asking detailed questions, editing files, or running implementation steps. |
| New feature, UI, behavior, config, or durable workflow change | `superpowers:brainstorming` | Design first, compare approaches, and get user approval before implementation. |
| Implementation planning | `superpowers:writing-plans` | Convert an approved design into a concrete plan before multi-step changes. |
| Executing an approved plan | `superpowers:executing-plans` | Work through a written plan and update progress as tasks complete. |
| Bug, broken behavior, data mismatch, or uncertain root cause | `superpowers:systematic-debugging` or `diagnose` | Reproduce, classify, and diagnose before changing code. |
| Logic with regression risk | `superpowers:test-driven-development` or `tdd` | Add or update tests first for gates, API contracts, packet building, decision rules, and bug fixes. |
| Frontend React/Vite work | `build-web-apps:react-best-practices` or `vercel:react-best-practices` | Component structure, state/data flow, performance, and maintainability. |
| Dashboard UI, visual polish, accessibility, and anti-slop review | `impeccable`, `design-taste-frontend`, `gpt-taste`, or `web-design-guidelines` | Dashboard, Command Center, Pixel Agent, mobile layout, visual hierarchy, accessibility, interaction quality, and anti-slop checks. |
| Impeccable UI critique backlog | `impeccable critique`, `impeccable audit`, `impeccable polish`, `impeccable harden`, `impeccable clarify`, `impeccable animate` | Use the command that matches the UI issue; read the latest relevant `.impeccable/critique/*` file before applying critique-driven fixes. |
| Browser or visual verification | `build-web-apps:frontend-testing-debugging`, `playwright`, or Browser plugin | After meaningful UI changes, verify the local app with browser checks, screenshots, and layout inspection. |
| shadcn/ui or local UI primitives | `build-web-apps:shadcn` or `vercel:shadcn` | Changes under `frontend/src/components/ui/*` or component-system conventions. |
| Supabase or Postgres changes | `supabase:supabase` and `supabase-postgres-best-practices` | Schema, queries, RLS/auth implications, migrations, and database performance. |
| API/backend/security-sensitive work | `security-best-practices`; use OpenAI-specific skills only when touching OpenAI APIs | Express routes, validation, auth, external calls, secrets, permissions, and predictable failure behavior. |
| Code review / milestone audit | `review`, `coderabbit:code-review`, or `superpowers:requesting-code-review` | Review behavioral risk, missing tests, regressions, security issues, and maintainability before handoff. |
| Final verification before claiming completion | `superpowers:verification-before-completion` | Run the appropriate checks and inspect outputs before saying the task is done. |
| Deployment or Vercel workflow | `vercel:deployments-cicd`, `vercel:vercel-cli`, or `deploy-to-vercel` | Deployments, environment variables, build failures, preview/prod verification, and CI/CD issues. |
| Discovering or installing new skills | `find-skills` | Search, evaluate source reputation/install count, and avoid adding low-trust skills to durable workflows. |
| Creating custom MyPortStock workflows | `skill-creator` or `write-a-skill` | Only after a repeated repo-specific pattern stabilizes, such as quote-gate review or dashboard quality review. |

### Skill Guardrails

- Skills may guide workflow, implementation, review, or verification, but they are not investment-decision authority.
- No skill or sub-agent may bypass the Main Orchestrator for current market data.
- Do not use analyst targets, fair value estimates, 52-week ranges, search snippets, or chart-only labels as `Last Price`.
- Do not install or require paid market-data skills, APIs, or plans unless the user explicitly asks for paid options.
- Treat external finance skills as experimental unless their source, install count, behavior, and risks have been reviewed.
- For autonomous scans or alert loops, define max tickers, max API calls, timeout, retry limit, cost cap, and kill switch before implementation.
- For frontend changes, verify both automated checks and visible UI behavior when practical.
- For Impeccable-driven work, run its setup/context step, use the product UI register for this dashboard, preserve the dark-first high-legibility design language, and avoid AI-slop patterns such as decorative glow, gradient text, over-rounded cards, glassmorphism by default, and motion that does not communicate state.
- For investment logic changes, add tests for fail-closed behavior and false `Buy/Add` prevention.

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
