---
name: session-discipline
description: Keep one-click-tools work sessions focused on one clear goal. Use when task goals change, context grows too large, context is compacted, explanations or reads repeat, or the user is about to continue into a second independent task.
---

# Session Discipline

Keep each one-click-tools session focused on one explicit goal.

## Rules

- Complete one clear goal per session by default.
- Record unrelated issues as follow-up tasks instead of handling them in the current session.
- Use `AGENTS.md` and project Skills for shared rules; do not paste full rule sets into the current prompt.
- End the session when the current goal or stop condition is reached.
- After context compaction, prefer a new session if the core task is still unfinished.
- Stop and suggest a new session when context is too long, explanations repeat, file reads repeat, or boundaries are being forgotten.
- Do not mix independent background, SEO, OCR, R2, database, UI, or other unrelated work streams in one session.
- Do not use a new session as a substitute for saving real code, Git state, or verification evidence.
- Do not create a new session for every small command; switch only when the goal changes or context materially grows.

## Handoff Summary

When a new session is needed, keep the handoff brief and include only:

- Current goal.
- Completed work.
- Current branch.
- Modified files.
- First blocker.
- Single next step.
