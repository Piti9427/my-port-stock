#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_DIR="$(pwd)"
ROOT_DIR="$(git -C "${START_DIR}" rev-parse --show-toplevel 2>/dev/null || pwd)"
LOCAL_SCRIPT="${ROOT_DIR}/docs/skills/docs-context-manager/scripts/docs_bootstrap.py"
DOCS_AUDIT_HOME="${DOCS_AUDIT_HOME:-${HOME}/.cursor/skills/docs-context-manager}"

if [[ -f "${LOCAL_SCRIPT}" ]]; then
  exec python3 "${LOCAL_SCRIPT}" --root "${ROOT_DIR}" "$@"
fi

SCRIPT="${DOCS_AUDIT_HOME}/scripts/docs_bootstrap.py"
if [[ ! -f "${SCRIPT}" ]]; then
  echo "docs-bootstrap: no local or global script found" >&2
  exit 2
fi

exec python3 "${SCRIPT}" --root "${ROOT_DIR}" "$@"
