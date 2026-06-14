# Phase 1 Foundation Plan

Date: 2026-06-14
Scope: first four weeks after the baseline audit.

## Principles

- Do not add more tools until the foundation can catch registration, SEO, language, and analytics mistakes automatically.
- Keep changes small and reviewable.
- Avoid changing production infrastructure in this phase.
- Prioritize gates that prevent future regressions.

## Week 1: Quality Gates And Registry Safety

### Tasks

1. Fix existing ESLint errors without behavior changes.
2. Add a read-only registry validation script for `data/tools.json`, `tool-client.tsx`, components, slugs, required fields, and localized slug coverage.
3. Add a script command such as `npm run validate:tools`.
4. Document the expected new-tool checklist in `AGENTS.md` or a contributor doc.

### Acceptance Criteria

- `npm run lint` exits 0.
- `npm run build` exits 0.
- Tool validation exits 0 and fails on an intentionally missing registration in local testing.
- No `reports/daily/*` files are included in feature PRs.

## Week 2: SEO And Language Foundation

### Tasks

1. Add canonical and hreflang alternates to English dynamic tool pages.
2. Fix `<html lang>` for `/zh-cn` and `/zh-tw` pages.
3. Localize shared header/footer chrome for Chinese routes.
4. Make `ToolSeoContent` locale-aware so English pages do not render Chinese blocks.
5. Add a language QA script for forbidden terms and placeholder copy.

### Acceptance Criteria

- Built HTML for `/`, `/zh-cn`, `/zh-tw` has correct language and metadata.
- Pixel Knock English page does not show Chinese SEO blocks unless explicitly in bilingual UI.
- Chinese pages do not show English header/footer navigation labels.
- Sitemap still includes all English tools and localized routes.

## Week 3: Analytics Standardization

### Tasks

1. Implement typed analytics helper functions around `trackEvent`.
2. Define safe parameter allowlists and file-size buckets.
3. Migrate Pixel Knock events to the standard event names or add compatibility mapping.
4. Wire standard events into five priority tools.
5. Add a basic analytics unit test for sanitizer behavior.

### Acceptance Criteria

- No analytics event can pass file names, user text, image data, tokens, cookies, or credentials.
- Priority tools report view/start/success/error/download/copy where applicable.
- Event names use a single snake_case vocabulary.
- Error events include `error_code` and never raw exception text.

## Week 4: Test Coverage And Priority Tool QA

### Tasks

1. Add a minimal test framework suitable for pure functions and metadata validators.
2. Extract pure helpers from selected tools where low-risk.
3. Add tests for JSON parsing/formatting, CSV parsing, URL building, date/number calculations, and 3D calculator formulas.
4. Create a manual QA checklist for file tools and image tools.

### Acceptance Criteria

- `npm run test` exists and passes.
- At least 20 high-risk pure functions have tests.
- Build, lint, validate, and tests can run locally without network access.
- Top priority tools have documented expected examples.

## Existing Tools To Validate First

1. Pixel Knock Grid Generator: high complexity, file upload, canvas, ZIP/STL/OBJ/CSV exports, analytics.
2. Markdown Previewer: previous XSS risk area; keep regression checks.
3. JSON Formatter / Validator / Minifier: common developer flows and parse errors.
4. CSV to JSON / JSON to CSV: parsing and escaping edge cases.
5. Image Compressor / Resizer / Cropper: local file handling and canvas reliability.
6. Build Plate Fit Calculator and 3D estimators: calculation trust and localized terminology.
7. UTM URL Builder and Canonical URL Checker: SEO correctness.

## Candidate Tools For Later Only

Do not build these in Phase 1; keep as backlog candidates:

- SVG optimizer / cleaner.
- WebP quality comparison tool.
- G-code metadata viewer.
- STL dimension inspector.
- Color palette reducer for craft projects.
- Regex cheatsheet builder.
- HTTP header analyzer without fetching external URLs.

## Infrastructure To Build Before More Tools

- Tool registry validator.
- Locale-aware shared layout/chrome.
- SEO metadata helper for static and dynamic pages.
- Analytics helper wrappers and privacy allowlist.
- Minimal unit test setup.
- Language QA scanner.
- Route smoke test after build.

## Risks To Avoid

- Do not add payment, ads, or backend storage before analytics and privacy boundaries are stable.
- Do not localize all 91 tools with machine translation; localize priority tools manually.
- Do not split `data/tools.json` until a validator exists and the schema is stable.
- Do not replace working tool logic while building foundation checks.
