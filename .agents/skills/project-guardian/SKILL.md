---
name: project-guardian
description: Guard one-click-tools project scope and delivery priorities. Use when planning or implementing repository work, especially when a request could expand into refactoring, architecture changes, schema or migration changes, production deployment changes, or work unrelated to the August 2026 completion target.
---

# Project Guardian

Keep one-click-tools moving toward about 90% completion by early August 2026.

## Rules

- Prioritize usable functionality over unrelated refactors, rewrites, or polish.
- Keep changes small and directly tied to the user's request.
- Do not change architecture, schemas, migrations, data routes, or production deployment without explicit approval.
- Do not add new services, infrastructure, dependencies, or operational processes unless the task requires them and the user approves.
- Preserve existing project rules in `AGENTS.md` and any more specific nested instructions.
- Do not include credentials, personal paths, or environment variable values in new artifacts.
- If the same problem fails for two consecutive attempts, stop, summarize both attempts, and ask for direction.

## Before Acting

1. Confirm the task supports the current product goal or is explicitly requested by the user.
2. Identify the smallest useful outcome.
3. Check whether the requested change touches protected areas: architecture, schema, migration, data route, or production deployment.
4. If protected areas are involved, pause for approval before editing.
