import { NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { listRecentFilamentImports } from "@/lib/filaments/imports/supabase-import-repository";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "未授权访问。" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "当前账号无权创建导入任务。" }, { status: 403 });
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

export async function POST() {
  return NextResponse.json(
    { error: "ZIP 文件必须使用 R2 直传流程。" },
    { status: 410 },
  );
}
