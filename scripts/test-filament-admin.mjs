import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyFilamentAdminPatch, summarizeFilamentDraft } from "../lib/filaments/admin/filament-admin.ts";

let passed = 0;
function check(fn) { fn(); passed += 1; }

const row = {
  id: "draft-1", import_id: "import-1", draft_key: "draft-key", source_run_id: "run-1", product_index: 0,
  status: "draft", review_status: "pending_review", publication_status: "draft", brand_id: "kexcelled",
  product_line_name: "THE K5 PETG M", material_type: "PETG", variant: "Matte",
  created_at: "2026-01-01", updated_at: "2026-01-02", created_by: "one", updated_by: "one",
  draft_data: {
    productKey: "kexcelled-k5-petg-m",
    productLine: { name: "THE K5 PETG M", materialType: "PETG", netWeightG: 1000 },
    colors: [{ colorId: "BLK", enabled: true }], images: [{ imageId: "image-1", role: "color" }],
    parameters: { fields: { materialType: "PETG", nozzleTemperature: "230–260 °C" }, candidates: [{ canonicalKey: "materialType" }], sourceEvidence: [{ evidenceId: "e-1" }] },
    evidence: [{ evidenceId: "top-1" }],
  },
};

check(() => assert.equal(summarizeFilamentDraft(row).parameterCount, 2));
check(() => assert.equal(summarizeFilamentDraft(row).colorCount, 1));
const renamed = applyFilamentAdminPatch(row, { productName: "THE K5 PETG M NEW", productKey: "kexcelled-k5-petg-m-new" });
check(() => assert.equal(renamed.productLineName, "THE K5 PETG M NEW"));
check(() => assert.equal(renamed.draftData.productKey, "kexcelled-k5-petg-m-new"));
const fields = applyFilamentAdminPatch(row, { parameters: { materialType: "PETG", netWeight: "1000 g" } }).draftData.parameters;
check(() => assert.deepEqual(fields.fields, { materialType: "PETG", netWeight: "1000 g" }));
check(() => assert.equal(fields.candidates.length, 1));
check(() => assert.equal(fields.sourceEvidence.length, 1));
const merged = applyFilamentAdminPatch(row, { parameterUpdates: { bedTemperature: "55–80 °C" } }).draftData.parameters;
check(() => assert.equal(merged.fields.nozzleTemperature, "230–260 °C"));
check(() => assert.equal(merged.fields.bedTemperature, "55–80 °C"));
const cleared = applyFilamentAdminPatch(row, { clearParameterKeys: ["nozzle temperature"] }).draftData.parameters;
check(() => assert.equal(cleared.fields.nozzleTemperature, undefined));
check(() => assert.equal(cleared.fields.materialType, "PETG"));
check(() => assert.throws(() => applyFilamentAdminPatch(row, { parameterUpdates: { madeUpKey: "x" } }), /unknown_parameter_key/));
check(() => assert.throws(() => applyFilamentAdminPatch(row, { productKey: "Bad Key" }), /invalid_product_key/));
check(() => assert.equal(applyFilamentAdminPatch(row, { publicationStatus: "published" }).status, "published"));
check(() => assert.equal(applyFilamentAdminPatch(row, { enabled: false }).draftData.enabled, false));
check(() => assert.equal(applyFilamentAdminPatch(row, { brandDefaults: { name: "Kexcelled" }, productOverrides: { website: "https://example.test" } }).draftData.brandDefaults.name, "Kexcelled"));
check(() => assert.throws(() => applyFilamentAdminPatch(row, { unknown: true }), /unsupported_patch_field/));

const deleteRoute = readFileSync(new URL("../app/api/admin/filament-import/kexcelled-evidence/[sourceRunId]/route.ts", import.meta.url), "utf8");
check(() => assert.match(deleteRoute, /session\.role !== "admin"[\s\S]+archive\.execute/));
const catalogLoader = readFileSync(new URL("../lib/filaments/catalog/published-catalog.ts", import.meta.url), "utf8");
check(() => { assert.doesNotMatch(catalogLoader, /CATALOG_RECORDS/); assert.match(catalogLoader, /mergePublishedWithStatic\(published, \[\]\)/); });

console.log(`filament admin tests: ${passed}/${passed} passed`);
