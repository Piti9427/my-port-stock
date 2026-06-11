# MyPortStock File Organization

## TL;DR

Root directory should contain only canonical project files, source code entrypoints, and investment source-of-truth markdown. Generated reports, screenshots, browser traces, and temporary render outputs live under `artifacts/`.

## Canonical Root Files

Keep these at the repository root because they are primary project context or runtime entrypoints:

- `AGENTS.md`
- `CONTEXT.md`
- `INVESTMENT_CIO_PERSONA.md`
- `ELITE_INVESTOR_SOP.md`
- `GEMINI.md`
- `PROJECT_MEMORY_INDEX.md`
- `stock_portfolio.md`
- `trade_journal.md`
- `server.js`
- `package.json`
- `package-lock.json`
- `README.md`

## Source And Runtime

- `src/` - backend modules.
- `public/` - local dashboard UI.
- `tests/` - Node test suite.
- `.gemini/agents/` - sub-agent contract references.
- `VAULT/` - ticker/company research vault.
- `notes/` - durable plans, scope docs, and decision notes.
- `tools/` - helper scripts that can regenerate artifacts.

## Generated Artifacts

- `artifacts/screenshots/` - dashboard or UI screenshots.
- `artifacts/reports/` - CSV or exported report files.
- `artifacts/pdf/` - generated PDFs and HTML-to-PDF source exports.
- `artifacts/pdf-previews/` - rendered PDF preview images.
- `artifacts/playwright-mcp/` - local browser verification logs and page snapshots.

## Temporary Workspace

- `tmp/` is scratch space only.
- Do not store canonical investment decisions in `tmp/`.
- Prefer moving completed outputs from `tmp/` into `artifacts/`.

## Prevention Guidance

- New screenshots should go to `artifacts/screenshots/`.
- New PDF/report outputs should go to `artifacts/pdf/` or `artifacts/reports/`.
- New helper scripts should go to `tools/`, not `tmp/`.
- Do not move `stock_portfolio.md` or `trade_journal.md`; they are source-of-truth context files.
- Do not let sub-agent output or browser traces sit at root.

## Verification

After file organization changes:

```bash
npm test
find . -maxdepth 2 -type f -not -path './node_modules/*' | sort
```
