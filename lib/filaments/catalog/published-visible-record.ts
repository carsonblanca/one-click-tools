import "server-only";

import { getCatalogRecord } from "./catalog-view-model";
import type { CatalogRecord } from "./mock-catalog-ext";
import { listPublishedFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import {
  visiblePublishedParameterFields,
} from "@/lib/filaments/parameters/normalized-parameters";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function publishedIdentity(row: Awaited<ReturnType<typeof listPublishedFilamentDrafts>>[number]) {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  const colors = arrayValue(data.canonicalColors).length
    ? arrayValue(data.canonicalColors)
    : arrayValue(data.colors);
  return {
    data,
    productLine,
    colors,
    productLineId: text(productLine.productLineId),
    productLineName: row.product_line_name || text(productLine.name) || text(productLine.productLineName),
  };
}

function publishedMatchesStatic(
  identity: ReturnType<typeof publishedIdentity>,
  record: CatalogRecord,
) {
  if (identity.productLineId && record.productLineId) {
    return identity.productLineId === record.productLineId;
  }
  return identity.productLineName === record.productLine;
}

function colorRecordId(color: Record<string, unknown>, productLineId: string) {
  return text(color.id)
    || text(color.colorId)
    || `${productLineId}-${text(color.officialColorCode).toLowerCase()}`.replace(/-+$/, "");
}

function buildPublishedRecord(
  row: Awaited<ReturnType<typeof listPublishedFilamentDrafts>>[number],
  filamentId: string,
): CatalogRecord | null {
  const identity = publishedIdentity(row);
  if (!identity.productLineId) return null;
  const selectedColor = identity.colors.find((color) => colorRecordId(color, identity.productLineId) === filamentId)
    || (filamentId === identity.productLineId ? identity.colors[0] : null);
  if (!selectedColor) return null;
  const normalizedParameters = visiblePublishedParameterFields(identity.data, row.publication_status);
  const hex = text(selectedColor.hexColor) || text(selectedColor.hex) || null;
  return {
    id: filamentId,
    brand: text(objectValue(identity.data.brand).name) || row.brand_id.toUpperCase(),
    brandZh: text(objectValue(identity.data.brand).nameZh) || text(objectValue(identity.data.brand).name) || row.brand_id.toUpperCase(),
    materialType: row.material_type || text(identity.productLine.materialType),
    materialTypeZh: row.material_type || text(identity.productLine.materialType),
    variant: row.variant || text(identity.productLine.variant) || "Standard",
    variantZh: row.variant || text(identity.productLine.variant) || "标准",
    productLine: identity.productLineName,
    productLineId: identity.productLineId,
    parameterStatus: Object.keys(normalizedParameters).length ? "partial" : "missing",
    normalizedParameters,
    catalogSource: "published",
    color: {
      colorNameZh: text(selectedColor.nameZh) || text(selectedColor.colorNameZh) || text(selectedColor.officialColorCode) || "颜色待补充",
      colorNameEn: text(selectedColor.nameEn) || text(selectedColor.colorNameEn) || text(selectedColor.nameZh) || "Color pending",
      colorFamily: "gray",
      hex,
      rgb: null,
      finish: "semi-glossy",
      transparency: "opaque",
      hasDigitalSwatch: Boolean(hex),
      hasPhysicalSwatch: false,
      physicalSwatchCount: 0,
      digitalSwatch: hex ? {
        hex,
        rgb: null,
        officialColorCode: text(selectedColor.officialColorCode),
        sourceType: "uploader",
        lastVerifiedAt: row.updated_at,
      } : null,
      physicalSwatches: [],
    },
    spool: {
      netFilamentWeight: Number(identity.productLine.netWeightG) || 0,
      emptySpoolWeight: null,
      fullSpoolWeight: null,
      spoolOuterDiameter: null,
      spoolWidth: null,
      hubDiameter: null,
      spoolMaterial: null,
      refillable: false,
      cardboardSpool: false,
      amsFit: "conditional",
      adapterRequired: false,
      spoolImagePlaceholder: null,
    },
    rating: 0,
    reviewCount: 0,
    createdAt: row.created_at,
  };
}

export async function getVisibleCatalogRecord(filamentId: string): Promise<CatalogRecord | null> {
  const staticRecord = getCatalogRecord(filamentId) || null;
  let published: Awaited<ReturnType<typeof listPublishedFilamentDrafts>> = [];
  try {
    published = await listPublishedFilamentDrafts();
  } catch {
    return staticRecord ? { ...staticRecord, catalogSource: "static" } : null;
  }

  if (staticRecord) {
    const publishedRow = published.find((row) => publishedMatchesStatic(publishedIdentity(row), staticRecord));
    if (!publishedRow) return { ...staticRecord, catalogSource: "static" };
    const parameters = visiblePublishedParameterFields(
      publishedIdentity(publishedRow).data,
      publishedRow.publication_status,
    );
    return {
      ...staticRecord,
      normalizedParameters: parameters,
      parameterStatus: Object.keys(parameters).length ? "partial" : "missing",
      catalogSource: "published",
    };
  }

  for (const row of published) {
    const record = buildPublishedRecord(row, filamentId);
    if (record) return record;
  }
  return null;
}
