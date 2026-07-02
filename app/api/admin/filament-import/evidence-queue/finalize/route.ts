import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { verifyEvidenceUploadIntentToken } from "@/lib/filaments/imports/evidence-upload-intent";
import {
  appendAdminAuditLog,
  createFilamentImport,
  listRecentFilamentImports,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  deleteImportObjectFromR2,
  headImportObjectFromR2,
} from "@/lib/storage/r2";

export const runtime = "nodejs";

type FinalizeInput = {
  brandId?: unknown;
  objectKey?: unknown;
  originalFilename?: unknown;
  size?: unknown;
  contentType?: unknown;
  sourceRunId?: unknown;
  intentToken?: unknown;
};

function queueItem(record: Awaited<ReturnType<typeof listRecentFilamentImports>>[number]) {
  return {
    id: record.id,
    sourceRunId: record.sourceRunId,
    brandId: record.brandId,
    originalFilename: record.originalFilename,
    status: record.status,
    createdAt: record.createdAt,
  };
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: "未授权访问。" }, { status: 401 });
  }
  if (!hasAdminScope(session.role, "display.draft.create")) {
    return NextResponse.json(
      { error: "当前账号无权创建导入任务。" },
      { status: 403 },
    );
  }

  let input: FinalizeInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const token = typeof input.intentToken === "string" ? input.intentToken : "";
  const intent = token ? verifyEvidenceUploadIntentToken(token) : null;
  if (!intent || intent.actorId !== session.actorId) {
    return NextResponse.json(
      { error: "上传意图无效或已过期。" },
      { status: 403 },
    );
  }

  const matchesIntent = (
    input.brandId === intent.brandId
    && input.objectKey === intent.objectKey
    && input.originalFilename === intent.originalFilename
    && input.size === intent.size
    && input.contentType === intent.contentType
    && input.sourceRunId === intent.sourceRunId
    && intent.objectKey.startsWith(
      `imports/evidence/${intent.brandId}/${intent.sourceRunId.toLowerCase()}/${intent.importId}/`,
    )
  );
  if (!matchesIntent || !intent.originalFilename.toLowerCase().endsWith(".zip")) {
    return NextResponse.json(
      { error: "上传元数据与服务器签发内容不匹配。" },
      { status: 400 },
    );
  }

  try {
    const object = await headImportObjectFromR2({
      bucket: intent.bucket,
      objectKey: intent.objectKey,
    });
    if (object.contentLength !== intent.size) {
      return NextResponse.json(
        { error: "R2 文件大小与上传意图不一致。" },
        { status: 409 },
      );
    }

    const record = await createFilamentImport({
      id: intent.importId,
      sourceRunId: intent.sourceRunId,
      brandId: intent.brandId,
      originalFilename: intent.originalFilename,
      r2Bucket: intent.bucket,
      r2ObjectKey: intent.objectKey,
      contentType: intent.contentType,
      byteSize: intent.size,
      status: "queued",
      manifest: {
        sourceType: "official_evidence_zip",
        upload: {
          originalFilename: intent.originalFilename,
          contentType: intent.contentType,
          byteSize: intent.size,
        },
      },
      evidence: null,
      createdBy: session.actorId,
    });

    try {
      await appendAdminAuditLog({
        actorId: session.actorId,
        action: "filament_import.queued",
        entityType: "filament_import",
        entityId: record.id,
        details: {
          sourceRunId: record.sourceRunId,
          brandId: record.brandId,
          status: record.status,
        },
      });
    } catch {
      // The import is durable even if audit persistence is temporarily unavailable.
    }

    return NextResponse.json({
      import: queueItem(record),
      message: "已上传，等待解析",
    }, { status: 201 });
  } catch {
    try {
      await deleteImportObjectFromR2({
        bucket: intent.bucket,
        objectKey: intent.objectKey,
      });
    } catch {
      // Cleanup is best effort and must not expose storage internals.
    }
    return NextResponse.json(
      { error: "导入记录创建失败，上传对象已安排清理。" },
      { status: 502 },
    );
  }
}
