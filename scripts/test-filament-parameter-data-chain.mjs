import assert from "node:assert/strict";
import {
  FILAMENT_PARAMETER_DEFINITIONS,
  fieldsAcceptedFromCandidates,
  normalizeStoredParameters,
  resolveCanonicalParameterKey,
} from "../lib/filaments/parameters/normalized-parameters.ts";

const expectedKeys = [
  "materialType",
  "filamentDiameter",
  "netWeight",
  "density",
  "diameterTolerance",
  "meltFlowIndex",
  "nozzleTemperature",
  "bedTemperature",
  "printingSpeed",
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

console.log("filament minimal parameter mapping tests passed");
