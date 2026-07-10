import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import { uploadManualFilamentAssetToR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const PRESET_EXTENSIONS = [".json", ".bbscfg", ".3mf", ".zip", ".txt", ".ini"];

function extensionOf(name: string) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "display.draft.create")) {
    return NextResponse.json({ error: "无权上传耗材资产。" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const brandId = String(form.get("brandId") || "").trim();
    const kind = String(form.get("kind") || "").trim();
    if (!brandId) return NextResponse.json({ error: "缺少品牌。" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "缺少文件。" }, { status: 400 });
    if (kind !== "image" && kind !== "preset") {
      return NextResponse.json({ error: "资产类型无效。" }, { status: 400 });
    }

    if (kind === "image" && !IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "仅支持 PNG/JPEG/WebP/GIF 图片。" }, { status: 400 });
    }
    if (kind === "preset" && !PRESET_EXTENSIONS.includes(extensionOf(file.name))) {
      return NextResponse.json({ error: "预设文件格式不支持。" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const upload = await uploadManualFilamentAssetToR2({
      brandId,
      kind: kind === "image" ? "images" : "presets",
      bytes,
      originalFilename: file.name,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      asset: {
        id: randomUUID(),
        kind,
        fileName: file.name,
        objectKey: upload.objectKey,
        url: upload.url,
        contentType: file.type || "application/octet-stream",
        size: bytes.byteLength,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "asset_upload_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
