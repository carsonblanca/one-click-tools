import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { createEvidenceUploadIntentToken } from "@/lib/filaments/imports/evidence-upload-intent";
import { createEvidencePackageUploadUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";

const MAX_ZIP_SIZE = 512 * 1024 * 1024;
const ZIP_CONTENT_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

function sourceRunId(importId: string) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  return `${timestamp}-${importId.slice(0, 8)}`;
}

function normalizeContentType(value: string) {
  return ZIP_CONTENT_TYPES.has(value.toLowerCase())
    ? value.toLowerCase()
    : "application/zip";
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

  let input: {
    brandId?: unknown;
    originalFilename?: unknown;
    size?: unknown;
    contentType?: unknown;
  };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const brandId = typeof input.brandId === "string"
    ? input.brandId.trim().toLowerCase()
    : "";
  const originalFilename = typeof input.originalFilename === "string"
    ? input.originalFilename.trim()
    : "";
  const size = typeof input.size === "number" ? input.size : 0;
  const contentType = normalizeContentType(
    typeof input.contentType === "string" ? input.contentType : "",
  );
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(brandId)) {
    return NextResponse.json({ error: "品牌标识无效。" }, { status: 400 });
  }
  if (
    !originalFilename
    || originalFilename.length > 255
    || !originalFilename.toLowerCase().endsWith(".zip")
    || /[\\/]/.test(originalFilename)
  ) {
    return NextResponse.json({ error: "ZIP 文件名无效。" }, { status: 400 });
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_ZIP_SIZE) {
    return NextResponse.json(
      { error: "ZIP 文件大小无效或超过 512 MB。" },
      { status: 400 },
    );
  }

  try {
    const importId = randomUUID();
    const runId = sourceRunId(importId);
    const upload = await createEvidencePackageUploadUrl({
      importId,
      sourceRunId: runId,
      brandId,
      originalFilename,
      contentType,
    });
    const intentToken = createEvidenceUploadIntentToken({
      importId,
      sourceRunId: runId,
      actorId: session.actorId,
      brandId,
      bucket: upload.bucket,
      objectKey: upload.objectKey,
      originalFilename,
      size,
      contentType: upload.contentType,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return NextResponse.json({
      uploadUrl: upload.uploadUrl,
      objectKey: upload.objectKey,
      sourceRunId: runId,
      contentType: upload.contentType,
      intentToken,
    });
  } catch {
    return NextResponse.json(
      { error: "暂时无法创建上传地址。" },
      { status: 503 },
    );
  }
}
