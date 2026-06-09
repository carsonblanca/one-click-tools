# Security Check

Run the baseline security check from the repository root:

```bash
python3 scripts/security_check.py
```

The script is read-only. It checks package lockfiles, the daily report workflow,
GitHub Secrets usage, obvious sensitive string patterns, required trust pages,
local upload/image tools, raw HTML rendering review points, and daily report
support files.

The daily report also includes the security check output in its `Security Summary`
section. If SMTP settings are not configured, the daily Markdown report still
generates and email delivery is skipped.
