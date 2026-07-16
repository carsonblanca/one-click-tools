---
name: import-filament-evidence-zip
description: Convert Evidence Pack Saver ZIP files into one-product FIP packages, validate identity, quantitative parameters, colors and images, check exact-name duplicates, and safely import each item through the existing OneClick Tools admin draft route. Use for one or more plugin evidence ZIPs that must become Production review drafts or eligible published filaments without overwriting existing products.
---

# Import Filament Evidence ZIP

Convert each plugin ZIP to one deterministic FIP, then use the existing admin APIs. Never send the original evidence ZIP to Production.

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
2. extracts the captured brand, product line, material, SKU diameter/weight, colors, color codes, mapped images, and recognized numeric candidates;
3. retains only concise source excerpts, not the original ZIP or full OCR transcript;
4. marks a specification table as conflicting when its own product label differs from the captured product identity;
5. scans the committed product-line catalog for an exact display-name match;
6. emits `ready_for_review` for duplicates or required-data failures and otherwise emits the automatic-publication eligibility decision.

## Import and publish decision

Upload the generated `.filament-import.zip` with an authenticated `opencode`, `codex`, or admin session. Confirm the response `sourceRunId` and draft URL.

- Exact duplicate: keep `publicationStatus=draft`, preserve the duplicate reason, and stop after verifying the editable candidate.
- Incomplete or image failure: keep as a review draft with explicit reasons.
- Complete, nonduplicate item: request publication only through the project's explicit publication endpoint and verify the resulting public page. If that endpoint is unavailable, keep the item as a draft; never simulate publication by changing status directly.

For every item, verify the stored name, material, parameter count, colors, image references, review reasons, and edit page. For a batch, record start/end time and per-item results using the existing import/audit records; do not create a new schema.

## Production safety

Before any Production write, verify the host is exactly `one-click-tools.com`, the logged-in role lacks deletion capability, and the upload target is the existing FIP API. After upload, verify no prior product changed and no second published record was created for an exact duplicate.
