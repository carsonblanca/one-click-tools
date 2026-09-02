import assert from "node:assert/strict";
import { canonicalProductKey, countCanonicalProducts, uniqueCanonicalProducts } from "../lib/filaments/catalog/canonical-product-dataset.ts";

const base = (color, material = "PLA", variant = "Silk") => ({
  id: `r-${color}`,
  brand: "Kexcelled",
  brandZh: "Kexcelled",
  materialType: material,
  materialTypeZh: material,
  variant,
  variantZh: variant,
  productLine: "THE K5 PLA Silk",
  color: { colorNameZh: color, colorNameEn: color, hex: null, hasDigitalSwatch: false, hasPhysicalSwatch: false, physicalSwatchCount: 0 },
  spool: { spoolImagePlaceholder: null },
  rating: 0,
  reviewCount: 0,
  createdAt: "2026-01-01",
});

const records = [base("Black"), base("White"), base("Red"), base("PA product", "PA", "CF")];
assert.equal(uniqueCanonicalProducts(records).length, 2);
assert.equal(countCanonicalProducts(records, (record) => record.materialType === "PLA"), 1);
assert.equal(countCanonicalProducts(records, (record) => record.materialType === "PA"), 1);
assert.equal(canonicalProductKey(records[0]), canonicalProductKey(records[1]));
console.log("canonical product count tests passed");
