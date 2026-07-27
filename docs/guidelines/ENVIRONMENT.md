---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0002-clerk-user-isolation-rls.md
primary_tests: npm test --workspace=backend
---

# Environment Variables

Reference for configuration keys. **Never commit real secrets.** Use local `.env` files listed in `.gitignore`.

## Backend (`backend/.env`)

| Key                             | Required        | Secret | Description                                                               |
| ------------------------------- | --------------- | ------ | ------------------------------------------------------------------------- |
| `PORT`                          | No              | No     | HTTP port (default varies; dev script uses `8080`)                        |
| `SUPABASE_URL`                  | Yes             | No     | Supabase project URL                                                      |
| `SUPABASE_ANON_KEY`             | Yes             | Yes    | Supabase anon key (RLS-scoped client)                                     |
| `SUPABASE_JWT_SECRET`           | Yes             | Yes    | JWT validation for RLS / Clerk bridge                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Import/admin    | Yes    | Bypasses RLS — scripts/migrations only                                    |
| `SUPABASE_PROJECT_REF`          | Optional        | No     | Project ref slug for CLI                                                  |
| `SUPABASE_ACCESS_TOKEN`         | Optional        | Yes    | Supabase CLI personal token                                               |
| `SUPABASE_DB_URL`               | Optional        | Yes    | Direct Postgres connection for migrations                                 |
| `CLERK_SECRET_KEY`              | Prod            | Yes    | Clerk Express middleware                                                  |
| `VITE_CLERK_PUBLISHABLE_KEY`    | Dev convenience | No     | Sometimes mirrored in backend for local tooling                           |
| `FINNHUB_API_KEY`               | Optional        | Yes    | Supplementary market data                                                 |
| `DEV_UI_AUTH_BYPASS`            | Dev only        | No     | Enable `Authorization: Bearer dev-ui-auth-bypass` when not production     |
| `MARKDOWN_IMPORT_OWNER_USER_ID` | Import          | No     | Target Clerk user for markdown snapshot import                            |
| `GEMINI_API_KEY` / Google GenAI | AI routes       | Yes    | Required for `/api/chat` and `/api/analyze` when enabled                  |
| `SENTRY_DSN`                    | Optional        | Yes    | Backend error reporting                                                   |
| `MPS_TEST_MODE`                 | Test only       | No     | Enables deterministic providers only when exactly `1` and `NODE_ENV=test` |
| `MPS_TEST_SCENARIO`             | Test only       | No     | Fixture scenario: `valid`, `conflict`, `provider-failure`, or `matrix`    |
| `MPS_LOAD_MODE`                 | Test only       | No     | Suppresses per-request logs during bounded fixture load assurance         |

## Frontend (`frontend/.env` / `.env.local`)

| Key                          | Required | Secret | Description                                 |
| ---------------------------- | -------- | ------ | ------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | No     | Clerk publishable key (browser)             |
| `VITE_DEV_AUTH_BYPASS`       | Dev only | No     | Frontend dev auth bypass flag               |
| `SENTRY_AUTH_TOKEN`          | CI/build | Yes    | Source map upload via `@sentry/vite-plugin` |
| `MPS_BACKEND_URL`            | E2E only | No     | Loopback Vite proxy target for E2E          |

## Root

| Key                     | Required       | Description                                                        |
| ----------------------- | -------------- | ------------------------------------------------------------------ |
| `LOAD_TARGET`           | Scheduled only | Must be an HTTP(S) loopback URL; non-loopback targets are rejected |
| `LOAD_HTTP_CLIENTS`     | Scheduled only | HTTP clients, hard-capped at 50                                    |
| `LOAD_WS_CLIENTS`       | Scheduled only | WebSocket clients, hard-capped at 100                              |
| `LOAD_DURATION_SECONDS` | Scheduled only | Scenario duration, hard-capped at 60 seconds                       |
| `LOAD_SERVER_PID`       | Scheduled only | Fixture backend PID used to measure target RSS growth              |

## Security rules

- Do not hardcode secrets in markdown, source, or tests (use test doubles).
- `SUPABASE_SERVICE_ROLE_KEY` must never ship to the browser.
- `DEV_UI_AUTH_BYPASS` must be rejected when `NODE_ENV=production`.
- `MPS_TEST_MODE=1` must be rejected unless `NODE_ENV=test`.
- CI database checks must not receive `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL`, or production credentials.
- Document new keys here when adding features.

## Verification

```bash
# Backend loads env without syntax errors
npm test --workspace=backend

# Frontend env contract tests
npm test --workspace=frontend -- --run tests/authBypassContract.test.js
```
