#!/usr/bin/env python3
"""Bootstrap missing documentation files from REFERENCE.md registry and skeleton templates."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from docs_audit import (
    check_required_documents,
    find_workspace_root,
    load_audit_config,
    parse_reference_md,
)

SKELETON_HEADER_RE = re.compile(r"^###\s+[\d.]+\s+(.+)$")
MINIMAL_STUB = "# {title}\n\n<!-- TODO: Fill in from docs/AGENT_CONTEXT_GUIDELINES.md -->\n"

ADAPTER_STUBS: dict[str, str] = {
    ".cursorrules": (
        "# Cursor Adapter\n"
        "Read root `AGENTS.md` before any code change.\n"
        "Doc tasks → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
    ),
    ".windsurfrules": (
        "# Windsurf Adapter\n"
        "Read root `AGENTS.md` before planning or executing tasks.\n"
        "Doc tasks → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
    ),
    ".github/copilot-instructions.md": (
        "# GitHub Copilot Adapter\n"
        "Read root `AGENTS.md` for coding rules and security.\n"
        "Doc tasks → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
    ),
    ".codex/AGENTS.md": (
        "# Codex Adapter\n"
        "Read root `AGENTS.md` first.\n"
        "Doc tasks → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
        "Before closing doc work, run `make docs-audit`.\n"
    ),
    ".agents/AGENTS.md": (
        "# Antigravity Adapter\n"
        "Read root `AGENTS.md` first.\n"
        "Doc/cleanup → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
    ),
    ".claude/CLAUDE.md": (
        "# Claude Code Instructions\n"
        "Read root `AGENTS.md` first.\n"
        "Doc tasks → read `docs/skills/docs-context-manager/SKILL.md` only.\n"
    ),
    "docs/plans/handoffs/README.md": (
        "# Multi-Agent Handoff Logs\n\n"
        "Naming: `YYYY-MM-DD-kebab-case-description.md`\n"
    ),
}


def parse_skeleton_templates(reference_path: Path) -> dict[str, str]:
    content = reference_path.read_text(encoding="utf-8")
    templates: dict[str, str] = {}
    current_file: str | None = None
    in_block = False
    block_lines: list[str] = []

    for line in content.splitlines():
        header = SKELETON_HEADER_RE.match(line)
        if header:
            if current_file and block_lines:
                templates[current_file] = "\n".join(block_lines).rstrip() + "\n"
            name = header.group(1).strip()
            current_file = name if name.endswith(".md") else None
            in_block = False
            block_lines = []
            continue

        if line.strip() == "```markdown":
            in_block = True
            block_lines = []
            continue
        if in_block and line.strip() == "```":
            if current_file:
                templates[current_file] = "\n".join(block_lines).rstrip() + "\n"
            in_block = False
            current_file = None
            block_lines = []
            continue
        if in_block:
            block_lines.append(line)

    return templates


def bootstrap(root: Path, dry_run: bool = False) -> list[str]:
    root = find_workspace_root(root)
    config = load_audit_config(root)
    if config.reference_md is None:
        raise SystemExit("REFERENCE.md not found — set reference_md in .docs-audit.json")

    missing = check_required_documents(root, config)
    templates = parse_skeleton_templates(config.reference_md)
    created: list[str] = []

    for item in missing:
        target = root / item.path
        if item.kind == "directory":
            if dry_run:
                created.append(f"[dry-run] mkdir {item.path}")
            else:
                target.mkdir(parents=True, exist_ok=True)
                created.append(f"mkdir {item.path}")
            continue

        content: str | None = templates.get(item.path)
        if content is None:
            content = ADAPTER_STUBS.get(item.path)
        if content is None:
            title = Path(item.path).stem.replace("_", " ").title()
            content = MINIMAL_STUB.format(title=title)

        if dry_run:
            created.append(f"[dry-run] create {item.path}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            created.append(f"create {item.path}")

    return created


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--dry-run", action="store_true", help="Show actions without writing")
    args = parser.parse_args(argv)

    actions = bootstrap(args.root, dry_run=args.dry_run)
    if not actions:
        print("Bootstrap — nothing missing.")
        return 0

    print("Bootstrap actions:")
    for action in actions:
        print(f"- {action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
