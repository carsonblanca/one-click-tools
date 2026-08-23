import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { readFipAssetFromR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  const productLineId = request.nextUrl.searchParams.get("productLineId")?.trim() || "";
  const sourceRunId = request.nextUrl.searchParams.get("sourceRunId")?.trim() || "";
  const assetKey = request.nextUrl.searchParams.get("assetKey")?.trim() || "";
  if (!productLineId && !sourceRunId) {
    return NextResponse.json({ error: "Invalid productLineId" }, { status: 400 });
  }

  let query = getServerSupabaseClient()
    .from("filament_drafts")
    .select("source_run_id,draft_data")
    .eq("brand_id", "kexcelled");

  query = process.env.NODE_ENV === "production"
    ? query.eq("status", "published").eq("publication_status", "published")
    : query.in("status", ["draft", "pending_review"]).eq("publication_status", "draft");

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: "Product image lookup failed" }, { status: 500 });
  }

  const productImage = (data ?? []).flatMap((row) => {
    if (sourceRunId && row.source_run_id !== sourceRunId) return [];
    const draftData = objectValue(row.draft_data);
    return Array.isArray(draftData.images) ? draftData.images : [];
  }).map(objectValue).find((image) => (
    (assetKey
      ? text(image.r2ObjectKey) === assetKey
      : ["product", "sku_thumbnail", "sku-thumb"].includes(text(image.role) || text(image.imageRole)))
    && (sourceRunId ? true : text(image.productLineId) === productLineId)
    && Boolean(text(image.r2ObjectKey))
  ));

  if (!productImage) {
    return NextResponse.json({ error: "Product image not found" }, { status: 404 });
  }

  try {
    const asset = await readFipAssetFromR2(text(productImage.r2ObjectKey));
    return new NextResponse(Buffer.from(asset.bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Product image unavailable" }, { status: 404 });
  }
}
