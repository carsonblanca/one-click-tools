---
name: root-cause-first
description: Diagnose one-click-tools failures from the simplest, lowest-level, most common causes before changing code. Use when debugging build errors, runtime errors, broken UI behavior, data loading issues, API failures, Supabase or R2 issues, or repeated failed fixes.
---

# Root Cause First

Debug one-click-tools by proving the cause before widening the fix.

## Workflow

1. Start with the simplest and most common layer: typo, missing import, bad prop, wrong route, stale state, invalid data shape, missing environment setup, or failed network response.
2. Reproduce or inspect the failure before editing when possible.
3. Trace from the lowest failing boundary upward: browser console, request, route handler, repository, Supabase or R2 call, then UI state.
4. Prefer one focused fix over broad rewrites.
5. After each attempt, verify whether the observed failure changed.
6. If two consecutive attempts fail on the same issue, stop and report the evidence, attempted fixes, and remaining unknowns.

## Boundaries

- Do not change schema, migrations, architecture, data route strategy, or production deployment while debugging unless the user approves.
- Do not mask data-chain failures with placeholder UI or mocked success.
- Do not call unverified work fixed; call it development complete and pending verification.
