import assert from "node:assert/strict";
import { fieldsAcceptedFromCandidates, parameterSourceEvidence } from "../lib/filaments/parameters/normalized-parameters.ts";

const candidates = [
  { field: "filamentDiameter", normalizedValue: "1.75", unit: "mm", reviewStatus: "official", evidenceId: "e-d", sourceFile: "images/diameter.png", trusted: true },
  { canonicalKey: "netWeight", normalizedValue: "1000", unit: "g", reviewStatus: "official", evidenceId: "e-w", sourceFile: "images/weight.png", trusted: true },
  { field: "nozzleTemperature", canonicalKey: "nozzleTemperature", normalizedValue: "230-260", unit: "°C", reviewStatus: "official", evidenceId: "e-n", sourceFile: "images/print.png", trusted: true },
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
console.log("parameter draft mapping: PASS");
