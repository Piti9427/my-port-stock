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

## Documentation Standards

To maintain high AI-Human developer workflow efficiency, all architectural, spec, design, and guide markdown documents under `docs/` must follow these rules:

1. **AI Context Anchors (Frontmatter):**
   Every documentation file must begin with a YAML frontmatter containing:
   - `status`: Stable / Active Development / Draft / Obsolete
   - `audience`: Human Developer & AI Agent / Human Only / AI Agent Only
   - `associated_adr`: Link or file scheme URL to related ADR(s)
   - `primary_tests`: Command or script path used to verify compliance

2. **Runnable Verification Blocks:**
   Every document must include a `## Verification` section at the bottom containing exact, copy-pasteable terminal commands to run.

## Standardized notes/ Template

All workflow, planning, and scoping records under `notes/` must be named in the format `notes/YYYY-MM-DD-short-description.md` and contain the following mandatory sections:

- **Background & Problem:** Core context and reasons for the note.
- **Architecture Impact:** Affected files, directories, databases, and schemas.
- **Action Items & Issues:** Checklist of tasks to perform.
- **Status:** Current status of implementation (e.g., Pending, Active, Completed).

## Verification

After file organization changes:

```bash
npm test
find . -maxdepth 2 -type f -not -path './node_modules/*' | sort
```
