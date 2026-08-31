import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import { readAdminFilamentDraft } from "@/lib/filaments/drafts/admin-drafts";
import { toParameterDetailProjection } from "@/lib/filaments/catalog/canonical-mapper";
import { updateAdminFilamentDraft } from "@/lib/filaments/drafts/admin-drafts";
import type {
  ColorDisplayStatus,
  ImageDisplayStatus,
  ParameterReviewStatus,
} from "@/lib/filaments/drafts/admin-drafts";
import type { ParameterCategory } from "@/lib/filaments/parameters/parameter-category";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.view")) {
    return NextResponse.json({ error: "无权查看草稿。" }, { status: 403 });
  }

  const { sourceRunId } = await params;
  const sourceRow = await getFilamentDraftBySourceRunId(sourceRunId);
  if (!sourceRow) return NextResponse.json({ error: "草稿不存在。" }, { status: 404 });

  const draft = readAdminFilamentDraft(sourceRow);
  return NextResponse.json({
    sourceRunId,
    projection: toParameterDetailProjection(draft.canonical),
  });
}

const COLOR_STATUSES = new Set<ColorDisplayStatus>(["pending", "approved", "hidden"]);
const IMAGE_STATUSES = new Set<ImageDisplayStatus>(["pending", "approved", "hidden", "no_image"]);
const PARAM_STATUSES = new Set<ParameterReviewStatus>(["missing", "official", "official_partial", "inherited_unverified"]);
const MANUAL_PARAM_SOURCE_STATUSES = new Set(["official", "manual", "missing"]);
type ManualParamSourceStatus = "official" | "manual" | "missing";

function manualParamSourceStatus(value: string | undefined): ManualParamSourceStatus {
  return MANUAL_PARAM_SOURCE_STATUSES.has(value || "")
    ? value as ManualParamSourceStatus
    : "manual";
}

type DraftPatch = {
  product?: {
    brandId?: string;
    brandName?: string;
    productLineName?: string;
    material?: string;
    variant?: string;
    diameter?: string;
    netWeight?: string;
    description?: string;
  };
  colors?: Array<{
    domIndex: number;
    colorNameZh?: string;
    colorNameEn?: string;
    officialColorCode?: string;
    availability?: string;
    displayStatus: ColorDisplayStatus;
    imageDisplayStatus: ImageDisplayStatus;
    imageUrl?: string;
    imageObjectKey?: string;
    physicalSwatchUrl?: string;
    physicalSwatchObjectKey?: string;
    imageReviewNote: string;
    imageSelectionReason?: string;
  }>;
  manualParameters?: Array<{
    id?: string;
    labelZh?: string;
    labelEn?: string;
    value?: string;
    unit?: string;
    sourceStatus?: string;
    sourceNote?: string;
    category?: ParameterCategory;
  }>;
  parameters?: {
    status: ParameterReviewStatus;
    sourceType: ParameterReviewStatus;
    fields: Record<string, unknown>;
    sourceEvidence: Array<{ sourceLabel: string; sourceUrl: string; evidencePath: string; note: string }>;
    reviewNote: string;
    parameterTemplateId?: string;
    parameterAppliedAt?: string;
    parameterAppliedBy?: string;
    parameterLocked?: boolean;
  };
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "display.draft.edit") || (session.role !== "admin" && session.role !== "codex")) {
    return NextResponse.json({ error: "无权编辑草稿。" }, { status: 403 });
  }

  let patch: DraftPatch;
  try {
    patch = (await request.json()) as DraftPatch;
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const { sourceRunId } = await params;

  if (!patch.product && !patch.colors && !patch.parameters && !patch.manualParameters) {
    return NextResponse.json({ error: "无有效更新字段。" }, { status: 400 });
  }

  const now = new Date().toISOString();

  let updated;
  try {
    updated = await updateAdminFilamentDraft(sourceRunId, (draft) => {
      const brand = patch.product
        ? {
            ...draft.brand,
            id: patch.product.brandId?.trim() || draft.brand.id || draft.brand.name,
            name: patch.product.brandName?.trim() || draft.brand.name,
            nameZh: patch.product.brandName?.trim() || draft.brand.nameZh || draft.brand.name,
          }
        : draft.brand;
      const productLine = patch.product
        ? {
            ...draft.productLine,
            name: patch.product.productLineName?.trim() || draft.productLine.name,
            materialType: patch.product.material?.trim() || draft.productLine.materialType,
            variant: patch.product.variant?.trim() || draft.productLine.variant,
            diameterMm: patch.product.diameter?.trim() ? Number(patch.product.diameter) : draft.productLine.diameterMm,
            netWeightG: patch.product.netWeight?.trim() ? Number(patch.product.netWeight) : draft.productLine.netWeightG,
            description: patch.product.description?.trim() || draft.productLine.description || "",
          }
        : draft.productLine;

      let colors = draft.colors;
      if (patch.colors) {
        const patchMap = new Map(patch.colors.map((c) => [c.domIndex, c]));
        colors = draft.colors.map((color) => {
          const cp = patchMap.get(color.domIndex);
          if (!cp) return color;

          const updates: Record<string, unknown> = {};
          if (cp.colorNameZh !== undefined) updates.nameZh = cp.colorNameZh;
          if (cp.colorNameEn !== undefined) updates.nameEn = cp.colorNameEn;
          if (cp.officialColorCode !== undefined) updates.officialColorCode = cp.officialColorCode;
          if (cp.availability !== undefined) updates.availability = cp.availability;
          if (COLOR_STATUSES.has(cp.displayStatus)) updates.displayStatus = cp.displayStatus;
          if (IMAGE_STATUSES.has(cp.imageDisplayStatus)) updates.imageDisplayStatus = cp.imageDisplayStatus;
          if (cp.imageUrl !== undefined) updates.imageCandidateUrl = cp.imageUrl;
          if (cp.imageObjectKey !== undefined) updates.imageObjectKey = cp.imageObjectKey;
          if (cp.physicalSwatchUrl !== undefined) {
            updates.physicalSwatchUrl = cp.physicalSwatchUrl;
            updates.physicalSwatchStatus = cp.physicalSwatchUrl ? "pending" : "";
          }
          if (cp.physicalSwatchObjectKey !== undefined) updates.physicalSwatchObjectKey = cp.physicalSwatchObjectKey;
          updates.imageReviewNote = cp.imageReviewNote ?? color.imageReviewNote;
          updates.imageSelectionReason = cp.imageSelectionReason ?? color.imageSelectionReason ?? cp.imageReviewNote ?? "";

          return { ...color, ...updates };
        });
      }

      let parameters = draft.parameters;
      if (patch.parameters && PARAM_STATUSES.has(patch.parameters.status) && PARAM_STATUSES.has(patch.parameters.sourceType)) {
        parameters = {
          ...parameters,
          status: patch.parameters.status,
          sourceType: patch.parameters.sourceType,
          fields: patch.parameters.fields || {},
          sourceEvidence: patch.parameters.sourceEvidence || [],
          reviewNote: patch.parameters.reviewNote || "",
          parameterTemplateId: patch.parameters.parameterTemplateId || parameters.parameterTemplateId || "",
          parameterAppliedAt: patch.parameters.parameterAppliedAt || parameters.parameterAppliedAt || "",
          parameterAppliedBy: patch.parameters.parameterAppliedBy || parameters.parameterAppliedBy || "",
          parameterLocked: Boolean(patch.parameters.parameterLocked),
          reviewedAt: now,
          reviewedBy: session.actorId,
          };
    }
    if (patch.manualParameters) {
      parameters = {
        ...parameters,
        manualParameters: patch.manualParameters
          .filter((item) => item.labelZh || item.labelEn || item.value || item.unit || item.sourceNote)
          .map((item, index) => ({
            id: item.id || `manual-${index + 1}`,
            labelZh: item.labelZh || "",
            labelEn: item.labelEn || "",
            value: item.value || "",
            unit: item.unit || "",
            sourceStatus: manualParamSourceStatus(item.sourceStatus),
            sourceNote: item.sourceNote || "",
            category: item.category === "print" ? "print" : "material",
          })),
        reviewedAt: now,
        reviewedBy: session.actorId,
      };
    }

    return {
      ...draft,
      brand,
      productLine,
      colors,
      parameters,
      updatedAt: now,
      updatedBy: session.actorId,
    };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "save_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "草稿不存在。" }, { status: 404 });
  }
  return NextResponse.json({ draft: updated });
}
