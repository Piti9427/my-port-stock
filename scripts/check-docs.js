#!/usr/bin/env node
"use strict";

/**
 * CI Gate: Documentation & Multi-Agent Structure Verifier
 * Validates:
 * 1. YAML Frontmatter presence & valid status field in docs/plans/
 * 2. Status matches directory location (completed, in-progress, pending, archived)
 * 3. Checks for loose files in docs/plans/ root (except README.md)
 * 4. Verifies Tool Adapter Pointers (.agents, .claude, .codex, .cursor)
 * 5. Checks markdown link validity for local file references
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const plansDir = path.join(repoRoot, "docs/plans");
const validStatuses = ["Completed", "In Progress", "Pending", "Archived"];
const validSubdirs = ["completed", "in-progress", "pending", "archived"];

let errors = [];
let warnings = [];

// 1. Check for loose files in docs/plans/
if (fs.existsSync(plansDir)) {
  const rootEntries = fs.readdirSync(plansDir);
  for (const entry of rootEntries) {
    const fullPath = path.join(plansDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && entry.endsWith(".md") && entry !== "README.md") {
      errors.push(
        `Loose plan file found at root of docs/plans/: ${entry}. Must be moved to completed/, in-progress/, pending/, or archived/.`,
      );
    }
  }
}

// 2. Verify files inside status subdirectories
for (const subdir of validSubdirs) {
  const dirPath = path.join(plansDir, subdir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Verify Frontmatter
    if (!content.startsWith("---")) {
      errors.push(`Missing YAML Frontmatter in docs/plans/${subdir}/${file}`);
      continue;
    }

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push(
        `Malformed YAML Frontmatter header in docs/plans/${subdir}/${file}`,
      );
      continue;
    }

    const frontmatterText = frontmatterMatch[1];
    const statusMatch = frontmatterText.match(/^status:\s*(.+)$/m);

    if (!statusMatch) {
      errors.push(
        `Missing 'status' field in Frontmatter of docs/plans/${subdir}/${file}`,
      );
      continue;
    }

    const statusValue = statusMatch[1].trim().replace(/^['"]|['"]$/g, "");
    if (!validStatuses.includes(statusValue)) {
      errors.push(
        `Invalid status '${statusValue}' in docs/plans/${subdir}/${file}. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    // Verify status matches directory
    const expectedStatusMap = {
      completed: "Completed",
      "in-progress": "In Progress",
      pending: "Pending",
      archived: "Archived",
    };

    if (statusValue !== expectedStatusMap[subdir]) {
      errors.push(
        `Status mismatch in docs/plans/${subdir}/${file}: status is '${statusValue}', but file is in '${subdir}/' folder (expected '${expectedStatusMap[subdir]}').`,
      );
    }
  }
}

// 3. Verify Tool Adapters (Thin Pointers)
const requiredAdapters = [
  [".agents/AGENTS.md", "AGENTS.md"],
  [".claude/CLAUDE.md", "AGENTS.md"],
  [".codex/AGENTS.md", "AGENTS.md"],
  [".cursor/rules/00-core-instructions.mdc", "AGENTS.md"],
];

for (const [relPath, expectedRef] of requiredAdapters) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required Tool Adapter Pointer: ${relPath}`);
  } else {
    const content = fs.readFileSync(fullPath, "utf8");
    if (!content.includes(expectedRef)) {
      errors.push(
        `Tool Adapter ${relPath} does not reference primary rule ${expectedRef}`,
      );
    }
  }
}

// 4. Verify Tool Registry Map presence
const toolMapPath = path.join(
  repoRoot,
  "docs/guidelines/TOOL_INTEGRATION_MAP.md",
);
if (!fs.existsSync(toolMapPath)) {
  errors.push(
    "Missing Central Tool Registry document: docs/guidelines/TOOL_INTEGRATION_MAP.md",
  );
}

// 5. Verify local markdown links in PROJECT_MEMORY_INDEX.md
const memoryIndexPath = path.join(repoRoot, "PROJECT_MEMORY_INDEX.md");
if (fs.existsSync(memoryIndexPath)) {
  const content = fs.readFileSync(memoryIndexPath, "utf8");
  const linkMatches = content.matchAll(
    /\[(?:[^\]]+)\]\((file:\/\/\/[^)]+|docs\/[^)]+)\)/g,
  );
  for (const match of linkMatches) {
    let target = match[1];
    if (target.startsWith("file:///")) {
      target = target.replace("file:///", "/");
    } else {
      target = path.join(repoRoot, target);
    }

    // Strip hash anchors
    target = target.split("#")[0];

    if (!fs.existsSync(target)) {
      warnings.push(
        `Broken link in PROJECT_MEMORY_INDEX.md: target file not found -> ${match[1]}`,
      );
    }
  }
}

// Report Results
console.log("=== Markdown & Multi-Agent Structure CI Audit ===");
if (warnings.length > 0) {
  console.log(`\n⚠️ Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
}

if (errors.length > 0) {
  console.error(`\n❌ Errors (${errors.length}):`);
  errors.forEach((e) => console.log(`  - ${e}`));
  console.error("\nDocs verification failed.");
  process.exit(1);
} else {
  console.log(
    "✅ All docs structure and tool adapter checks passed successfully!\n",
  );
  process.exit(0);
}
