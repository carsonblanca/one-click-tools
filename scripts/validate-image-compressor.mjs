import assert from "node:assert/strict";

import {
  getCompressionRateLabel,
  getCompressionRatePercent,
  getQualityPercent,
  getSavedBytes,
  isOutputSmaller,
  unavailableCompressionLabel,
} from "../lib/image-compressor-stats.ts";

const rateCases = [
  { original: 1000, output: 700, expected: 30 },
  { original: 1000, output: 999, expected: 0 },
  { original: 1000, output: 1000, expected: 0 },
  { original: 1000, output: 1200, expected: 0 },
];

for (const testCase of rateCases) {
  assert.equal(
    getCompressionRatePercent(testCase.original, testCase.output),
    testCase.expected,
    `${testCase.original} -> ${testCase.output} should display ${testCase.expected}%`,
  );
}

assert.equal(getCompressionRateLabel(0, 0), unavailableCompressionLabel);
assert.equal(getCompressionRatePercent(0, 0), null);
assert.equal(getQualityPercent(0.7), 70);
assert.equal(getQualityPercent(0.705), 71);
assert.equal(getSavedBytes(1000, 700), 300);
assert.equal(getSavedBytes(1000, 1200), 0);
assert.equal(isOutputSmaller(1000, 700), true);
assert.equal(isOutputSmaller(1000, 1000), false);
assert.equal(isOutputSmaller(1000, 1200), false);

const numericResults = [
  getCompressionRatePercent(1000, 700),
  getCompressionRatePercent(1000, 999),
  getCompressionRatePercent(1000, 1000),
  getCompressionRatePercent(1000, 1200),
  getQualityPercent(0.7),
  getQualityPercent(0.705),
  getSavedBytes(1000, 1200),
];

for (const result of numericResults) {
  assert.equal(Number.isFinite(result), true, `${result} must be finite`);
  assert.equal(result >= 0, true, `${result} must not be negative`);
}

console.log("validate:image-compressor passed");
