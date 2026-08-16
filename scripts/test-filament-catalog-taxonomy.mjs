import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const base = join(root, specifier.slice(2));
    const resolved = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]
      .find((candidate) => existsSync(candidate));
    return resolved
      ? { url: pathToFileURL(resolved).href, shortCircuit: true }
      : nextResolve(specifier, context);
  },
});

const { buildMaterialTaxonomy, recordMatchesTaxonomy } = await import("../lib/filaments/catalog/material-taxonomy.ts");
const { applyFilamentAdminPatch } = await import("../lib/filaments/admin/filament-admin.ts");

function record({ productKey, labelZh, labelEn, sortOrder, enabled = true }) {
  return {
    id: productKey,
    productLineId: productKey,
    materialType: "PLA",
    materialTypeZh: "PLA",
    variant: labelEn,
    variantZh: labelZh,
    productLine: productKey,
    taxonomy: {
      materialId: "material:pla",
      subtypeId: `subtype:material:pla:${productKey.replace("kexcelled-k5-pla-", "").replace("kexcelled-k5-pla", "standard")}`,
      labelZh,
      labelEn,
      sortOrder,
      enabled,
    },
  };
}

const records = [
  ...Array.from({ length: 28 }, () => record({ productKey: "kexcelled-k5-pla-silk", labelZh: "丝绸", labelEn: "Silk", sortOrder: 30 })),
  ...Array.from({ length: 47 }, () => record({ productKey: "kexcelled-k5-pla", labelZh: "标准", labelEn: "Standard", sortOrder: 10 })),
  ...Array.from({ length: 5 }, () => record({ productKey: "kexcelled-k5-pla-cf", labelZh: "碳纤增强", labelEn: "Carbon Fiber Reinforced", sortOrder: 40 })),
  ...Array.from({ length: 37 }, () => record({ productKey: "kexcelled-k5-pla-m", labelZh: "哑光", labelEn: "Matte", sortOrder: 20 })),
  record({ productKey: "hidden", labelZh: "隐藏", labelEn: "Hidden", sortOrder: 0, enabled: false }),
];

const taxonomy = buildMaterialTaxonomy(records, "zh-cn");
assert.equal(taxonomy.length, 1);
assert.equal(taxonomy[0].count, 117);
assert.deepEqual(taxonomy[0].subtypes.map(({ id, label, count }) => ({ id, label, count })), [
  { id: "subtype:material:pla:standard", label: "标准", count: 47 },
  { id: "subtype:material:pla:m", label: "哑光", count: 37 },
  { id: "subtype:material:pla:silk", label: "丝绸", count: 28 },
  { id: "subtype:material:pla:cf", label: "碳纤增强", count: 5 },
]);
assert.equal(recordMatchesTaxonomy(records[0], "material:pla", "subtype:material:pla:silk"), true);
assert.equal(recordMatchesTaxonomy(records[0], "material:pla", "subtype:material:pla:m"), false);
assert.equal(recordMatchesTaxonomy(records.at(-1), null, null), false);

const renamed = records.map((item) => item.productLineId === "kexcelled-k5-pla-m"
  ? { ...item, taxonomy: { ...item.taxonomy, labelZh: "柔雾", sortOrder: 5 } }
  : item);
assert.equal(buildMaterialTaxonomy(renamed, "zh-cn")[0].subtypes[0].label, "柔雾");

const adminRow = {
  draft_key: "test-material",
  brand_id: "test-brand",
  product_line_name: "TEST MATERIAL",
  material_type: "PLA",
  variant: "Standard",
  review_status: "approved",
  publication_status: "draft",
  status: "draft",
  draft_data: { productLine: { name: "TEST MATERIAL", materialType: "PLA" } },
};
const managedTaxonomy = {
  materialId: "material:pla",
  subtypeId: "subtype:material:pla:standard",
  labelZh: "标准",
  labelEn: "Standard",
  sortOrder: 10,
  enabled: true,
};
assert.deepEqual(applyFilamentAdminPatch(adminRow, { taxonomy: managedTaxonomy }).draftData.productLine.taxonomy, managedTaxonomy);

const componentSource = readFileSync(join(root, "components/filaments/BambuFilamentCatalogExperience.tsx"), "utf8");
assert.equal(componentSource.includes("MATERIAL_VARIANTS"), false);
assert.equal(componentSource.includes("MATERIAL_TYPES"), false);
assert.equal(componentSource.includes("实拍参考"), false);
assert.equal(componentSource.includes("data-official-color-code"), true);

console.log("filament catalog taxonomy tests passed");
