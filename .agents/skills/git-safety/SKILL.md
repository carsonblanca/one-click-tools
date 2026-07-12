---
name: git-safety
description: Protect one-click-tools Git state before staging, committing, pushing, or preparing a PR. Use when asked to commit, push, open a PR, inspect changes, or finish work that may be committed.
---

# Git Safety

Protect user changes and repository history.

## Required Checks

Before staging, committing, pushing, or opening a PR:

1. Check the current branch.
2. Check working tree status.
3. Inspect the diff for files touched by the task.
4. Inspect staged files before committing.
5. Confirm no unrelated or unowned changes are included.

## Rules

- Do not push directly to `main`.
- Do not force push.
- Do not delete branches.
- Do not revert or overwrite unowned changes.
- Do not include generated reports, secrets, credentials, personal paths, or environment variable values.
- Do not commit or push unless the user explicitly requested it.
- If unrelated changes exist, leave them untouched and report that they were preserved.
