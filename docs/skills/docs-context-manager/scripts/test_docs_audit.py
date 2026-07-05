#!/usr/bin/env python3
"""Integration tests for docs_audit.py and docs_bootstrap.py."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from docs_audit import (
    AuditConfig,
    _global_reference_candidates,
    _resolve_reference_path,
    check_broken_links,
    check_naming_conventions,
    check_required_documents,
    find_workspace_root,
    load_audit_config,
    parse_reference_md,
    run_audit,
    scan_security,
)
from docs_bootstrap import bootstrap, parse_skeleton_templates

FULL_REQUIRED_FILES = (
    "AGENTS.md",
    ".agents/AGENTS.md",
    ".claude/CLAUDE.md",
    ".codex/AGENTS.md",
    ".cursorrules",
    ".windsurfrules",
    ".github/copilot-instructions.md",
    "docs/AGENT_SKILLS.md",
    "docs/AGENT_CONTEXT_GUIDELINES.md",
    "docs/CONTEXT.md",
    "docs/ARCHITECTURE.md",
    "docs/CODING_RULES.md",
    "docs/RUNBOOK.md",
    "docs/DEFINITION_OF_DONE.md",
    "docs/TESTING_STRATEGY.md",
    "docs/API_CONTRACT.md",
    "docs/DEPLOYMENT.md",
    "docs/ENVIRONMENT.md",
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "docs/README.md",
)

FULL_REQUIRED_DIRECTORIES = (
    "docs/plans/handoffs",
    "docs/adr",
    "docs/specs",
    "docs/plans",
    "docs/postmortems",
    "docs/archive",
)


def _full_config(**kwargs) -> AuditConfig:
    return AuditConfig(
        required_files=FULL_REQUIRED_FILES,
        required_directories=FULL_REQUIRED_DIRECTORIES,
        **kwargs,
    )


class DocsAuditTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_loads_config_from_json(self) -> None:
        (self.root / ".docs-audit.json").write_text(
            json.dumps({"required_files": ["README.md", "AGENTS.md"], "required_directories": ["docs"]}),
            encoding="utf-8",
        )
        config = load_audit_config(self.root)
        self.assertEqual(config.required_files, ("README.md", "AGENTS.md"))

    def test_parses_reference_md_registry(self) -> None:
        ref = self.root / "REFERENCE.md"
        ref.write_text(
            """## 1. Required Document Registry

| File | Location | Role |
|---|---|---|
| Readme | `README.md` (Root) | overview |
| Handoffs | `docs/plans/handoffs/` | logs |
""",
            encoding="utf-8",
        )
        files, dirs = parse_reference_md(ref)
        self.assertIn("README.md", files)
        self.assertIn("docs/plans/handoffs", dirs)

    def test_detects_missing_required_file(self) -> None:
        (self.root / "README.md").write_text("# Root\n", encoding="utf-8")
        missing = check_required_documents(self.root, _full_config())
        self.assertTrue(any(item.path == "AGENTS.md" for item in missing))

    def test_passes_when_required_registry_present(self) -> None:
        for rel in FULL_REQUIRED_FILES:
            path = self.root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("# ok\n", encoding="utf-8")
        for rel in FULL_REQUIRED_DIRECTORIES:
            (self.root / rel).mkdir(parents=True, exist_ok=True)
        missing = check_required_documents(self.root, _full_config())
        self.assertEqual(missing, [])

    def test_detects_broken_relative_markdown_link(self) -> None:
        docs = self.root / "docs"
        docs.mkdir(parents=True)
        source = docs / "README.md"
        source.write_text("[missing](does-not-exist.md)\n", encoding="utf-8")
        broken = check_broken_links(self.root, AuditConfig(), [source])
        self.assertEqual(len(broken), 1)

    def test_ignores_external_http_links(self) -> None:
        docs = self.root / "docs"
        docs.mkdir(parents=True)
        source = docs / "README.md"
        source.write_text("[external](https://example.com/guide)\n", encoding="utf-8")
        broken = check_broken_links(self.root, AuditConfig(), [source])
        self.assertEqual(broken, [])

    def test_detects_thai_citizen_id(self) -> None:
        content = "Borrower citizen id: 1234567890123\n"
        findings = scan_security(content, Path("docs/sample.md"))
        self.assertTrue(any(item.kind == "thai citizen id" for item in findings))

    def test_strict_mode_flags_bare_pii_not_pdf_filename(self) -> None:
        content = "Borrower id on file: 1341500021233\n"
        normal = scan_security(content, Path("docs/plan.md"), strict=False)
        strict = scan_security(content, Path("docs/plan.md"), strict=True)
        self.assertTrue(normal)
        self.assertTrue(strict)

    def test_detects_naming_violation(self) -> None:
        handoffs = self.root / "docs/plans/handoffs"
        handoffs.mkdir(parents=True)
        (handoffs / "bad-name.md").write_text("# bad\n", encoding="utf-8")
        violations = check_naming_conventions(self.root)
        self.assertEqual(len(violations), 1)

    def test_accepts_valid_naming(self) -> None:
        handoffs = self.root / "docs/plans/handoffs"
        handoffs.mkdir(parents=True)
        (handoffs / "2026-07-05-docs-context-manager.md").write_text("# ok\n", encoding="utf-8")
        violations = check_naming_conventions(self.root)
        self.assertEqual(violations, [])

    def test_strict_clears_exclude_scan_roots(self) -> None:
        (self.root / ".docs-audit.json").write_text(
            json.dumps({"exclude_scan_roots": ["docs/archive"]}),
            encoding="utf-8",
        )
        config = load_audit_config(self.root, strict=True)
        self.assertEqual(config.exclude_scan_roots, ())
        self.assertTrue(config.strict)

    def test_exclude_scan_roots_skips_archived_docs(self) -> None:
        docs = self.root / "docs"
        archive = docs / "archive"
        archive.mkdir(parents=True)
        (docs / "README.md").write_text("# Active\n", encoding="utf-8")
        (archive / "old.md").write_text("[broken](missing.md)\n", encoding="utf-8")
        config = AuditConfig(scan_roots=("docs",), exclude_scan_roots=("docs/archive",))
        broken = check_broken_links(self.root, config)
        self.assertEqual(broken, [])

    def test_run_audit_reports_findings(self) -> None:
        (self.root / "docs").mkdir(parents=True)
        (self.root / "docs" / "leak.md").write_text("id 1234567890123\n[broken](missing.md)\n", encoding="utf-8")
        report = run_audit(self.root, config=_full_config())
        self.assertTrue(report.missing_required)
        self.assertTrue(report.broken_links)
        self.assertTrue(report.security_findings)


class DocsBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_parse_skeleton_templates(self) -> None:
        ref = self.root / "REFERENCE.md"
        ref.write_text(
            """### 2.1 CONTRIBUTING.md
```markdown
# Contributing Guide
## Branch Strategy
```
""",
            encoding="utf-8",
        )
        templates = parse_skeleton_templates(ref)
        self.assertIn("CONTRIBUTING.md", templates)
        self.assertIn("Branch Strategy", templates["CONTRIBUTING.md"])

    def test_bootstrap_creates_missing_file(self) -> None:
        ref_dir = self.root / "docs/skills/docs-context-manager"
        ref_dir.mkdir(parents=True)
        (ref_dir / "REFERENCE.md").write_text(
            """## 1. Required Document Registry
| File | Location | Role |
|---|---|---|
| Contributing | `CONTRIBUTING.md` | guide |

## 2. Skeleton Templates
### 2.1 CONTRIBUTING.md
```markdown
# Contributing Guide
```
""",
            encoding="utf-8",
        )
        (self.root / ".docs-audit.json").write_text(
            json.dumps({"reference_md": "docs/skills/docs-context-manager/REFERENCE.md"}),
            encoding="utf-8",
        )
        actions = bootstrap(self.root)
        self.assertTrue(any("CONTRIBUTING.md" in a for a in actions))
        self.assertTrue((self.root / "CONTRIBUTING.md").is_file())

    def test_global_reference_fallback_when_no_vendored_reference(self) -> None:
        (self.root / ".docs-audit.json").write_text(
            json.dumps({"scan_roots": ["docs"]}),
            encoding="utf-8",
        )
        config = load_audit_config(self.root)
        global_candidates = _global_reference_candidates()
        if not any(path.is_file() for path in global_candidates):
            self.skipTest("global reference not installed")
        self.assertIsNotNone(config.reference_md)
        self.assertTrue(config.reference_md.is_file())

    def test_light_init_bootstrap_uses_global_reference(self) -> None:
        (self.root / "README.md").write_text("# App\n", encoding="utf-8")
        (self.root / ".docs-audit.json").write_text(
            json.dumps({"scan_roots": ["docs"]}),
            encoding="utf-8",
        )
        global_candidates = _global_reference_candidates()
        if not any(path.is_file() for path in global_candidates):
            self.skipTest("global reference not installed")
        actions = bootstrap(self.root, dry_run=True)
        self.assertTrue(len(actions) > 0)


if __name__ == "__main__":
    unittest.main()
