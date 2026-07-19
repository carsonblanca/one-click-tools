import assert from "node:assert/strict";
import {
  GENERATED_PATCH_TARGET,
  validateGeneratedPatchBaseline,
  validateGeneratedPatchInput,
  validateGeneratedPatchPreservation,
  validateGeneratedPatchReadback,
} from "../lib/filaments/drafts/generated-patch-guard.ts";

const originalKeys = [
  "filamentDiameter", "netWeight", "diameterTolerance", "density", "meltFlowIndex",
  "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength",
  "elongationAtBreak", "flexuralStrength", "flexuralModulus",
  "unnotchedImpactStrength", "notchedImpactStrength",
];
const printKeys = [
  "nozzleTemperature", "nozzleDiameter", "bedTemperature", "coolingFan", "printingSpeed",
  "retractionDistance", "retractionSpeed", "dryingTemperature", "dryingTime", "buildPlateSurface",
];
const fields = Object.fromEntries(["materialType", ...originalKeys, ...printKeys].map((key) => [key, key === "materialType" ? "PETG" : `${key}-value`]));
fields.diameterTolerance = "±0.03 mm";
const colors = Array.from({ length: 22 }, (_, index) => ({
  domIndex: index,
  sourceSkuId: `sku-${index}`,
  rawSkuText: `sku raw ${index}`,
  officialColorCode: `C${index}`,
  localImagePath: `images/${index}.webp`,
}));
const images = Array.from({ length: 36 }, (_, index) => ({ sourcePath: `images/${index}.webp` }));
const currentData = {
  sourceType: "capture",
  source: { zipFilename: "golden.zip" },
  brand: { id: "kexcelled" },
  productLine: { name: GENERATED_PATCH_TARGET.productName, productLineId: GENERATED_PATCH_TARGET.productLineId, materialType: "PETG" },
  colors,
  canonicalColors: colors,
  images,
  skus: colors.map((color) => ({ sourceSkuId: color.sourceSkuId, rawSkuText: color.rawSkuText })),
  parameters: {
    fields: Object.fromEntries(originalKeys.map((key) => [key, `${key}-old`])),
    candidates: Array.from({ length: 13 }, (_, index) => ({ canonicalKey: originalKeys[index], productLineId: GENERATED_PATCH_TARGET.productLineId })),
    sourceEvidence: Array.from({ length: 13 }, (_, index) => ({ canonicalKey: originalKeys[index], productLineId: GENERATED_PATCH_TARGET.productLineId })),
  },
  evidence: [{ notes: "old scoped evidence", productLineId: GENERATED_PATCH_TARGET.productLineId }],
};
const row = {
  id: GENERATED_PATCH_TARGET.draftId,
  source_run_id: GENERATED_PATCH_TARGET.sourceRunId,
  status: "draft",
  publication_status: "draft",
  product_line_name: GENERATED_PATCH_TARGET.productName,
  material_type: "PETG",
  draft_data: currentData,
};
const counts = { importCount: 1, draftCount: 1, matchingDraftCount: 1 };
assert.deepEqual(validateGeneratedPatchBaseline(row, counts), []);

const patch = {
  identityScope: { brandId: "kexcelled", productLineId: GENERATED_PATCH_TARGET.productLineId, productKey: GENERATED_PATCH_TARGET.productLineId },
  productDefaults: { diameterMm: 1.75, netWeightG: 1000 },
  parameters: {
    fields,
    candidates: Object.keys(fields).map((canonicalKey) => ({ canonicalKey, productLineId: GENERATED_PATCH_TARGET.productLineId })),
    sourceEvidence: Object.keys(fields).map((canonicalKey) => ({ canonicalKey, productLineId: GENERATED_PATCH_TARGET.productLineId })),
    status: "official",
  },
  evidence: [{ notes: "current product only", productLineId: GENERATED_PATCH_TARGET.productLineId }],
};
assert.deepEqual(validateGeneratedPatchInput(patch), []);
const next = {
  ...currentData,
  productKey: GENERATED_PATCH_TARGET.productLineId,
  productLine: {
    ...currentData.productLine,
    productLineId: GENERATED_PATCH_TARGET.productLineId,
    productKey: GENERATED_PATCH_TARGET.productLineId,
    diameterMm: 1.75,
    netWeightG: 1000,
  },
  colors: currentData.colors.map((color) => ({ ...color, brandId: "kexcelled", productLineId: GENERATED_PATCH_TARGET.productLineId, productKey: GENERATED_PATCH_TARGET.productLineId })),
  canonicalColors: currentData.canonicalColors.map((color) => ({ ...color, brandId: "kexcelled", productLineId: GENERATED_PATCH_TARGET.productLineId, productKey: GENERATED_PATCH_TARGET.productLineId })),
  images: currentData.images.map((image) => ({ ...image, brandId: "kexcelled", productLineId: GENERATED_PATCH_TARGET.productLineId, productKey: GENERATED_PATCH_TARGET.productLineId })),
  parameters: {
    ...currentData.parameters,
    fields,
    candidates: patch.parameters.candidates,
    sourceEvidence: patch.parameters.sourceEvidence,
    status: "official",
  },
  evidence: patch.evidence,
};
assert.deepEqual(validateGeneratedPatchPreservation(currentData, next), []);
assert.deepEqual(validateGeneratedPatchReadback({ ...row, draft_data: next }, counts), []);
assert.ok(validateGeneratedPatchBaseline({ ...row, draft_data: next }, counts).some((issue) => issue.includes("必须为 13")), "a second effective apply must be rejected");
assert.ok(validateGeneratedPatchInput({ ...patch, evidence: [{ notes: "PC K7" }] }).some((issue) => issue.includes("PC K7")));
assert.ok(validateGeneratedPatchPreservation(currentData, { ...next, images: [] }).some((issue) => issue.includes("图片")));

console.log("generated patch guard tests passed");
