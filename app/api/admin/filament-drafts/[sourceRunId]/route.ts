import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  CaptureDraftPatchError,
  mergeCaptureDraftData,
  type CaptureDraftPatch,
} from "@/lib/filaments/drafts/capture-draft-patch";
import { updateSupabaseFilamentDraftRow } from "@/lib/filaments/drafts/supabase-draft-repository";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";

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
  try {
    const draft = await getFilamentDraftBySourceRunId(sourceRunId);
    if (!draft) {
      return NextResponse.json({ error: "草稿不存在。" }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "readback_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "display.draft.edit") || (session.role !== "admin" && session.role !== "codex")) {
    return NextResponse.json({ error: "无权编辑草稿。" }, { status: 403 });
  }

  let patch: CaptureDraftPatch;
  try {
    patch = (await request.json()) as CaptureDraftPatch;
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const { sourceRunId } = await params;

  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "无有效更新字段。" }, { status: 400 });
  }

  try {
    const current = await getFilamentDraftBySourceRunId(sourceRunId);
    if (!current) {
      return NextResponse.json({ error: "草稿不存在。" }, { status: 404 });
    }
    const nextDraftData = mergeCaptureDraftData(current.draft_data, patch);
    await updateSupabaseFilamentDraftRow({
      sourceRunId,
      draftData: nextDraftData,
      updatedBy: session.actorId,
    });
    return NextResponse.json({
      draft: {
        ...current,
        draft_data: nextDraftData,
      },
    });
  } catch (error) {
    if (error instanceof CaptureDraftPatchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "save_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
