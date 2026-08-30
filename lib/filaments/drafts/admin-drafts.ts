import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import { updateSupabaseFilamentDraftRow } from "./supabase-draft-repository";
import { getParameterCategory, type ParameterCategory } from "@/lib/filaments/parameters/parameter-category";
import { getParameterByProductLine } from "@/lib/filaments/parameters/catalog";
import kexcelledProductLines from "@/data/filaments/product-lines/kexcelled.json";
import { mapCanonicalFilamentProduct, type CanonicalFilamentProduct } from "@/lib/filaments/catalog/canonical-mapper";

export type ColorDisplayStatus = "pending" | "approved" | "hidden";
export type ImageDisplayStatus = "pending" | "approved" | "hidden" | "no_image";
export type ParameterReviewStatus = "missing" | "official" | "official_partial" | "inherited_unverified";

export type AdminFilamentDraft = {
  sourceRunId: string;
  importId: string;
  brand: { id?: string; name: string; nameZh?: string; nameEn?: string };
  productLine: {
    name: string;
    materialType?: string;
    variant?: string;
    diameterMm?: number | null;
    netWeightG?: number | null;
    description?: string;
  };
  colors: Array<{
    domIndex: number;
    rawSkuText?: string;
    officialColorCode?: string;
    nameZh: string;
    nameEn?: string;
    hexColor?: string;
    availability?: string;
    displayStatus: ColorDisplayStatus;
    imageDisplayStatus: ImageDisplayStatus;
    imageReviewNote: string;
    imageSelectionReason?: string;
    localImagePath?: string;
    colorVariants?: Array<Record<string, unknown>>;
  }>;
  parameters: {
    status: ParameterReviewStatus;
    sourceType: string;
    sourceTemplateId?: string;
    sourceTemplateLabel?: string;
    fields: Record<string, unknown>;
    sourceEvidence: Array<Record<string, unknown>>;
    reviewNote: string;
    parameterTemplateId?: string;
    parameterAppliedAt?: string;
    parameterAppliedBy?: string;
    parameterLocked?: boolean;
    parameterCategories?: Record<string, ParameterCategory>;
    parameterSources?: Record<string, "official" | "user" | "site">;
    reviewedAt?: string;
    reviewedBy?: string;
    manualParameters?: Array<{
      id: string;
      key?: string;
      labelZh: string;
      labelEn: string;
      value: string;
      unit: string;
      sourceStatus: "official" | "site" | "user" | "manual" | "missing";
      sourceNote: string;
      category: ParameterCategory;
      locked?: boolean;
    }>;
  };
  importStatus: string;
  reviewStatus: string;
  publicationStatus: string;
  canonicalColorCount?: number;
  mergedVariantCount?: number;
  rawSkuCount?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  canonical: CanonicalFilamentProduct;
};

function compact(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function curatedPrintParameters(productLineName: string) {
  const normalized = compact(productLineName);
  const line = (kexcelledProductLines.productLines as Array<{ id: string; productLine: string }>).find(
    (item) => compact(item.productLine) === normalized,
  );
  const record = line ? getParameterByProductLine(line.id) : null;
  if (!record) return null;

  const fields: Record<string, string> = {};
  const add = (key: string, value: string | null | undefined) => {
    if (value) fields[key] = value;
  };
  add("nozzleTemperature", record.nozzleTemperature.recommended?.raw);
  add("bedTemperature", record.bedTemperature.recommended?.raw);
  add("recommendedPrintSpeed", record.recommendedPrintSpeed?.raw);
  add("coolingFan", record.coolingFan?.raw);
  if (!Object.keys(fields).length) return null;

  return {
    fields,
    categories: Object.fromEntries(Object.keys(fields).map((key) => [key, getParameterCategory(key)])),
    sources: Object.fromEntries(Object.keys(fields).map((key) => [key, "official"])) as Record<string, "official" | "user" | "site">,
  } as const;
}

export function readAdminFilamentDraft(sourceRow: NonNullable<Awaited<ReturnType<typeof getFilamentDraftBySourceRunId>>>): AdminFilamentDraft {
  const data = (sourceRow.draft_data ?? {}) as Record<string, unknown>;
  const sourceProductLine = (data.productLine as Record<string, unknown> | null) || {};
  const rawParameters = (data.parameters as AdminFilamentDraft["parameters"] | null) || null;
  const curated = curatedPrintParameters(String(sourceRow.product_line_name || sourceProductLine.name || ""));
  const fields = { ...(curated?.fields || {}), ...(rawParameters?.fields || {}) };
  const parameterCategories = { ...(curated?.categories || {}), ...(rawParameters?.parameterCategories || {}) };
  const parameterSources: Record<string, "official" | "user" | "site"> = {
    ...(curated?.sources || {}),
    ...(rawParameters?.parameterSources || {}),
  };
  const parameters: AdminFilamentDraft["parameters"] = rawParameters
    ? {
        ...rawParameters,
        fields,
        parameterCategories,
        parameterSources,
        status: rawParameters.status === "missing" && curated ? "official_partial" : rawParameters.status,
      }
    : {
        status: (curated ? "official_partial" : "missing") as ParameterReviewStatus,
        sourceType: curated ? "official_product_page" : "missing",
        fields,
        sourceEvidence: [],
        reviewNote: curated ? "已补充本地核验的官方打印参数，保存后写入草稿。" : "",
        parameterCategories,
        parameterSources,
      };
  const canonical = mapCanonicalFilamentProduct({
    brandId: sourceRow.brand_id,
    brandName: String((data.brand as Record<string, unknown> | undefined)?.name || sourceRow.brand_id),
    productLineName: sourceRow.product_line_name || sourceProductLine.name,
    materialType: sourceRow.material_type || sourceProductLine.materialType,
    variant: sourceRow.variant || sourceProductLine.variant,
    reviewStatus: sourceRow.review_status,
    publicationStatus: sourceRow.publication_status,
    draftData: data,
  });
  return {
    sourceRunId: sourceRow.source_run_id,
    importId: sourceRow.import_id,
    brand: (data.brand as AdminFilamentDraft["brand"]) || { id: String(sourceRow.brand_id), name: String(sourceRow.brand_id) },
    productLine: {
      ...sourceProductLine,
      name: String(sourceRow.product_line_name || sourceProductLine.name || ""),
      materialType: String(sourceRow.material_type || sourceProductLine.materialType || ""),
      variant: String(sourceRow.variant || sourceProductLine.variant || ""),
    },
    colors: (data.canonicalColors as AdminFilamentDraft["colors"]) || (data.colors as AdminFilamentDraft["colors"]) || [],
    parameters,
    importStatus: sourceRow.status,
    reviewStatus: sourceRow.review_status,
    publicationStatus: sourceRow.publication_status,
    canonicalColorCount: data.canonicalColorCount as number | undefined,
    mergedVariantCount: data.mergedVariantCount as number | undefined,
    rawSkuCount: data.rawSkuCount as number | undefined,
    createdAt: sourceRow.created_at,
    updatedAt: sourceRow.updated_at,
    canonical,
  };
}

export async function updateAdminFilamentDraft(
  sourceRunId: string,
  updater: (draft: AdminFilamentDraft) => AdminFilamentDraft,
) {
  const sourceRow = await getFilamentDraftBySourceRunId(sourceRunId);
  if (!sourceRow) return null;

  const draft = readAdminFilamentDraft(sourceRow);
  const nextDraft = updater(draft);
  const originalData = (sourceRow.draft_data ?? {}) as Record<string, unknown>;
  const nextDraftData = {
    ...originalData,
    ...nextDraft,
    brand: nextDraft.brand,
    productLine: nextDraft.productLine,
    colors: nextDraft.colors,
    canonicalColors: nextDraft.colors,
    parameters: nextDraft.parameters,
  };
  const canonical = mapCanonicalFilamentProduct({
    brandId: nextDraft.brand.id || nextDraft.brand.name,
    brandName: nextDraft.brand.name,
    productLineName: nextDraft.productLine.name,
    materialType: nextDraft.productLine.materialType,
    variant: nextDraft.productLine.variant,
    reviewStatus: nextDraft.reviewStatus,
    publicationStatus: nextDraft.publicationStatus,
    draftData: nextDraftData,
  });

  await updateSupabaseFilamentDraftRow({
    sourceRunId,
    draftData: nextDraftData,
    status: nextDraft.importStatus,
    reviewStatus: nextDraft.reviewStatus,
    publicationStatus: nextDraft.publicationStatus,
    brandId: nextDraft.brand.id || nextDraft.brand.name,
    productLineName: nextDraft.productLine.name || null,
    materialType: nextDraft.productLine.materialType || null,
    variant: nextDraft.productLine.variant || null,
    updatedBy: nextDraft.updatedBy || "system",
  });

  return { ...nextDraft, canonical };
}
