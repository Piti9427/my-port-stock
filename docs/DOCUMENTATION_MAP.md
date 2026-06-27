---
status: Stable
audience: AI Agent Only
associated_adr: file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0001-supabase-runtime-source-of-truth.md
primary_tests: "None"
---

# MyPortStock Documentation Sitemap & Intent Directory

This map is designed for AI agents to discover, evaluate, and navigate the markdown documentation in the MyPortStock repository without inflating context token limits.

---

## 🗺️ Documentation Directory Map

### 1. Root Orchestrator Entrypoints
*   **`README.md`** (Size: Low)
    *   *Intent:* General human introduction to the workspace, repo structure, and developer dependencies.
*   **`AGENTS.md`** (Size: High)
    *   *Intent:* **MANDATORY READ ON TURN START.** Contains strict execution rules, pricing source ladder tables, score weights, and sub-agent council mappings.

### 2. Core Investment & Persona Guardrails
*   **`INVESTMENT_CIO_PERSONA.md`** (Size: Medium)
    *   *Intent:* Defines the Chief Investment Officer's objective, unbiased debate stance, tone rules, and formatting rules.
*   **`ELITE_INVESTOR_SOP.md`** (Size: High)
    *   *Intent:* The Standard Operating Procedure for evaluating trades. Contains the 7-Dimension auditing checklist.
*   **`GEMINI.md`** (Size: Medium)
    *   *Intent:* Core runtime data integrity guardrails, package version rules (Clerk v6, Clerk Express, Supabase JS v2).

### 3. Repository Memory & History
*   **`PROJECT_MEMORY_INDEX.md`** (Size: High)
    *   *Intent:* Active log of durable session memories. Read to understand what was completed in the previous sessions.
*   **`docs/adr/`** (Size: Low per file)
    *   *Intent:* Chronological record of architectural decisions:
        *   `0001-supabase-runtime-source-of-truth.md`
        *   `0002-clerk-user-isolation-rls.md`
        *   `0003-subagent-autonomous-search.md`
        *   `0004-unbiased-institutional-quality-gates.md`

### 4. Code & Visual Style Guides
*   **`docs/DESIGN.md`** (Size: Medium)
    *   *Intent:* Defines the dark terminal UI styling guidelines, colors, font rules, spacing, and CSS constraints.
*   **`docs/FILE_ORGANIZATION.md`** (Size: Medium)
    *   *Intent:* Standardizes directory structure, generated artifacts, scratch files, and template notes naming.

---

## 🎯 Task-to-File Reading Matrix

Use this matrix to load only the files required for your active task:

| If your task is to... | MUST Read | OPTIONAL / Contextual Read |
| :--- | :--- | :--- |
| **Debug database or RLS rules** | `docs/adr/0002-clerk-user-isolation-rls.md` | `GEMINI.md` (database rules section) |
| **Modify buy/sell decision math** | `AGENTS.md`, `ELITE_INVESTOR_SOP.md` | `docs/adr/0004-unbiased-institutional-quality-gates.md` |
| **Edit CSS or build UI pages** | `docs/DESIGN.md` | `docs/FILE_ORGANIZATION.md` |
| **Understand previous session tasks** | `PROJECT_MEMORY_INDEX.md` | Check `notes/` directory for active roadmap notes |
| **Write scripts or add tool files** | `docs/FILE_ORGANIZATION.md` | `tools/` directory list |

---

## 🔍 Verification

To verify that all markdown files follow the AI Context Anchors standard:

```bash
# Verify that files in /docs contain the status and audience frontmatter
head -n 5 docs/adr/*.md
head -n 5 docs/*.md
```
