import assert from "node:assert/strict";
import {
  countFrozenAcceptedParameters,
  fieldsAcceptedFromCandidates,
  getFrozenAcceptedParameterKeys,
  parameterSourceEvidence,
} from "../lib/filaments/parameters/normalized-parameters.ts";

const candidates = [
  { field: "filamentDiameter", normalizedValue: "1.75", unit: "mm", reviewStatus: "official", evidenceId: "e-d", sourceFile: "images/diameter.png", trusted: true },
  { canonicalKey: "netWeight", normalizedValue: "1000", unit: "g", reviewStatus: "official", evidenceId: "e-w", sourceFile: "images/weight.png", trusted: true },
  { canonicalKey: "nozzleTemperature", normalizedValue: "230-260", unit: "°C", reviewStatus: "official", evidenceId: "e-n", sourceFile: "images/print.png", trusted: true },
];
const fields = fieldsAcceptedFromCandidates(candidates);
assert.equal(Object.keys(fields).length, 3);
assert.equal(fields.filamentDiameter, "1.75 mm");
assert.equal(fields.netWeight, "1000 g");
assert.equal(fields.nozzleTemperature, "230-260 °C");
const evidence = parameterSourceEvidence(candidates, [
  { evidenceId: "e-d", sourceFile: "images/diameter.png", sourceText: "1.75mm" },
  { evidenceId: "e-w", sourceFile: "images/weight.png", sourceText: "1KG" },
  { evidenceId: "e-n", sourceFile: "images/print.png", sourceText: "喷嘴温度 230-260°C" },
  { evidenceId: "color", sourceFile: "images/color.png", sourceText: "黑色" },
]);
assert.equal(evidence.length, 3);
assert.deepEqual(evidence.map((item) => item.evidenceId), ["e-d", "e-w", "e-n"]);

const frozenKeys = {
  "THE K5 ABS P": ["filamentDiameter", "netWeight", "materialType", "meltFlowIndex", "tensileStrength", "elongationAtBreak", "flexuralStrength", "flexuralModulus", "unnotchedImpactStrength", "notchedImpactStrength"],
  "THE K5 ABS 夜光系列": ["filamentDiameter", "netWeight", "materialType", "density", "meltFlowIndex", "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength", "elongationAtBreak", "flexuralStrength", "flexuralModulus", "unnotchedImpactStrength", "notchedImpactStrength"],
  "THE K5™ ABS T": ["filamentDiameter", "netWeight", "density", "meltFlowIndex", "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength", "elongationAtBreak", "flexuralStrength", "flexuralModulus", "unnotchedImpactStrength", "notchedImpactStrength"],
  "THE K5 ABS 高安定性": ["filamentDiameter", "netWeight", "materialType", "density", "meltFlowIndex", "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength", "elongationAtBreak", "flexuralStrength", "flexuralModulus", "unnotchedImpactStrength", "notchedImpactStrength"],
};
const extras = {
  "THE K5 ABS P": [],
  "THE K5 ABS 夜光系列": [],
  "THE K5™ ABS T": ["diameterTolerance", "nozzleTemperature", "bedTemperature", "recommendedPrintSpeed"],
  "THE K5 ABS 高安定性": ["diameterTolerance", "nozzleTemperature", "bedTemperature", "recommendedPrintSpeed", "coolingFan"],
};
for (const [productLine, keys] of Object.entries(frozenKeys)) {
  const candidatesForProduct = [...keys, ...extras[productLine]].map((canonicalKey) => ({ canonicalKey, normalizedValue: "value" }));
  assert.deepEqual(getFrozenAcceptedParameterKeys(productLine), keys);
  assert.equal(candidatesForProduct.length, keys.length + extras[productLine].length);
  assert.equal(countFrozenAcceptedParameters(productLine, candidatesForProduct), keys.length);
}
console.log("parameter draft mapping: PASS");
