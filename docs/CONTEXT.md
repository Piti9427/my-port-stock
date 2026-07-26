---
status: Stable
audience: Human Developer & AI Agent
associated_adr: ../CONTEXT.md
primary_tests: docs/skills/docs-context-manager/scripts/docs-audit.sh
---

# Domain Context (alias)

The canonical investment vocabulary and term boundaries live at the repository root:

**→ [`CONTEXT.md`](../CONTEXT.md)**

Do not maintain a separate glossary in this file. Update the root `CONTEXT.md` when investment language changes.

## Verification

```bash
test -f CONTEXT.md && head -n 5 CONTEXT.md
```
