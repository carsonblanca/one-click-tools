---
name: evidence-pack-to-fip
description: Convert a Chrome Evidence Pack ZIP containing capture.json, color-mappings.json, and optional parameter-evidence.json into the current KEXCELLED .filament-import.zip FIP structure. Use when Codex must mechanically build or validate an Evidence Pack → FIP package, group spool/refill SKUs by official manufacturer color code, preserve explicit SKU/color/image/parameter evidence, and avoid AI completion, guessing, image analysis, downloading, uploading, or publishing.
---

# Evidence Pack To FIP

Build a review-only FIP package with the bundled deterministic script. Keep this workflow local and never upload or publish the result.

## Run the conversion

From the one-click-tools repository root, run:

```bash
node .agents/skills/evidence-pack-to-fip/scripts/build-fip.mjs \
  /path/to/input.evidence-pack.zip \
  /path/to/output.filament-import.zip
```

Omit the output argument to write beside the input. Accept legacy Evidence Pack `.zip` names only when the required internal files prove the format.

## Enforce the conversion contract

- Require `capture.json`, `color-mappings.json`, `images.json`, `page.meta.json`, `page.txt`, and `README.md`.
- Resolve the product line with `scripts/product-identity-resolver.mjs`, in this order: SKU strings (structured.json tmall_sku_base, then color-mappings.json) → page.txt / README.md / title (official series words only) → `capture.json.productLine` as the canonical base. Never emit an empty product line when evidence carries a clear model; never append description words (e.g. never "THE K5™ ABS T 透明高透光").
- Read colors only from `color-mappings.json`.
- Treat `brand + productLine + officialColorCode` as the canonical color identity. Recover a missing code only from an explicit SKU pattern in `sourceText`; fail when no official code is available.
- Merge spool and refill SKU rows sharing that identity into one color record; retain every SKU in `skuVariants`.
- Preserve `officialColorCode`, `colorNameZh`, `colorNameEn`, `sourceText`, `variantId`, `skuId`, `imagePath`, `imageSource`, `imageStatus`, and `spoolType`.
- Detect refill only from explicit text such as `无盘`, `补充装`, `REFILL`, `spool-free`, or `no spool`; never infer it visually.
- Select `primarySkuVariant` in this order: spool/available, spool/placeholder, refill/available, then original order. Use its image for the top-level color record.
- Treat explicit placeholder filenames such as `tps-2-2` as `placeholder` even if the source pack marked them available.
- Copy an image only when its normalized status is `available` and its `imagePath` exists in the Evidence Pack.
- Copy image bytes unchanged into `assets/`; never download, transform, inspect visually, or infer color from an image.
- Read `parameter-evidence.json` when present and mechanically map each row to `parameter-candidates.json`.
- Bridge evidence rows to canonical candidates using the production canonical schema (`lib/filaments/parameters/normalized-parameters.ts`: `FILAMENT_PARAMETER_DEFINITIONS` / `resolveCanonicalParameterKey`): `materialType` is canonical, `diameter` is an alias of `filamentDiameter`, and `manufacturer` is NOT a canonical parameter. The script keeps a minimal compat map only because it runs as plain `node` with no TS loader; keep that map in sync with the canonical schema and do not extend it with custom fields.
- Derive a candidate value only when the evidence row carries one: `materialType` from `capture.json.productIdentity.material`, `filamentDiameter` from identity diameter or a numeric value in the row's `sourceText`. Rows with no derivable value (e.g. `manufacturer`) stay evidence-only and never become candidates. Never invent values to inflate the candidate count.
- Every evidence-backed candidate carries `source.sourceFile` (`parameter-evidence.json`) plus a non-empty `source.snippet`; it may omit `source.sourceImage`/`source.ocrTextPath`. A candidate with no provenance fails verification.
- Preserve the raw `sourceText`; keep `reviewStatus` pending.
- Never split ranges, convert units, normalize values, infer parameters, or write parameter values into `products.json`.
- Read `ocr/index.json` and its `ocr/*.txt` when present and convert official `label + value [+ unit]` rows into canonical parameter candidates during this build. Never leave that work to the upload or draft-parsing stage.
- Accept an OCR-derived parameter only with `canonicalKey`, `value`, `unit`, `sourceImage`, and `ocrSnippet`, and only when the OCR text carries the current product identity. Reject bare numbers, price blocks, SKU lists, recommendation rails, foreign product lines, and implausible values, and record every rejection in `evidence.json`.
- Keep OCR-derived candidates at `reviewStatus: pending_review`; they are review-gated proposals, never applied values.
- Emit an empty `parameter-candidates.json` when the Evidence Pack has neither `parameter-evidence.json` nor usable OCR text.
- Never merge by translated or visually similar color names. Never allow a refill image to override an eligible spool image.
- Require brand `KEXCELLED`, because the current production FIP parser rejects other brands.
- Keep `requiresManualReview: true` and `importStatus: draft`.

## Verify before reporting completion

The script validates its generated ZIP before writing it. Confirm its JSON summary reports:

- `productCount: 1`
- the expected original SKU count and final official-code color count
- report counts for merged variants, spool primaries, and refill variants
- `parameterCandidateCount` equal to the number of evidence rows with a derivable canonical value plus OCR candidates, or `0` when no source is present (evidence rows without a derivable value are preserved as evidence, not candidates)
- `ocrSourceImageCount`, `ocrParameterCandidateCount`, and `ocrRejectedCount` match the OCR text actually bundled in the Evidence Pack
- every `available` color resolves through `images.json` to an existing `assets/` file
- placeholder and missing colors have an empty `imagePath`

Inspect `package-report.json` for status counts and warnings. Call the package development complete only after testing the actual Evidence Pack intended for import.

## Stop boundaries

Stop and report instead of modifying any API, admin page, Supabase/R2 code, schema, migration, authentication, Chrome extension, or FIP parser. Do not upload, publish, or add network access.
