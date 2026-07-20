import { NextRequest, NextResponse } from "next/server";
import { listPublishedFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import { readFipAssetFromR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasPublishedAsset(draftData: unknown, key: string) {
  const data = objectValue(draftData);
  const images = Array.isArray(data.images) ? data.images : [];
  const colors = Array.isArray(data.colors) ? data.colors : [];
  return images.some((item) => objectValue(item).r2ObjectKey === key)
    || colors.some((item) => objectValue(item).localImagePath === key);
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim() || "";
  if (!key.startsWith("filament-imports/")) {
    return NextResponse.json({ error: "资产路径无效。" }, { status: 400 });
  }

  try {
    const published = await listPublishedFilamentDrafts();
    if (!published.some((row) => hasPublishedAsset(row.draft_data, key))) {
      return NextResponse.json({ error: "资产不存在。" }, { status: 404 });
    }
    const asset = await readFipAssetFromR2(key);
    return new NextResponse(Buffer.from(asset.bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "资产读取失败。" }, { status: 500 });
  }
}
