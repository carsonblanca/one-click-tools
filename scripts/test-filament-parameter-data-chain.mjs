import assert from "node:assert/strict";
import {
  FILAMENT_PARAMETER_DEFINITIONS,
  fieldsAcceptedFromCandidates,
  normalizeStoredParameters,
  resolveCanonicalParameterKey,
  unmappedFieldsAcceptedFromCandidates,
} from "../lib/filaments/parameters/normalized-parameters.ts";
import { manufacturerColorDisplay } from "../lib/filaments/colors/color-display.ts";
import {
  productLineScopeMatches,
  recordsForProductLine,
} from "../lib/filaments/identity/product-scope.ts";

const expectedKeys = [
  "materialType",
  "filamentDiameter",
  "netWeight",
  "density",
  "diameterTolerance",
  "meltFlowIndex",
  "nozzleTemperature",
  "nozzleDiameter",
  "bedTemperature",
  "coolingFan",
  "printingSpeed",
  "retractionDistance",
  "retractionSpeed",
  "buildPlateSurface",
  "tensileStrength",
  "elongationAtBreak",
  "impactStrength",
  "unnotchedImpactStrength",
  "notchedImpactStrength",
  "flexuralStrength",
  "flexuralModulus",
  "heatDeflectionTemperature",
  "vicatSofteningTemperature",
  "dryingTemperature",
  "dryingTime",
];
assert.deepEqual(
  FILAMENT_PARAMETER_DEFINITIONS.map((item) => item.canonicalKey),
  expectedKeys,
  "the first-stage dictionary must stay limited to the approved core and official-table fields",
);
assert.equal(resolveCanonicalParameterKey("线径"), "filamentDiameter");
assert.equal(resolveCanonicalParameterKey("printSpeed"), "printingSpeed");
assert.equal(resolveCanonicalParameterKey("dryingDuration"), "dryingTime");
assert.equal(resolveCanonicalParameterKey("喷嘴口径"), "nozzleDiameter");
assert.equal(resolveCanonicalParameterKey("底板温度"), "bedTemperature");
assert.equal(resolveCanonicalParameterKey("回抽速度"), "retractionSpeed");
assert.equal(resolveCanonicalParameterKey("Build Plate Material"), "buildPlateSurface");

const historicalChineseKey = normalizeStoredParameters({
  fields: { "线径": "1.75 mm" },
});
assert.deepEqual(historicalChineseKey.fields, { filamentDiameter: "1.75 mm" });
assert.equal("线径" in historicalChineseKey.fields, false);
assert.equal(
  historicalChineseKey.rows.find((row) => row.canonicalKey === "filamentDiameter")?.zhCNLabel,
  "线径",
);
assert.equal(
  historicalChineseKey.rows.find((row) => row.canonicalKey === "density")?.status,
  "missing",
);

const unknown = normalizeStoredParameters({
  fields: { vendorMysteryValue: "42 foo" },
});
assert.deepEqual(unknown.fields, {});
assert.deepEqual(unknown.unmappedFields, { vendorMysteryValue: "42 foo" });
assert.equal(
  unknown.rows.find((row) => row.canonicalKey === "vendorMysteryValue")?.zhCNLabel,
  "vendorMysteryValue",
);
assert.deepEqual(unmappedFieldsAcceptedFromCandidates([{
  field: "厂家透光率",
  normalizedValue: "42",
  unit: "%",
  reviewStatus: "official",
}]), { 厂家透光率: "42 %" }, "unknown official key/value pairs must be retained losslessly");

const trusted = fieldsAcceptedFromCandidates([
  {
    field: "density",
    normalizedValue: "1.05",
    unit: "g/cm³",
    reviewStatus: "official",
  },
  {
    field: "diameterTolerance",
    normalizedValue: "0.03",
    unit: "mm",
    accepted: true,
  },
]);
assert.deepEqual(trusted, {
  density: "1.05 g/cm³",
  diameterTolerance: "0.03 mm",
});

const unsafe = fieldsAcceptedFromCandidates([
  {
    field: "filamentDiameter",
    normalizedValue: "1.75",
    unit: "mm",
    reviewStatus: "candidate",
    skuVariantSpecific: true,
  },
  {
    field: "tensileStrength",
    normalizedValue: "75",
    unit: "MPa",
    reviewStatus: "conflict",
  },
  {
    field: "density",
    normalizedValue: "1.28",
    unit: "g/cm³",
    publicVisible: false,
    reviewStatus: "approved",
  },
]);
assert.deepEqual(unsafe, {}, "SKU, conflict, and hidden candidates must not become fields");

const officialTable = fieldsAcceptedFromCandidates([
  { field: "meltFlowIndex", normalizedValue: "6–16", unit: "g/10min", reviewStatus: "official" },
  { field: "unnotchedImpactStrength", normalizedValue: "24–41", unit: "kJ/m²", reviewStatus: "official" },
  { field: "notchedImpactStrength", normalizedValue: "2–5", unit: "kJ/m²", reviewStatus: "official" },
]);
assert.deepEqual(officialTable, {
  meltFlowIndex: "6–16 g/10min",
  unnotchedImpactStrength: "24–41 kJ/m²",
  notchedImpactStrength: "2–5 kJ/m²",
});

assert.deepEqual(fieldsAcceptedFromCandidates([
  { field: "diameterTolerance", normalizedValue: "±0.03", unit: "mm", reviewStatus: "official" },
  { field: "printingSpeed", normalizedValue: "≤150", unit: "mm/s", reviewStatus: "official" },
  { field: "nozzleDiameter", normalizedValue: "≥0.2", unit: "mm", reviewStatus: "official" },
  { field: "coolingFan", normalizedValue: "0–50", unit: "%", reviewStatus: "official" },
]), {
  diameterTolerance: "±0.03 mm",
  printingSpeed: "≤150 mm/s",
  nozzleDiameter: "≥0.2 mm",
  coolingFan: "0–50 %",
});

const impactRows = normalizeStoredParameters({
  fields: {
    notchedImpactStrength: "2–5 kJ/m²",
    unnotchedImpactStrength: "24–41 kJ/m²",
  },
}).rows;
assert.equal(impactRows.some((row) => row.canonicalKey === "impactStrength"), false);

assert.deepEqual(manufacturerColorDisplay({
  nameZh: "哑光黑色",
  displayNameEn: null,
  officialColorCode: "BLK",
}), {
  nameZh: "哑光黑色",
  nameEn: null,
  manufacturerCode: "BLK",
});

const scoped = recordsForProductLine([
  { field: "density", productLineId: "kexcelled-k5-petg-m" },
  { field: "density", productLineId: "kexcelled-k8-pc" },
], "kexcelled-k5-petg-m");
assert.equal(scoped.length, 1, "foreign productLineId candidates must not be re-scoped into the current product");
assert.equal(productLineScopeMatches({ productLineId: "kexcelled-k8-pc" }, "kexcelled-k5-petg-m"), false);

console.log("filament minimal parameter mapping tests passed");
