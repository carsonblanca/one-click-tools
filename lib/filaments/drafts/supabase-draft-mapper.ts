import type {
  AdminFilamentDraft,
  PublicationStatus,
  ReviewedDraftColor,
  ReviewedParameters,
} from "./admin-drafts";
import type { SupabaseFilamentDraftRow } from "./supabase-draft-repository";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstCandidateValue(value: unknown, key: string) {
  for (const item of arrayValue(value)) {
    const result = stringValue(objectValue(item)[key]).trim();
    if (result) return result;
  }
  return "";
}

function reviewedColor(value: unknown, index: number): ReviewedDraftColor | null {
  const color = objectValue(value);
  const nameZh = stringValue(color.nameZh).trim();
  const officialColorCode = stringValue(color.officialColorCode).trim();
  const rawSkuText = stringValue(color.rawSkuText).trim();
  if (!nameZh && !officialColorCode && !rawSkuText) return null;
  const imageCandidateUrl = stringValue(color.imageCandidateUrl);
  const localImagePath = stringValue(color.localImagePath);
  const hasImage = Boolean(imageCandidateUrl || localImagePath);
  return {
    ...color,
    domIndex: numberValue(color.domIndex) ?? index,
    rawSkuText,
    officialColorCode,
    nameZh,
    nameEn: stringValue(color.nameEn),
    availability: color.availability === "available" || color.availability === "disabled"
      ? color.availability
      : "unknown",
    imageCandidateUrl,
    localImagePath,
    imageSourceMethod: stringValue(color.imageSourceMethod),
    imageQualityRole: color.imageQualityRole === "sku_thumbnail"
      || color.imageQualityRole === "sku_image"
      || color.imageQualityRole === "variant_image_candidate"
      ? color.imageQualityRole
      : "unknown",
    isSharedImageCandidate: Boolean(color.isSharedImageCandidate),
    requiresManualReview: color.requiresManualReview !== false,
    reviewStatus: stringValue(color.reviewStatus) || "pending_review",
    sourceEvidence: arrayValue(color.sourceEvidence) as Array<Record<string, unknown>>,
    notes: arrayValue(color.notes).filter((note): note is string => typeof note === "string"),
    representativeImageCandidateUrl: stringValue(color.representativeImageCandidateUrl)
      || imageCandidateUrl
      || localImagePath,
    colorVariants: arrayValue(color.colorVariants) as ReviewedDraftColor["colorVariants"],
    rawSkuCount: numberValue(color.rawSkuCount) ?? 1,
    displayStatus: color.displayStatus === "approved" || color.displayStatus === "hidden"
      ? color.displayStatus
      : "pending",
    imageDisplayStatus: color.imageDisplayStatus === "approved"
      || color.imageDisplayStatus === "hidden"
      || color.imageDisplayStatus === "no_image"
      ? color.imageDisplayStatus
      : hasImage ? "pending" : "no_image",
    imageReviewNote: stringValue(color.imageReviewNote),
    reviewedAt: stringValue(color.reviewedAt),
    reviewedBy: stringValue(color.reviewedBy) || "system",
  } as ReviewedDraftColor;
}

function mapColors(data: Record<string, unknown>) {
  const canonical = arrayValue(data.canonicalColors);
  const rawColors = canonical.length ? canonical : arrayValue(data.colors);
  const structured = rawColors
    .map(reviewedColor)
    .filter((color): color is ReviewedDraftColor => color !== null);
  if (structured.length) return structured;

  const colors: ReviewedDraftColor[] = [];
  for (const candidateValue of rawColors) {
    for (const parsedItem of arrayValue(objectValue(candidateValue).parsedItems)) {
      const nameZh = stringValue(parsedItem).trim();
      const color = reviewedColor({
        nameZh,
        rawSkuText: nameZh,
        availability: "unknown",
      }, colors.length);
      if (color) colors.push(color);
    }
  }
  return colors;
}

function mapParameters(data: Record<string, unknown>): ReviewedParameters {
  const rawParameters = objectValue(data.parameters);
  const fields = { ...objectValue(rawParameters.fields) };
  if (Object.keys(fields).length === 0) {
    for (const candidateValue of arrayValue(data.parameters)) {
      const candidate = objectValue(candidateValue);
      const field = stringValue(candidate.field).trim();
      const rawValue = stringValue(candidate.rawValue).trim();
      if (field && rawValue) fields[field] = rawValue;
    }
  }
  const hasFields = Object.keys(fields).length > 0;
  return {
    status: hasFields ? "official_partial" : "missing",
    sourceType: hasFields ? "official_partial" : "missing",
    fields,
    sourceEvidence: [],
    parameterTemplateId: "",
    parameterAppliedAt: "",
    parameterAppliedBy: "",
    parameterLocked: false,
    reviewedAt: "",
    reviewedBy: "",
    reviewNote: "",
  };
}

function mapRow(row: SupabaseFilamentDraftRow): AdminFilamentDraft {
  const data = objectValue(row.draft_data);
  const source = objectValue(data.source);
  const brand = objectValue(data.brand);
  const productLine = objectValue(data.productLine);
  const colors = mapColors(data);
  const parameters = mapParameters(data);
  const productLineName = row.product_line_name
    || stringValue(productLine.name).trim()
    || firstCandidateValue(data.productLineCandidates, "productLine");
  const materialType = row.material_type
    || stringValue(productLine.materialType).trim()
    || firstCandidateValue(data.materialCandidates, "materialType");
  const publicationStatus = [
    "draft",
    "pending_review",
    "directory_preview",
    "complete_profile",
    "archived",
  ].includes(row.publication_status)
    ? row.publication_status as PublicationStatus
    : "draft";

  return {
    id: row.id,
    sourceRunId: row.product_index === 0 ? row.source_run_id : row.draft_key,
    sourceZipName: stringValue(source.zipFilename),
    sourceEvidencePath: `supabase:filament_drafts/${row.id}`,
    sourceEvidenceStatus: "available",
    sourceEvidenceMissingReason: "",
    status: "draft",
    importStatus: row.status === "failed" ? "failed" : "imported_draft",
    reviewStatus: row.review_status === "approved" || row.review_status === "published"
      ? row.review_status
      : "pending_review",
    isPublished: publicationStatus === "complete_profile",
    brand: {
      name: stringValue(brand.name).trim() || row.brand_id.toUpperCase(),
      nameZh: stringValue(brand.nameZh),
      sourceType: "supabase_import",
      sourceUrl: "",
      reviewStatus: row.review_status,
    },
    productLine: {
      name: productLineName,
      materialType,
      diameterMm: numberValue(productLine.diameterMm),
      netWeightG: numberValue(productLine.netWeightG),
      variant: row.variant || stringValue(productLine.variant),
      sourceEvidence: [],
      reviewStatus: row.review_status,
    },
    colors,
    canonicalColors: colors,
    rawSkuCount: colors.reduce((count, color) => count + color.rawSkuCount, 0),
    canonicalColorCount: colors.length,
    mergedVariantCount: Math.max(
      0,
      colors.reduce((count, color) => count + color.rawSkuCount, 0) - colors.length,
    ),
    parameters,
    parameterStatus: parameters.status,
    parameterEvidenceCandidates: [],
    parameterExtractionSummary: {
      candidateCount: 0,
      exactCandidateCount: 0,
      conflictCount: 0,
      unresolvedCount: 0,
      lastExtractedAt: "",
    },
    productLineParameters: [],
    productLineParametersUpdatedAt: "",
    publicationStatus,
    publishedAt: "",
    publishedBy: "",
    publicationNote: "",
    importedAt: row.created_at,
    createdAt: row.created_at,
    completedAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function mapSupabaseDraftRows(rows: SupabaseFilamentDraftRow[]) {
  const uniqueRows = new Map<string, SupabaseFilamentDraftRow>();
  for (const row of rows) {
    const key = `${row.import_id}:${row.product_index}`;
    if (!uniqueRows.has(key)) uniqueRows.set(key, row);
  }
  return Array.from(uniqueRows.values()).map(mapRow);
}

export async function resolveAdminDraftSource(
  rows: SupabaseFilamentDraftRow[],
  localFallback: () => Promise<AdminFilamentDraft[]>,
) {
  if (rows.length > 0) return mapSupabaseDraftRows(rows);
  return localFallback();
}
