import type { FilamentDraftRow, JsonValue } from "@/lib/filaments/imports/supabase-import-repository";
import { normalizeParameterFields } from "@/lib/filaments/parameters/normalized-parameters";

export type FilamentAdminPatch = {
  productName?: string;
  productKey?: string;
  brandId?: string;
  materialType?: string;
  series?: string;
  variant?: string;
  taxonomy?: {
    materialId: string;
    subtypeId: string;
    labelZh: string;
    labelEn: string;
    sortOrder: number;
    enabled: boolean;
  };
  netWeightG?: number | null;
  netWeightOptionsG?: number[];
  filamentDiameterMm?: number | null;
  colors?: Array<Record<string, unknown>>;
  parameters?: Record<string, unknown>;
  parameterUpdates?: Record<string, unknown>;
  clearParameterKeys?: string[];
  images?: Array<Record<string, unknown>>;
  spoolAndPackaging?: Record<string, unknown> | null;
  compatibility?: Record<string, unknown> | null;
  notes?: string;
  evidence?: Array<Record<string, unknown>>;
  reviewStatus?: string;
  publicationStatus?: string;
  enabled?: boolean;
  brandDefaults?: Record<string, unknown> | null;
  productOverrides?: Record<string, unknown> | null;
};

const REVIEW_STATUSES = new Set(["pending_review", "approved", "rejected"]);
const PUBLICATION_STATUSES = new Set(["draft", "published", "hidden", "archived"]);

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayOfObjects(value: unknown, field: string): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`invalid_${field}`);
  }
  return value as Array<Record<string, unknown>>;
}

function cleanText(value: unknown, field: string) {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  return value.trim();
}

function requiredText(value: unknown, field: string) {
  const result = cleanText(value, field);
  if (!result) throw new Error(`invalid_${field}`);
  return result;
}

function positiveNumberOrNull(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`invalid_${field}`);
  return value;
}

function productKeyFromData(data: Record<string, unknown>, fallback: string) {
  const productLine = objectValue(data.productLine);
  return String(data.productKey || productLine.productKey || productLine.productLineId || fallback);
}

export function summarizeFilamentDraft(row: FilamentDraftRow) {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(data.parameters);
  const fields = objectValue(parameters.fields);
  const colors = Array.isArray(data.colors) ? data.colors : [];
  const images = Array.isArray(data.images) ? data.images : [];
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    productKey: productKeyFromData(data, row.draft_key),
    productName: row.product_line_name || String(productLine.name || ""),
    brandId: row.brand_id,
    materialType: row.material_type || String(productLine.materialType || ""),
    variant: row.variant || String(productLine.variant || ""),
    reviewStatus: row.review_status,
    publicationStatus: row.publication_status,
    status: row.status,
    enabled: data.enabled !== false && String(data.enabled).toLowerCase() !== "false",
    colorCount: colors.length,
    parameterCount: Object.keys(fields).length,
    imageCount: images.length,
    updatedAt: row.updated_at,
  };
}

export function applyFilamentAdminPatch(row: FilamentDraftRow, patch: FilamentAdminPatch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("invalid_patch");
  const allowed = new Set([
    "productName", "productKey", "brandId", "materialType", "series", "variant", "taxonomy",
    "netWeightG", "netWeightOptionsG", "filamentDiameterMm", "colors", "parameters",
    "parameterUpdates", "clearParameterKeys", "images", "spoolAndPackaging", "compatibility", "notes", "evidence", "reviewStatus",
    "publicationStatus", "enabled", "brandDefaults", "productOverrides",
  ]);
  if (Object.keys(patch).some((key) => !allowed.has(key))) throw new Error("unsupported_patch_field");

  const current = objectValue(row.draft_data);
  const currentProductLine = objectValue(current.productLine);
  const currentParameters = objectValue(current.parameters);
  const next: Record<string, unknown> = { ...current };
  const productLine = { ...currentProductLine };

  if (patch.productName !== undefined) productLine.name = requiredText(patch.productName, "product_name");
  if (patch.productKey !== undefined) {
    const key = requiredText(patch.productKey, "product_key").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) throw new Error("invalid_product_key");
    next.productKey = key;
    productLine.productKey = key;
    productLine.productLineId = key;
  }
  if (patch.brandId !== undefined) {
    const brandId = requiredText(patch.brandId, "brand_id").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(brandId)) throw new Error("invalid_brand_id");
    next.brand = { ...objectValue(next.brand), id: brandId, brandId };
  }
  if (patch.materialType !== undefined) productLine.materialType = requiredText(patch.materialType, "material_type").toUpperCase();
  if (patch.series !== undefined) productLine.series = cleanText(patch.series, "series");
  if (patch.variant !== undefined) productLine.variant = cleanText(patch.variant, "variant");
  if (patch.taxonomy !== undefined) {
    const taxonomy = patch.taxonomy;
    if (!taxonomy || typeof taxonomy !== "object" || Array.isArray(taxonomy)) throw new Error("invalid_taxonomy");
    const materialId = requiredText(taxonomy.materialId, "taxonomy_material_id");
    const subtypeId = requiredText(taxonomy.subtypeId, "taxonomy_subtype_id");
    const labelZh = requiredText(taxonomy.labelZh, "taxonomy_label_zh");
    const labelEn = requiredText(taxonomy.labelEn, "taxonomy_label_en");
    if (typeof taxonomy.sortOrder !== "number" || !Number.isFinite(taxonomy.sortOrder)) throw new Error("invalid_taxonomy_sort_order");
    productLine.taxonomy = { materialId, subtypeId, labelZh, labelEn, sortOrder: taxonomy.sortOrder, enabled: taxonomy.enabled !== false };
  }
  if (patch.netWeightG !== undefined) productLine.netWeightG = positiveNumberOrNull(patch.netWeightG, "net_weight");
  if (patch.filamentDiameterMm !== undefined) productLine.diameterMm = positiveNumberOrNull(patch.filamentDiameterMm, "diameter");
  if (patch.netWeightOptionsG !== undefined) {
    if (!Array.isArray(patch.netWeightOptionsG) || patch.netWeightOptionsG.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error("invalid_net_weight_options");
    }
    productLine.netWeightOptionsG = [...new Set(patch.netWeightOptionsG)].sort((a, b) => a - b);
  }
  next.productLine = productLine;

  if (patch.colors !== undefined) next.colors = arrayOfObjects(patch.colors, "colors");
  if (patch.images !== undefined) next.images = arrayOfObjects(patch.images, "images");
  if (patch.evidence !== undefined) next.evidence = arrayOfObjects(patch.evidence, "evidence");
  if (patch.parameters !== undefined) {
    const normalized = normalizeParameterFields(patch.parameters);
    if (Object.keys(normalized.unmappedFields).length) throw new Error("unknown_parameter_key");
    next.parameters = { ...currentParameters, fields: normalized.fields };
  }
  if (patch.parameterUpdates !== undefined || patch.clearParameterKeys !== undefined) {
    const existingFields = objectValue(objectValue(next.parameters).fields);
    const updates = patch.parameterUpdates ?? {};
    const normalized = normalizeParameterFields(updates);
    if (Object.keys(normalized.unmappedFields).length) throw new Error("unknown_parameter_key");
    const fields: Record<string, unknown> = { ...existingFields, ...normalized.fields };
    if (patch.clearParameterKeys !== undefined) {
      if (!Array.isArray(patch.clearParameterKeys) || patch.clearParameterKeys.some((key) => typeof key !== "string")) {
        throw new Error("invalid_clear_parameter_keys");
      }
      const clearProbe = normalizeParameterFields(Object.fromEntries(patch.clearParameterKeys.map((key) => [key, "__clear__"])));
      if (Object.keys(clearProbe.unmappedFields).length) throw new Error("unknown_parameter_key");
      for (const key of Object.keys(clearProbe.fields)) delete fields[key];
    }
    next.parameters = { ...currentParameters, ...objectValue(next.parameters), fields };
  }
  if (patch.spoolAndPackaging !== undefined) {
    if (patch.spoolAndPackaging !== null && (typeof patch.spoolAndPackaging !== "object" || Array.isArray(patch.spoolAndPackaging))) throw new Error("invalid_spool_and_packaging");
    next.spoolAndPackaging = patch.spoolAndPackaging;
  }
  if (patch.compatibility !== undefined) {
    if (patch.compatibility !== null && (typeof patch.compatibility !== "object" || Array.isArray(patch.compatibility))) throw new Error("invalid_compatibility");
    next.compatibility = patch.compatibility;
  }
  if (patch.notes !== undefined) next.notes = cleanText(patch.notes, "notes");
  if (patch.enabled !== undefined) next.enabled = Boolean(patch.enabled);
  if (patch.brandDefaults !== undefined) {
    if (patch.brandDefaults !== null && (typeof patch.brandDefaults !== "object" || Array.isArray(patch.brandDefaults))) throw new Error("invalid_brand_defaults");
    next.brandDefaults = patch.brandDefaults;
  }
  if (patch.productOverrides !== undefined) {
    if (patch.productOverrides !== null && (typeof patch.productOverrides !== "object" || Array.isArray(patch.productOverrides))) throw new Error("invalid_product_overrides");
    next.productOverrides = patch.productOverrides;
  }

  const reviewStatus = patch.reviewStatus ?? row.review_status;
  const publicationStatus = patch.publicationStatus ?? row.publication_status;
  if (!REVIEW_STATUSES.has(reviewStatus)) throw new Error("invalid_review_status");
  if (!PUBLICATION_STATUSES.has(publicationStatus)) throw new Error("invalid_publication_status");
  const status = publicationStatus === "published" ? "published" : publicationStatus === "archived" ? "archived" : "draft";

  return {
    draftData: next as JsonValue,
    brandId: patch.brandId?.trim().toLowerCase() || row.brand_id,
    productLineName: String(productLine.name || row.product_line_name || "") || null,
    materialType: String(productLine.materialType || row.material_type || "") || null,
    variant: String(productLine.variant || row.variant || "") || null,
    reviewStatus,
    publicationStatus,
    status,
  };
}
