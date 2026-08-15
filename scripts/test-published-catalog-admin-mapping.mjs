import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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

const {
  mapPublishedDraftToCatalogRecord,
  validatePublishedParameterContract,
} = await import("../lib/filaments/publishing/minimal-publish.ts");
const { getColorCardImageUrl } = await import("../lib/filaments/catalog/image-roles.ts");

const spoolDefault = {
  scope: "1kg",
  spoolVersions: [],
  packagingVersions: [],
  noteZh: "品牌默认",
  noteEn: "Brand default",
};
const spoolOverride = {
  ...spoolDefault,
  noteZh: "产品覆盖",
  noteEn: "Product override",
};
const baseDraft = {
  id: "draft-1",
  source_run_id: "source-1",
  status: "published",
  review_status: "approved",
  publication_status: "published",
  brand_id: "test-brand",
  product_line_name: "TEST MATERIAL",
  material_type: "PETG",
  variant: "Matte",
  created_at: "2026-08-10T00:00:00.000Z",
  draft_data: {
    enabled: true,
    productKey: "test-material",
    brand: { name: "IMPORTED BRAND", nameZh: "导入品牌" },
    brandDefaults: {
      name: "Managed Brand",
      nameZh: "管理品牌",
      legalEntity: "Managed Brand Ltd.",
      spoolAndPackaging: spoolDefault,
    },
    productOverrides: {
      brandName: "Product Brand",
      spoolAndPackaging: spoolOverride,
    },
    productLine: {
      name: "TEST MATERIAL",
      materialType: "PETG",
      netWeightG: 1000,
      netWeightOptionsG: [500, 1000, 3000],
    },
    parameters: {
      parameterSchemaVersion: "oneclick.filament-parameters.v1",
      fields: {
        materialType: "PETG",
        netWeight: "1000 g",
        emptyParameter: "",
      },
    },
    colors: [
      { colorId: "late", displayNameZhCN: "后", officialColorCode: "L", displayOrder: 20, localImagePath: "filament-imports/test/late.jpg" },
      { colorId: "hidden", displayNameZhCN: "隐藏", officialColorCode: "H", displayOrder: 1, enabled: false, localImagePath: "filament-imports/test/hidden.jpg" },
      { colorId: "early", displayNameZhCN: "前", officialColorCode: "E", displayOrder: 10, localImagePath: "filament-imports/test/early.jpg" },
    ],
    images: [
      { imageId: "product", role: "product", r2ObjectKey: "filament-imports/test/product.jpg" },
      { imageId: "evidence", role: "evidence-only", r2ObjectKey: "filament-imports/test/evidence.jpg" },
    ],
  },
};

const record = mapPublishedDraftToCatalogRecord(baseDraft);
assert.ok(record);
assert.equal(record.brand, "Product Brand");
assert.equal(record.brandZh, "管理品牌");
assert.deepEqual(record.spool.netWeightOptionsG, [500, 1000, 3000]);
assert.deepEqual(record.published.colors.map((item) => item.id), ["early", "late"]);
assert.deepEqual(record.published.colors.map((item) => item.productLineId), ["test-material", "test-material"]);
assert.equal(record.published.colors[0].officialColorCode, "E");
assert.equal(record.published.colors[0].imageUrl, "/api/filament-assets?key=filament-imports%2Ftest%2Fearly.jpg");
assert.equal(getColorCardImageUrl(record), "/api/filament-assets?key=filament-imports%2Ftest%2Fearly.jpg");
assert.equal(getColorCardImageUrl({
  ...record,
  productLineId: "another-product",
}), null);
assert.equal(getColorCardImageUrl({
  ...record,
  color: {
    ...record.color,
    digitalSwatch: { ...record.color.digitalSwatch, officialColorCode: "UNKNOWN" },
  },
}), null);
assert.deepEqual(record.published.images.map((item) => item.id), ["product"]);
assert.equal(record.published.parameters.length, 2);
assert.equal(record.published.parameters.find((item) => item.canonicalKey === "materialType")?.labelEn, "Material type");
assert.equal(record.published.parameters.some((item) => item.value === ""), false);
assert.equal(record.published.brandDefaults.legalEntity, "Managed Brand Ltd.");
assert.equal(record.published.spoolAndPackaging.noteZh, "产品覆盖");

assert.equal(mapPublishedDraftToCatalogRecord({
  ...baseDraft,
  draft_data: { ...baseDraft.draft_data, enabled: false },
}), null);
assert.equal(mapPublishedDraftToCatalogRecord({
  ...baseDraft,
  draft_data: {
    ...baseDraft.draft_data,
    colors: baseDraft.draft_data.colors.map((color) => ({ ...color, enabled: false })),
  },
}), null);

const defaultsOnly = mapPublishedDraftToCatalogRecord({
  ...baseDraft,
  draft_data: {
    ...baseDraft.draft_data,
    productOverrides: {},
  },
});
assert.ok(defaultsOnly);
assert.equal(defaultsOnly.brand, "Managed Brand");
assert.equal(defaultsOnly.published.spoolAndPackaging.noteZh, "品牌默认");

assert.deepEqual(validatePublishedParameterContract(baseDraft), []);
assert.match(validatePublishedParameterContract({
  ...baseDraft,
  draft_data: {
    ...baseDraft.draft_data,
    parameters: {
      ...baseDraft.draft_data.parameters,
      fields: { ...baseDraft.draft_data.parameters.fields, futureUnknownField: "1" },
    },
  },
})[0], /未知正式参数/);

console.log("published catalog admin mapping tests passed");
