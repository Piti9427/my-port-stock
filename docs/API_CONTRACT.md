---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0002-clerk-user-isolation-rls.md
primary_tests: npm test --workspace=backend
---

# API Contract

REST surface for the MyPortStock backend. Base URL: `/` on the backend host (Vite dev proxies `/api`).

**Auth:** Clerk session JWT on protected routes unless `DEV_UI_AUTH_BYPASS` is enabled in non-production.

**Errors:** JSON `{ "error": "..." }` or `{ "status": "INSUFFICIENT_DATA", "error_details": "..." }` for quote/analysis fail-closed paths.

## Health & static

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Process health, cache, gate thresholds |
| `GET` | `/*` (non-API) | No | SPA static assets from `frontend/dist` |

## Quote & analysis (server.js)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/quote/:ticker` | No* | Two-source quote packet; may return `INSUFFICIENT_DATA` |
| `GET` | `/api/packet/:ticker` | Yes | Verified packet for orchestrator / UI |
| `POST` | `/api/analyze` | Yes | Full analysis with decision engine |
| `POST` | `/api/chat` | Yes | Chat with verified portfolio/journal context |
| `POST` | `/api/ws-ticket` | Yes | WebSocket auth ticket |

\*Rate-limited; production UI should prefer authenticated packet routes.

### Quote success shape (abbreviated)

```json
{
  "ticker": "NVDA",
  "last_price": 0,
  "price_sources": [],
  "price_source_tiers": [],
  "quote_timestamp": "",
  "market_session": "Regular",
  "current_price_acceptance_gate": "pass"
}
```

## Portfolio & journal (`/api` router)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/holdings` | Yes | User holdings from Supabase |
| `GET` | `/api/watchlists` | Yes | Watchlist rows |
| `POST` | `/api/watchlists` | Yes | Add watchlist entry (Zod validated ticker) |
| `DELETE` | `/api/watchlists/:ticker` | Yes | Remove watchlist entry |
| `GET` | `/api/journal` | Yes | Trade journal list |
| `GET` | `/api/journal/:ticker` | Yes | Journal filtered by ticker |
| `POST` | `/api/journal` | Yes | Create journal entry |
| `DELETE` | `/api/journal/:id` | Yes | Delete journal entry |
| `GET` | `/api/watchlist/scan` | Yes | Alert scan for watchlist |
| `GET` | `/api/price/:ticker` | Yes | Enriched price (THB-adjusted display) |

## User preferences & today

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/preferences` | Yes | User preferences (theme, onboarding, etc.) |
| `PUT` | `/api/preferences` | Yes | Update preferences (validated schema) |
| `GET` | `/api/today` | Yes | Today queue + pulse summary |

## Validation conventions

- Tickers: `^[A-Z0-9.-]{1,10}$` (normalized uppercase)
- Request bodies: Zod schemas in route modules
- No silent fallbacks to sample portfolio rows

## Versioning

No URL version prefix (`/api/v1`) at this time. Breaking changes require ADR + contract test updates.

## Verification

```bash
npm test --workspace=backend
curl -s http://127.0.0.1:8080/health | head
```
