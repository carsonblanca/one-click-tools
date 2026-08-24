---
name: fip-upload-sync
description: Validate and upload complete KEXCELLED .filament-import.zip product packages to the online admin import endpoint, read back every draft, remove only verified duplicate draft records, and stop at human review without publishing.
---

# FIP Upload Sync

Upload validated `.filament-import.zip` packages to the online admin FIP import endpoint. This skill does not build FIP packages. Each package is one product category and must contain complete colors, image assets, and parameter candidates.

## Required input

- One or more `.filament-import.zip` files.

## Run the upload

From the one-click-tools repository root:

```bash
node .agents/skills/fip-upload-sync/scripts/upload-fip.mjs \
  --base-url https://one-click-tools.com \
  /path/to/file1.filament-import.zip \
  /path/to/file2.filament-import.zip
```

To run the same gate without logging in or writing drafts:

```bash
node .agents/skills/fip-upload-sync/scripts/upload-fip.mjs \
  --validate-only /path/to/file.filament-import.zip
```

Use `--base-url` to point at a non-default deployment:

```bash
node .agents/skills/fip-upload-sync/scripts/upload-fip.mjs \
  --base-url https://one-click-tools.com \
  /path/to/file.filament-import.zip
```

## What the script does

1. **Validates the entire batch before writing**. If any package fails, no package is uploaded. Each zip must contain the required FIP files:
   - `manifest.json`
   - `products.json`
   - `colors.json`
   - `evidence.json`
   - `package-report.json`

   It also blocks packages with zero parameter candidates, inconsistent
   `package-report.json` counts, detail images without OCR text, no colors, or
   fewer image records than colors. This prevents the historical case where a
   visually complete package imported with `parameters = 0`.

   It also requires exactly one product category, non-empty parameter candidates with evidence, colors, enough image records, and resolvable image assets. A failed package is handed off for code/image recognition repair or manual completion; it is not uploaded.

2. **Requires an online HTTPS target** for upload. Local upload requires explicit `--allow-local`.

3. Authenticates with `OPENCODE_IMPORT_API_TOKEN` when present, using `Authorization: Bearer ...`; otherwise falls back to `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the human-admin path.

4. **Uploads** through the existing import endpoint, then reads back product line, material, color count, image count, parameter candidate count, draft status, and publication state.

5. **Deduplicates only after readback passes**: keeps the new complete draft and deletes only older, deletable records with the same original source run, product line, and material. Approved or published records are never deleted.

6. **Stops at human review**. It never publishes or approves and outputs an online edit URL.

## Success output

```json
{
  "filename": "kexcelled-the-k5-abs-colors-v2.filament-import.zip",
  "importId": "fip_abc123...",
  "draftId": "draft_789...",
  "status": "uploaded_and_deduplicated",
  "parameters": 13,
  "colors": 36,
  "images": 36,
  "draftStatus": "draft",
  "published": false,
  "requiresHumanReview": true,
  "reviewUrl": "https://one-click-tools.com/admin/filament-drafts/.../edit"
}
```

## Failure output

```json
{
  "filename": "broken-package.filament-import.zip",
  "error": "不是合法 FIP，缺少 evidence.json / package-report.json",
  "step": "validate"
}
```

## Environment variables

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | Admin bootstrap email for login |
| `ADMIN_PASSWORD` | Admin bootstrap password for login |
| `OPENCODE_IMPORT_API_TOKEN` | Scoped machine token for upload and readback only; never stored in the repository |
| `BASE_URL` (optional) | Online deployment base URL; defaults to `https://one-click-tools.com` |

## Enforce the contract

- Validate the entire batch **before** uploading. One failed package blocks all writes.
- Call the existing `POST /api/admin/filament-import/kexcelled-evidence` endpoint. Do not re-implement upload logic.
- Read back every uploaded draft before cleanup.
- Delete only verified duplicate draft records from the same category; never delete approved or published records.
- Do **not** auto-publish or auto-approve. Human verification is mandatory.
- Machine-token mode does not delete duplicates; duplicate cleanup remains a human-admin operation so the machine token cannot delete data.
- Upload status must stay `draft` / `queued`.
- Never auto-retry an ambiguous upload; query/read back and resolve manually to avoid duplicates.
- Output JSON to stdout; log diagnostic messages to stderr.
