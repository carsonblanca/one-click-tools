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
  const sourceRunId = request.nextUrl.searchParams.get("sourceRunId")?.trim() || "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(sourceRunId)) {
    return NextResponse.json({ error: "Invalid sourceRunId" }, { status: 400 });
  }

  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select("draft_data")
    .eq("source_run_id", sourceRunId)
    .eq("status", "published")
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Product image lookup failed" }, { status: 500 });
  }

  const draftData = objectValue(data?.draft_data);
  const productImage = (Array.isArray(draftData.images) ? draftData.images : [])
    .map(objectValue).find((image) => (
    text(image.role) === "product"
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
