import { NextRequest, NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import { hasAdminScope } from "@/lib/admin/permissions";
import { getFilamentDraftById } from "@/lib/filaments/imports/supabase-import-repository";
import { FilamentAdminUpdateError, updateFilamentDraftAsAdmin } from "@/lib/filaments/admin/filament-admin-service";
import type { FilamentAdminPatch } from "@/lib/filaments/admin/filament-admin";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminScope(session.role, "display.view")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { draftId } = await params;
  const draft = await getFilamentDraftById(draftId);
  return draft ? NextResponse.json({ draft }) : NextResponse.json({ error: "draft_not_found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { patch?: FilamentAdminPatch; expectedUpdatedAt?: string };
    const { draftId } = await params;
    const draft = await updateFilamentDraftAsAdmin({
      session,
      draftId,
      patch: body.patch || {},
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    const status = error instanceof FilamentAdminUpdateError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "update_failed" }, { status });
  }
}
