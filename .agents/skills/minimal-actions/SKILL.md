---
name: minimal-actions
description: Control one-click-tools task scope, command count, file reads, edits, and verification effort. Use by default for development, debugging, and validation tasks to avoid repeated commands, repeated tests, broad scans, unnecessary modifications, and scope expansion.
---

# Minimal Actions

Use the fewest necessary actions to complete the current one-click-tools task without skipping real safety checks or acceptance criteria.

## Before Starting

Create a minimal action plan:

- Expected files to read.
- Expected files to modify.
- Expected commands to run.
- Expected verification to perform.

If actual actions clearly exceed the plan, explain why before widening the scope. Do not expand scope without proving the added work is necessary.

## Rules

- Prefer modifying the fewest files by default.
- Read only files directly related to the current problem; do not run goal-free repository-wide scans.
- Do not repeat a command or test that already produced a valid result unless the relevant input changed.
- Run build, typecheck, lint, and browser checks only when the task or code changes require them.
- Re-verify only the range affected by a change to already verified work.
- Do not perform incidental optimization, refactoring, unification, or cleanup.
- Handle only the current goal and the first real blocker.
- Stop as soon as acceptance criteria are met.
- Use precise commands, target files, and focused tests instead of unnecessary full-run operations.
- Do not skip required safety checks or real acceptance verification merely to reduce actions.
