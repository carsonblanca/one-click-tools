import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  getFilamentEvidenceDraft,
  resolveEvidenceDraftAsset,
} from "@/lib/filaments/evidence/evidence-draft-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { id } = await context.params;
  if (!/^evidence-[A-Za-z0-9-]+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const draft = await getFilamentEvidenceDraft(id);
  if (!draft) return new NextResponse("Not found", { status: 404 });
  const filePath = resolveEvidenceDraftAsset(draft.sourceImageAssetId);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
  return new NextResponse(await readFile(filePath), {
    headers: { "content-type": mimeType, "cache-control": "private, no-store" },
  });
}

