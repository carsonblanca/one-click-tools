import assert from "node:assert/strict";
import {
  FILAMENT_PARAMETER_DEFINITIONS,
  fieldsAcceptedFromCandidates,
  normalizeParameterCandidate,
  normalizeStoredParameters,
  visiblePublishedParameterFields,
} from "../lib/filaments/parameters/normalized-parameters.ts";

const canonicalKeys = FILAMENT_PARAMETER_DEFINITIONS.map((item) => item.canonicalKey);
assert.equal(new Set(canonicalKeys).size, canonicalKeys.length, "canonical keys must be unique");

const k8Candidates = [
  ...["filamentDiameter", "netWeight"].map((field) => ({
    field,
    normalizedValue: field === "filamentDiameter" ? "1.75" : "1000",
    unit: field === "filamentDiameter" ? "mm" : "g",
    reviewStatus: "candidate",
    publicVisible: false,
    sourceFile: "color-mappings.json",
    skuVariantSpecific: true,
  })),
  ...[
    "diameterOptions", "netWeightOptions", "diameterTolerance", "meltFlowIndex",
    "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength",
    "elongationAtBreak", "flexuralStrength", "flexuralModulus",
    "unnotchedImpactStrength", "notchedImpactStrength", "nozzleTemperature", "density",
  ].map((field) => ({
    field,
    rawValue: "conflicting K7 value",
    reviewStatus: "conflict",
    publicVisible: false,
    sourceFile: "ocr/ocr-raw.txt",
  })),
];
const normalizedK8 = k8Candidates.map(normalizeParameterCandidate);
assert.equal(normalizedK8.length, 16);
assert.equal(normalizedK8.filter((item) => item.candidateStatus === "sku_candidate").length, 2);
assert.equal(normalizedK8.filter((item) => item.candidateStatus === "conflict").length, 14);
assert.deepEqual(fieldsAcceptedFromCandidates(k8Candidates), {}, "K8 unapproved values must not become fields");

const k5Abs = normalizeStoredParameters({
  fields: { "线径": "1.75 mm" },
  candidates: [
    { field: "filamentDiameter", rawValue: "1.75", unit: "mm", reviewStatus: "candidate" },
    { field: "diameterTolerance", rawValue: "0.03", unit: "mm", reviewStatus: "candidate" },
  ],
});
assert.deepEqual(k5Abs.fields, { filamentDiameter: "1.75 mm" });
assert.equal("线径" in k5Abs.fields, false);
assert.equal(k5Abs.candidates.length, 2);
assert.equal(k5Abs.rows.find((row) => row.canonicalKey === "filamentDiameter")?.status, "field");
assert.equal(k5Abs.rows.find((row) => row.canonicalKey === "density")?.status, "missing");

const k5Petg = normalizeStoredParameters({
  fields: {},
  candidates: [
    { field: "filamentDiameter", rawValue: "1.75", unit: "mm", skuVariantSpecific: true, sourceFile: "color-mappings.json" },
    { field: "netWeight", rawValue: "1000", unit: "g", skuVariantSpecific: true, sourceFile: "color-mappings.json" },
    { field: "diameterTolerance", rawValue: "0.03", unit: "mm", reviewStatus: "candidate", publicVisible: false },
    { field: "density", rawValue: "1.28", unit: "g/cm³", reviewStatus: "candidate", publicVisible: false },
  ],
});
assert.equal(k5Petg.candidates.length, 4);
assert.deepEqual(k5Petg.fields, {});
assert.equal(k5Petg.rows.find((row) => row.canonicalKey === "filamentDiameter")?.status, "sku_candidate");
assert.equal(k5Petg.rows.find((row) => row.canonicalKey === "density")?.status, "candidate");

const approved = fieldsAcceptedFromCandidates([{
  field: "density",
  normalizedValue: "1.05",
  unit: "g/cm³",
  reviewStatus: "approved",
  publicVisible: true,
  sourceFile: "official-tds.json",
}]);
assert.deepEqual(approved, { density: "1.05 g/cm³" });

const unknown = normalizeStoredParameters({ fields: { vendorMysteryValue: "42 foo" } });
assert.deepEqual(unknown.fields, {});
assert.deepEqual(unknown.unmappedFields, { vendorMysteryValue: "42 foo" });
assert.equal(unknown.rows.some((row) => row.status === "unmapped"), true);

const publishFixture = { parameters: { fields: { density: "1.05 g/cm³" } } };
assert.deepEqual(visiblePublishedParameterFields(publishFixture, "draft"), {});
assert.deepEqual(
  visiblePublishedParameterFields(publishFixture, "published"),
  { density: "1.05 g/cm³" },
);

console.log("filament parameter data-chain tests passed");
