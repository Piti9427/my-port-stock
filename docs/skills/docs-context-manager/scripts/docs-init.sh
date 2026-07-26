#!/usr/bin/env bash
# Initialize docs-context-manager in a project — no Makefile required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_HOME="${DOCS_AUDIT_HOME:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
START_DIR="$(pwd)"
ROOT_DIR="$(git -C "${START_DIR}" rev-parse --show-toplevel 2>/dev/null || pwd)"

MODE="full"
PRINT_MAKEFILE=0

usage() {
  cat <<'EOF'
Usage: docs-init [options] [path]

Initialize docs-context-manager in a project without Makefile.

Options:
  -l, --light           Create .docs-audit.json only (use global scripts + reference)
  -f, --full            Vendor scripts + REFERENCE into repo (default)
  --print-makefile      Print optional Makefile snippet and exit
  -h, --help            Show this help

Examples:
  docs-init                     # full init in current git root
  docs-init --light ./my-app    # light init, no vendor
  docs-init --print-makefile    # show optional Makefile targets
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -l|--light) MODE="light"; shift ;;
    -f|--full) MODE="full"; shift ;;
    --print-makefile) PRINT_MAKEFILE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "docs-init: unknown option: $1" >&2; usage; exit 2 ;;
    *)
      ROOT_DIR="$(cd "$1" && pwd)"
      shift
      ;;
  esac
done

if [[ "${PRINT_MAKEFILE}" -eq 1 ]]; then
  cat <<'EOF'
.PHONY: docs-audit docs-audit-strict docs-audit-test docs-bootstrap docs-bootstrap-dry

DOCS_SCRIPTS := docs/skills/docs-context-manager/scripts

docs-audit:
	@$(DOCS_SCRIPTS)/docs-audit.sh

docs-audit-strict:
	@$(DOCS_SCRIPTS)/docs-audit.sh --strict

docs-audit-test:
	@python3 -m unittest discover -s $(DOCS_SCRIPTS) -p 'test_*.py' -v

docs-bootstrap:
	@$(DOCS_SCRIPTS)/docs-bootstrap.sh

docs-bootstrap-dry:
	@$(DOCS_SCRIPTS)/docs-bootstrap.sh --dry-run
EOF
  exit 0
fi

CONFIG="${ROOT_DIR}/.docs-audit.json"
if [[ ! -f "${CONFIG}" ]]; then
  if [[ "${MODE}" == "light" ]]; then
    cat > "${CONFIG}" <<'EOF'
{
  "scan_roots": ["docs", ".agents", ".claude", ".codex"],
  "scan_root_files_only": ["."],
  "exclude_scan_roots": ["docs/archive"],
  "scan_files": [],
  "skip_dirs": [".venv", "node_modules", "bin", "obj", "tmp"]
}
EOF
  else
    cat > "${CONFIG}" <<'EOF'
{
  "reference_md": "docs/skills/docs-context-manager/REFERENCE.md",
  "scan_roots": ["docs", ".agents", ".claude", ".codex"],
  "scan_root_files_only": ["."],
  "exclude_scan_roots": ["docs/archive"],
  "scan_files": [],
  "skip_dirs": [".venv", "node_modules", "bin", "obj", "tmp"]
}
EOF
  fi
  echo "Created: ${CONFIG}"
else
  echo "Exists:  ${CONFIG}"
fi

if [[ "${MODE}" == "full" ]]; then
  "${SCRIPT_DIR}/vendor-to-repo.sh" "${ROOT_DIR}"
else
  echo "Light init: skipped vendoring (using global scripts + reference)"
fi

cat <<EOF

Ready — no Makefile required.

  docs-bootstrap          # create missing registry files
  docs-bootstrap --dry-run
  docs-audit              # default gate
  docs-audit --strict     # include archive + stricter PII

Or use the dispatcher:

  docs-context-manager bootstrap
  docs-context-manager audit

Optional Makefile targets: docs-init --print-makefile
EOF
