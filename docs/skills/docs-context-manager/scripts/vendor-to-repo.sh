#!/usr/bin/env bash
# Vendor docs-context-manager scripts + REFERENCE into a target git repo.
set -euo pipefail

SKILL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"

if [[ -z "${TARGET}" ]]; then
  echo "Usage: vendor-to-repo.sh <path-to-git-repo>" >&2
  exit 1
fi

TARGET="$(cd "${TARGET}" && pwd)"
DEST="${TARGET}/docs/skills/docs-context-manager"

mkdir -p "${DEST}/scripts"
cp "${SKILL_HOME}/references/full-reference.md" "${DEST}/REFERENCE.md"
cp "${SKILL_HOME}/scripts/"*.py "${DEST}/scripts/"
cp "${SKILL_HOME}/scripts/"*.sh "${DEST}/scripts/"
chmod +x "${DEST}/scripts/"*.sh

cat > "${DEST}/SKILL.md" <<'EOF'
---
name: docs-context-manager
description: Manages and audits project markdown documentation lifecycle. Vendored scripts in this repo; canonical skill at ~/.cursor/skills/docs-context-manager/.
disable-model-invocation: true
argument-hint: "audit | bootstrap | handoff | reindex | cleanup"
---

# Docs Context Manager (Project Vendored)

Canonical personal skill: `~/.cursor/skills/docs-context-manager/SKILL.md`

## Commands
```bash
docs-context-manager init       # setup project (no Makefile)
docs-context-manager bootstrap
docs-context-manager audit
docs-audit
docs-bootstrap
```

Optional Makefile — run `docs-init --print-makefile`. See personal skill for full workflow.
EOF

if [[ ! -f "${TARGET}/.docs-audit.json" ]]; then
  cat > "${TARGET}/.docs-audit.json" <<'EOF'
{
  "reference_md": "docs/skills/docs-context-manager/REFERENCE.md",
  "scan_roots": ["docs", ".agents", ".claude", ".codex"],
  "scan_root_files_only": ["."],
  "exclude_scan_roots": ["docs/archive"],
  "scan_files": [],
  "skip_dirs": [".venv", "node_modules", "bin", "obj"]
}
EOF
  echo "Created: ${TARGET}/.docs-audit.json"
fi

echo "Vendored docs-context-manager to ${DEST}"
echo "No Makefile required — use: docs-bootstrap && docs-audit"
echo "Optional Makefile: docs-init --print-makefile"
