import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { mergeCaptureDraftData, type CaptureDraftPatch } from "@/lib/filaments/drafts/capture-draft-patch";
import {
  GENERATED_PATCH_TARGET,
  summarizeGeneratedPatchDraft,
  validateGeneratedPatchBaseline,
  validateGeneratedPatchInput,
  validateGeneratedPatchPreservation,
  validateGeneratedPatchReadback,
} from "@/lib/filaments/drafts/generated-patch-guard";
import { updateSupabaseFilamentDraftRow } from "@/lib/filaments/drafts/supabase-draft-repository";
import {
  getFilamentDraftApplySafetySnapshot,
  getFilamentDraftBySourceRunId,
} from "@/lib/filaments/imports/supabase-import-repository";

export const runtime = "nodejs";

async function requireTargetAdmin(sourceRunId: string) {
  const session = await readAdminSession();
  if (!session || session.role !== "admin" || !hasAdminScope(session.role, "display.draft.edit")) {
    return { error: NextResponse.json({ error: "仅管理员可以应用该补丁。" }, { status: 403 }) } as const;
  }
  if (sourceRunId !== GENERATED_PATCH_TARGET.sourceRunId) {
    return { error: NextResponse.json({ error: "该入口只允许目标黄金样本草稿。" }, { status: 400 }) } as const;
  }
  return { session } as const;
}

async function readTarget() {
  const [draft, counts] = await Promise.all([
    getFilamentDraftBySourceRunId(GENERATED_PATCH_TARGET.sourceRunId),
    getFilamentDraftApplySafetySnapshot(GENERATED_PATCH_TARGET.sourceRunId),
  ]);
  return { draft, counts };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const { sourceRunId } = await params;
  const auth = await requireTargetAdmin(sourceRunId);
  if ("error" in auth) return auth.error;

  try {
    const { draft, counts } = await readTarget();
    if (!draft) return NextResponse.json({ error: "目标草稿不存在。" }, { status: 404 });
    return NextResponse.json({
      summary: summarizeGeneratedPatchDraft(draft, counts),
      blockers: validateGeneratedPatchBaseline(draft, counts),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "preflight_failed" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const { sourceRunId } = await params;
  const auth = await requireTargetAdmin(sourceRunId);
  if ("error" in auth) return auth.error;

  let patch: CaptureDraftPatch;
  try {
    patch = await request.json() as CaptureDraftPatch;
  } catch {
    return NextResponse.json({ error: "补丁 JSON 无效。" }, { status: 400 });
  }

  try {
    const { draft: before, counts: beforeCounts } = await readTarget();
    if (!before) return NextResponse.json({ error: "目标草稿不存在。" }, { status: 404 });

    const baselineIssues = validateGeneratedPatchBaseline(before, beforeCounts);
    if (baselineIssues.length) {
      return NextResponse.json({ error: "写入前基线不符合要求。", issues: baselineIssues }, { status: 409 });
    }
    const patchIssues = validateGeneratedPatchInput(patch);
    if (patchIssues.length) {
      return NextResponse.json({ error: "补丁未通过完整校验。", issues: patchIssues }, { status: 400 });
    }

    const nextDraftData = mergeCaptureDraftData(before.draft_data, patch);
    const preservationIssues = validateGeneratedPatchPreservation(before.draft_data, nextDraftData);
    if (preservationIssues.length) {
      return NextResponse.json({ error: "补丁会改变受保护数据。", issues: preservationIssues }, { status: 409 });
    }

    await updateSupabaseFilamentDraftRow({
      sourceRunId: GENERATED_PATCH_TARGET.sourceRunId,
      draftData: nextDraftData,
      updatedBy: auth.session.actorId,
    });

    const { draft: after, counts: afterCounts } = await readTarget();
    if (!after) return NextResponse.json({ error: "写入后无法回读目标草稿。" }, { status: 500 });
    const readbackIssues = [
      ...validateGeneratedPatchPreservation(before.draft_data, after.draft_data),
      ...validateGeneratedPatchReadback(after, afterCounts),
    ];

    return NextResponse.json({
      ok: readbackIssues.length === 0,
      summary: summarizeGeneratedPatchDraft(after, afterCounts),
      issues: readbackIssues,
    }, { status: readbackIssues.length ? 500 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "apply_failed" }, { status: 500 });
  }
}
