import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import { hasAdminScope } from "@/lib/admin/permissions";
import { getFilamentDraftById } from "@/lib/filaments/imports/supabase-import-repository";
import { updateFilamentDraftAsAdmin } from "@/lib/filaments/admin/filament-admin-service";
import { uploadFipAssetToR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function colorIdentifier(value: Record<string, unknown>) {
  return String(value.colorId || value.matchKey || value.officialColorCode || value.colorCode || value.sku || value.rawSkuId || "");
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { draftId } = await params;
  const draft = await getFilamentDraftById(draftId);
  if (!draft) return NextResponse.json({ error: "draft_not_found" }, { status: 404 });
  const requiredScope = draft.publication_status === "published" ? "display.published.edit" : "display.draft.edit";
  if (!hasAdminScope(session.role, requiredScope)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const role = String(form.get("role") || "product");
  const colorKey = String(form.get("colorKey") || "");
  if (!(file instanceof File) || !EXTENSION_BY_TYPE[file.type] || file.size <= 0 || file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "invalid_image_file" }, { status: 400 });
  }
  if (!new Set(["product", "color", "evidence-only"]).has(role)) {
    return NextResponse.json({ error: "invalid_image_role" }, { status: 400 });
  }

  const data = objectValue(draft.draft_data);
  const productLine = objectValue(data.productLine);
  const productLineId = String(data.productKey || productLine.productKey || productLine.productLineId || draft.draft_key);
  const colors = Array.isArray(data.colors) ? data.colors.map(objectValue) : [];
  const images = Array.isArray(data.images) ? data.images.map(objectValue) : [];
  const targetColorIndex = role === "color" ? colors.findIndex((color) => colorIdentifier(color) === colorKey) : -1;
  if (role === "color" && targetColorIndex < 0) {
    return NextResponse.json({ error: "color_not_found" }, { status: 400 });
  }

  const imageId = `admin-${randomUUID()}`;
  const stored = await uploadFipAssetToR2({
    importId: draft.import_id,
    brandId: draft.brand_id,
    packagePath: `manual-assets/${imageId}.${EXTENSION_BY_TYPE[file.type]}`,
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  });
  const nextImages = [...images, {
    imageId,
    role,
    productLineId,
    r2ObjectKey: stored.objectKey,
    source: "admin_manual",
    sourceType: "admin_manual",
    originalFilename: file.name,
    updatedBy: session.actorId,
    updatedAt: new Date().toISOString(),
  }];
  const nextColors = colors.map((color, index) => index === targetColorIndex
    ? { ...color, localImagePath: stored.objectKey, imageStatus: "available" }
    : color);
  try {
    const updated = await updateFilamentDraftAsAdmin({
      session,
      draftId: draft.id,
      expectedUpdatedAt: draft.updated_at,
      patch: { images: nextImages, ...(role === "color" ? { colors: nextColors } : {}) },
    });
    return NextResponse.json({ imageId, role, r2ObjectKey: stored.objectKey, draft: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "image_update_failed", orphanedObjectKey: stored.objectKey }, { status: 409 });
  }
}
