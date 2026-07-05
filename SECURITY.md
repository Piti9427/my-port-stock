# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | Yes |
| Older tags | Best effort only |

## Reporting a Vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

1. Email the repository owner privately (use your project contact channel)
2. Include reproduction steps, impact, and affected paths
3. Expect acknowledgment within 7 days; coordinated disclosure preferred

## Security Practices

### Authentication & data

- Clerk JWT for user identity; Supabase RLS enforces per-user data isolation
- `DEV_UI_AUTH_BYPASS` is **development only** and must fail in production
- `SUPABASE_SERVICE_ROLE_KEY` — server/scripts only, never client-side

### Input validation

- Zod schemas on API inputs; strict ticker regex
- Reject oversize JSON bodies (256kb limit on Express parser)

### Subprocess & scripts

- Use `execFile` / `spawn` with argument arrays — no shell string interpolation
- Timeouts on external process calls

### Secrets

- Store keys in `.env` files (gitignored)
- Never commit `.env`, API keys, or service role tokens
- Run `docs-audit --strict` before release to catch accidental secret patterns in markdown

### Dependencies

- Keep `@clerk/*`, `@supabase/*`, and Express patched via `npm audit` review

## Verification

```bash
npm test --workspace=backend -- --test-name-pattern="auth|hardening|bypass"
docs/skills/docs-context-manager/scripts/docs-audit.sh --strict
```
