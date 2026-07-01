import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  createFilamentImport,
  listRecentFilamentImports,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  deleteImportObjectFromR2,
  uploadEvidencePackageToR2,
} from "@/lib/storage/r2";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "未授权访问。" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "当前账号无权创建导入任务。" }, { status: 403 });
}

function sourceRunId(importId: string) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  return `${timestamp}-${importId.slice(0, 8)}`;
}

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

export async function GET() {
  const session = await readAdminSession();
  if (!session) return unauthorized();
  if (!hasAdminScope(session.role, "display.view")) return forbidden();

  try {
    const imports = await listRecentFilamentImports();
    return NextResponse.json({ imports: imports.map(queueItem) });
  } catch {
    return NextResponse.json(
      { error: "暂时无法读取线上解析队列。" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return unauthorized();
  if (!hasAdminScope(session.role, "display.draft.create")) return forbidden();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "上传表单无效。" }, { status: 400 });
  }

  const file = formData.get("file");
  const brandId = String(formData.get("brandId") ?? "").trim().toLowerCase();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择 ZIP 文件。" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "仅接受 ZIP 文件。" }, { status: 400 });
  }
  if (!brandId) {
    return NextResponse.json({ error: "请先选择品牌。" }, { status: 400 });
  }

  const importId = randomUUID();
  const runId = sourceRunId(importId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let stored: Awaited<ReturnType<typeof uploadEvidencePackageToR2>> | null = null;

  try {
    stored = await uploadEvidencePackageToR2({
      importId,
      bytes,
      originalFilename: file.name,
      contentType: file.type || "application/zip",
    });

    const record = await createFilamentImport({
      id: importId,
      sourceRunId: runId,
      brandId,
      originalFilename: file.name,
      r2Bucket: stored.bucket,
      r2ObjectKey: stored.objectKey,
      contentType: stored.contentType,
      byteSize: stored.size,
      status: "queued",
      manifest: {
        sourceType: "official_evidence_zip",
        upload: {
          originalFilename: file.name,
          contentType: stored.contentType,
          byteSize: stored.size,
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
      // The import is already durable; audit logging must not misreport it as failed.
    }

    return NextResponse.json({
      import: queueItem(record),
      message: "已上传，等待解析",
    }, { status: 201 });
  } catch {
    if (stored) {
      try {
        await deleteImportObjectFromR2({
          bucket: stored.bucket,
          objectKey: stored.objectKey,
        });
      } catch {
        // Cleanup is best effort; do not expose storage internals.
      }
    }
    return NextResponse.json(
      { error: "上传未完成，请稍后重试。" },
      { status: 502 },
    );
  }
}
