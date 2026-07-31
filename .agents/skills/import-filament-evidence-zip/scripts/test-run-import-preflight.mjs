import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { ImportRunnerError, inspectFip } from "./run-import.mjs";

function json(value) {
  return strToU8(JSON.stringify(value));
}

function writeFip(colors) {
  const root = mkdtempSync(join(tmpdir(), "filament-preflight-test-"));
  const path = join(root, "fixture.filament-import.zip");
  const images = colors.flatMap((color, index) => color.localImagePath ? [{
    imageId: `image-${index + 1}`,
    packagePath: `assets/${color.localImagePath}`,
  }] : []);
  const files = {
    "manifest.json": json({
      sourceRunId: "test-source",
      brand: "KEXCELLED",
      brandId: "kexcelled",
      productLineId: "kexcelled-test",
      productKey: "kexcelled-test",
    }),
    "products.json": json([{
      productLine: "THE TEST PLA",
      displayName: "Kexcelled THE TEST PLA",
      brandDisplayNameEn: "Kexcelled",
      materialType: "PLA",
      productLineId: "kexcelled-test",
      productKey: "kexcelled-test",
    }]),
    "colors.json": json(colors),
    "images.json": json(images),
    "parameter-candidates.json": json([]),
    "evidence.json": json([]),
    "package-report.json": json({ importDecision: { autoPublishEligible: false } }),
    "draft-patch.json": json({}),
  };
  for (const image of images) files[image.packagePath] = new Uint8Array([1, 2, 3]);
  writeFileSync(path, zipSync(files));
  return path;
}

function color(overrides = {}) {
  return {
    nameZh: "测试色",
    officialColorCode: "TEST",
    sourceSkuId: "sku-1",
    imageStatus: "available",
    localImagePath: "images/test.png",
    sourceStatus: "marketplace_official_store",
    rawSkuText: "THE TEST PLA-TEST",
    ...overrides,
  };
}

test("an explicitly verified official placeholder passes without a fabricated image relation", () => {
  const result = inspectFip(writeFip([
    color(),
    color({
      nameZh: "哑光宝蓝色",
      officialColorCode: "RYBLU",
      sourceSkuId: "6005626081046",
      imageStatus: "placeholder",
      localImagePath: "",
      rawSkuText: "THE K5 PLA M-1.75-RYBLU-1KG（哑光宝蓝色）",
    }),
  ]));

  assert.equal(result.counts.colors, 2);
  assert.equal(result.counts.colorImageRelations, 1);
  assert.equal(result.counts.explicitPlaceholderColors, 1);
  assert.deepEqual(result.colorsWithoutUsableOfficialImage, [{
    colorCode: "RYBLU",
    sku: "6005626081046",
    imageStatus: "placeholder",
    reason: "official_placeholder_filtered",
  }]);
});

for (const [name, overrides] of [
  ["missing imageStatus", { imageStatus: "" }],
  ["download failure", { imageStatus: "download_failed" }],
  ["missing mapping", { imageStatus: "mapping_missing" }],
  ["available image without relation", { imageStatus: "available" }],
  ["placeholder without SKU", { imageStatus: "placeholder", sourceSkuId: "" }],
  ["placeholder without source proof", { imageStatus: "placeholder", rawSkuText: "unrelated" }],
]) {
  test(`${name} remains a hard preflight failure`, () => {
    assert.throws(
      () => inspectFip(writeFip([color({ ...overrides, localImagePath: "" })])),
      (error) => error instanceof ImportRunnerError
        && error.stage === "fip_preflight"
        && error.message === "Every color must reference an included image",
    );
  });
}
