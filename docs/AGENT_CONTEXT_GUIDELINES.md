---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0001-supabase-runtime-source-of-truth.md
primary_tests: docs/skills/docs-context-manager/scripts/docs-audit.sh
---

# Agent Context Guidelines

Playbook for adding or updating AI agent context in MyPortStock without bloating tokens or duplicating sources.

## Principles

1. **Single source of truth** — one canonical file per concept; link elsewhere
2. **Progressive disclosure** — index files point to detail; agents read on demand
3. **Fail-closed investment language** — never duplicate price rules; link `AGENTS.md`
4. **Evidence timestamps** — dates inside portfolio/journal snapshots are historical, not "today"

## Canonical locations

| Concept | Canonical file | Do not duplicate in |
|---|---|---|
| Investment vocabulary | [`CONTEXT.md`](../CONTEXT.md) | `docs/CONTEXT.md` (alias only) |
| Orchestrator rules | [`AGENTS.md`](../AGENTS.md) | Adapter files (short pointers only) |
| Session memory | [`PROJECT_MEMORY_INDEX.md`](../PROJECT_MEMORY_INDEX.md) | Long narratives in `notes/` |
| Agent navigation | [`DOCUMENTATION_MAP.md`](DOCUMENTATION_MAP.md) | Entire repo dumps |
| UI system | [`DESIGN.md`](DESIGN.md) | `frontend/DESIGN.md` (checklist only) |
| Engineering how-to | `docs/RUNBOOK.md`, `docs/ARCHITECTURE.md` | Root README |

## Adapter files (short)

Root adapters (`.cursorrules`, `.claude/CLAUDE.md`, `.codex/AGENTS.md`, etc.) must:

- Point to `AGENTS.md` first
- Point to `docs/skills/docs-context-manager/SKILL.md` for doc tasks
- Stay under ~10 lines — no full rule duplication

## Adding a new agent-facing doc

1. Choose zone: ADR / plan / spec / engineering / investment root
2. Use naming convention for zone (see [README.md](README.md))
3. Add YAML frontmatter (`status`, `audience`, `associated_adr`, `primary_tests`)
4. End with `## Verification` and runnable commands
5. Link from `docs/README.md` or `DOCUMENTATION_MAP.md`
6. Run `docs-audit`

## Adding a durable decision

- Short entry in `PROJECT_MEMORY_INDEX.md` (3–6 lines)
- Detailed note in `notes/YYYY-MM-DD-topic.md` only if index entry would be too long
- ADR in `docs/adr/` when architectural

## Security

- Never commit secrets, customer data, or live credentials in markdown
- Use placeholder values in examples
- `docs-audit --strict` before release

## Bootstrap vs fill

| Phase | Tool | Output |
|---|---|---|
| Structure missing | `docs-context-manager bootstrap` | Skeleton files |
| Content needed | `doc-coauthoring` + repo evidence | Filled docs |
| Gate | `docs-audit` | Pass/fail |

## Verification

```bash
docs/skills/docs-context-manager/scripts/docs-audit.sh
head -n 6 docs/adr/*.md
```
