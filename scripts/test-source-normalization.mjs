#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { normalizeEvidencePack } from "../lib/filaments/imports/source-normalization.mjs";

function fixture(overrides = {}) {
  return normalizeEvidencePack({
    capture: { productIdentity: { brand: "", productLine: "", material: "PLA", officialUrl: "https://example.test/item" } },
    pageMeta: {},
    pageText: "R3D旗舰店 品牌 R3D PLA 哑光",
    colorMappings: [{ sourceText: "PLA 哑光 白 1kg", skuId: "sku-1", variantId: "variant-1", imagePath: "images/1.webp", imageStatus: "available" }],
    parameterEvidence: [],
    imageMetadata: [],
    ...overrides,
  });
}

const structured = fixture({ capture: { productIdentity: { brand: "Example", productLine: "Line", material: "PLA" } }, pageText: "Other旗舰店" });
assert.equal(structured.brand.value, "Example");
assert.equal(structured.brand.source, "capture.json.productIdentity.brand");

const fallback = fixture();
assert.equal(fallback.brand.value, "R3D");
assert.equal(fallback.brand.status, "CONFIRMED");

const missing = fixture({ pageText: "无品牌信息", colorMappings: [] });
assert.equal(missing.brand.status, "UNKNOWN");
assert.equal(missing.parameters.length, 0);

const conflicting = fixture({
  capture: { productIdentity: { brand: "Brand A" } },
  pageMeta: { brandName: "Brand B" },
});
assert.equal(conflicting.brand.value, "Brand A");
assert.equal(conflicting.brand.status, "CONFIRMED");

const mixed = fixture({
  colorMappings: [
    { sourceText: "PLA 哑光 白 1kg", skuId: "m1", variantId: "mv1" },
    { sourceText: "PLA 哑光 黑 3kg", skuId: "m2", variantId: "mv2" },
    { sourceText: "PLA 丝绸 金 1kg", skuId: "s1", variantId: "sv1" },
    { sourceText: "PLA 透明 蓝 1kg", skuId: "t1", variantId: "tv1" },
  ],
});
assert.equal(mixed.productCandidates.length, 3);
assert.equal(mixed.productCandidates.find((x) => x.canonicalIdentity.effect === "matte").packageVariants.length, 2);
assert.equal(mixed.skus.every((sku) => sku.officialColorCode === null), true);
assert.equal(mixed.skus.every((sku) => sku.colorIdentityStatus === "CONFIRMED"), true);

const ambiguous = fixture({ colorMappings: [{ sourceText: "PLA 试验色 1kg", skuId: "u1", variantId: "uv1" }] });
assert.equal(ambiguous.productCandidates.length, 1);
assert.equal(ambiguous.productCandidates[0].canonicalIdentity.status, "UNKNOWN");

const partial = fixture({ colorMappings: [
  { sourceText: "PLA 哑光 白 1kg", skuId: "p1", variantId: "pv1" },
  { sourceText: "PLA 试验色 1kg", skuId: "u1", variantId: "uv1" },
] });
assert.equal(partial.productCandidates.filter((x) => x.canonicalIdentity.status === "CONFIRMED").length, 1);
assert.equal(partial.productCandidates.filter((x) => x.canonicalIdentity.status === "UNKNOWN").length, 1);

const sparse = fixture({ parameterEvidence: [{ candidateField: "density", sourceText: "density", value: "", sourceUrl: "https://example.test" }] });
assert.equal(sparse.parameters.length, 1);
assert.equal(sparse.parameters[0].status, "UNKNOWN");

const zipPath = process.argv[2];
if (zipPath) {
  const files = unzipSync(new Uint8Array(readFileSync(zipPath)));
  const capture = JSON.parse(strFromU8(files["capture.json"]));
  const pageMeta = JSON.parse(strFromU8(files["page.meta.json"]));
  const pageText = strFromU8(files["page.txt"]);
  const colors = JSON.parse(strFromU8(files["color-mappings.json"]));
  const parameters = JSON.parse(strFromU8(files["parameter-evidence.json"]));
  const normalized = normalizeEvidencePack({ capture, pageMeta, pageText, colorMappings: colors, parameterEvidence: parameters, imageMetadata: JSON.parse(strFromU8(files["images.json"])) });
  assert.equal(normalized.brand.value, "R3D");
  assert.equal(normalized.skus.length, 130);
  assert.equal(normalized.productCandidates.length, 5);
  assert.equal(normalized.productCandidates.filter((x) => x.canonicalIdentity.status === "CONFIRMED").length, 5);
  assert.equal(normalized.skus.filter((x) => x.officialColorCode).length, 0);
  console.log(JSON.stringify({
    brand: normalized.brand,
    rawSkuCount: normalized.skus.length,
    productCandidateCount: normalized.productCandidates.length,
    confirmedProductCount: normalized.productCandidates.filter((x) => x.canonicalIdentity.status === "CONFIRMED").length,
    unknownProductCount: normalized.productCandidates.filter((x) => x.canonicalIdentity.status !== "CONFIRMED").length,
    colorIdentityConfirmedCount: normalized.skus.filter((x) => x.colorIdentityStatus === "CONFIRMED").length,
    parameterConfirmedCount: normalized.parameters.filter((x) => x.status !== "UNKNOWN").length,
    groups: normalized.productCandidates.map((x) => ({ identity: x.canonicalIdentity, skuCount: x.skuCount, packageVariants: x.packageVariants })),
    warnings: normalized.warnings,
  }, null, 2));
}

console.log("source-normalization tests passed");
