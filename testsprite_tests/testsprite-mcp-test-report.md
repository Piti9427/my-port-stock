# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** MyPortStock
- **Date:** 2026-07-12
- **Run:** #2 (after clean port reset + `npm run dev:ui`)
- **Prepared by:** TestSprite AI Team
- **Server Mode:** development (`npm run dev:ui`)
- **Local Endpoint:** http://localhost:5173 + http://127.0.0.1:8080
- **Auth Mode:** Dev auth bypass (Clerk disabled)
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/75fe416e-0af2-471d-a194-4520f080f3fa

---

## 2️⃣ Requirement Validation Summary

### Requirement: Command Center Analysis

#### Test TC001 Look up a ticker and view its quote panel
- **Status:** ⛔ BLOCKED
- **Severity:** HIGH
- **Analysis:** `ERR_EMPTY_RESPONSE` on `/command-center` — Vite dev server stopped responding mid-run (~07:55 UTC).

#### Test TC003 Log a trade from command center
- **Status:** ⛔ BLOCKED
- **Severity:** HIGH
- **Analysis:** Blank page, 0 interactive elements — SPA never mounted.

#### Test TC004 Run deep analysis for a searched ticker
- **Status:** ⛔ BLOCKED
- **Severity:** HIGH
- **Analysis:** Same infrastructure failure; analysis flow untested.

#### Test TC007 Chat about a ticker in command center
- **Status:** ❌ Failed (marked failed in raw report; root cause = server unreachable)
- **Severity:** HIGH
- **Analysis:** Detailed blocked report — chat/search UI never appeared.

---

### Requirement: Portfolio Dashboard

#### Test TC002 View portfolio summary and holdings
- **Status:** ⛔ BLOCKED
- **Analysis:** `/dashboard` blank — no holdings visible.

#### Test TC010 Add ticker to watchlist
- **Status:** ⛔ BLOCKED
- **Analysis:** Dashboard UI unreachable.

#### Test TC015 Remove ticker from watchlist
- **Status:** ⛔ BLOCKED
- **Analysis:** Dashboard UI unreachable.

---

### Requirement: Today Overview

#### Test TC005 Review today overview and open linked workflow
- **Status:** ⛔ BLOCKED
- **Analysis:** Root route blank after reload attempts.

---

### Requirement: Market & Ticker Detail

#### Test TC006 Review ticker quote and decision packet
- **Status:** ⛔ BLOCKED
- **Analysis:** Market route empty response.

#### Test TC012 Inspect ticker journal history and analysis context
- **Status:** ⛔ BLOCKED
- **Analysis:** `/market` unreachable via tunnel.

#### Test TC013 Open ticker detail from linked workflow
- **Status:** ⛔ BLOCKED
- **Analysis:** Dashboard blank, no workflow links.

---

### Requirement: Trade Journal

#### Test TC008 Log a new trade from the journal
- **Status:** ⛔ BLOCKED
- **Analysis:** Journal UI never loaded.

#### Test TC009 Browse journal history and filter trades
- **Status:** ⛔ BLOCKED
- **Analysis:** 0 interactive elements on `/journal`.

#### Test TC011 Filter and inspect journal entries
- **Status:** ⛔ BLOCKED
- **Analysis:** Filter controls not reachable.

---

### Requirement: Analytics

#### Test TC014 View analytics metrics and equity curve
- **Status:** ⛔ BLOCKED
- **Analysis:** `/analytics` blank page.

---

## 3️⃣ Coverage & Matching Metrics

- **0% passed** (0 / 15)
- **14 blocked** + **1 failed** (TC007 — infrastructure, not app logic)

| Requirement              | Total | ✅ Passed | ❌ Failed | ⛔ Blocked |
|--------------------------|------:|----------:|----------:|-----------:|
| Command Center Analysis  | 4     | 0         | 1         | 3          |
| Portfolio Dashboard      | 3     | 0         | 0         | 3          |
| Today Overview           | 1     | 0         | 0         | 1          |
| Market & Ticker Detail   | 3     | 0         | 0         | 3          |
| Trade Journal            | 3     | 0         | 0         | 3          |
| Analytics                | 1     | 0         | 0         | 1          |
| **Total**                | **15**| **0**     | **1**     | **14**     |

---

## 4️⃣ Key Gaps / Risks

### Root Cause (Confirmed — Run #2)
Ports were clean and health checks passed **before** TestSprite started. During execution, tunnel logs show **`ECONNREFUSED 127.0.0.1:5173`** starting ~3 minutes in. **Vite dev server cannot survive TestSprite's concurrent tunnel load** — this is an environment stability issue, not an application bug.

### What Worked
- Clean single `dev:ui` instance on 5173 + 8080
- Pre-run health: both returned HTTP 200
- Auth bypass active

### What Failed
- Dev server crashed/hung under parallel TestSprite browser sessions
- All UI tests blocked with `ERR_EMPTY_RESPONSE` or blank SPA

### Recommended Fix: Production Preview Mode
Dev mode is explicitly discouraged by TestSprite for concurrent E2E. Use:

```bash
# Terminal 1 — backend
npm run dev:ui --workspace=backend

# Terminal 2 — frontend (built + preview on 5173)
npm run build --workspace=frontend
npm run preview --workspace=frontend -- --port 5173 --host 127.0.0.1

# Verify, then re-run TestSprite
curl -I http://127.0.0.1:5173/
curl http://127.0.0.1:8080/health
```

Then re-run TestSprite with `serverMode: production`.

### Important Notes for User
- **Do not run `npm run dev:ui` in terminal 1 while TestSprite runs** if another instance already holds the ports — use only one server process set.
- User's terminal `dev:ui` had failed earlier (5174 + backend EADDRINUSE) because stale processes were still bound to 5173/8080.

---
