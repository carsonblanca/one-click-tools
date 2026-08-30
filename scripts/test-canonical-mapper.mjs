import assert from "node:assert/strict";
import { mapCanonicalFilamentProduct, toParameterDetailProjection } from "../lib/filaments/catalog/canonical-mapper.ts";

function fixture(productLine, materialType, variant, colorCount, imageCount, parameterCount) {
  const fields = Object.fromEntries(Array.from({ length: parameterCount }, (_, index) => [`field-${index + 1}`, `${index + 1}`]));
  return {
    brandId: "kexcelled",
    brandName: "Kexcelled",
    productLineName: productLine,
    materialType,
    variant,
    reviewStatus: "approved",
    publicationStatus: "published",
    draftData: {
      productLine: { name: productLine, materialType, variant },
      canonicalColors: Array.from({ length: colorCount }, (_, index) => ({
        rawSkuText: `SKU-${index + 1}`,
        nameZh: `颜色${index + 1}`,
        officialColorCode: `C-${index + 1}`,
      })),
      images: Array.from({ length: imageCount }, (_, index) => ({ ref: `image-${index + 1}` })),
      parameters: { fields, parameterCategories: {} },
    },
  };
}

const absP = mapCanonicalFilamentProduct(fixture("THE K5 ABS P", "ABS", "P", 6, 7, 10));
assert.equal(absP.technicalParameters.length + absP.printParameters.length, 10);
assert.equal(absP.identity.materialType, "ABS");
assert.equal(absP.colors.length, 6);
assert.equal(absP.images.length, 7);
assert.equal(absP.publication.status, "published");

for (const [name, material, variant, colors, images, parameters] of [
  ["THE K5 ABS P", "ABS", "P", 6, 7, 10],
  ["THE K5 ABS 夜光系列", "ABS", "Glow", 2, 3, 13],
  ["THE K5 ABS 高安定性", "ABS", "High Stability", 36, 37, 13],
  ["THE K5™ ABS T", "ABS", "Transparent", 8, 9, 12],
]) {
  const result = mapCanonicalFilamentProduct(fixture(name, material, variant, colors, images, parameters));
  assert.equal(result.colors.length, colors);
  assert.equal(result.images.length, images);
  assert.equal(result.technicalParameters.length + result.printParameters.length, parameters);
}

const sharedInput = fixture("THE K5™ PLA Silk", "PETG", "", 2, 2, 2);
const admin = mapCanonicalFilamentProduct(sharedInput);
const frontend = mapCanonicalFilamentProduct(sharedInput);
assert.deepEqual(frontend, admin);
assert.equal(admin.identity.materialType, "PLA");
assert.equal(admin.identity.variant, "Silk");
assert.equal(admin.classification.surfaceEffect, "silk");

const projection = toParameterDetailProjection(absP);
assert.equal(projection.technicalParameters[0].key, "field-1");
assert.ok("images" in projection);
assert.ok("presetFamilies" in projection);
console.log("canonical mapper and projection: PASS");
