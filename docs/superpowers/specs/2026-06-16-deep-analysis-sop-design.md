# Design Specification: Deep 7-Dimension SOP & SWOT Analysis Integration
**Date:** 2026-06-16  
**Status:** Brainstorming Validation / Architectural Review  

---

## 1. Goal & Objectives

The goal is to restore deep fundamental, technical, and SWOT audits of stocks according to the `ELITE_INVESTOR_SOP.md` framework in the MyPortStock application. Currently, the AI analyst lacks real-time financial statements, balance sheet stats, and multi-timeframe weekly/daily technical indicators. This causes the AI to output arbitrary scores and generic text.

---

## 2. Architecture & Components (Clean Architecture)

Following **Clean Architecture** principles, the system is strictly decoupled into layers. Dependencies only point inward.

```
       +---------------------------------------------+
       |             PRESENTATION LAYER              |
       |  - React UI (Dashboard, CommandCenter)     |
       +---------------------------------------------+
                              │
                              ▼ (JSON APIs & WebSockets)
       +---------------------------------------------+
       |             APPLICATION SERVICES            |
       |  - server.js (Express endpoints)            |
       |  - aiAnalyst.js (LLM prompt orchestration)  |
       +---------------------------------------------+
                              │
                              ▼ (Stable Interfaces)
       +---------------------------------------------+
       |                DOMAIN LAYER                 |
       |  - decisionEngine.js (SOP validations)      |
       |  - Stable Data Contract Schemas             |
       +---------------------------------------------+
                              ▲
                              │ (Adapter Translation)
       +---------------------------------------------+
       |             INFRASTRUCTURE LAYER            |
       |  - market_oracle.py (Python subprocess)     |
       |  - External APIs (Yahoo Finance API)        |
       +---------------------------------------------+
```

### Clean Architecture Boundaries:
* **Decoupled Data Source:** `market_oracle.py` acts as an infrastructure gateway. It queries `yfinance`, performs math, and outputs a normalized JSON. It has no knowledge of how the data is used for decisions.
* **Stable Domain Model:** The domain services (`decisionEngine.js`) operate solely on domain entities, isolated from infrastructure renames or API changes.
* **Separation of Presentation:** React components only manage user interactions and visual states (tabs, accordions), consuming clean JSON inputs.

---

## 3. Pragmatic Domain-Driven Design (DDD)

We split the system into clear, cohesive bounded contexts to ensure domain logic is focused and testable.

* **Bounded Contexts:**
  1. **Market Data Context:** Responsible for pulling prices, raw statement figures, and technical history. Its boundary ends at the JSON output of the python script.
  2. **Audit / Evaluation Context:** Responsible for checking SOP checklists, verifying price acceptance gates, and calculating the weighted conviction scores. Its boundary is managed by the `decisionEngine.js`.
  3. **Trade Execution Planning Context:** Responsible for computing ATR-based entry zones, stops, targets, and calculating position sizing.
* **Entities & Aggregate Roots:**
  * **Aggregate Root:** `StockDataPacket` - a validated collection containing fundamental statistics, technical history, and portfolio relationships. It is the single source of truth passed to services.

---

## 4. SOLID Principles

1. **Single Responsibility Principle (SRP):**
   * `market_oracle.py` only fetches and cleans raw market data.
   * `aiAnalyst.js` only manages LLM instructions and structures.
   * `decisionEngine.js` only executes checklist math and weights.
2. **Open/Closed Principle (OCP):**
   * The tabbed layout in the UI is structured dynamically. New tabs or metrics can be added without modifying the core sidebar drawer or state controllers.
3. **Liskov Substitution Principle (LSP):**
   * Standard and manually overridden quote packets share a polymorphic interface, allowing the decision engine to parse them interchangeably without custom type checks.
4. **Interface Segregation Principle (ISP):**
   * UI components only receive the specific sub-structures they require (e.g. `swot` component receives only the SWOT JSON object).
5. **Dependency Inversion Principle (DIP):**
   * Application services depend on a high-level JSON schema (data contract), not on the low-level python implementation details or database configurations.

---

## 5. Design Patterns Applied

* **Strategy Pattern:** Implemented in `decisionEngine.js` to compute conviction scores using different weighted strategy matrices (`Quick Trade`, `Swing Trade`, `Long-Term/Core`, `Exit Review`) depending on the active `decisionMode`.
* **Adapter Pattern:** Implemented in `market_oracle.py` and `server.js` to translate raw, volatile API structures (such as yfinance naming drift like `'Capital Expenditure'`) into a stable, typed JSON format for domain consumers.
* **Observer Pattern (Pub-Sub):** Managed via WebSockets in `server.js` to broadcast real-time sub-agent states (`ANALYSIS_PROGRESS`, `ANALYSIS_COMPLETE`) to the frontend during long-running audits.

---

## 6. DevOps / CI/CD & Automation

* **Automated Regression Suite:** All changes must pass the backend test framework (`node --test tests/*.test.js`). 
* **Static Analysis:** Pre-commit hooks (`lint-staged`) enforce code style (`prettier`) and syntax verification (`eslint`).
* **Environment Safeguards:** Verification tests check that the build fails immediately if critical env variables (like `GEMINI_API_KEY` or `CLERK_SECRET_KEY`) are missing, preventing un-executable builds from going live.

---

## 7. Secure by Design

* **Command Injection Prevention (OS Sandbox):** 
  * The backend runs the Python script using `execFile` or `spawn` with a strict array of arguments: `['tools/market_oracle.py', ticker]`.
  * The `ticker` argument is validated against a strict alphanumeric regex `^[A-Za-z0-9.-]{1,10}$` before execution.
  * We **never** use string interpolation or shell execution (`exec`), closing all avenues for shell injection.
* **Data Leak Prevention:** Standardize logs to ensure no private credentials, Clerk JWTs, or database passwords are printed to stdout or stored in server logs.
* **Least Privilege:** API routes enforce user authentication and restrict database queries using Clerk-based Row Level Security (RLS) in Supabase.

---

## 8. Observability & SRE / Reliability

* **Timeouts & Deadlines (SRE Guardrails):**
  * Subprocess Execution: Strict 10-second timeout on the Python oracle command to prevent server hangs.
  * API Requests: Strict 8-second timeout on the Gemini API calls.
* **Fail-Closed Graceful Degradation:**
  * If the python script or Gemini API fails or times out, the service catches the error, records the warning log, and falls back to a safe `Wait` verdict with a clear indicator on the UI, rather than crashing the Express server.
* **Observability (Logging & Telemetry):**
  * Sentry is integrated in both backend (`server.js`) and frontend (`App.jsx`) to capture runtime errors, API latency, and performance bottlenecks.
  * Critical errors during the yfinance parsing loop are printed to stderr with descriptive contextual codes.

---

## 9. Evolutionary Architecture

* **Schema Extensibility:** The JSON contract between Python, Node.js, and React is built with evolutionary principles. All properties are optional or have safe defaults. Future additions (e.g. options data, news feeds, macro indicators) can be added as optional fields in `market_oracle.py` without breaking existing backend code or UI pages.

---

## 10. Agent Skills & Workflows (Agile Delivery Tools)

This task uses all relevant tools and skills as a coordinated workflow, not as a literal inventory of every installed capability. Skills are workflow helpers only; they are not investment-decision authority and must not bypass the Main Orchestrator's data contract.

### 10.1 Workflow Principle

1. **Main Orchestrator owns truth:** Only the Main Orchestrator may fetch, validate, and normalize current market data. All downstream agents, skills, and UI components consume the verified data packet.
2. **Investment gates override skill output:** Price Source Ladder, Current Price Acceptance Gate, journal review, thesis integrity, hard stop-loss, hard THB risk, and fail-closed rules override every score, sub-agent opinion, or external skill recommendation.
3. **Relevant skills only:** Use every relevant skill/tool for this task, but do not force unrelated skills into the workflow. A skill must map to discovery, design, implementation, security, data integrity, frontend quality, review, or verification.
4. **Optional skills are not dependencies:** Skills discovered through `find-skills` remain candidates until source reputation, install count, repository quality, and behavior are reviewed. Do not make optional skills required gates before that review.

### 10.2 Tool + Skill Orchestration By Phase

| Phase | Tools / Skills | Purpose | Required Output |
|---|---|---|---|
| Start / Orientation | `superpowers:using-superpowers`, repo read order, `rg`, file inspection, `PROJECT_MEMORY_INDEX.md` | Confirm the applicable workflow, repo conventions, durable decisions, current design state, and dirty worktree boundaries before changing anything. | Scoped task understanding, affected files, and unrelated existing changes identified. |
| Design / Planning | `superpowers:brainstorming`, `superpowers:writing-plans`, `find-skills` | Shape the work into an approved design and implementation plan; discover candidate skills only when the current installed set is insufficient. | Approved spec/plan with clear assumptions and optional skill backlog. |
| Market Data / Finance Truth | Main Orchestrator, accepted web/search/fetch sources, user/broker quote when needed | Build the verified data packet for any investment-sensitive analysis. Sub-agents must not independently search market data. | `last_price`, source tiers, timestamps/session, delay status, conflicts, journal context, and gate status. |
| Implementation | `tdd` or `superpowers:test-driven-development`, `diagnose` or `superpowers:systematic-debugging`, `security-best-practices`, `supabase:supabase`, `supabase:supabase-postgres-best-practices`, `vercel:react-best-practices` | Implement one vertical slice at a time with a failing public-interface test first; protect subprocess execution, auth, RLS, runtime data access, and React data flow. | Passing targeted tests for oracle output, API contracts, fail-closed decision logic, and UI packet consumption. |
| Frontend Quality | `impeccable`, `design-taste-frontend`, `web-design-guidelines`, `playwright` or Browser plugin | Keep the deep-analysis dashboard consistent with the dark-terminal product UI and verify interaction quality visually. | Desktop/mobile checks for tabs, SWOT accordions, financial tables, technical badges, trade ticket, loading/error states, and text containment. |
| Review / Verification | `review` or `superpowers:requesting-code-review`, `superpowers:verification-before-completion` | Audit behavioral risk, missing tests, security regressions, data-integrity gaps, and final readiness. | Review findings resolved or documented; backend tests, frontend tests, build checks, and browser verification completed before handoff. |

### 10.3 Parallel Agent Council Contract

The Default Sub-Agent Council may work in parallel only after the Main Orchestrator has prepared a verified data packet. Each agent receives the same packet and returns a bounded result. No agent may perform independent web searches, quote lookups, filings retrieval, news lookup, or social-source scans.

| Agent | Scope | Inputs | Failure Mode |
|---|---|---|---|
| `@fundamental-auditor` | SOP Dimensions 2, 3, 6: moat, financial quality, earnings quality, bear case, thesis integrity | Verified fundamental packet, financial statements, journal context, known conflicts | Return `INSUFFICIENT_DATA` if financials, earnings context, or thesis evidence are missing. |
| `@quant-technician` | SOP Dimension 5: W1/D1 setup, trend health, entry zone, stop, target, R/R | Verified current price, weekly/daily technical packet, volume data, ATR/RSI/ZVR fields | Return `INSUFFICIENT_DATA` if current price or technical inputs are stale, missing, or contradictory. |
| `@macro-strategist` | SOP Dimensions 1, 4: macro regime, AI-cycle stage, institutional flow, sentiment | Verified macro/flow packet, market regime notes, source timestamps | Return `INSUFFICIENT_DATA` if macro or flow evidence is not source-backed. |
| `@portfolio-risk-manager` | SOP Dimension 0: position sizing, THB risk, concentration, speculative caps | Portfolio context, broker/user cash data when available, journal context, hard-risk rules | Return `INSUFFICIENT_DATA` if position size, cash, or current exposure cannot be verified. |
| `@catalyst-hunter` | Catalyst freshness for Quick/Swing setups | Verified catalyst/news packet with source timestamps | Return `INSUFFICIENT_DATA` if catalyst timing is unverified, stale, or already passed. |

The Orchestrator normalizes all agent outputs, applies hard gates, caps any `Poor` mode-fit score at `5`, and downgrades to `Wait` when required data is missing. A `Buy/Add` verdict is impossible unless every hard gate passes.

### 10.4 Optional Skill Discovery Backlog

The current session does not expose `ml-best-practices`, `notebook-guidance`, or `managing-python-dependencies` as callable skills, even though `GEMINI.md` lists them as desired project skills. These remain discovery candidates, not required dependencies.

1. **Quantitative / ML audit candidate:** Needed for FCF margin math, quarterly trend normalization, RSI-14, ZVR, moving-average slope, ATR, and score calibration. `npx skills find quantitative finance` surfaced `omer-metin/skills-for-antigravity@quantitative-research` (1.9K installs) and `404kidwiz/claude-supercode-skills@quant-analyst` (1.1K installs). Review source reputation and repository quality before use.
2. **Python dependency candidate:** Needed only if new Python dependencies are added or yfinance / pandas / technical-analysis packages are changed. `npx skills find python dependencies` surfaced `wshobson/agents@uv-package-manager` (10.3K installs) as the strongest candidate. Do not add Python production dependencies without explicit approval.
3. **React testing candidate:** Existing local skills are enough for most React work. If UI test scope expands materially, `npx skills find react testing security` surfaced `affaan-m/everything-claude-code@react-testing` (467 installs). Treat it as lower-priority than installed `vercel:react-best-practices`, `tdd`, and Playwright workflows.

### 10.5 Explicit Constraints

* Do not install or require paid market-data tools, APIs, or plans unless the user explicitly asks for paid options.
* Do not treat external finance skills, analyst targets, fair value estimates, search snippets, social posts, or chart-only labels as decision authority.
* Do not let sub-agents fetch current market data independently.
* Do not make optional skills mandatory until their source quality, install count, behavior, and risk profile are reviewed.
* Do not produce actionable `Buy/Add` output when any required data packet field is missing, stale, contradictory, or fails the Current Price Acceptance Gate.

---

## 11. Data Schema & UI Layout Design

### 11.1 Python Oracle Output Schema
```json
{
  "ticker": "AAPL",
  "last_price": 298.15,
  "financials": [
    {
      "date": "2026-03-31",
      "revenue": 111184000000.0,
      "net_income": 28702000000.0,
      "operating_cash_flow": 28702000000.0,
      "capital_expenditure": -1971000000.0,
      "free_cash_flow": 26731000000.0,
      "fcf_margin": 0.2404
    }
  ],
  "balance_sheet": {
    "cash": 68507000000.0,
    "total_debt": 84711000000.0,
    "debt_to_equity": 1.23
  },
  "weekly_technicals": {
    "close": 298.15,
    "ema200": 215.55,
    "ma50": 260.07,
    "ema20": 281.56,
    "golden_filter_pass": true
  },
  "daily_technicals": {
    "close": 298.15,
    "pullback_active": false,
    "zvr_ratio": 0.22,
    "rsi_14": 46.2,
    "macd": "neutral"
  },
  "sentiment": {
    "institutional_ownership": 58.4,
    "short_percent_of_float": 1.1,
    "consensus_price_target": 310.5
  }
}
```

### 11.2 UI Tabbed Interface Design
The `VerdictCard` component in `DashboardPage.jsx` and the verdict summary section in `CommandCenterPage.jsx` will render:
* **Tab 1: 🎯 สรุป & SWOT**
  * Verdict banner + 4 collapsible accordions for SWOT (Strengths, Weaknesses, Opportunities, Threats) that toggle individually.
* **Tab 2: 📊 งบการเงิน & ปัจจัยพื้นฐาน**
  * Quarterly table for last 4 quarters (Revenue, Net Income, OCF, FCF Margin %).
  * Balance Sheet Summary box (Cash, Debt, Debt/Equity).
* **Tab 3: 📈 สัญญาณเทคนิคอล (Technicals)**
  * Weekly Golden Filter checklist (Weekly 200 EMA, 50 MA, 20 EMA, Slope check).
  * Daily confluences (pullback, ZVR, RSI).
* **Tab 4: 📝 แผนเทรด SOP (Trade Ticket)**
  * Monospace ticket simulating a broker layout with dynamic THB risk calculations.
