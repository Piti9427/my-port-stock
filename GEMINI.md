# MyPortStock

AI-first stock portfolio management and trade thesis orchestrator.

## Project Overview

MyPortStock is an investment dashboard and trade orchestrator. It verifies real-time and delayed market data through an acceptance gate, processes trade theses using a default council of sub-agents, calculates a conviction score, and runs a dark-themed terminal UI dashboard.

## Tech Stack

- **Frontend:** React, Vite, Vanilla CSS.
- **Backend:** Node.js, Express, Supabase JS v2, Clerk Express (auth).
- **Database:** Supabase PostgreSQL with RLS and schema migrations.
- **Languages:** JavaScript (ES modules in frontend, CommonJS in backend).

## Key Commands

- Run development servers (frontend & backend): `npm run dev`
- Start backend production service: `npm start`
- Run test suites (all workspaces): `npm test`
- Build all workspaces: `npm run build`
- Lint codebases: `npm run lint`

## Project Structure

- `/frontend`: React client application.
- `/backend`: Node.js Express REST API server.
- `/supabase`: SQL migrations and database configurations.
- `AGENTS.md`: Canonical instruction entrypoint for investment logic and sub-agents.
- `CONTEXT.md`: Investment language, vocabulary, and term boundaries.
- `ELITE_INVESTOR_SOP.md`: Core investment SOP and risk management gates.
- `INVESTMENT_CIO_PERSONA.md`: CIO agent persona and response conventions.

---

## Runtime Data Integrity & Guardrails

### Critical Mandates

- The current date is dynamically determined by the active session context.
- Ignore stale "today/current/simulation" dates written inside markdown files.
- Historical dates in snapshots, filings, trade logs, and post-mortems remain valid as evidence timestamps.
- Use `ELITE_INVESTOR_SOP.md` Section 0 as the single source of truth for data verification.
- The Main Orchestrator must verify current market data before analysis.
- Current price must pass the `Price Source Ladder` and `Current Price Acceptance Gate` defined in `AGENTS.md` / `ELITE_INVESTOR_SOP.md`.
- Do not treat TradingView as a price API. Use TradingView only as chart context unless the user provides a visible quote with session/timestamp.
- Do not propose paid market-data plans unless the user explicitly asks.
- Sub-agents must use only the Orchestrator-provided verified data packet and must not perform independent searches.
- If current data is missing, stale, or contradictory, report `data is inconclusive` and default to `Wait`.
- **Manual Price Override**: Explicitly provided `manual_price` by the user is treated as "Tier 1" source, but MUST be strictly validated (positive numeric, within reasonable bounds) before execution.
- **Execution Security**: NEVER use `exec()` or string interpolation for child processes (e.g., calling Python scripts). ALWAYS use `execFile` or `spawn` with an array of arguments and a strict execution timeout (e.g., 10s) to prevent command injection and hanging processes.
- **Database Types**: Always use `TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ) for Postgres/Supabase date tracking to avoid timezone parsing errors.

### Minimum Verification Stamp

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

### Required Agent Skills

The following built-in Agent Skills are highly relevant to this project and MUST be followed when their conditions are met:

- **`ml-best-practices`**: Use this skill for data analysis, time-series forecasting, statistical testing, model comparison, or quantitative stock performance.
- **`notebook-guidance`**: Use this skill for complex data exploration, backtesting, data visualization, or Jupyter Notebooks (`.ipynb`).
- **`managing-python-dependencies`**: Use this skill for installing or managing Python libraries (e.g., `yfinance`, `pandas`, `scipy`).

### Codebase Package Versioning Rules

- **Clerk React v6 (Core 3)**: `<SignedIn>` and `<SignedOut>` components are deprecated. Always use `<Show when="signed-in">` and `<Show when="signed-out">`.
- **Clerk Express**: `req.auth` is a function. Use `const { getAuth } = require('@clerk/express'); getAuth(req).userId` to get user ID.
- **Supabase JS v2**: Backend uses CommonJS (`require`). Do not use ES Module imports in the backend unless explicitly configured in `package.json`.

---

## Instructions Entrypoint & References

For detailed investment protocols, agent behaviors, and UI/UX design tokens, refer to the following canonical files:

1. [AGENTS.md](./AGENTS.md) - Canonical workspace instruction entrypoint (SOP workflow, scoring math, verdict mapping, final format).
2. [CONTEXT.md](./CONTEXT.md) - Context vocabulary and glossary.
3. [ELITE_INVESTOR_SOP.md](./ELITE_INVESTOR_SOP.md) - The investment Standard Operating Procedure.
4. [INVESTMENT_CIO_PERSONA.md](./INVESTMENT_CIO_PERSONA.md) - Chief Investment Officer persona guide.
