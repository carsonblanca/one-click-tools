import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { saveBrandEntry } from "@/lib/filaments/catalog/brand-store";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "display.draft.create")) {
    return NextResponse.json({ error: "无权编辑品牌。" }, { status: 403 });
  }
  try {
    const { brandId } = await params;
    const payload = await request.json();
    const brand = await saveBrandEntry({ ...payload, brandId });
    return NextResponse.json({ brand });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "品牌保存失败。" }, { status: 400 });
  }
}
