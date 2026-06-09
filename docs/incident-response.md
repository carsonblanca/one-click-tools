# OneClick Tools Incident Response

Use this document as the first-response checklist for common operational and security events. Keep actions factual, preserve evidence, and avoid posting secrets in tickets, logs, or chat.

## DDoS or Malicious Traffic

1. Discover: Watch for traffic spikes, high error rates, unusual geography, repeated user agents, or Vercel bandwidth/runtime alerts.
2. Confirm: Compare Vercel analytics, deployment logs, and external uptime checks. Identify affected routes and whether normal users are blocked.
3. Contain: Enable or tighten Vercel/CDN protections, block obvious abusive patterns, temporarily reduce expensive dynamic behavior, and pause nonessential automation if needed.
4. Fix: Add durable CDN/WAF rules, tune robots guidance, and reduce expensive route behavior.
5. Review: Document timing, impact, attack pattern, controls used, and follow-up work.

## Vercel Deployment Failure

1. Discover: Identify failed deployments through Vercel alerts, GitHub Actions output, or user reports.
2. Confirm: Check the failing build step, recent code changes, environment variables, and whether production is still serving the last good deployment.
3. Contain: Keep the last good deployment active. Avoid redeploy loops until the cause is understood.
4. Fix: Resolve build, dependency, environment, or route errors in a focused patch.
5. Review: Record the root cause and add a daily report or build check if the failure mode can be detected earlier.

## GitHub Token or SMTP Secret Leak

1. Discover: Treat any secret in source, logs, screenshots, issue comments, or chat as exposed.
2. Confirm: Identify which credential leaked, where it appeared, and whether it is still valid.
3. Contain: Revoke or rotate the credential immediately. Remove the exposed value from GitHub Secrets and replace it with a new value only after rotation.
4. Fix: Remove the leaked value from files and logs where possible, check workflow output, and review whether code printed sensitive variables.
5. Review: Document exposure window, affected systems, rotation time, and prevention changes.

## Malicious PR or Dependency Anomaly

1. Discover: Look for unexpected dependency changes, lockfile churn, new install scripts, suspicious workflow edits, or unrelated code in a PR.
2. Confirm: Review package names, maintainers, install scripts, workflow permissions, and whether secrets could be exposed.
3. Contain: Do not run untrusted workflows with secrets. Close or isolate suspicious PRs and disable compromised automation if needed.
4. Fix: Revert or replace suspicious dependency changes, pin safe versions, and re-run build/security checks.
5. Review: Record indicators, affected files, and review rules that should catch similar changes earlier.

## Website Page Abnormality

1. Discover: Detect broken pages through user reports, daily reports, monitoring, or manual checks.
2. Confirm: Reproduce the issue on affected routes and compare local build output with production behavior.
3. Contain: If production is broken, roll forward with a minimal fix or use the last known good deployment where available.
4. Fix: Patch the route, component, data, or metadata issue without unrelated refactors.
5. Review: Add a targeted check if the same class of issue can be caught by build, route, sitemap, or security reports.

## Communication

- Keep a short timeline with discovery time, confirmation time, containment time, and resolution time.
- Keep secrets out of incident notes.
- Prefer small fixes that restore service before broader cleanup.
- After resolution, add one concrete prevention task to the backlog or daily report checks.
