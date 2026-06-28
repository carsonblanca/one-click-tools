import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.create")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const html = await readFile(
    path.join(process.cwd(), "tools/filament-evidence-importer/manual_color_card_annotator.html"),
    "utf8",
  );
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self' blob: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob: data:;",
    },
  });
}

