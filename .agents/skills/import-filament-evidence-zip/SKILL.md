---
name: import-filament-evidence-zip
description: Convert Evidence Pack Saver ZIP files into one-product FIP packages, validate identity, quantitative parameters, colors and images, check exact-name duplicates, and safely import each item through the existing OneClick Tools admin draft route. Use for one or more plugin evidence ZIPs that must become Production review drafts or eligible published filaments without overwriting existing products.
---

# Import Filament Evidence ZIP

This is the only OpenCode entry for filament evidence ZIP imports. Convert each plugin ZIP to one deterministic FIP, then use the existing admin APIs. Never send the original evidence ZIP to Production.

The final report must distinguish all five stages: evidence ZIP preview, FIP contents, stored draft readback, admin-page display, and publication decision. A build or upload response alone is never success.

## Guardrails

- Treat one ZIP as exactly one product.
- Compare product names character-for-character. Do not normalize case, spaces, punctuation, hyphens, or parentheses for duplicate decisions.
- Never overwrite an existing product. Route an exact-name duplicate to review with a difference summary.
- Do not infer absent values. Record required missing fields and keep them out of published data.
- Keep marketing prose out of parameters.
- Mark low-confidence and conflicting values for review; keep them hidden from public display.
- Require every color to reference an included image. Shared official images are allowed only when the relationship is explicit.
- Use `/api/admin/filament-import/kexcelled-evidence` for creation. Do not call DELETE endpoints or use a Supabase service-role credential.
- Process batch items independently and continue after an item fails. Report published, review, duplicate, and failed counts.

## Build and preview

Run from the OneClick Tools repository:

```bash
node .agents/skills/import-filament-evidence-zip/scripts/build-fip.mjs \
  --input "/absolute/path/evidence.zip" \
  --output "/tmp/product.filament-import.zip"
```

Read the JSON preview printed to stdout. Stop before upload if identity is ambiguous, a required color image is missing, or the FIP validator fails.

The converter:

1. rejects unsafe archive paths and missing capture files;
2. extracts the captured brand, product line, material, colors, manufacturer color codes, mapped images, and recognized official parameter candidates;
3. on macOS, scans detail images omitted from the ZIP's OCR output with built-in Vision and accepts a table only when it contains the exact current product identity plus an official recommended-print heading;
4. normalizes known parameter headings through the shared canonical dictionary, while retaining an unknown but explicit official key/value row in `unmappedFields` instead of treating the dictionary as a whitelist;
5. keeps every candidate, image, color, SKU relation, and evidence summary scoped to the same `productLineId` and drops a record already scoped to another product line;
6. retains only concise source excerpts, not the original ZIP or full OCR transcript;
7. scans the committed product-line catalog for an exact display-name match;
8. emits `ready_for_review` for duplicates or required-data failures and otherwise emits the automatic-publication eligibility decision.

It also emits `draft-patch.json`. For an explicitly identified existing capture draft, send that file unchanged to `PATCH /api/admin/filament-drafts/[sourceRunId]`; never call the creation POST for an existing draft. Diameter and weight inferred only from an SKU remain candidates; the same values may become official fields and product defaults when an identity-matched official specification table confirms them.

## Import and publish decision

Upload a new product's generated `.filament-import.zip` with an authenticated `opencode`, `codex`, or admin session. Confirm the response `sourceRunId` and draft URL. Before upload, query the existing draft/product surfaces for the exact display name; the committed catalog check is only a local preflight.

For an existing capture draft regression:

1. read the draft first and record its `id`, `sourceRunId`, status, product defaults, colors, canonical colors, images, and unknown fields;
2. require the caller to provide the exact target `sourceRunId`;
3. PATCH only the generated `draft-patch.json` to `/api/admin/filament-drafts/[sourceRunId]`;
4. GET the same endpoint after PATCH and save that JSON outside the repository;
5. verify it against the FIP:

```bash
node .agents/skills/import-filament-evidence-zip/scripts/verify-readback.mjs \
  --fip "/tmp/product.filament-import.zip" \
  --readback "/tmp/product.readback.json" \
  --source-run-id "capture-..."
```

Stop if the draft ID, sourceRunId, colors, canonical colors, image relationships, status, or unknown fields change unexpectedly. Never retry by creating another draft.

- Exact duplicate: keep `publicationStatus=draft`, preserve the duplicate reason, and stop after verifying the editable candidate.
- Incomplete or image failure: keep as a review draft with explicit reasons.
- Complete, nonduplicate item: request publication only through the project's explicit publication endpoint and verify the resulting public page. If that endpoint is unavailable, keep the item as a draft; never simulate publication by changing status directly.

For every item, verify the stored name, material, parameter fields, parameter candidates, parameter source evidence, colors, canonical colors, image references, missing product defaults, review reasons, and edit page. Record both the FIP count and the stored readback count. For a batch, record start/end time and per-item results using the existing import/audit records; do not create a new schema.

## Publication truth

Only report automatic publication as supported when a deployed, authenticated publication endpoint exists and succeeds. The current UI reference to `/api/admin/filament-drafts/batch-publish` is not sufficient evidence by itself. If the route is absent, keep the draft unpublished and report that exact missing endpoint as the blocker for the next new-product test.

## Production safety

Before any Production write, verify the host is exactly `one-click-tools.com`, the logged-in role lacks deletion capability, and the upload target is the existing FIP API. After upload, verify no prior product changed and no second published record was created for an exact duplicate.
