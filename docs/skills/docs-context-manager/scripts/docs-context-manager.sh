#!/usr/bin/env bash
# Unified CLI for docs-context-manager — works without Makefile.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DOCS_AUDIT_HOME="${DOCS_AUDIT_HOME:-$(cd "${SCRIPT_DIR}/.." && pwd)}"

usage() {
  cat <<'EOF'
Usage: docs-context-manager <command> [options]

Commands:
  init [path]       Initialize project (.docs-audit.json + optional vendor)
  audit             Run default docs audit (active docs)
  strict            Run strict audit (include archive + tighter PII)
  bootstrap         Create missing registry files
  bootstrap-dry     Preview bootstrap without writing
  test              Run unit tests
  help              Show this help

No Makefile required — run from any git repo root after install.sh.

Examples:
  docs-context-manager init
  docs-context-manager init --light ./my-app
  docs-context-manager bootstrap
  docs-context-manager audit
EOF
}

cmd="${1:-audit}"
if [[ "${cmd}" == "help" || "${cmd}" == "-h" || "${cmd}" == "--help" ]]; then
  usage
  exit 0
fi
shift || true

case "${cmd}" in
  init)
    exec "${SCRIPT_DIR}/docs-init.sh" "$@"
    ;;
  audit)
    exec "${SCRIPT_DIR}/docs-audit.sh" "$@"
    ;;
  strict|audit-strict)
    exec "${SCRIPT_DIR}/docs-audit.sh" --strict "$@"
    ;;
  bootstrap)
    exec "${SCRIPT_DIR}/docs-bootstrap.sh" "$@"
    ;;
  bootstrap-dry)
    exec "${SCRIPT_DIR}/docs-bootstrap.sh" --dry-run "$@"
    ;;
  test)
    exec python3 -m unittest discover -s "${SCRIPT_DIR}" -p 'test_*.py' -v "$@"
    ;;
  *)
    echo "docs-context-manager: unknown command: ${cmd}" >&2
    usage
    exit 2
    ;;
esac
