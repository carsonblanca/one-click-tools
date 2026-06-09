# OneClick Tools Security Baseline Audit

## Architecture Overview

OneClick Tools is a Next.js site designed around lightweight browser-based utilities. The public site is expected to run on Vercel, source changes are managed through GitHub, and scheduled health checks run through GitHub Actions. Most tools are client-side utilities, so user-entered content should remain in the browser unless a future feature explicitly adds server-side processing.

## Current Attack Surface

- Public web routes, including the homepage, tool pages, legal pages, sitemap, and robots file.
- Client-side tool components that parse, transform, or preview user-provided text, URLs, images, and files.
- GitHub Actions workflows that install dependencies, run builds, generate daily reports, send email notifications, and commit report files.
- GitHub Secrets used for SMTP configuration.
- npm dependencies and the package lockfile used during CI and deployment.
- Search engine crawlers, automated scanners, and low-quality SEO traffic.

## Risk Assessment

| Area | Risk | Notes |
| --- | --- | --- |
| DDoS and malicious traffic | Medium | A static-first Vercel deployment reduces origin exposure, but traffic spikes, aggressive crawlers, and repeated dynamic route hits can still consume bandwidth and build/runtime resources. |
| GitHub Actions and Secrets | Medium | The workflow can write generated reports and uses SMTP secrets. Scope, secret hygiene, and workflow review remain important. |
| Upload and image tools | Medium | Browser-only file handling limits server exposure, but large files can still cause browser memory pressure and user confusion. |
| Frontend XSS | Medium | Text converters and formatters must avoid rendering user input as trusted HTML. React escaping helps, but preview features need caution. |
| Dependencies and supply chain | Medium | npm packages and lockfiles must be reviewed. Multiple lockfiles or unpinned installs increase ambiguity. |
| SEO spam and crawler traffic | Low | Public utility sites attract crawlers. The main risk is noise, bandwidth usage, and analytics pollution. |
| Static legal and trust pages | Low | About, privacy, terms, and contact pages reduce trust risk but need to stay accurate as features change. |

## DDoS and Malicious Traffic

Current exposure is mostly public page traffic. Vercel's edge network provides a useful first layer, but the project should still monitor traffic spikes, unusual user agents, high error rates, and repeated hits against dynamic tool routes. If the site grows, add rate limiting or WAF rules at the hosting/CDN layer rather than inside individual client-side tools.

## GitHub Actions and Secrets

The daily report workflow has repository write permission so it can commit generated reports. This should stay limited to the smallest required permission. SMTP credentials must remain in GitHub Secrets only and should never be printed in logs or committed into source files.

## Upload and Image Tools

Image and file utilities should continue to run locally in the browser. They should not upload files to external services, and UI copy should avoid promising advanced metadata extraction unless implemented safely. Large image handling should use browser APIs carefully to avoid crashes or excessive memory use.

## Frontend XSS

Tools that accept HTML, XML, JSON, CSV, YAML, URLs, or Markdown-like content should display output as text unless a preview is intentionally sandboxed. Avoid `dangerouslySetInnerHTML` for user-provided content. The Markdown preview tool now renders a limited set of Markdown as React nodes and only allows `http://`, `https://`, and `mailto:` links.

## Dependencies and Supply Chain

Keep dependency changes small, review lockfile changes, and avoid unnecessary packages for simple browser tools. CI should use a lockfile-based install. If more workflows are added, pin official actions to stable major versions at minimum and periodically review them.

## SEO Spam, Crawlers, and Indexing

Utility sites can attract automated scraping and low-quality crawler traffic. The site should keep `robots.txt` and `sitemap.xml` accurate, monitor unusual traffic, and avoid generating thin duplicate pages. If spam traffic becomes expensive, add CDN-level bot controls.

## Current Protections

- Browser-first tools reduce server-side handling of user content.
- Basic trust pages exist for privacy, terms, and contact information.
- The daily report workflow has explicit permissions.
- SMTP notification secrets are injected from GitHub Secrets.
- A security check script now scans for baseline workflow, lockfile, secret, upload-tool, and support-page risks.
- The Markdown preview tool avoids raw HTML injection and limits supported Markdown to safe basic formatting.

## Recommendations

- Keep upload and image tools local-only unless a future server feature has a separate security review.
- Review GitHub Actions changes carefully because workflows can access secrets and repository write permissions.
- Rotate SMTP credentials immediately if they appear in logs or source files.
- Keep one package manager lockfile in the repository.
- Add hosting-level traffic controls if crawler or DDoS traffic becomes visible in Vercel metrics.
- Continue running the security check through the daily report.
