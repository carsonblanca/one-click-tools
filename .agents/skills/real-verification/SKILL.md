---
name: real-verification
description: Verify one-click-tools changes through real browser behavior and data-link checks instead of relying only on build success. Use before declaring a UI, API, admin flow, Supabase/R2 flow, or tool feature complete.
---

# Real Verification

Treat build success as necessary but not sufficient.

## Verification Rules

- Run the project-relevant build or static check when appropriate.
- Verify user-facing behavior in a real browser for UI changes.
- Verify the actual data chain for API, Supabase, R2, repository, admin, or draft-flow changes.
- Check both light and dark themes for tool UI changes when the touched surface supports them.
- Do not substitute mocks, screenshots, or compile success for live behavior when the task depends on data flow.
- If verification cannot be completed, state exactly what was not verified and call the work development complete or pending verification, not fixed or done.

## Stop Rule

If the same verification failure remains after two consecutive attempts, stop and report the failing step, observed result, attempted fixes, and likely next checks.
