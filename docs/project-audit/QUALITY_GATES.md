# Quality Gates

Date: 2026-06-14

## Required Pre-Release Commands

Run these before merging feature work:

```bash
npm run validate:tools
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

## Temporarily Allowed Warnings

These warnings are allowed temporarily but should be tracked:

- Local preview tools using raw `<img>` for local object URLs.
- Unused `locale` props in existing 3D Printing tools while DOM translation remains in place.

Warnings should not increase. New warnings require either a fix or a short explanation in the PR.

## New Tool Checklist

Before adding a new tool:

- Add metadata to `data/tools.json`.
- Use an existing category unless a new category is intentionally added.
- Register the component in `app/tools/[slug]/tool-client.tsx`.
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
