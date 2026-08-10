import { NextRequest, NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import { hasAdminScope } from "@/lib/admin/permissions";
import { updateFilamentDraftAsAdmin } from "@/lib/filaments/admin/filament-admin-service";
import type { FilamentAdminPatch } from "@/lib/filaments/admin/filament-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "admin" || !hasAdminScope(session.role, "candidate.edit.any")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    draftIds?: string[];
    patch?: FilamentAdminPatch;
    confirmed?: boolean;
    expectedUpdatedAt?: Record<string, string>;
  } | null;
  const draftIds = [...new Set(body?.draftIds?.filter((id) => typeof id === "string" && id) || [])];
  if (!body?.confirmed || !draftIds.length || draftIds.length > 200 || !body.patch) {
    return NextResponse.json({ error: "invalid_or_unconfirmed_batch" }, { status: 400 });
  }
  const results = [];
  for (const draftId of draftIds) {
    try {
      const draft = await updateFilamentDraftAsAdmin({
        session,
        draftId,
        patch: body.patch,
        expectedUpdatedAt: body.expectedUpdatedAt?.[draftId],
      });
      results.push({ draftId, ok: true, updatedAt: draft.updated_at });
    } catch (error) {
      results.push({ draftId, ok: false, error: error instanceof Error ? error.message : "update_failed" });
    }
  }
  return NextResponse.json({ selectedCount: draftIds.length, results });
}
