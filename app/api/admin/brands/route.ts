import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { listBrandEntries, saveBrandEntry } from "@/lib/filaments/catalog/brand-store";

export const runtime = "nodejs";

async function requireBrandEditor() {
  const session = await readAdminSession();
  return session && hasAdminScope(session.role, "display.draft.create") ? session : null;
}

export async function GET() {
  const session = await requireBrandEditor();
  if (!session) return NextResponse.json({ error: "无权查看品牌。" }, { status: 403 });
  return NextResponse.json({ brands: await listBrandEntries() });
}

export async function POST(request: NextRequest) {
  const session = await requireBrandEditor();
  if (!session) return NextResponse.json({ error: "无权编辑品牌。" }, { status: 403 });
  try {
    const payload = await request.json();
    const brand = await saveBrandEntry(payload);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "品牌保存失败。" }, { status: 400 });
  }
}
