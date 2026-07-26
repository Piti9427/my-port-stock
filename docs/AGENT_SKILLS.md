---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0002-clerk-user-isolation-rls.md
primary_tests: npm test
---

# Agent Skills Guide

Task → skill routing for MyPortStock. Full 6-phase workflow: [PROJECT_SKILLS_WORKFLOW.md](PROJECT_SKILLS_WORKFLOW.md). Mandatory investment rules: [`AGENTS.md`](../AGENTS.md).

## Always first

| Task | Skill / doc |
|---|---|
| Any non-trivial work | `superpowers:using-superpowers` |
| Investment / portfolio advice | Read order in `AGENTS.md` |
| Docs structure / audit | `docs-context-manager` |

## By domain

| Domain | When | Skills |
|---|---|---|
| Planning / RFC | New feature or architecture | `grill-me`, `grill-with-docs`, `superpowers:brainstorming`, `superpowers:writing-plans` |
| Implementation | Approved plan | `superpowers:executing-plans`, `tdd` |
| Database | Schema, RLS, migrations | `supabase`, `supabase-postgres-best-practices` |
| Backend security | Auth, routes, subprocess | `security-best-practices` |
| Frontend | React, performance, composition | `vercel-react-best-practices`, `vercel-composition-patterns` |
| UI polish | Dashboard, a11y, anti-slop | `impeccable`, `design-taste-frontend`, `web-design-guidelines`, `shadcn` |
| Testing | New behavior, regressions | `tdd`, `superpowers:test-driven-development` |
| Browser verify | UI changes | `playwright-cli`, `qa` |
| Debug | Bugs, data mismatch | `superpowers:systematic-debugging`, `diagnose`, `debug-mantra` |
| Review | Pre-merge / milestone | `review`, `superpowers:requesting-code-review` |
| Docs authoring | Specs, structure files | `doc-coauthoring` |
| Docs lifecycle | Audit, bootstrap, archive | `docs-context-manager` |
| Deploy | Vercel / CI | `vercel:deployments-cicd`, `deploy-to-vercel` |

## Skill guardrails (this repo)

- Skills do **not** override investment gates in `AGENTS.md`
- No skill may bypass orchestrator price verification
- Do not install paid market-data skills unless user asks
- Run `docs-audit` before closing documentation tasks

## Verification

```bash
npm run check:all
docs/skills/docs-context-manager/scripts/docs-audit.sh
```
