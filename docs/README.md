---
status: Stable
audience: Human Developer & AI Agent
associated_adr: docs/adr/0001-supabase-runtime-source-of-truth.md
primary_tests: docs/skills/docs-context-manager/scripts/docs-audit.sh
---

# MyPortStock Documentation Index

Navigation hub for engineering, agent, and product documentation. Prefer **progressive disclosure**: load only what the task needs.

## Agent read order (investment + code)

1. [`AGENTS.md`](../AGENTS.md) — mandatory orchestrator rules
2. [`CONTEXT.md`](../CONTEXT.md) — investment vocabulary (canonical; not `docs/CONTEXT.md`)
3. [`INVESTMENT_CIO_PERSONA.md`](../INVESTMENT_CIO_PERSONA.md)
4. [`ELITE_INVESTOR_SOP.md`](../ELITE_INVESTOR_SOP.md)
5. [`PROJECT_MEMORY_INDEX.md`](../PROJECT_MEMORY_INDEX.md) — durable session decisions
6. [`docs/DOCUMENTATION_MAP.md`](DOCUMENTATION_MAP.md) — task-to-file matrix for agents

## Engineering docs (this folder)

| Doc | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System layout, data flow, major components |
| [RUNBOOK.md](RUNBOOK.md) | Dev commands, local run, troubleshooting |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variable reference (no secrets) |
| [API_CONTRACT.md](API_CONTRACT.md) | REST API surface and response contracts |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Unit, integration, and verification gates |
| [CODING_RULES.md](CODING_RULES.md) | Shared frontend/backend conventions |
| [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) | Ship checklist |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Build and deploy notes |
| [DESIGN.md](DESIGN.md) | Dark terminal UI system |
| [FILE_ORGANIZATION.md](FILE_ORGANIZATION.md) | Repo layout and artifact rules |
| [PROJECT_SKILLS_WORKFLOW.md](PROJECT_SKILLS_WORKFLOW.md) | 6-phase dev workflow with skills |
| [AGENT_SKILLS.md](AGENT_SKILLS.md) | Task → skill routing table |
| [AGENT_CONTEXT_GUIDELINES.md](AGENT_CONTEXT_GUIDELINES.md) | How to add agent context safely |

## Decisions & plans

| Zone | Location | Naming |
|---|---|---|
| ADRs | [`docs/adr/`](adr/) | `NNNN-kebab-title.md` |
| Active execution plans | [`docs/plans/`](plans/) | `YYYY-MM-DD-kebab-description.md` |
| Superpowers workflow plans | [`docs/superpowers/plans/`](superpowers/plans/) | legacy + dated; new work → `docs/plans/` |
| Handoffs | [`docs/plans/handoffs/`](plans/handoffs/) | `YYYY-MM-DD-kebab-description.md` |
| Archive | [`docs/archive/`](archive/) | completed plans |

### Active plans

- [2026-06-20-ux-ui-refactor-plan.md](plans/2026-06-20-ux-ui-refactor-plan.md)
- [2026-06-27-institutional-risk-refactor-plan.md](plans/2026-06-27-institutional-risk-refactor-plan.md)
- [2026-06-28-webapp-pwa-implementation-plan.md](plans/2026-06-28-webapp-pwa-implementation-plan.md)

### ADRs

- [0001 Supabase runtime source of truth](adr/0001-supabase-runtime-source-of-truth.md)
- [0002 Clerk user isolation RLS](adr/0002-clerk-user-isolation-rls.md)
- [0003 Subagent autonomous search](adr/0003-subagent-autonomous-search.md)
- [0004 Institutional quality gates](adr/0004-unbiased-institutional-quality-gates.md)
- [0005 PWA-first Vite stack](adr/0005-pwa-first-ts-migration-vite-stack.md)

## Root standards

| File | Purpose |
|---|---|
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Branch, commit, PR flow |
| [`SECURITY.md`](../SECURITY.md) | Vulnerability reporting |
| [`CHANGELOG.md`](../CHANGELOG.md) | Release history |

## Docs tooling

- Config: [`.docs-audit.json`](../.docs-audit.json)
- Skill: [`docs/skills/docs-context-manager/`](skills/docs-context-manager/)
- Audit: `docs/skills/docs-context-manager/scripts/docs-audit.sh`

## Verification

```bash
docs/skills/docs-context-manager/scripts/docs-audit.sh
npm run check:all
```
