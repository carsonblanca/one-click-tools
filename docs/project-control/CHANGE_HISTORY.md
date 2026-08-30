# Change History

## 2026-08-20

Change:

Restored historical parameter pipeline and recovered explicit diameter/weight handling for the ABS import baseline.

Commit:

`6d0c4d1bc353550d403a4c6b29800352a95cd823`

Result:

PASS (recorded stable baseline)

Impact:

Skill/FIP builder only.

Production:

No write recorded for this baseline.

## 2026-08-20

Change:

Created the project operation memory and control documents.

Commit:

None.

Result:

Documentation only.

Impact:

No application, database, importer, FIP, authentication, or Production changes.

Production:

No write.

## 2026-08-21

Change:

Audited the proposed `feat(filaments): stabilize draft production workflow` Group A milestone scope.

Result:

NOT READY. TypeScript, production build, filament parameter validation, and parameter draft mapping passed. Targeted ESLint failed in `DraftDetailClient.tsx` with React ref-render errors and one dependency warning.

Commit:

None.

Impact:

No application code, database, Production, deployment, or publish changes. Group B/C changes were excluded.

Next action:

Resolve the editor lint failures, rerun Group A validation, and reassess the clean commit boundary.

## 2026-08-21

Change:

Fixed the ESLint issues in `app/admin/(protected)/filament-drafts/[sourceRunId]/DraftDetailClient.tsx` only.

Result:

PASS. Replaced render-time ref reads with state-backed baselines while preserving save behavior.

Validation:

ESLint PASS; TypeScript PASS; Production build PASS.

Commit:

None.

Impact:

No importer, API, repository, FIP, parameter pipeline, database, Production, deployment, or publish changes.

## 2026-08-21

Change:

Created isolated imported draft edit support commit `b4477d9`.

Files:

- `app/admin/(protected)/filament-drafts/[sourceRunId]/DraftDetailClient.tsx`
- `app/admin/(protected)/filament-drafts/[sourceRunId]/edit/page.tsx`
- `app/admin/(protected)/filament-drafts/[sourceRunId]/page.tsx` edit-entry hunk only

Validation:

ESLint PASS; TypeScript PASS; Production build PASS.

Deployment:

BLOCKED by Vercel CLI `Not authorized`. No Production data or publish state changed.

## 2026-08-22

Change:

Added the first simplified Kexcelled ABS public delivery path. It reads published ABS drafts from Production, reuses their parameters and first available color, and generates a Bambu Studio-compatible JSON after printer selection.

Files:

- `lib/filaments/presets/bambu/kexcelled-abs.ts`
- `lib/filaments/catalog/published-kexcelled.ts`
- `components/filaments/KexcelledAbsDownloadPanel.tsx`
- `app/(zh-cn)/zh-cn/filaments/kexcelled-abs/page.tsx`
- `app/(en)/filaments/kexcelled-abs/page.tsx`

Validation:

Targeted ESLint PASS; TypeScript PASS; production build PASS.

Production:

No database writes, uploads, deletes, publishes, or deployment performed.

Remaining risk:

The generated ABS JSON still requires a manual import test in Bambu Studio. The existing evidence-pack plugin and legacy FIP workflow remain frozen and unchanged.

## 2026-08-22 — Catalog UI integration

Integrated published Kexcelled ABS records into the existing filament catalog page instead of relying on the standalone test page.

Preserved:

- Existing card layout
- Brand and material filters
- Light/dark themes
- Comparison controls
- Printer selection and download interaction

Added:

- Production-to-catalog read-only mapping
- Color-level ABS cards
- Source-run-based product image lookup
- Kexcelled ABS preset generation using the selected color and printer

Validation:

TypeScript PASS; targeted ESLint PASS with existing warnings; production build PASS.

Production writes, deployment, publication, and legacy FIP changes: 0.

## 2026-08-22 — Local static catalog reset

Disabled exposure of the historical local static `CATALOG_RECORDS` data for local display. Source definitions and historical assets were preserved. Production-backed published records remain separate and were not modified.

Validation:

TypeScript PASS; production build PASS.

Database, Production, uploads, deletes, publication, and deployment: 0.

## 2026-08-22 — Local K5 ABS parameter recovery validation

Rebuilt/imported a local review-only K5 ABS FIP using the existing OCR/physical-property bridge. The resulting draft contains 13 editable parameter candidates. The original parameter-less draft was preserved; no Production upload, delete, publish, deployment, or code change was performed.

## 2026-08-22 — Add parameter completeness gates to the sync workflow

Added deterministic preflight protections to the Evidence Pack → FIP → upload workflow. FIP building now stops when captured detail images have no indexed OCR text or produce no candidates. FIP upload validation now rejects empty candidates, report-count mismatches, detail-image/OCR gaps, empty colors, and incomplete image records before authentication or POST.

Validation: the four compatible ABS packages passed local validation with parameter counts `13/10/12/13`, color counts `2/6/8/36`, and image counts `2/6/8/36`. No Production upload, deletion, publication, or deployment was performed.

## 2026-08-22 — Correct K5 ABS parameter readback and labels

The K5 ABS local review draft now exposes imported candidates with Chinese names in the admin editor and bilingual names in the public detail page. The public adapter now reads pending candidate values for local preview instead of relying only on publishable fields.

Added a conservative industry color-name fallback for blank English color fields. Existing official English names are preserved; blank values are inferred from Chinese names or official color codes and remain editable before saving.

Added five explicitly evidenced pending-review candidates: nozzle temperature `220–250°C`, bed/platform temperature `80–100°C`, recommended print speed `40–80mm/s`, cooling fan `OFF`, and diameter tolerance `±0.03mm`. The local draft now contains 18 candidates. No candidate was promoted to an approved/publishable field, and no publication or deployment occurred.

Validation: TypeScript PASS; targeted ESLint PASS with existing warnings; production build PASS.

## 2026-08-23 — K5 ABS locale, spool, and review UI correction

Public labels now follow the selected locale instead of showing Chinese and English together. Imported candidates replace the duplicated generic parameter block on the detail page. Kexcelled cards now use the manufacturer spool facts, including dimensions, empty spool weight, supported filament weights, and the old/new spool dispatch note.

The admin color review is now a compact four-column layout with image, Chinese name, English name, and official code/SKU only. Added per-color image replacement using the existing asset endpoint; no upload was performed. Validation: TypeScript PASS, targeted ESLint PASS, production build PASS, browser verification PASS. Production writes, uploads, deletes, publication, and deployment: 0.

## 2026-08-23 — K5 ABS detail media and color navigation

The selected color now has a large spool image at the top of its detail page. Other colors from the same product line are shown below in a compact grid of up to ten cards per row, with direct links to each color detail page. Digital swatches now use a 1:1 color block with HEX/RGB identifiers.

Added a separate physical-swatch upload path in the admin editor. New uploads remain pending and are excluded from public readback until approved. The public detail page links to the authenticated editor when no approved swatch exists. Social accounts and information sources were hidden from the manufacturer section; the official store remains visible.

Validation: TypeScript PASS; targeted ESLint PASS; production build PASS; browser verification PASS. Production writes, uploads, deletes, publication, and deployment: 0.

## 2026-08-23 — Global detail-page audit and transparent ABS T correction

Fixed detail-page return navigation to the locale filament list. Added product-line fallback resolution so historical transparent ABS T drafts no longer appear as unnamed when the row field is empty. Removed mock parameter placeholders, color-family/transparency summary fields, evidence count, and aggregate score from the global detail view. Ratings now use five blank interactive stars.

The historical transparent ABS T evidence package was audited: eight color assets were present, but the old persisted import had zero parameter candidates. The page now correctly shows no synchronized official parameters instead of fabricated placeholders. The package requires re-extraction/re-import for parameter recovery; no historical draft was deleted or rewritten.

Kexcelled spool material guidance now uses `PP / PET / ABS（以实际料盘为准）`. Validation: TypeScript PASS; targeted ESLint PASS; production build PASS; browser verification PASS. Production writes, uploads, deletes, publication, and deployment: 0.

## 2026-08-23 — Complete transparent ABS T parameters from supplied Tmall screenshots

Updated local draft `capture-20260817024438-9acb75e7a1e3-d9ed9669` with 16 screenshot-derived official parameter candidates for the 8-color `THE K5™ ABS T` transparent series. All candidates remain `pending_review`; draft status remains unpublished and no approved `fields` were written. Set the previously empty product-line name to `THE K5™ ABS T` and normalized the print-speed key to `recommendedPrintSpeed` for Chinese display. Browser readback passed for all 8 color URLs; TypeScript and targeted ESLint passed. Production uploads, deletes, publication, and deployment: 0.
## 2026-08-30 — Codex Context Recovery Protocol

- Added `CURRENT_TASK_CHECKPOINT.md` as the small overwriteable current-task recovery state file.
- Added `CODEX_CONTEXT_RECOVERY_PROTOCOL.md` covering minimal startup reads, context recovery continuation, loop/no-progress stops, append-only history, and frozen capability boundaries.
- Recorded `Implement Minimal Shared Canonical Mapper + Read-Only Parameter Detail Projection` as `PAUSED_CONTEXT_OVERLOAD`; it remains paused pending the new protocol and was not resumed.
- Documentation-only control change. Existing history and all business-code changes were preserved.
