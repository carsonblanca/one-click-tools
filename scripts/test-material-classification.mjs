import assert from "node:assert/strict";
import { countCanonicalProducts } from "../lib/filaments/catalog/canonical-product-dataset.ts";
import { normalizeMaterialType } from "../lib/filaments/catalog/material-taxonomy.ts";

const record = (id, productLine, materialType) => ({
  id,
  brand: "Kexcelled",
  brandZh: "Kexcelled",
  productLine,
  productLineZh: productLine,
  materialType,
  materialTypeZh: materialType,
  variant: "Basic",
  color: {
    colorNameZh: id,
    colorNameEn: id,
    colorFamily: "gray",
    hex: "#888888",
    rgb: "136,136,136",
    finish: "semi-glossy",
    transparency: "opaque",
    hasDigitalSwatch: true,
    hasPhysicalSwatch: false,
  },
  spool: { spoolType: "plastic", spoolColor: "black", spoolImagePlaceholder: null, amsFit: "yes" },
  parameterStatus: "verified",
  rating: 5,
  reviewCount: 1,
  createdAt: "2026-01-01",
});

const records = [
  record("silk-black", "THE K5 PLA Silk", "PLA"),
  record("silk-white", "THE K5 PLA Silk", "PLA"),
  record("pa-c", "THE K8 PA C", "PA"),
  record("petg-gf", "THE K5 PETG GF", "PETG"),
];

assert.equal(countCanonicalProducts(records, () => true), 3);
assert.equal(countCanonicalProducts(records, (item) => item.materialType === "PLA"), 1);
assert.equal(countCanonicalProducts(records, (item) => item.materialType === "PA"), 1);
assert.equal(countCanonicalProducts(records, (item) => item.materialType === "PETG"), 1);
assert.equal(normalizeMaterialType(undefined, "THE K7"), "Other");
assert.equal(normalizeMaterialType(undefined, "THE K6 PET CF10"), "PET");
assert.notEqual(normalizeMaterialType(undefined, "THE K5 PLA Silk"), "PA");
assert.notEqual(normalizeMaterialType(undefined, "THE K5 PLA Silk"), "PETG");

console.log("material classification tests passed");
