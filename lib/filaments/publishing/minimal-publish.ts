import type { CatalogColor, ColorFamily, Finish, Transparency } from "@/lib/filaments/catalog/mock-colors";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";
import {
  getParameterDefinition,
  normalizeStoredParameters,
} from "@/lib/filaments/parameters/normalized-parameters";

export const GOLDEN_SOURCE_RUN_ID = "opencode-20260718081745-d5c1e1ff-d199c528";
export const GOLDEN_DRAFT_ID = "8a3ac57b-ffc6-4c35-9d2a-41482d5002a8";
export const GOLDEN_PRODUCT_KEY = "kexcelled-k5-petg-m";

export type PublishableDraftRow = {
  id: string;
  source_run_id: string;
  status: string;
  review_status: string;
  publication_status: string;
  brand_id: string;
  product_line_name: string | null;
  material_type: string | null;
  variant: string | null;
  draft_data: unknown;
  created_at: string;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function productKeyOf(row: PublishableDraftRow) {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  return text(data.productKey) || text(productLine.productKey) || text(productLine.productLineId);
}

function countProductLineRecords(value: unknown, productKey: string) {
  return arrayValue(value).filter((item) => {
    const recordProductLineId = text(objectValue(item).productLineId);
    return !recordProductLineId || recordProductLineId === productKey;
  }).length;
}

export function validateSinglePublishRequest(value: unknown): string[] {
  const body = objectValue(value);
  const sourceRunIds = arrayValue(body.sourceRunIds).map(text).filter(Boolean);
  if (sourceRunIds.length !== 1) return ["第一版发布接口只允许一次发布一条草稿。"];
  if (sourceRunIds[0] !== GOLDEN_SOURCE_RUN_ID) return ["当前发布接口仅允许黄金样本 sourceRunId。"];
  return [];
}

export function validateDraftForPublish(
  row: PublishableDraftRow | null,
  publishedRows: PublishableDraftRow[],
): string[] {
  if (!row) return ["草稿不存在。"]; 
  const data = objectValue(row.draft_data);
  const parameters = objectValue(data.parameters);
  const fields = objectValue(parameters.fields);
  const candidates = arrayValue(parameters.candidates);
  const parameterEvidence = arrayValue(parameters.sourceEvidence);
  const colors = arrayValue(data.colors);
  const images = arrayValue(data.images);
  const productKey = productKeyOf(row);
  const serialized = JSON.stringify(data);
  const issues: string[] = [];

  if (row.source_run_id !== GOLDEN_SOURCE_RUN_ID) issues.push("sourceRunId 不匹配。");
  if (row.id !== GOLDEN_DRAFT_ID) issues.push("草稿 ID 不匹配。");
  if (text(row.product_line_name) !== "THE K5 PETG M") issues.push("产品名称不匹配。");
  if (productKey !== GOLDEN_PRODUCT_KEY) issues.push("productKey 不匹配。");
  if (row.publication_status !== "draft") issues.push("草稿不是待发布状态。");
  if (!["pending_review", "approved"].includes(row.review_status)) issues.push("reviewStatus 不可发布。");
  if (Object.keys(fields).length !== 24) issues.push("正式参数数量不是 24。");
  if (candidates.length !== 24) issues.push("候选参数数量不是 24。");
  if (parameterEvidence.length !== 24) issues.push("参数证据数量不是 24。");
  if (text(fields.materialType) !== "PETG") issues.push("材料类型不是 PETG。");
  if (colors.length !== 22) issues.push("颜色数量不是 22。");
  if (images.length !== 36) issues.push("图片数量不是 36。");
  if (countProductLineRecords(colors, productKey) !== 22) issues.push("颜色 productLineId 关系不是 22/22。");
  if (countProductLineRecords(images, productKey) !== 36) issues.push("图片 productLineId 关系不是 36/36。");
  if (colors.some((item) => !text(objectValue(item).localImagePath))) issues.push("存在没有图片关系的颜色。");
  if (serialized.includes("PC K7")) issues.push("仍包含 PC K7 污染。");
  if (serialized.includes("英文名待补充")) issues.push("仍包含英文名待补充。");

  const duplicate = publishedRows.find((item) => item.id !== row.id && (
    item.source_run_id === row.source_run_id || productKeyOf(item) === productKey
  ));
  if (duplicate) issues.push("存在相同 sourceRunId 或 productKey 的已发布记录。");
  return issues;
}

function inferColorFamily(name: string, hex: string | null): ColorFamily {
  const normalized = name.toLowerCase();
  if (normalized.includes("黑")) return "black";
  if (normalized.includes("白")) return "white";
  if (normalized.includes("灰")) return "gray";
  if (normalized.includes("红")) return "red";
  if (normalized.includes("橙")) return "orange";
  if (normalized.includes("黄")) return "yellow";
  if (normalized.includes("绿")) return "green";
  if (normalized.includes("蓝")) return "blue";
  if (normalized.includes("紫")) return "purple";
  if (normalized.includes("粉")) return "pink";
  if (normalized.includes("棕") || normalized.includes("巧克力")) return "brown";
  if (!hex) return "gray";
  return "gray";
}

function rgbFromHex(hex: string | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function publicAssetUrl(objectKey: string) {
  return objectKey.startsWith("filament-imports/")
    ? `/api/filament-assets?key=${encodeURIComponent(objectKey)}`
    : null;
}

function mapColor(value: unknown, index: number) {
  const source = objectValue(value);
  const nameZh = text(source.displayNameZhCN) || text(source.nameZh) || `颜色 ${index + 1}`;
  const nameEn = text(source.displayNameEn) || nameZh;
  const officialColorCode = text(source.officialColorCode);
  const rawHex = text(source.hexColor) || text(source.hex);
  const hex = /^#[0-9a-f]{6}$/i.test(rawHex) ? rawHex.toUpperCase() : null;
  const rgb = rgbFromHex(hex);
  const imageUrl = publicAssetUrl(text(source.localImagePath));
  const color: CatalogColor = {
    colorNameZh: nameZh,
    colorNameEn: nameEn,
    colorFamily: inferColorFamily(nameZh, hex),
    hex,
    rgb,
    finish: "matte" as Finish,
    transparency: "opaque" as Transparency,
    hasDigitalSwatch: Boolean(hex),
    hasPhysicalSwatch: Boolean(imageUrl),
    physicalSwatchCount: imageUrl ? 1 : 0,
    digitalSwatch: {
      hex,
      rgb,
      officialColorCode,
      sourceType: "manufacturer",
      lastVerifiedAt: "2026-07-20",
    },
    physicalSwatches: imageUrl ? [{
      imageCount: 1,
      uploaderPublicId: "official",
      reviewStatus: "approved",
      lightSource: "unknown",
      usedGrayCard: false,
      declaredPostProcessed: false,
    }] : [],
  };
  return {
    id: text(source.colorId) || text(source.matchKey) || `${GOLDEN_PRODUCT_KEY}-color-${index + 1}`,
    nameZh,
    nameEn,
    officialColorCode,
    imageUrl,
    color,
  };
}

function netWeightGrams(value: string, fallback: unknown) {
  const numeric = Number(value.match(/[\d.]+/)?.[0]);
  if (Number.isFinite(numeric) && numeric > 0) {
    return /kg/i.test(value) ? numeric * 1000 : numeric;
  }
  return numberValue(fallback) || 0;
}

export function mapPublishedDraftToCatalogRecord(row: PublishableDraftRow): CatalogRecord {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  const normalizedParameters = normalizeStoredParameters(data.parameters);
  const productKey = productKeyOf(row);
  const colors = arrayValue(data.colors).map(mapColor);
  const images = arrayValue(data.images).flatMap((value, index) => {
    const image = objectValue(value);
    const url = publicAssetUrl(text(image.r2ObjectKey));
    return url ? [{
      id: text(image.imageId) || `image-${index + 1}`,
      role: text(image.role) || "product",
      url,
    }] : [];
  });
  const parameters = Object.entries(normalizedParameters.fields).map(([canonicalKey, value]) => ({
    canonicalKey,
    labelZh: getParameterDefinition(canonicalKey)?.zhCNLabel || canonicalKey,
    value,
  }));
  const primary = colors[0]?.color || mapColor({}, 0).color;
  return {
    id: productKey,
    brand: "Kexcelled",
    brandZh: "Kexcelled",
    materialType: text(row.material_type) || text(productLine.materialType),
    materialTypeZh: text(row.material_type) || text(productLine.materialType),
    variant: text(row.variant) || text(productLine.variant) || "Matte",
    variantZh: "哑光",
    productLine: text(row.product_line_name) || text(productLine.name),
    productLineId: productKey,
    parameterStatus: "complete",
    color: primary,
    spool: {
      netFilamentWeight: netWeightGrams(normalizedParameters.fields.netWeight || "", productLine.netWeightG),
      emptySpoolWeight: null,
      fullSpoolWeight: null,
      spoolOuterDiameter: null,
      spoolWidth: null,
      hubDiameter: null,
      spoolMaterial: null,
      refillable: false,
      cardboardSpool: false,
      amsFit: "yes",
      adapterRequired: false,
      spoolImagePlaceholder: images[0]?.url || null,
    },
    rating: 0,
    reviewCount: 0,
    createdAt: row.created_at,
    published: {
      sourceRunId: row.source_run_id,
      publicationStatus: "published",
      parameters,
      colors,
      images,
    },
  };
}

export function mergePublishedWithStatic(
  published: CatalogRecord[],
  fallback: CatalogRecord[],
) {
  const publishedKeys = new Set(published.flatMap((record) => [record.id, record.productLineId].filter(Boolean)));
  return [
    ...published,
    ...fallback.filter((record) => !publishedKeys.has(record.id) && !publishedKeys.has(record.productLineId)),
  ];
}
