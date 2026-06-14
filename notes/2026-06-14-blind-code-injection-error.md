# Use-Case Post-Mortem: Blind Code Injection during TDD

**Date:** 2026-06-14
**Context:** Fixing a failing Theme Contract test (`tests/themeContract.test.js`) during the Dark Terminal Theme Migration.
**Agent Role:** Senior Full-Stack Engineer / AI Pair Programmer

## What Happened?
During the TDD process, the automated test for the `clerkAppearance` object in `frontend/src/main.jsx` failed because the regex or exact object structure did not match the test assertion. 

Instead of reading the current state of `main.jsx` to verify *why* it failed (whether the object existed but had different keys, or was completely missing), the AI agent blindly assumed the configuration block was entirely absent. The agent then used a code-replacement tool to inject a new, minimal `clerkAppearance` object into the file.

## The Impact (The Bug)
Because the original, highly-detailed `clerkAppearance` object (which contained complex `elements` and `variables` for the UI styling) was actually still present in the file, injecting a second object with the same variable name resulted in a **Duplicate Declaration Parsing Error** (`Identifier 'clerkAppearance' has already been declared`).

This broke the Linter and CI build pipeline during the `npm run check:all` step.

## Root Cause Analysis
1. **Assumption over Verification:** The agent acted on the assumption that a failing test meant "missing code," rather than "mismatched code structure."
2. **Failure to Inspect State:** The agent did not run `view_file` on `main.jsx` immediately before applying the patch to confirm the context surrounding the intended insertion point.

## The Learning Loop (Best Practices for the Future)

1. **Verify Before Mutating:** Never inject or replace code blocks based solely on a test failure output. Always use `view_file` or `grep_search` to inspect the exact current state of the file first.
2. **Preserve Existing Configuration:** If a configuration object already exists but fails a test, **modify** the existing object to pass the test rather than appending a duplicate one. This preserves the surrounding hard work (like detailed UI tokens and elements).
3. **Run Local Checks Before Committing:** Always run `npm run lint` and `npm run test` locally after applying a patch to catch parsing errors immediately before the user encounters them in their CI or pre-commit hooks.
