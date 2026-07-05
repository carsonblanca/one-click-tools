import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { readFipAssetFromR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.view")) {
    return NextResponse.json({ error: "无权读取草稿资产", code: "FORBIDDEN", details: "" }, { status: 403 });
  }
  const key = request.nextUrl.searchParams.get("key") || "";
  try {
    const asset = await readFipAssetFromR2(key);
    return new NextResponse(Buffer.from(asset.bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "草稿资产不存在", code: "ASSET_NOT_FOUND", details: "" }, { status: 404 });
  }
}
