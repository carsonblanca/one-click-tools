import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { updateAdminFilamentDraft } from "@/lib/filaments/drafts/admin-drafts";
import type { ColorDisplayStatus, ImageDisplayStatus, ParameterReviewStatus } from "@/lib/filaments/drafts/admin-drafts";

export const runtime = "nodejs";

const COLOR_STATUSES = new Set<ColorDisplayStatus>(["pending", "approved", "hidden"]);
const IMAGE_STATUSES = new Set<ImageDisplayStatus>(["pending", "approved", "hidden", "no_image"]);
const PARAM_STATUSES = new Set<ParameterReviewStatus>(["missing", "official", "official_partial", "inherited_unverified"]);

type DraftPatch = {
  colors?: Array<{
    domIndex: number;
    displayStatus: ColorDisplayStatus;
    imageDisplayStatus: ImageDisplayStatus;
    imageReviewNote: string;
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
  let updated;
  try {
    updated = await updateAdminFilamentDraft(sourceRunId, (draft) => {
    const now = new Date().toISOString();
    const colors = patch.colors
      ? draft.colors.map((color) => {
          const next = patch.colors?.find((item) => item.domIndex === color.domIndex);
          if (!next) return color;
          if (!COLOR_STATUSES.has(next.displayStatus) || !IMAGE_STATUSES.has(next.imageDisplayStatus)) {
            return color;
          }
          return {
            ...color,
            displayStatus: next.displayStatus,
            imageDisplayStatus: next.imageDisplayStatus,
            imageReviewNote: next.imageReviewNote || "",
            reviewedAt: now,
            reviewedBy: session.actorId,
          };
        })
      : draft.colors;

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

    return {
      ...draft,
      colors,
      parameters,
      parameterStatus: parameters.status,
      publicationStatus: draft.publicationStatus === "draft" ? "pending_review" : draft.publicationStatus,
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
