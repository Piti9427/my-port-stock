#!/usr/bin/env python3
"""Portable documentation audit for any git workspace."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlparse

CONFIG_FILENAME = ".docs-audit.json"

DEFAULT_SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    "bin",
    "obj",
    "tmp",
    "site-packages",
    ".playwright",
    "nuget-packages",
    ".nuget",
}

DEFAULT_SCAN_ROOTS = ("docs", ".agents", ".claude", ".codex")
DEFAULT_SCAN_ROOT_FILES_ONLY = (".",)
DEFAULT_REFERENCE_CANDIDATES = (
    "docs/skills/docs-context-manager/REFERENCE.md",
)


def _skill_home() -> Path:
    env = os.environ.get("DOCS_AUDIT_HOME")
    if env:
        return Path(env).expanduser()
    return Path.home() / ".cursor" / "skills" / "docs-context-manager"


def _global_reference_candidates() -> tuple[Path, ...]:
    home = _skill_home()
    return (
        home / "references" / "full-reference.md",
        home / "REFERENCE.md",
    )

DEFAULT_REQUIRED_FILES = ("README.md",)
DEFAULT_REQUIRED_DIRECTORIES = ("docs",)

NAMING_DIRS = (
    "docs/plans",
    "docs/plans/handoffs",
    "docs/postmortems",
)
NAMING_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*\.md$")
NAMING_EXEMPT = frozenset({"README.md"})

MARKDOWN_LINK_RE = re.compile(
    r"""
    (?<!\!)
    \[[^\]]*\]
    \(
    (?P<target>[^)\s]+)
    (?:\s+"[^"]*")?
    \)
    """,
    re.VERBOSE,
)

ANGLE_FILE_LINK_RE = re.compile(r"<(?P<target>file://[^>]+)>")
REF_LOCATION_RE = re.compile(r"`([^`]+)`")

THAI_ID_RE = re.compile(
    r"\b(?:\d[\d\s-]{11,17}\d|\d{1}-\d{4}-\d{5}-\d{2}-\d{1})\b"
)

EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("password assignment", re.compile(r"(?i)(?:password|passwd|pwd)\s*[:=]\s*['\"][^'\"]{4,}['\"]")),
    ("api key assignment", re.compile(r"(?i)api[_-]?key\s*[:=]\s*['\"][^'\"]{8,}['\"]")),
    ("secret assignment", re.compile(r"(?i)(?:secret|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]")),
    ("jwt token", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("aws access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("bearer token", re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{20,}")),
)

ALLOWLIST_EMAIL_DOMAINS = ("example.com", "example.org", "test.com", "localhost")
ALLOWLIST_EMAIL_LOCALPARTS = ("user@", "admin@", "your.email@", "security@", "contact@")
ALLOWLIST_LINE_SNIPPETS = (
    "no pii",
    "เลขบัตรประชาชน",
    "password:",
    "api key",
    "jwt token",
    "bearer token",
    "secret?",
    "hardcode",
    "<!-- todo",
    "fill in",
    "e.g.",
    "example",
    "placeholder",
    "xxx",
    "yyyy-mm-dd",
)


@dataclass(frozen=True)
class AuditConfig:
    scan_roots: tuple[str, ...] = DEFAULT_SCAN_ROOTS
    scan_root_files_only: tuple[str, ...] = DEFAULT_SCAN_ROOT_FILES_ONLY
    scan_files: tuple[str, ...] = ()
    exclude_scan_roots: tuple[str, ...] = ()
    required_files: tuple[str, ...] = DEFAULT_REQUIRED_FILES
    required_directories: tuple[str, ...] = DEFAULT_REQUIRED_DIRECTORIES
    skip_dirs: frozenset[str] = field(default_factory=lambda: frozenset(DEFAULT_SKIP_DIRS))
    reference_md: Path | None = None
    strict: bool = False


@dataclass(frozen=True)
class BrokenLink:
    source: Path
    line: int
    target: str
    resolved: str


@dataclass(frozen=True)
class MissingRequired:
    path: str
    kind: str


@dataclass(frozen=True)
class SecurityFinding:
    source: Path
    line: int
    kind: str
    snippet: str


@dataclass(frozen=True)
class NamingViolation:
    path: Path
    expected: str


@dataclass
class AuditReport:
    root: Path
    config: AuditConfig
    missing_required: list[MissingRequired] = field(default_factory=list)
    broken_links: list[BrokenLink] = field(default_factory=list)
    security_findings: list[SecurityFinding] = field(default_factory=list)
    naming_violations: list[NamingViolation] = field(default_factory=list)

    @property
    def has_findings(self) -> bool:
        return bool(
            self.missing_required
            or self.broken_links
            or self.security_findings
            or self.naming_violations
        )


def find_workspace_root(start: Path | None = None) -> Path:
    start = (start or Path.cwd()).resolve()
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=start,
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(result.stdout.strip()).resolve()
    except (subprocess.CalledProcessError, FileNotFoundError):
        current = start
        for candidate in (current, *current.parents):
            if (candidate / ".git").exists():
                return candidate
        return start


def _line_is_allowlisted(line: str) -> bool:
    lowered = line.lower()
    if any(snippet in lowered for snippet in ALLOWLIST_LINE_SNIPPETS):
        return True
    if "citizen id" in lowered and not THAI_ID_RE.search(line):
        return True
    return False


def parse_reference_md(path: Path) -> tuple[list[str], list[str]]:
    content = path.read_text(encoding="utf-8")
    files: list[str] = []
    directories: list[str] = []
    in_registry = False

    for line in content.splitlines():
        if "## 1. Required Document Registry" in line:
            in_registry = True
            continue
        if in_registry and line.startswith("## ") and "Required Document Registry" not in line:
            break
        if not in_registry or not line.startswith("|") or "---" in line:
            continue

        cols = [col.strip() for col in line.split("|")[1:-1]]
        if len(cols) < 2:
            continue

        match = REF_LOCATION_RE.search(cols[1])
        if not match:
            continue

        raw_path = match.group(1).strip()
        if raw_path.endswith("/"):
            directories.append(raw_path.rstrip("/"))
        else:
            files.append(raw_path)

    return files, directories


def _resolve_reference_path(root: Path, raw: dict[str, Any]) -> Path | None:
    if "reference_md" in raw:
        candidate = root / raw["reference_md"]
        if candidate.is_file():
            return candidate

    for rel in DEFAULT_REFERENCE_CANDIDATES:
        candidate = root / rel
        if candidate.is_file():
            return candidate

    for candidate in _global_reference_candidates():
        if candidate.is_file():
            return candidate
    return None


def load_audit_config(root: Path, strict: bool = False) -> AuditConfig:
    root = root.resolve()
    raw: dict[str, Any] = {}
    config_path = root / CONFIG_FILENAME
    if config_path.is_file():
        raw = json.loads(config_path.read_text(encoding="utf-8"))

    skip_dirs = set(DEFAULT_SKIP_DIRS)
    skip_dirs.update(raw.get("skip_dirs", []))

    reference_path = _resolve_reference_path(root, raw)
    parsed_files: list[str] = []
    parsed_dirs: list[str] = []
    if reference_path is not None:
        parsed_files, parsed_dirs = parse_reference_md(reference_path)

    required_files = tuple(raw["required_files"]) if "required_files" in raw else tuple(parsed_files or DEFAULT_REQUIRED_FILES)
    required_directories = tuple(raw["required_directories"]) if "required_directories" in raw else tuple(parsed_dirs or DEFAULT_REQUIRED_DIRECTORIES)

    exclude_scan_roots = () if strict else tuple(raw.get("exclude_scan_roots", ()))

    return AuditConfig(
        scan_roots=tuple(raw.get("scan_roots", DEFAULT_SCAN_ROOTS)),
        scan_root_files_only=tuple(raw.get("scan_root_files_only", DEFAULT_SCAN_ROOT_FILES_ONLY)),
        scan_files=tuple(raw.get("scan_files", ())),
        exclude_scan_roots=exclude_scan_roots,
        required_files=required_files,
        required_directories=required_directories,
        skip_dirs=frozenset(skip_dirs),
        reference_md=reference_path,
        strict=strict,
    )


def _is_excluded(path: Path, root: Path, config: AuditConfig) -> bool:
    try:
        rel = path.relative_to(root).as_posix()
    except ValueError:
        return False
    for excluded in config.exclude_scan_roots:
        prefix = excluded.rstrip("/")
        if rel == prefix or rel.startswith(prefix + "/"):
            return True
    return False


def discover_markdown_files(root: Path, config: AuditConfig, scope: str = "project") -> list[Path]:
    if scope == "all":
        files: list[Path] = []
        for path in root.rglob("*.md"):
            if any(part in config.skip_dirs for part in path.parts):
                continue
            if _is_excluded(path, root, config):
                continue
            files.append(path)
        return sorted(files)

    files: list[Path] = []

    for rel_root in config.scan_root_files_only:
        base = root if rel_root == "." else root / rel_root
        if base.is_dir():
            for path in base.glob("*.md"):
                if not _is_excluded(path, root, config):
                    files.append(path)

    for rel_root in config.scan_roots:
        base = root / rel_root
        if not base.is_dir():
            continue
        for path in base.rglob("*.md"):
            if any(part in config.skip_dirs for part in path.parts):
                continue
            if _is_excluded(path, root, config):
                continue
            files.append(path)

    for rel_file in config.scan_files:
        path = root / rel_file
        if path.is_file() and not _is_excluded(path, root, config):
            files.append(path)

    return sorted(set(files))


def check_required_documents(root: Path, config: AuditConfig) -> list[MissingRequired]:
    missing: list[MissingRequired] = []
    for rel in config.required_files:
        if not (root / rel).is_file():
            missing.append(MissingRequired(path=rel, kind="file"))
    for rel in config.required_directories:
        if not (root / rel).is_dir():
            missing.append(MissingRequired(path=rel, kind="directory"))
    return missing


def check_naming_conventions(root: Path) -> list[NamingViolation]:
    violations: list[NamingViolation] = []
    expected = "YYYY-MM-DD-kebab-case-description.md"

    for rel_dir in NAMING_DIRS:
        base = root / rel_dir
        if not base.is_dir():
            continue
        for path in base.glob("*.md"):
            if path.name in NAMING_EXEMPT:
                continue
            if not NAMING_PATTERN.match(path.name):
                violations.append(NamingViolation(path=path.relative_to(root), expected=expected))

    return violations


def _normalize_link_target(raw: str) -> str | None:
    target = raw.strip()
    if not target or target.startswith("#"):
        return None
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", target):
        return target if target.startswith("file://") else None
    if target.startswith("mailto:"):
        return None
    return target.split("#", 1)[0]


def _resolve_target(target: str, source_file: Path, root: Path) -> Path | None:
    if target.startswith("file://"):
        parsed = urlparse(target)
        return Path(unquote(parsed.path))

    source_dir = source_file.parent
    if target.startswith("/"):
        return root / target.lstrip("/")
    return (source_dir / target).resolve()


def _target_exists(resolved: Path) -> bool:
    return resolved.exists()


def extract_link_targets(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for line_no, line in enumerate(content.splitlines(), start=1):
        for match in MARKDOWN_LINK_RE.finditer(line):
            normalized = _normalize_link_target(match.group("target"))
            if normalized:
                findings.append((line_no, normalized))
        for match in ANGLE_FILE_LINK_RE.finditer(line):
            findings.append((line_no, match.group("target")))
    return findings


def check_broken_links(
    root: Path,
    config: AuditConfig,
    markdown_files: Iterable[Path] | None = None,
    scope: str = "project",
) -> list[BrokenLink]:
    broken: list[BrokenLink] = []
    files = list(markdown_files) if markdown_files is not None else discover_markdown_files(root, config, scope=scope)

    for md_file in files:
        try:
            content = md_file.read_text(encoding="utf-8")
        except OSError:
            continue

        for line_no, target in extract_link_targets(content):
            resolved = _resolve_target(target, md_file, root)
            if resolved is None or _target_exists(resolved):
                continue
            broken.append(
                BrokenLink(
                    source=md_file.relative_to(root),
                    line=line_no,
                    target=target,
                    resolved=str(resolved),
                )
            )
    return broken


def _email_is_allowlisted(email: str) -> bool:
    lowered = email.lower()
    if any(lowered.endswith(f"@{domain}") for domain in ALLOWLIST_EMAIL_DOMAINS):
        return True
    return any(lowered.startswith(prefix) for prefix in ALLOWLIST_EMAIL_LOCALPARTS)


def _thai_id_is_plausible(value: str) -> bool:
    return len(re.sub(r"\D", "", value)) == 13


def _thai_id_in_fixture_context(line: str, match: re.Match[str], strict: bool) -> bool:
    start, end = match.span()
    window = line[max(0, start - 8) : min(len(line), end + 12)]
    if re.search(r"\d{10,13}\.(pdf|png|jpg|jpeg|md)\b", window, re.IGNORECASE):
        return True
    if strict:
        return False
    if "golden" in line.lower() or "fixture" in line.lower() or "benchmark" in line.lower():
        return True
    return False


def scan_security(content: str, source: Path, strict: bool = False) -> list[SecurityFinding]:
    findings: list[SecurityFinding] = []

    for line_no, line in enumerate(content.splitlines(), start=1):
        if _line_is_allowlisted(line):
            continue

        for match in THAI_ID_RE.finditer(line):
            if not _thai_id_is_plausible(match.group(0)):
                continue
            if _thai_id_in_fixture_context(line, match, strict):
                continue
            findings.append(
                SecurityFinding(
                    source=source,
                    line=line_no,
                    kind="thai citizen id",
                    snippet=line.strip()[:120],
                )
            )

        for match in EMAIL_RE.finditer(line):
            if not _email_is_allowlisted(match.group(0)):
                findings.append(
                    SecurityFinding(
                        source=source,
                        line=line_no,
                        kind="email address",
                        snippet=line.strip()[:120],
                    )
                )

        for label, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(
                    SecurityFinding(
                        source=source,
                        line=line_no,
                        kind=label,
                        snippet=line.strip()[:120],
                    )
                )

    return findings


def scan_all_security(
    root: Path,
    config: AuditConfig,
    markdown_files: Iterable[Path] | None = None,
    scope: str = "project",
) -> list[SecurityFinding]:
    findings: list[SecurityFinding] = []
    files = list(markdown_files) if markdown_files is not None else discover_markdown_files(root, config, scope=scope)

    for md_file in files:
        try:
            content = md_file.read_text(encoding="utf-8")
        except OSError:
            continue
        findings.extend(scan_security(content, md_file.relative_to(root), strict=config.strict))

    return findings


def run_audit(root: Path, scope: str = "project", config: AuditConfig | None = None, strict: bool = False) -> AuditReport:
    root = find_workspace_root(root)
    config = config or load_audit_config(root, strict=strict)
    if strict and not config.strict:
        config = AuditConfig(
            scan_roots=config.scan_roots,
            scan_root_files_only=config.scan_root_files_only,
            scan_files=config.scan_files,
            exclude_scan_roots=(),
            required_files=config.required_files,
            required_directories=config.required_directories,
            skip_dirs=config.skip_dirs,
            reference_md=config.reference_md,
            strict=True,
        )
    return AuditReport(
        root=root,
        config=config,
        missing_required=check_required_documents(root, config),
        broken_links=check_broken_links(root, config, scope=scope),
        security_findings=scan_all_security(root, config, scope=scope),
        naming_violations=check_naming_conventions(root),
    )


def format_report(report: AuditReport) -> str:
    ref = report.config.reference_md
    ref_note = ref.relative_to(report.root) if ref and ref.is_relative_to(report.root) else ref
    mode = "strict" if report.config.strict else "default"

    lines = [
        f"Docs audit — root: {report.root}",
        f"Mode: {mode}",
        f"Config: {CONFIG_FILENAME}" + (f" + {ref_note}" if ref_note else ""),
        "",
        f"## Missing required ({len(report.missing_required)})",
    ]

    if report.missing_required:
        lines.extend(f"- [{item.kind}] {item.path}" for item in report.missing_required)
    else:
        lines.append("- none")

    lines.extend(["", f"## Broken links ({len(report.broken_links)})"])
    if report.broken_links:
        lines.extend(
            f"- {item.source}:{item.line} -> {item.target} (resolved: {item.resolved})"
            for item in report.broken_links
        )
    else:
        lines.append("- none")

    lines.extend(["", f"## Security findings ({len(report.security_findings)})"])
    if report.security_findings:
        lines.extend(
            f"- {item.source}:{item.line} [{item.kind}] {item.snippet}"
            for item in report.security_findings
        )
    else:
        lines.append("- none")

    lines.extend(["", f"## Naming violations ({len(report.naming_violations)})"])
    if report.naming_violations:
        lines.extend(
            f"- {item.path} (expected: {item.expected})"
            for item in report.naming_violations
        )
    else:
        lines.append("- none")

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Start path (git root auto-detected)")
    parser.add_argument(
        "--scope",
        choices=("project", "all"),
        default="project",
        help="Scan scope: project-owned docs (default) or all markdown files",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Strict mode: include excluded paths, tighter PII rules",
    )
    args = parser.parse_args(argv)

    report = run_audit(args.root, scope=args.scope, strict=args.strict)
    print(format_report(report))
    return 1 if report.has_findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
