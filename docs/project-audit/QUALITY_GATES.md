# Quality Gates

Date: 2026-06-14

## Required Pre-Release Commands

Run these before merging feature work:

```bash
npm run validate:tools
npm run validate:analytics
npm run validate:image-compressor
npm run lint
npx tsc --noEmit --incremental false
npm run build
python3 scripts/security_check.py
```

The combined local gate is:

```bash
npm run quality:check
```

`quality:check` intentionally does not run tests yet because the project does not currently define a `test` script.

## `validate:tools` Checks

`npm run validate:tools` runs `scripts/validate-tools.mjs`. It is read-only and must not rewrite `data/tools.json`.

It blocks when:

- `data/tools.json` is not an array.
- Any tool is missing `name`, `slug`, `tag`, `category`, `categorySlug`, `desc`, or `description`.
- Any slug is duplicated.
- Any slug is not lowercase, numeric, and hyphenated.
- Any English-facing metadata field contains obvious Chinese characters.
- Any tool metadata lacks a matching `tool-client` registration.
- Any `tool-client` registration lacks metadata.
- Any registered component import cannot be resolved.
- Any registered component file is missing.
- Tool names are exactly duplicated.
- Tool descriptions are exactly duplicated.
- Generated English tool URLs are duplicated.
- Pixel Knock-specific content appears under another slug.
- Localized content references an unknown tool slug.

## Lint Standard

- `npm run lint` must exit 0.
- Do not use global `eslint-disable`.
- Do not disable React hook/compiler rules to hide real issues.
- Do not use `any`, `ts-ignore`, or fake dependencies to bypass checks.
- Local one-line disables are allowed only when the code pattern is intentionally safe and the comment explains why.

## TypeScript Standard

- Run `npx tsc --noEmit --incremental false`.
- The non-incremental flag avoids writing `tsconfig.tsbuildinfo` and is stable for local and CI validation.
- Type errors block release.

## Build Standard

- `npm run build` must pass.
- Build warnings must be recorded.
- The known workspace root warning is currently caused by a parent `/Users/a1/pnpm-lock.yaml`; do not delete user-level files from this project. Fix safely by setting project root config or removing the unrelated parent lockfile only with explicit owner approval.

## Language Blocking Conditions

Block release when:

- English routes render Chinese SEO copy or Chinese-only long-form content.
- `/zh-cn` routes render `<html lang="en">`.
- `/zh-tw` routes render `<html lang="en">`.
- Chinese routes show placeholder messages such as `正在准备中`, `待上线`, or `占位`.
- Forbidden mistranslations return: `细胞`, `活性细胞`, `模特尺寸`, `像素敲击`, `排泄塔`.
- Buttons, error states, empty states, and download labels are partially translated on pages marked as localized.

## SEO Blocking Conditions

Block release when:

- A tool page canonical points to the homepage, another tool, or the wrong slug.
- A tool page lacks self-referencing canonical.
- A page emits hreflang alternates for routes that do not exist.
- A localized route points canonical to a different language page.
- Page title, H1, description, and tool slug describe different functionality.
- Sitemap omits existing tool pages or includes duplicate URLs.

## Tool Registration Blocking Conditions

Block release when:

- A metadata slug in `data/tools.json` is not registered in `app/(en)/tools/[slug]/tool-client.tsx`.
- A registered slug has no metadata entry.
- A registered component import cannot be resolved.
- A registered component file is missing.
- A slug, generated tool URL, tool name, or description is exactly duplicated.
- Pixel Knock-specific metadata appears under any slug other than `pixel-knock-board-generator`.

## Temporarily Allowed Warnings

These warnings are allowed temporarily but should be tracked:

- Local preview tools using raw `<img>` for local object URLs.
- Unused `locale` props in existing 3D Printing tools while DOM translation remains in place.

Warnings should not increase. New warnings require either a fix or a short explanation in the PR.

## New Tool Checklist

Before adding a new tool:

- Add metadata to `data/tools.json`.
- Use an existing category unless a new category is intentionally added.
- Register the component in `app/(en)/tools/[slug]/tool-client.tsx`.
- Confirm the component file exists in `components/tools/`.
- Use `ToolUI` primitives for inputs, buttons, panels, result boxes, checkboxes, and stat cards.
- Keep processing client-side unless server work is explicitly approved.
- Do not upload user content to OneClick Tools servers.
- Add custom SEO copy for important tools.
- Add analytics only through the approved safe event wrapper.
- Run `npm run validate:tools`, `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build`.

## Explicitly Forbidden Bypasses

- Do not force push to hide broken history.
- Do not delete user files, Python scripts, or existing tools to make checks pass.
- Do not loosen validation rules just to pass a failing tool.
- Do not add fake metadata, fake components, or fake localized routes.
- Do not collect user input, file names, image contents, cookies, credentials, or secrets in analytics events.
- Do not modify production deployment, DNS, Vercel, Cloudflare, secrets, or environment variables as part of quality-gate work.
- Do not add analytics events that collect file names, user input, raw URLs, raw errors, credentials, or private file content.

## HTML Lang Check Method

After `npm run build`, run the site locally and inspect representative pages:

- `/` must render `<html lang="en">`.
- `/tools/json-formatter` must render `<html lang="en">`.
- `/zh-cn` and `/zh-cn/tools/pixel-knock-board-generator` must render `<html lang="zh-CN">`.
- `/zh-tw` and `/zh-tw/tools/pixel-knock-board-generator` must render `<html lang="zh-TW">`.

Do not fix this with client-side JavaScript after page load. The language must come from server-rendered route/layout output.

## Canonical And Hreflang Check Method

For each sampled page, inspect the generated head:

- English tool pages must have a self-referencing canonical such as `https://one-click-tools.com/tools/json-formatter`.
- English tool pages must include `zh-CN` and `zh-TW` hreflang only when those localized routes really exist.
- Localized tool pages must have canonical URLs under their own locale path.
- Open Graph `url` should match the canonical URL for English dynamic tool pages.
- `sitemap.xml` must include 91 English tool URLs, only real localized tool URLs, and no duplicate `<loc>` values.

## English Page Chinese Pollution Check Method

For English samples such as `/`, `/tools/json-formatter`, and `/tools/pixel-knock-board-generator`:

- Strip script and style tags before checking visible text.
- Block release if visible English-page text contains Chinese SEO paragraphs, Chinese FAQ, Chinese helper copy, Chinese button text, or Pixel Knock Chinese-only terms.
- Language switch UI on English pages should use English names such as `Simplified Chinese` and `Traditional Chinese`.
- Pixel Knock English UI should label its internal language option as `Chinese`, not `中文`.

## Production Manual Sample List

Before production release, manually sample:

- English home page: `/`
- English ordinary tool page: `/tools/json-formatter`
- English Pixel Knock page: `/tools/pixel-knock-board-generator`
- Simplified Chinese home page: `/zh-cn`
- Simplified Chinese Pixel Knock page: `/zh-cn/tools/pixel-knock-board-generator`
- A non-localized Chinese tool URL such as `/zh-cn/tools/json-formatter`, which must not be advertised as a real localized page
- `/sitemap.xml`
- `/robots.txt`
