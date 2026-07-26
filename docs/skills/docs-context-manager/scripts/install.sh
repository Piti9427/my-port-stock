#!/usr/bin/env bash
set -euo pipefail

SKILL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/bin"

link_skill() {
  local target_dir="$1"
  mkdir -p "${target_dir}"
  ln -sfn "${SKILL_HOME}" "${target_dir}/docs-context-manager"
  echo "Linked: ${target_dir}/docs-context-manager -> ${SKILL_HOME}"
}

install_bin() {
  local name="$1"
  local script="$2"
  mkdir -p "${BIN_DIR}"
  ln -sf "${script}" "${BIN_DIR}/${name}"
  chmod +x "${script}"
  echo "Installed: ${BIN_DIR}/${name} -> ${script}"
}

install_bin "docs-audit" "${SKILL_HOME}/scripts/docs-audit.sh"
install_bin "docs-bootstrap" "${SKILL_HOME}/scripts/docs-bootstrap.sh"
install_bin "docs-init" "${SKILL_HOME}/scripts/docs-init.sh"
install_bin "docs-context-manager" "${SKILL_HOME}/scripts/docs-context-manager.sh"

link_skill "${HOME}/.claude/skills"
link_skill "${HOME}/.codex/skills"
link_skill "${HOME}/.gemini/config/skills"

mkdir -p "${HOME}/.cursor/commands"
ln -sfn "${SKILL_HOME}/adapters/cursor-command.md" "${HOME}/.cursor/commands/docs-context-manager.md"
echo "Linked: ${HOME}/.cursor/commands/docs-context-manager.md"

echo ""
echo "Docs Context Manager installed."
echo "  Skill:  ${SKILL_HOME}"
echo "  Cursor: /docs-context-manager"
echo "  Codex:  /docs-context-manager"
echo "  CLI:    docs-context-manager, docs-init, docs-audit, docs-bootstrap"
echo "Ensure ${BIN_DIR} is on your PATH."
