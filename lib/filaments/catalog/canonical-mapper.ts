import { inferMaterialTypeFromName, inferSurfaceFinishFromName, normalizeMaterialType } from "./material-taxonomy";
import { resolveCanonicalParameterKey } from "../parameters/normalized-parameters";

type AnyObject = Record<string, unknown>;

export type CanonicalParameter = {
  key: string;
  value: string;
  unit: string | null;
  source: string;
  reviewStatus: string;
  category: "print" | "material";
};

export type CanonicalColor = {
  sku: string;
  officialColorCode: string | null;
  nameZh: string;
  nameEn: string | null;
  imageRef: string | null;
  swatchRef: string | null;
};

export type CanonicalImage = {
  ref: string;
  role: string | null;
  colorSku: string | null;
};

export type CanonicalPresetFamily = {
  familyKey: string | null;
  readiness: string;
  variantReferences: string[];
};

export type CanonicalFilamentProduct = {
  identity: {
    brandId: string;
    brandName: string;
    productLine: string;
    materialType: string;
    variant: string;
  };
  classification: { surfaceEffect: string };
  colors: CanonicalColor[];
  images: CanonicalImage[];
  technicalParameters: CanonicalParameter[];
  printParameters: CanonicalParameter[];
  presetFamilies: CanonicalPresetFamily[];
  publication: {
    status: string;
    reviewStatus: string;
    publishedAt: string | null;
  };
};

export type ParameterDetailProjection = Pick<CanonicalFilamentProduct, "identity" | "classification" | "technicalParameters" | "printParameters" | "images" | "presetFamilies" | "publication"> & {
  colors: CanonicalColor[];
};

export type CanonicalMapperInput = {
  sourceRunId?: unknown;
  brandId?: unknown;
  brandName?: unknown;
  productLineName?: unknown;
  materialType?: unknown;
  variant?: unknown;
  reviewStatus?: unknown;
  publicationStatus?: unknown;
  publishedAt?: unknown;
  draftData?: unknown;
};

function objectValue(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyObject : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function arrayOfObjects(value: unknown): AnyObject[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyObject => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function parameterValue(value: AnyObject): string {
  return text(value.normalizedDisplayValue) || text(value.normalizedValue) || text(value.rawValue) || text(value.value);
}

function parameterKey(value: unknown): string {
  const raw = text(value);
  return resolveCanonicalParameterKey(raw) || raw;
}

function parameterCategory(key: string, value: AnyObject, categories: AnyObject): "print" | "material" {
  const category = text(value.category) || text(categories[key]);
  return category === "print" ? "print" : "material";
}

function parameterSource(key: string, value: AnyObject, sources: AnyObject): string {
  return text(value.source) || text(value.sourceType) || text(sources[key]) || "unknown";
}

function parameterReviewStatus(value: AnyObject, fallback: string): string {
  return text(value.reviewStatus) || text(value.status) || fallback || "pending";
}

function collectParameters(parameterBlock: AnyObject): CanonicalParameter[] {
  const fields = objectValue(parameterBlock.fields);
  const categories = objectValue(parameterBlock.parameterCategories);
  const sources = objectValue(parameterBlock.parameterSources);
  const fallbackReviewStatus = text(parameterBlock.status) || "pending";
  const result: CanonicalParameter[] = [];
  const seen = new Set<string>();

  const add = (rawKey: unknown, rawValue: unknown, metadata: AnyObject = {}) => {
    const key = parameterKey(rawKey);
    const value = text(rawValue) || parameterValue(metadata);
    if (!key || !value || seen.has(key)) return;
    seen.add(key);
    result.push({
      key,
      value,
      unit: text(metadata.unit) || null,
      source: parameterSource(key, metadata, sources),
      reviewStatus: parameterReviewStatus(metadata, fallbackReviewStatus),
      category: parameterCategory(key, metadata, categories),
    });
  };

  for (const [key, value] of Object.entries(fields)) add(key, value);
  for (const candidate of arrayOfObjects(parameterBlock.candidates)) {
    add(candidate.canonicalKey || candidate.field || candidate.key, candidate.normalizedDisplayValue || candidate.normalizedValue || candidate.rawValue || candidate.value, candidate);
  }
  for (const manual of arrayOfObjects(parameterBlock.manualParameters || parameterBlock.items)) {
    add(manual.key || manual.labelZh || manual.labelEn, manual.value, manual);
  }
  return result;
}

function normalizeVariant(productLine: string, storedVariant: string): string {
  const value = `${productLine} ${storedVariant}`.toLowerCase();
  if (value.includes("silk") || value.includes("丝绸")) return "Silk";
  if (value.includes("matte") || value.includes("哑光") || /\b(?:pla|petg)[\s-]*m\b/.test(value)) return "Matte";
  if (value.includes("sparkle") || value.includes("闪耀")) return "Sparkle";
  if (value.includes("wood") || value.includes("木质")) return "Wood";
  if (value.includes("glass fiber") || value.includes("玻纤") || /\bgf\b/.test(value)) return "GF";
  if (value.includes("carbon fiber") || value.includes("碳纤") || /\bcf\b/.test(value)) return "CF";
  if (value.includes("high speed") || value.includes("高速") || /\bhf\b/.test(value)) return "High Speed";
  if (value.includes("glow") || value.includes("夜光")) return "Glow";
  return storedVariant || "Basic";
}

function mapColors(data: AnyObject): CanonicalColor[] {
  const colors = Array.isArray(data.canonicalColors) ? data.canonicalColors : data.colors;
  return arrayOfObjects(colors).map((color, index) => {
    const variants = arrayOfObjects(color.colorVariants || color.skuVariants);
    const firstVariant = variants[0] || {};
    return {
      sku: text(color.rawSkuText) || text(firstVariant.rawSkuText) || `color-${index + 1}`,
      officialColorCode: text(color.officialColorCode || color.colorCode) || null,
      nameZh: text(color.nameZh || color.displayNameZh || color.nameEn),
      nameEn: text(color.nameEn) || null,
      imageRef: text(color.publicUrl || color.imageUrl || color.imageCandidateUrl || color.localImagePath || color.imageObjectKey) || null,
      swatchRef: text(color.physicalSwatchUrl || color.physicalColorCardUrl || color.physicalSwatchObjectKey) || null,
    };
  });
}

function mapImages(data: AnyObject): CanonicalImage[] {
  return arrayOfObjects(data.images).flatMap((image) => {
    const ref = text(image.ref || image.publicUrl || image.url || image.imageUrl || image.r2ObjectKey || image.localImagePath || image.imageObjectKey);
    return ref ? [{ ref, role: text(image.role) || null, colorSku: text(image.colorSku || image.sku) || null }] : [];
  });
}

function mapPresetFamilies(data: AnyObject): CanonicalPresetFamily[] {
  const families = arrayOfObjects(data.presetFamilies);
  if (families.length) return families.map((family) => ({
    familyKey: text(family.familyKey) || null,
    readiness: text(family.readiness || family.status) || "UNKNOWN",
    variantReferences: Array.isArray(family.variantReferences) ? family.variantReferences.map(text).filter(Boolean) : [],
  }));
  const presets = arrayOfObjects(data.presets);
  return presets.length ? [{
    familyKey: text(data.presetFamilyKey) || null,
    readiness: presets.every((preset) => text(preset.objectKey || preset.url)) ? "UNKNOWN" : "NO",
    variantReferences: presets.map((preset) => text(preset.id || preset.fileName || preset.name)).filter(Boolean),
  }] : [];
}

export function mapCanonicalFilamentProduct(input: CanonicalMapperInput): CanonicalFilamentProduct {
  const data = objectValue(input.draftData);
  const productLine = objectValue(data.productLine);
  const productLineName = text(input.productLineName) || text(productLine.name) || "";
  const explicitMaterial = text(input.materialType) || text(productLine.materialType);
  const materialType = normalizeMaterialType(inferMaterialTypeFromName(productLineName) || explicitMaterial, productLineName);
  const variant = normalizeVariant(productLineName, text(input.variant) || text(productLine.variant));
  const classification = objectValue(data.classification);
  const surfaceEffect = text(data.surfaceEffect) || text(classification.surfaceEffect) || text(productLine.surfaceEffect) || inferSurfaceFinishFromName(productLineName, variant);
  const parameters = collectParameters(objectValue(data.parameters));
  const brandName = text(input.brandName) || text(objectValue(data.brand).name) || text(objectValue(data.brand).nameZh) || text(input.brandId);

  return {
    identity: {
      brandId: text(input.brandId) || text(objectValue(data.brand).id),
      brandName,
      productLine: productLineName,
      materialType,
      variant,
    },
    classification: { surfaceEffect },
    colors: mapColors(data),
    images: mapImages(data),
    technicalParameters: parameters.filter((parameter) => parameter.category === "material"),
    printParameters: parameters.filter((parameter) => parameter.category === "print"),
    presetFamilies: mapPresetFamilies(data),
    publication: {
      status: text(input.publicationStatus) || "unknown",
      reviewStatus: text(input.reviewStatus) || "unknown",
      publishedAt: text(input.publishedAt) || null,
    },
  };
}

export function toParameterDetailProjection(product: CanonicalFilamentProduct): ParameterDetailProjection {
  return {
    identity: product.identity,
    classification: product.classification,
    colors: product.colors,
    images: product.images,
    technicalParameters: product.technicalParameters,
    printParameters: product.printParameters,
    presetFamilies: product.presetFamilies,
    publication: product.publication,
  };
}
