import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  listSupabaseFilamentDraftRows,
  updateSupabaseFilamentDraftRow,
} from "@/lib/filaments/drafts/supabase-draft-repository";
import {
  resolveAdminDraftSource,
} from "@/lib/filaments/drafts/supabase-draft-mapper";

// ── Self-contained type stubs (removes kexcelled-draft-store dependency) ──
type ScalarColorFields = {
  domIndex?: number; rawSkuText?: string;
  officialColorCode?: string | null; variantCode?: string | null;
  nameZh?: string | null; nameEn?: string | null;
  availability?: string;
  imageCandidateUrl?: string | null; localImagePath?: string | null;
  imageSourceMethod?: string; imageQualityRole?: string;
  isSharedImageCandidate?: boolean; requiresManualReview?: boolean;
  reviewStatus?: string;
  sourceEvidence?: Array<Record<string, unknown>>; notes?: string[];
  evidenceAssetId?: string; evidenceType?: string;
  rawSkuIds?: string[]; packageSkuIds?: string[];
  imageCandidates?: string[]; primaryImage?: string | null;
  imageSelectionReason?: string;
  cropAssetId?: string; cropRelativePath?: string;
  cropRect?: [number, number, number, number]; cropConfidence?: number;
  pantoneCode?: string; officialReferenceText?: string;
  officialHexReference?: string; officialRgbReference?: string;
  rawSkuCount?: number;
};

export type CanonicalKexcelledDraftColor = ScalarColorFields & {
  colorVariants?: Array<{
    rawSkuText?: string; packageVariant?: string; availability?: string;
    variantCode?: string;
    imageCandidates?: Array<{
      sourceUrl?: string; localPath?: string; packageVariant?: string;
      variantCode?: string; sourceType?: string; isSharedImageCandidate?: boolean;
    }>;
    selectedImage?: string; sourceEvidenceRef?: string;
    sourceEvidence?: Array<Record<string, unknown>>;
  }>;
  representativeImageCandidateUrl?: string;
};

export type KexcelledDraftColor = ScalarColorFields;

export type KexcelledEvidenceDraft = {
  brand: { name: string; nameZh: string; sourceType: string; sourceUrl: string; reviewStatus: string };
  productLine: {
    name: string; materialType: string; diameterMm: number | null; netWeightG: number | null;
    variant?: string; notes?: string[]; sourceEvidence: Array<Record<string, unknown>>; reviewStatus: string;
  };
  colors: ScalarColorFields[];
  parameters: { status: string; sourceType: string; fields: Record<string, unknown> };
  importMeta: {
    schemaVersion: string; createdAt: string; sourceZipName: string; sourceZipPath: string;
    pageTitle: string; primaryInput: string; variantFallbackInput: string;
    compatibilityInput: string; compatibilityNote: string; requiresManualReview: boolean;
  };
};

export type ImportedFilamentDraft = {
  id: string; sourceRunId: string; sourceZipName: string; sourceEvidencePath: string;
  sourceEvidenceStatus?: string; sourceEvidenceMissingReason?: string;
  status: "draft"; importStatus: string; reviewStatus: string; isPublished: boolean;
  brand: KexcelledEvidenceDraft["brand"]; productLine: KexcelledEvidenceDraft["productLine"];
  colors: CanonicalKexcelledDraftColor[];
  canonicalColors?: CanonicalKexcelledDraftColor[];
  rawSkuCount: number; canonicalColorCount: number; mergedVariantCount: number;
  parameters: KexcelledEvidenceDraft["parameters"]; parameterStatus: string;
  productLineParameters?: ProductLineParameterDisplay[]; productLineParametersUpdatedAt?: string;
  parameterEvidenceCandidates?: ParameterEvidenceCandidate[];
  unmatchedSkuCandidates?: Array<Record<string, unknown>>;
  kexcelledEvidenceClassifications?: Array<Record<string, unknown>>;
  kexcelledParameterGroups?: Record<string, Array<Record<string, unknown>>>;
  officialColorCardAssets?: Array<Record<string, unknown>>;
  importedAt: string;
};

function colorsToCanonical(colors: Array<KexcelledDraftColor | CanonicalKexcelledDraftColor | ReviewedDraftColor>): CanonicalKexcelledDraftColor[] {
  return colors.map((c) => ({
    ...c,
    colorVariants: (c as CanonicalKexcelledDraftColor).colorVariants || [],
    rawSkuCount: (c as CanonicalKexcelledDraftColor).rawSkuCount || 1,
    availability: c.availability || "unknown",
  })) as CanonicalKexcelledDraftColor[];
}

export type ColorDisplayStatus = "pending" | "approved" | "hidden";
export type ImageDisplayStatus = "pending" | "approved" | "hidden" | "no_image";
export type ParameterReviewStatus = "missing" | "official" | "official_partial" | "inherited_unverified";
export type PublicationStatus = "draft" | "pending_review" | "directory_preview" | "complete_profile" | "archived";
export type ParameterEvidenceField = "nozzleTemperature" | "bedTemperature" | "speed" | "drying" | "nozzleRestriction" | "density" | "diameterMm" | "netWeightG" | "materialWarning" | "additionalSpecifications";
export type ParameterEvidenceSourceKind = "page_txt" | "page_html" | "ocr_text" | "image_metadata" | "existing_draft";
export type ParameterEvidenceConfidence = "exact_label_value" | "exact_text_context" | "ambiguous";
export type ParameterEvidenceReviewStatus = "pending_review" | "accepted" | "rejected";

export type ParameterEvidenceCandidate = {
  candidateId: string;
  field: ParameterEvidenceField;
  normalizedValue: string;
  unit: string;
  rawText: string;
  sourceKind: ParameterEvidenceSourceKind;
  evidencePath: string;
  sourceRunId: string;
  confidence: ParameterEvidenceConfidence;
  conflict: boolean;
  reviewStatus: ParameterEvidenceReviewStatus;
  notes: string;
  evidenceOccurrences?: number;
  evidenceExamples?: string[];
};

export type ParameterExtractionSummary = {
  candidateCount: number;
  exactCandidateCount: number;
  conflictCount: number;
  unresolvedCount: number;
  lastExtractedAt: string;
};

export type ProductLineParameterDisplay = {
  field: ParameterEvidenceField;
  displayValue: string;
  values: string[];
  sourceTypes: string[];
  sourceLabel: string;
  evidencePaths: string[];
  hasMultipleValues: boolean;
  pageProvided: boolean;
};

export type ReviewedDraftColor = CanonicalKexcelledDraftColor & {
  displayStatus: ColorDisplayStatus;
  imageDisplayStatus: ImageDisplayStatus;
  imageReviewNote: string;
  reviewedAt: string;
  reviewedBy: string;
};

export type ParameterSourceEvidence = {
  sourceLabel: string;
  sourceUrl: string;
  evidencePath: string;
  note: string;
};

export type ReviewedParameters = KexcelledEvidenceDraft["parameters"] & {
  status: ParameterReviewStatus;
  sourceType: ParameterReviewStatus;
  sourceEvidence: ParameterSourceEvidence[];
  parameterTemplateId: string;
  parameterAppliedAt: string;
  parameterAppliedBy: string;
  parameterLocked: boolean;
  reviewedAt: string;
  reviewedBy: string;
  reviewNote: string;
  fields: Record<string, unknown> & {
    nozzleTemperature?: string;
    bedTemperature?: string;
    speed?: string;
    drying?: string;
    nozzleRestriction?: string;
  };
};

export type AdminFilamentDraft = Omit<ImportedFilamentDraft, "colors" | "parameters"> & {
  colors: ReviewedDraftColor[];
  parameters: ReviewedParameters;
  parameterEvidenceCandidates: ParameterEvidenceCandidate[];
  parameterExtractionSummary: ParameterExtractionSummary;
  productLineParameters: ProductLineParameterDisplay[];
  productLineParametersUpdatedAt: string;
  publicationStatus: PublicationStatus;
  publishedAt: string;
  publishedBy: string;
  publicationNote: string;
  createdAt: string;
  completedAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type PublicationLevel = "directory_preview" | "complete_profile";

const ADMIN_DRAFTS_PATH = "data/filaments/admin-drafts/kexcelled-imported-drafts.json";

function storePath() {
  return path.join(process.cwd(), ADMIN_DRAFTS_PATH);
}

function now() {
  return new Date().toISOString();
}

function normalizeColor(color: CanonicalKexcelledDraftColor | ReviewedDraftColor): ReviewedDraftColor {
  const reviewed = color as Partial<ReviewedDraftColor>;
  const hasImage = Boolean(color.imageCandidateUrl || color.localImagePath);
  const defaultImageStatus: ImageDisplayStatus = hasImage ? "pending" : "no_image";

  // Auto-approve: color has code + name + image + no explicit pending override
  const canAutoApprove =
    Boolean(color.officialColorCode) &&
    Boolean(color.nameZh) &&
    hasImage &&
    reviewed.displayStatus !== "pending";

  return {
    ...color,
    displayStatus: reviewed.displayStatus
      || (canAutoApprove ? "approved" : "pending"),
    imageDisplayStatus: reviewed.imageDisplayStatus
      || (canAutoApprove ? "approved" : defaultImageStatus),
    imageReviewNote: reviewed.imageReviewNote || "",
    reviewedAt: reviewed.reviewedAt || now(),
    reviewedBy: reviewed.reviewedBy || "system",
  };
}

function normalizeColors(colors: Array<KexcelledDraftColor | CanonicalKexcelledDraftColor | ReviewedDraftColor>) {
  const hasCanonicalShape = colors.every((color) => Array.isArray((color as Partial<CanonicalKexcelledDraftColor>).colorVariants));
  const canonical = hasCanonicalShape
    ? colors as CanonicalKexcelledDraftColor[]
    : colorsToCanonical(colors as KexcelledDraftColor[]);
  return canonical.map(normalizeColor);
}

function getColorStats(colors: ReviewedDraftColor[], draft: Partial<AdminFilamentDraft> & ImportedFilamentDraft) {
  const rawSkuCount = draft.rawSkuCount || colors.reduce((sum, color) => sum + (color.rawSkuCount || 1), 0);
  const canonicalColorCount = draft.canonicalColorCount || colors.length;
  const mergedVariantCount = draft.mergedVariantCount || Math.max(0, rawSkuCount - canonicalColorCount);
  return { rawSkuCount, canonicalColorCount, mergedVariantCount };
}

function normalizeParameters(
  parameters: ImportedFilamentDraft["parameters"] | ReviewedParameters,
  draft?: Partial<AdminFilamentDraft> & ImportedFilamentDraft,
): ReviewedParameters {
  const reviewed = parameters as Partial<ReviewedParameters>;
  const status = (reviewed.status || "missing") as ParameterReviewStatus;
  const sourceType = (reviewed.sourceType || status || "missing") as ParameterReviewStatus;
  const fields: Record<string, unknown> = reviewed.fields || {};

  // Populate parameters.fields from kexcelledParameterGroups if available
  const groups = draft?.kexcelledParameterGroups;
  if ((!fields || Object.keys(fields).length === 0) && groups) {
    const groupKeys: Array<keyof (typeof groups)> = [
      "recommendedPrintParameters",
      "filamentSpecifications",
      "materialProperties",
      "testsAndWarnings",
    ];
    for (const gk of groupKeys) {
      const groupFields = groups[gk] as Array<{ field?: string; rawLabel?: string; rawValue?: string; unit?: string }> | undefined;
      if (!groupFields) continue;
      for (const gf of groupFields) {
        if (gf.field && gf.rawValue) {
          fields[gf.field] = gf.rawValue + (gf.unit ? ` ${gf.unit}` : "");
        }
      }
    }
    // Also populate from product at top level
    if (draft?.productLine) {
      if (draft.productLine.diameterMm != null && !fields["filament_diameter"]) {
        fields["filament_diameter"] = `${draft.productLine.diameterMm} mm`;
      }
      if (draft.productLine.netWeightG != null && !fields["net_weight"]) {
        fields["net_weight"] = `${draft.productLine.netWeightG / 1000} kg`;
      }
    }
  }

  return {
    ...parameters,
    status: (Object.keys(fields).length > 0 ? "official_partial" : status) as ParameterReviewStatus,
    sourceType,
    fields,
    sourceEvidence: reviewed.sourceEvidence || [],
    parameterTemplateId: reviewed.parameterTemplateId || "",
    parameterAppliedAt: reviewed.parameterAppliedAt || "",
    parameterAppliedBy: reviewed.parameterAppliedBy || "",
    parameterLocked: Boolean(reviewed.parameterLocked),
    reviewedAt: reviewed.reviewedAt || "",
    reviewedBy: reviewed.reviewedBy || "",
    reviewNote: reviewed.reviewNote || "",
  };
}

function restoreMissingCoreParameterState(
  draft: Partial<AdminFilamentDraft> & ImportedFilamentDraft,
  parameters: ReviewedParameters,
) {
  // Preserve existing parameter statuses — no longer force-reset to missing
  return parameters;
}

function normalizeParameterEvidenceCandidates(draft: Partial<AdminFilamentDraft>) {
  return Array.isArray(draft.parameterEvidenceCandidates) ? draft.parameterEvidenceCandidates : [];
}

function normalizeParameterExtractionSummary(draft: Partial<AdminFilamentDraft>): ParameterExtractionSummary {
  const summary = draft.parameterExtractionSummary;
  const candidates = normalizeParameterEvidenceCandidates(draft);
  return {
    candidateCount: summary?.candidateCount ?? candidates.length,
    exactCandidateCount: summary?.exactCandidateCount ?? candidates.filter((candidate) => candidate.confidence !== "ambiguous").length,
    conflictCount: summary?.conflictCount ?? candidates.filter((candidate) => candidate.conflict).length,
    unresolvedCount: summary?.unresolvedCount ?? candidates.filter((candidate) => candidate.confidence === "ambiguous").length,
    lastExtractedAt: summary?.lastExtractedAt || "",
  };
}

export function normalizeAdminDraft(draft: ImportedFilamentDraft | AdminFilamentDraft): AdminFilamentDraft {
  const normalized = draft as Partial<AdminFilamentDraft> & ImportedFilamentDraft;
  const authoritativeColors = normalized.canonicalColors?.length
    ? normalized.canonicalColors
    : draft.colors;
  const colors = normalizeColors(authoritativeColors);
  const stats = getColorStats(colors, normalized);
  const parameters = restoreMissingCoreParameterState(normalized, normalizeParameters(draft.parameters, normalized));
  return {
    ...draft,
    sourceEvidenceStatus: normalized.sourceEvidenceStatus || "available",
    sourceEvidenceMissingReason: normalized.sourceEvidenceMissingReason || "",
    colors,
    canonicalColors: colors,
    rawSkuCount: stats.rawSkuCount,
    canonicalColorCount: stats.canonicalColorCount,
    mergedVariantCount: stats.mergedVariantCount,
    parameters,
    parameterEvidenceCandidates: normalizeParameterEvidenceCandidates(normalized),
    parameterExtractionSummary: normalizeParameterExtractionSummary(normalized),
    productLineParameters: Array.isArray(normalized.productLineParameters) ? normalized.productLineParameters : [],
    productLineParametersUpdatedAt: normalized.productLineParametersUpdatedAt || "",
    publicationStatus: normalized.publicationStatus || draft.status || "draft",
    publishedAt: normalized.publishedAt || "",
    publishedBy: normalized.publishedBy || "",
    publicationNote: normalized.publicationNote || "",
    createdAt: normalized.createdAt || draft.importedAt || "",
    completedAt: normalized.completedAt || draft.importedAt || "",
    updatedAt: normalized.updatedAt || draft.importedAt || "",
    updatedBy: normalized.updatedBy || "system",
  };
}

async function readLocalAdminFilamentDrafts(): Promise<AdminFilamentDraft[]> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Array<ImportedFilamentDraft | AdminFilamentDraft>;
    return Array.isArray(parsed) ? parsed.map(normalizeAdminDraft) : [];
  } catch {
    return [];
  }
}

export async function readAdminFilamentDrafts(): Promise<AdminFilamentDraft[]> {
  const supabaseRows = await listSupabaseFilamentDraftRows();
  return resolveAdminDraftSource(supabaseRows, readLocalAdminFilamentDrafts);
}

export async function writeAdminFilamentDrafts(drafts: AdminFilamentDraft[]) {
  const file = storePath();
  if (drafts.length === 0) {
    try {
      const existingRaw = await readFile(file, "utf8");
      const existing = JSON.parse(existingRaw) as unknown;
      if (Array.isArray(existing) && existing.length > 0) {
        throw new Error("Refusing to overwrite non-empty admin draft store with an empty array.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Refusing to overwrite")) throw error;
    }
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(drafts, null, 2) + "\n", "utf8");
}

export async function readAdminFilamentDraft(sourceRunId: string) {
  const drafts = await readAdminFilamentDrafts();
  return drafts.find((draft) => draft.sourceRunId === sourceRunId) || null;
}

export async function updateAdminFilamentDraft(sourceRunId: string, updater: (draft: AdminFilamentDraft) => AdminFilamentDraft) {
  const drafts = await readAdminFilamentDrafts();
  const index = drafts.findIndex((draft) => draft.sourceRunId === sourceRunId);
  if (index < 0) return null;
  const nextDraft = updater(drafts[index]);

  // Write to Supabase as primary store
  try {
    await updateSupabaseFilamentDraftRow({
      sourceRunId,
      draftData: nextDraft,
      status: nextDraft.importStatus,
      reviewStatus: nextDraft.reviewStatus,
      publicationStatus: nextDraft.publicationStatus,
      productLineName: nextDraft.productLine?.name ?? null,
      materialType: nextDraft.productLine?.materialType ?? null,
      variant: nextDraft.productLine?.variant ?? null,
      updatedBy: nextDraft.updatedBy || "system",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "supabase_write_failed";
    throw new Error(`草稿保存失败: ${message}. 请稍后重试。`);
  }

  // Local JSON write: dev compatibility only, never a success gate
  if (!process.env.VERCEL) {
    try {
      const nextDrafts = [...drafts];
      nextDrafts[index] = nextDraft;
      await writeAdminFilamentDrafts(nextDrafts);
    } catch {
      // Local dev file write failure is non-blocking; Supabase is authoritative.
      console.warn("[admin-drafts] local JSON write failed — Supabase save already succeeded.");
    }
  }

  return nextDraft;
}

export async function removeAdminFilamentDraft(sourceRunId: string) {
  const drafts = await readAdminFilamentDrafts();
  const nextDrafts = drafts.filter((draft) => draft.sourceRunId !== sourceRunId);
  const removedCount = drafts.length - nextDrafts.length;
  if (removedCount > 0) {
    const file = storePath();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(nextDrafts, null, 2) + "\n", "utf8");
  }
  return removedCount;
}

export function getDirectoryPreviewIssues(draft: AdminFilamentDraft) {
  const issues: string[] = [];
  if (!draft.brand?.name) issues.push("缺少品牌");
  if (!draft.productLine?.name) issues.push("缺少产品线");
  if (!draft.productLine?.materialType) issues.push("缺少材料类型");
  if (!draft.colors.length) issues.push("缺少颜色记录");
  if (!draft.colors.some((color) => color.displayStatus === "approved")) issues.push("至少需要 1 条已批准展示的颜色");
  return issues;
}

export function getCompleteProfileIssues(draft: AdminFilamentDraft) {
  const issues = getDirectoryPreviewIssues(draft);
  const allowed: ParameterReviewStatus[] = ["official", "official_partial", "inherited_unverified"];
  if (!allowed.includes(draft.parameters.status)) issues.push("参数状态不能为 missing");
  if (!allowed.includes(draft.parameters.sourceType)) issues.push("参数来源类型不合格");
  if (!draft.parameters.sourceEvidence.length) issues.push("缺少参数来源证据");
  return issues;
}

export function canShowPresetDownload(draft: AdminFilamentDraft) {
  return draft.publicationStatus === "complete_profile" && ["official", "official_partial"].includes(draft.parameters.sourceType);
}

export function markDraftPublished(draft: AdminFilamentDraft, level: PublicationLevel, actorId: string, note = ""): AdminFilamentDraft {
  const timestamp = now();
  return {
    ...draft,
    publicationStatus: level,
    reviewStatus: "pending_review",
    publishedAt: timestamp,
    publishedBy: actorId,
    publicationNote: note,
    createdAt: draft.createdAt || draft.importedAt || timestamp,
    updatedAt: timestamp,
    updatedBy: actorId,
  };
}

export function retractDraftPublication(draft: AdminFilamentDraft, actorId: string): AdminFilamentDraft {
  const timestamp = now();
  return {
    ...draft,
    publicationStatus: "pending_review",
    reviewStatus: "pending_review",
    publicationNote: "publication_retracted",
    updatedAt: timestamp,
    updatedBy: actorId,
  };
}
