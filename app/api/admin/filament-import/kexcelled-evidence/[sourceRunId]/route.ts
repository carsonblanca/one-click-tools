import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  deleteFilamentDraftsBySourceRunId,
  deleteFilamentImport,
  getFilamentImportBySourceRunId,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  deleteImportObjectFromR2,
} from "@/lib/storage/r2";

export const runtime = "nodejs";

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.create")) {
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
      // 如果导入记录已不存在（可能已删除），仍尝试清理可能的残留草稿
      removedAdminDraftCount = await deleteFilamentDraftsBySourceRunId(sourceRunId);
      return NextResponse.json({
        deletedRunId: sourceRunId,
        removedAdminDraftCount,
        info: "导入记录已被清理，草稿已删除（如存在）。",
      });
    }

    // 1. Delete drafts
    removedAdminDraftCount = await deleteFilamentDraftsBySourceRunId(sourceRunId);

    // 2. Delete import record
    await deleteFilamentImport(importRecord.id);

    // 3. Best-effort R2 cleanup (package only; individual assets kept for safety)
    try {
      await deleteImportObjectFromR2({
        bucket: importRecord.r2Bucket,
        objectKey: importRecord.r2ObjectKey,
      });
    } catch {
      // Non-blocking: R2 cleanup is best-effort
    }

    // 4. Audit log
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
