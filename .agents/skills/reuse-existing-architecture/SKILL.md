---
name: reuse-existing-architecture
description: Reuse one-click-tools existing Supabase, R2, repository, API, and component patterns. Use when adding features, fixing data flows, touching admin flows, building tool UI, or deciding where logic should live.
---

# Reuse Existing Architecture

Follow the current one-click-tools structure before adding new patterns.

## Rules

- Reuse existing Supabase clients, R2 helpers, repository modules, API route patterns, and shared components before creating new abstractions.
- Keep browser-only tools client-side whenever possible.
- Use existing tool metadata and routing conventions for tool pages.
- Use existing admin, repository, and draft data flow patterns for admin features.
- Prefer shared UI components from the project over new one-off styling.
- Do not introduce new schema, migration, data route, infrastructure, or production deployment behavior without approval.

## Before Creating New Code

1. Search for an existing component, repository, API route, helper, or type that already solves the problem.
2. Match naming, file placement, and data flow to nearby code.
3. Add a new abstraction only when existing patterns cannot cover the task cleanly.
4. Keep any new helper narrow and local unless the project already has a shared location for that concern.
