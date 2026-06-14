import assert from "node:assert/strict";

import {
  getCompressionRateLabel,
  getCompressionRatePercent,
  getLatestDebouncedQuality,
  getProcessingStateAfterRequestSettles,
  getQualityPercent,
  getQualityPresetId,
  getSavedBytes,
  isLatestCompressionRequest,
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
assert.equal(getQualityPercent(0.9), 90);
assert.equal(getQualityPercent(0.7), 70);
assert.equal(getQualityPercent(0.5), 50);
assert.equal(getQualityPercent(0.3), 30);
assert.equal(getQualityPercent(0.705), 71);
assert.equal(getQualityPercent(0.64), 64);
assert.equal(getQualityPresetId(0.9), "high-quality");
assert.equal(getQualityPresetId(0.7), "balanced");
assert.equal(getQualityPresetId(0.5), "smaller-file");
assert.equal(getQualityPresetId(0.3), "strong-compression");
assert.equal(getQualityPresetId(0.64), null);
assert.equal(getSavedBytes(1000, 700), 300);
assert.equal(getSavedBytes(1000, 1200), 0);
assert.equal(isOutputSmaller(1000, 700), true);
assert.equal(isOutputSmaller(1000, 1000), false);
assert.equal(isOutputSmaller(1000, 1200), false);
assert.equal(getLatestDebouncedQuality(["0.9", "0.7", "0.5", "0.3"]), "0.3");
assert.equal(getLatestDebouncedQuality(["0.9"]), "0.9");
assert.equal(getLatestDebouncedQuality([]), null);
assert.equal(isLatestCompressionRequest(3, 4), false);
assert.equal(isLatestCompressionRequest(4, 4), true);
assert.equal(
  getProcessingStateAfterRequestSettles({
    currentProcessing: true,
    requestId: 3,
    latestRequestId: 4,
  }),
  true,
);
assert.equal(
  getProcessingStateAfterRequestSettles({
    currentProcessing: true,
    requestId: 4,
    latestRequestId: 4,
  }),
  false,
);

const numericResults = [
  getCompressionRatePercent(1000, 700),
  getCompressionRatePercent(1000, 999),
  getCompressionRatePercent(1000, 1000),
  getCompressionRatePercent(1000, 1200),
  getQualityPercent(0.9),
  getQualityPercent(0.7),
  getQualityPercent(0.5),
  getQualityPercent(0.3),
  getQualityPercent(0.705),
  getQualityPercent(0.64),
  getSavedBytes(1000, 1200),
];

for (const result of numericResults) {
  assert.equal(Number.isFinite(result), true, `${result} must be finite`);
  assert.equal(result >= 0, true, `${result} must not be negative`);
}

console.log("validate:image-compressor passed");
