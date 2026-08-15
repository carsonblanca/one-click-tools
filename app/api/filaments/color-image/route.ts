import { NextRequest, NextResponse } from "next/server";
import { resolvePublishedColorAsset } from "@/lib/filaments/catalog/color-image-access";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { readFipAssetFromR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

function valid(value: string, pattern: RegExp) {
  return value.length > 0 && value.length <= 200 && pattern.test(value);
}

export async function GET(request: NextRequest) {
  const sourceRunId = request.nextUrl.searchParams.get("sourceRunId")?.trim() || "";
  const productKey = request.nextUrl.searchParams.get("productKey")?.trim() || "";
  const officialColorCode = request.nextUrl.searchParams.get("officialColorCode")?.trim() || "";
  const colorId = request.nextUrl.searchParams.get("colorId")?.trim() || "";
  if (
    !valid(sourceRunId, /^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
    || !valid(productKey, /^[a-z0-9][a-z0-9-]*$/)
    || !valid(officialColorCode, /^[A-Za-z0-9._-]+$/)
    || !valid(colorId, /^[A-Za-z0-9._:-]+$/)
  ) {
    return NextResponse.json({ error: "Invalid color image identity" }, { status: 400 });
  }

  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select("draft_data")
    .eq("source_run_id", sourceRunId)
    .eq("status", "published")
    .eq("publication_status", "published")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Color image lookup failed" }, { status: 500 });
  }

  const assetKey = resolvePublishedColorAsset(data?.draft_data, {
    productKey,
    officialColorCode,
    colorId,
  });
  if (!assetKey) {
    return NextResponse.json({ error: "Formal color image not found" }, { status: 404 });
  }

  try {
    const asset = await readFipAssetFromR2(assetKey);
    return new NextResponse(Buffer.from(asset.bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Formal color image unavailable" }, { status: 404 });
  }
}
