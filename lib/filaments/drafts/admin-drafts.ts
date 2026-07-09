import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import { updateSupabaseFilamentDraftRow } from "./supabase-draft-repository";

export type ColorDisplayStatus = "pending" | "approved" | "hidden";
export type ImageDisplayStatus = "pending" | "approved" | "hidden" | "no_image";
export type ParameterReviewStatus = "missing" | "official" | "official_partial" | "inherited_unverified";

export type AdminFilamentDraft = {
  sourceRunId: string;
  importId: string;
  brand: { name: string; nameZh?: string };
  productLine: { name: string; materialType?: string; variant?: string };
  colors: Array<{
    domIndex: number;
    rawSkuText: string;
    officialColorCode?: string;
    nameZh: string;
    nameEn?: string;
    hexColor?: string;
    displayStatus: ColorDisplayStatus;
    imageDisplayStatus: ImageDisplayStatus;
    imageReviewNote: string;
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
    reviewedAt?: string;
    reviewedBy?: string;
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
};

function readAdminFilamentDraft(sourceRow: NonNullable<Awaited<ReturnType<typeof getFilamentDraftBySourceRunId>>>): AdminFilamentDraft {
  const data = (sourceRow.draft_data ?? {}) as Record<string, unknown>;
  return {
    sourceRunId: sourceRow.source_run_id,
    importId: sourceRow.import_id,
    brand: (data.brand as AdminFilamentDraft["brand"]) || { name: String(sourceRow.brand_id) },
    productLine: {
      name: String(sourceRow.product_line_name || (data.productLine as Record<string, unknown> | null)?.name || ""),
      materialType: String(sourceRow.material_type || (data.productLine as Record<string, unknown> | null)?.materialType || ""),
      variant: String(sourceRow.variant || (data.productLine as Record<string, unknown> | null)?.variant || ""),
    },
    colors: (data.colors as AdminFilamentDraft["colors"]) || [],
    parameters: (data.parameters as AdminFilamentDraft["parameters"]) || {
      status: "missing",
      sourceType: "missing",
      fields: {},
      sourceEvidence: [],
      reviewNote: "",
    },
    importStatus: sourceRow.status,
    reviewStatus: sourceRow.review_status,
    publicationStatus: sourceRow.publication_status,
    canonicalColorCount: data.canonicalColorCount as number | undefined,
    mergedVariantCount: data.mergedVariantCount as number | undefined,
    rawSkuCount: data.rawSkuCount as number | undefined,
    createdAt: sourceRow.created_at,
    updatedAt: sourceRow.updated_at,
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

  await updateSupabaseFilamentDraftRow({
    sourceRunId,
    draftData: nextDraft,
    status: nextDraft.importStatus,
    reviewStatus: nextDraft.reviewStatus,
    publicationStatus: nextDraft.publicationStatus,
    productLineName: nextDraft.productLine.name || null,
    materialType: nextDraft.productLine.materialType || null,
    variant: nextDraft.productLine.variant || null,
    updatedBy: nextDraft.updatedBy || "system",
  });

  return nextDraft;
}
