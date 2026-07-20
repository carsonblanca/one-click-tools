import assert from "node:assert/strict";
import {
  GOLDEN_DRAFT_ID,
  GOLDEN_PRODUCT_KEY,
  GOLDEN_SOURCE_RUN_ID,
  mapPublishedDraftToCatalogRecord,
  mergePublishedWithStatic,
  validateDraftForPublish,
  validateSinglePublishRequest,
} from "../lib/filaments/publishing/minimal-publish.ts";

const parameterKeys = [
  "materialType", "filamentDiameter", "netWeight", "density", "diameterTolerance",
  "meltFlowIndex", "nozzleTemperature", "nozzleDiameter", "bedTemperature", "coolingFan",
  "printingSpeed", "retractionDistance", "retractionSpeed", "buildPlateSurface", "tensileStrength",
  "elongationAtBreak", "unnotchedImpactStrength", "notchedImpactStrength", "flexuralStrength",
  "flexuralModulus", "heatDeflectionTemperature", "vicatSofteningTemperature", "dryingTemperature",
  "dryingTime",
];
const fields = Object.fromEntries(parameterKeys.map((key) => [key, key === "materialType" ? "PETG" : `${key}-value`]));
fields.filamentDiameter = "1.75 mm";
fields.netWeight = "1 kg";
fields.diameterTolerance = "±0.03 mm";
fields.printingSpeed = "≤150 mm/s";
fields.nozzleDiameter = "≥0.2 mm";

const colors = Array.from({ length: 22 }, (_, index) => ({
  colorId: `${GOLDEN_PRODUCT_KEY}-sku-${index + 1}`,
  productLineId: GOLDEN_PRODUCT_KEY,
  nameZh: `颜色${index + 1}`,
  officialColorCode: `C${index + 1}`,
  localImagePath: `filament-imports/kexcelled/import/assets/images/${index + 1}.webp`,
}));
const images = Array.from({ length: 36 }, (_, index) => ({
  imageId: `image-${index + 1}`,
  productLineId: GOLDEN_PRODUCT_KEY,
  role: index < 22 ? "color" : "product",
  r2ObjectKey: `filament-imports/kexcelled/import/assets/images/${index + 1}.webp`,
}));

const draft = {
  id: GOLDEN_DRAFT_ID,
  source_run_id: GOLDEN_SOURCE_RUN_ID,
  status: "draft",
  review_status: "pending_review",
  publication_status: "draft",
  brand_id: "kexcelled",
  product_line_name: "THE K5 PETG M",
  material_type: "PETG",
  variant: "Matte",
  created_at: "2026-07-18T00:00:00.000Z",
  draft_data: {
    productKey: GOLDEN_PRODUCT_KEY,
    brand: { id: "kexcelled", name: "KEXCELLED" },
    productLine: { productLineId: GOLDEN_PRODUCT_KEY, name: "THE K5 PETG M", materialType: "PETG", netWeightG: 1000 },
    parameters: {
      fields,
      candidates: parameterKeys.map((canonicalKey) => ({ canonicalKey })),
      sourceEvidence: parameterKeys.map((canonicalKey) => ({ canonicalKey })),
    },
    colors,
    images,
  },
};

assert.deepEqual(validateSinglePublishRequest({ sourceRunIds: [] }).length, 1);
assert.deepEqual(validateSinglePublishRequest({ sourceRunIds: [GOLDEN_SOURCE_RUN_ID, "other"] }).length, 1);
assert.deepEqual(validateSinglePublishRequest({ sourceRunIds: [GOLDEN_SOURCE_RUN_ID] }), []);
assert.equal(validateSinglePublishRequest({ sourceRunIds: ["missing-source"] }).length, 1);
assert.deepEqual(validateDraftForPublish(null, []), ["草稿不存在。"]);
assert.deepEqual(validateDraftForPublish(draft, []), []);
assert.ok(validateDraftForPublish({ ...draft, publication_status: "published" }, []).length > 0);
assert.equal(validateDraftForPublish(draft, [{ ...draft, id: "other", publication_status: "published" }]).length, 1);

const record = mapPublishedDraftToCatalogRecord({ ...draft, status: "published", review_status: "approved", publication_status: "published" });
assert.equal(record.id, GOLDEN_PRODUCT_KEY);
assert.equal(record.published.parameters.length, 24);
assert.equal(record.published.colors.length, 22);
assert.equal(record.published.images.length, 36);
assert.equal(record.published.colors.filter((color) => color.imageUrl).length, 22);
assert.equal(record.published.parameters.find((item) => item.canonicalKey === "diameterTolerance")?.value, "±0.03 mm");
assert.equal(record.published.parameters.find((item) => item.canonicalKey === "printingSpeed")?.value, "≤150 mm/s");
assert.equal(record.published.parameters.find((item) => item.canonicalKey === "nozzleDiameter")?.value, "≥0.2 mm");

const fallback = [{ ...record, published: undefined }];
assert.deepEqual(mergePublishedWithStatic([], fallback), fallback);
assert.deepEqual(mergePublishedWithStatic([record], fallback), [record]);

console.log("minimal filament publication tests passed");
