import type { CatalogColor, ColorFamily, Finish, Transparency } from "@/lib/filaments/catalog/mock-colors";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";
import {
  FILAMENT_PARAMETER_SCHEMA_VERSION,
  getParameterDefinition,
  normalizeStoredParameters,
} from "@/lib/filaments/parameters/normalized-parameters";

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

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function enabled(value: unknown) {
  return value !== false && text(value).toLowerCase() !== "false";
}

function numberList(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(numberValue).filter((item): item is number => item !== null && item > 0)))
    : [];
}

function brandDisplayName(value: string, brandId: string) {
  const source = value.trim();
  if (source && source !== source.toUpperCase()) return source;
  return brandId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ") || source;
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
  if (body.draftId !== undefined && !text(body.draftId)) return ["draftId 格式无效。"];
  return [];
}

export function validatePublishedParameterContract(row: PublishableDraftRow): string[] {
  const data = objectValue(row.draft_data);
  const rawParameters = objectValue(data.parameters);
  const normalized = normalizeStoredParameters(rawParameters);
  const issues: string[] = [];
  const schemaVersion = text(rawParameters.parameterSchemaVersion);
  if (schemaVersion !== FILAMENT_PARAMETER_SCHEMA_VERSION) {
    issues.push(`parameterSchemaVersion 必须为 ${FILAMENT_PARAMETER_SCHEMA_VERSION}。`);
  }
  const unknownFieldKeys = Object.keys(normalized.unmappedFields);
  if (unknownFieldKeys.length) issues.push(`存在未知正式参数：${unknownFieldKeys.join(",")}。`);
  const unknownCandidateKeys = normalized.candidates.flatMap((candidate) => (
    text(candidate.unknownCanonicalKey) ? [text(candidate.unknownCanonicalKey)] : []
  ));
  if (unknownCandidateKeys.length) {
    issues.push(`存在未知候选参数 canonicalKey：${[...new Set(unknownCandidateKeys)].join(",")}。`);
  }
  return issues;
}

export function validateDraftForPublish(
  row: PublishableDraftRow | null,
  publishedRows: PublishableDraftRow[],
  request: { sourceRunId: string; draftId?: string },
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

  if (row.source_run_id !== request.sourceRunId) issues.push("sourceRunId 不匹配。");
  if (request.draftId && row.id !== request.draftId) issues.push("草稿 ID 不匹配。");
  if (!text(row.product_line_name)) issues.push("产品名称缺失。");
  if (!productKey) issues.push("productKey 缺失。");
  if (row.publication_status !== "draft") issues.push("草稿不是待发布状态。");
  if (!["pending_review", "approved"].includes(row.review_status)) issues.push("reviewStatus 不可发布。");
  if (!Object.keys(fields).length) issues.push("没有可发布的正式参数。");
  if (!candidates.length) issues.push("没有参数候选记录。");
  if (!parameterEvidence.length) issues.push("没有参数证据记录。");
  if (!text(row.material_type) && !text(fields.materialType)) issues.push("材料类型缺失。");
  if (!colors.length) issues.push("没有可发布的颜色。");
  if (!images.length) issues.push("没有可发布的图片。");
  if (countProductLineRecords(colors, productKey) !== colors.length) issues.push("存在跨产品颜色记录。");
  if (countProductLineRecords(images, productKey) !== images.length) issues.push("存在跨产品图片记录。");
  if (colors.some((item) => !text(objectValue(item).localImagePath))) issues.push("存在没有图片关系的颜色。");
  if (serialized.includes("PC K7")) issues.push("仍包含 PC K7 污染。");
  if (serialized.includes("英文名待补充")) issues.push("仍包含英文名待补充。");
  issues.push(...validatePublishedParameterContract(row));

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

function colorImageUrl(input: {
  assetKey: string;
  colorId: string;
  officialColorCode: string;
  productKey: string;
  sourceRunId: string;
}) {
  if (!input.assetKey.startsWith("filament-imports/")) return null;
  const params = new URLSearchParams({
    sourceRunId: input.sourceRunId,
    productKey: input.productKey,
    officialColorCode: input.officialColorCode,
    colorId: input.colorId,
  });
  return `/api/filaments/color-image?${params.toString()}`;
}

function extractChineseColorName(rawSkuText: unknown): string {
  const raw = text(rawSkuText);
  if (!raw) return "";
  const match = raw.match(/（([^）]+)）/);
  if (!match) return "";
  const candidate = match[1].trim();
  // Only accept the parenthetical when it carries manufacturer Chinese color text.
  return /[㐀-鿿]/.test(candidate) ? candidate : "";
}

function mapColor(value: unknown, index: number, productKey: string, sourceRunId: string) {
  const source = objectValue(value);
  const officialColorCode = text(source.officialColorCode);
  const colorId = text(source.colorId) || text(source.matchKey) || `${productKey}-color-${index + 1}`;
  const nameZh =
    text(source.displayNameZhCN) ||
    text(source.nameZh) ||
    extractChineseColorName(source.rawSkuText) ||
    `颜色 ${index + 1}`;
  const nameEn = text(source.displayNameEn);
  const rawHex = text(source.hexColor) || text(source.hex);
  const hex = /^#[0-9a-f]{6}$/i.test(rawHex) ? rawHex.toUpperCase() : null;
  const rgb = rgbFromHex(hex);
  const imageUrl = colorImageUrl({
    assetKey: text(source.localImagePath),
    colorId,
    officialColorCode,
    productKey,
    sourceRunId,
  });
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
    id: colorId,
    productLineId: text(source.productLineId) || productKey,
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

/**
 * Official multi-spec net weights, scoped to the exact KEXCELLED product line.
 * This set belongs ONLY to KEXCELLED THE K5 ABS (sold as 0.5 / 1 / 3 / 5 kg); it must
 * never be applied by materialType, otherwise every other brand's single-1kg ABS would
 * be wrongly presented as a multi-spec product.
 */
const OFFICIAL_NET_WEIGHT_OPTIONS_BY_PRODUCT: Record<string, number[]> = {
  "kexcelled-k5-abs": [500, 1000, 3000, 5000],
};

function declaredNetWeightsGrams(value: string) {
  const isKg = /kg/i.test(value);
  const parsed = (value.match(/\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => (isKg ? item * 1000 : item));
  return Array.from(new Set(parsed));
}

function netWeightOptionsGrams(value: string, productKey: string, explicitValue: unknown) {
  // A product-level declaration is authoritative, including a single explicit option.
  const explicit = numberList(explicitValue);
  if (explicit.length) return explicit;
  // Priority A: a draft that already declares multiple net weights needs no fallback.
  const declared = declaredNetWeightsGrams(value);
  if (declared.length > 1) return declared;
  const official = OFFICIAL_NET_WEIGHT_OPTIONS_BY_PRODUCT[productKey.trim().toLowerCase()];
  return official && official.length > 1 ? [...official] : undefined;
}

export function mapPublishedDraftToCatalogRecord(row: PublishableDraftRow): CatalogRecord | null {
  const data = objectValue(row.draft_data);
  if (!enabled(data.enabled)) return null;

  const brandDefaults = objectValue(data.brandDefaults);
  const productOverrides = objectValue(data.productOverrides);
  const productLine = {
    ...objectValue(data.productLine),
    ...objectValue(productOverrides.productLine),
  };
  const sourceBrand = objectValue(data.brand);
  const overrideBrand = objectValue(productOverrides.brand);
  const normalizedParameters = normalizeStoredParameters(data.parameters);
  const productKey = productKeyOf(row);
  const colors = arrayValue(data.colors)
    .map((value, index) => ({
      value,
      index,
      source: objectValue(value),
      displayOrder: numberValue(objectValue(value).displayOrder),
    }))
    .filter((item) => enabled(item.source.enabled))
    .sort((first, second) => (
      (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
      || first.index - second.index
    ))
    .map((item, index) => mapColor(item.value, index, productKey, row.source_run_id));
  if (!colors.length) return null;
  const images = arrayValue(data.images).flatMap((value, index) => {
    const image = objectValue(value);
    const url = publicAssetUrl(text(image.r2ObjectKey));
    const role = text(image.role) || "product";
    if (role === "evidence-only" || role === "evidence" || role === "document" || role === "parameter") return [];
    return url ? [{
      id: text(image.imageId) || `image-${index + 1}`,
      role,
      url,
    }] : [];
  });
  const parameters = Object.entries(normalizedParameters.fields).map(([canonicalKey, value]) => ({
    canonicalKey,
    labelZh: getParameterDefinition(canonicalKey)?.zhCNLabel || canonicalKey,
    labelEn: getParameterDefinition(canonicalKey)?.labelEn || canonicalKey,
    value,
  }));
  const primary = colors[0]?.color || mapColor({}, 0, productKey, row.source_run_id).color;
  const materialType = text(row.material_type) || text(productLine.materialType);
  const netWeightField = normalizedParameters.fields.netWeight || "";
  const explicitNetWeightOptions = hasOwn(productOverrides, "netWeightOptionsG")
    ? productOverrides.netWeightOptionsG
    : hasOwn(productLine, "netWeightOptionsG")
      ? productLine.netWeightOptionsG
      : hasOwn(data, "netWeightOptionsG")
        ? data.netWeightOptionsG
        : brandDefaults.netWeightOptionsG;
  const netWeightOptionsG = netWeightOptionsGrams(netWeightField, productKey, explicitNetWeightOptions);
  const rawBrandName = text(productOverrides.brandName)
    || text(overrideBrand.name)
    || text(brandDefaults.name)
    || text(sourceBrand.name)
    || text(data.brandName)
    || row.brand_id;
  const brand = brandDisplayName(rawBrandName, row.brand_id);
  const brandZh = text(productOverrides.brandNameZh)
    || text(overrideBrand.nameZh)
    || text(brandDefaults.nameZh)
    || text(sourceBrand.nameZh)
    || text(data.brandNameZh)
    || brand;
  const effectiveSpoolAndPackaging = hasOwn(productOverrides, "spoolAndPackaging")
    ? productOverrides.spoolAndPackaging
    : hasOwn(data, "spoolAndPackaging")
      ? data.spoolAndPackaging
      : hasOwn(brandDefaults, "spoolAndPackaging")
        ? brandDefaults.spoolAndPackaging
        : undefined;
  const published = {
    sourceRunId: row.source_run_id,
    publicationStatus: "published" as const,
    brandId: row.brand_id,
    parameters,
    colors,
    images,
    brandDefaults,
    productOverrides,
    ...(effectiveSpoolAndPackaging !== undefined
      ? { spoolAndPackaging: effectiveSpoolAndPackaging }
      : {}),
  };
  return {
    id: productKey,
    brand,
    brandZh,
    materialType,
    materialTypeZh: materialType,
    variant: text(row.variant) || text(productLine.variant) || "",
    variantZh: text(productLine.variantZh) || text(data.variantZh) || text(row.variant) || text(productLine.variant) || "",
    productLine: text(row.product_line_name) || text(productLine.name),
    productLineId: productKey,
    parameterStatus: parameters.length ? "complete" : "missing",
    color: primary,
    spool: {
      netFilamentWeight: netWeightGrams(netWeightField, productLine.netWeightG),
      netWeightOptionsG,
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
    published,
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
