import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminApiSession } from "@/lib/admin/auth";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  deleteFilamentDraftsBySourceRunId,
  deleteFilamentImport,
  getFilamentDraftBySourceRunId,
  getFilamentImportBySourceRunId,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  deleteImportObjectFromR2,
} from "@/lib/storage/r2";

export const runtime = "nodejs";

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

// Machine/Bearer authenticated, READ-ONLY import readback for the KEXCELLED canary import.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminApiSession(request);
  if (!session) {
    return jsonError("需要认证", "UNAUTHORIZED", 401);
  }
  if (!hasAdminScope(session.role, "candidate.view")) {
    return jsonError("无权查看导入记录", "FORBIDDEN", 403);
  }

  const { sourceRunId } = await params;
  if (!sourceRunId) {
    return jsonError("缺少 sourceRunId", "MISSING_PARAM", 400);
  }

  const importRecord = await getFilamentImportBySourceRunId(sourceRunId);
  const draft = await getFilamentDraftBySourceRunId(sourceRunId);

  if (!importRecord && !draft) {
    return jsonError("导入记录不存在", "NOT_FOUND", 404);
  }

  return NextResponse.json({
    sourceRunId,
    import: importRecord,
    draft: draft || null,
    draftData: draft ? draft.draft_data : null,
    draftCount: draft ? 1 : 0,
    identity: {
      productLineName: draft?.product_line_name ?? null,
      materialType: draft?.material_type ?? null,
      variant: draft?.variant ?? null,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminSession();
  if (!session) {
    return jsonError("请先登录管理员账号", "UNAUTHORIZED", 401);
  }
  if (session.role !== "admin" || !hasAdminScope(session.role, "archive.execute")) {
    return jsonError("无权删除导入草稿", "FORBIDDEN", 403);
  }

  const { sourceRunId } = await params;

  if (!sourceRunId) {
    return jsonError("缺少 sourceRunId", "MISSING_PARAM", 400);
  }

  let removedAdminDraftCount = 0;

  try {
    const importRecord = await getFilamentImportBySourceRunId(sourceRunId);

    if (!importRecord) {
      removedAdminDraftCount = await deleteFilamentDraftsBySourceRunId(sourceRunId);
      return NextResponse.json({
        deletedRunId: sourceRunId,
        removedAdminDraftCount,
        info: "导入记录已被清理，草稿已删除（如存在）。",
      });
    }

    removedAdminDraftCount = await deleteFilamentDraftsBySourceRunId(sourceRunId);
    await deleteFilamentImport(importRecord.id);
    try {
      await deleteImportObjectFromR2({
        bucket: importRecord.r2Bucket,
        objectKey: importRecord.r2ObjectKey,
      });
    } catch {
      // Non-blocking: R2 cleanup is best-effort
    }
    try {
      await appendAdminAuditLog({
        actorId: session.actorId,
        action: "filament_fip_deleted",
        entityType: "filament_import",
        entityId: importRecord.id,
        details: {
          sourceRunId,
          removedAdminDraftCount,
          originalFilename: importRecord.originalFilename,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      deletedRunId: sourceRunId,
      removedAdminDraftCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除操作失败";
    return jsonError(message, "DELETE_FAILED", 500);
  }
}
