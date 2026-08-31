import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import {
  FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS,
  frozenProductionParentStrategy,
  mayReadFrozenProductionPreflight,
} from "@/lib/filaments/imports/frozen-production-preflight";
import {
  getFilamentDraftCollisionRowsByDraftKeys,
  getFilamentDraftCollisionRowsBySourceRunIds,
  getFilamentImportCollisionRowsByIds,
  getFilamentImportCollisionRowsBySourceRunIds,
} from "@/lib/filaments/imports/supabase-import-repository";

export const runtime = "nodejs";

export async function GET() {
  const session = await readAdminSession();
  if (!mayReadFrozenProductionPreflight(session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sourceRunIds = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.sourceRunId);
  const draftKeys = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.draftKey);
  const parentImportIds = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.parentImportId);
  const [sourceDraftRows, draftKeyRows, sourceImportRows, parentImportRows] = await Promise.all([
    getFilamentDraftCollisionRowsBySourceRunIds(sourceRunIds),
    getFilamentDraftCollisionRowsByDraftKeys(draftKeys),
    getFilamentImportCollisionRowsBySourceRunIds(sourceRunIds),
    getFilamentImportCollisionRowsByIds(parentImportIds),
  ]);

  const sourceRunCollisionCount = new Set([
    ...sourceDraftRows.map((row) => `draft:${row.id}`),
    ...sourceImportRows.map((row) => `import:${row.id}`),
  ]).size;
  const parentIdCollisionCount = parentImportRows.length;

  return NextResponse.json({
    targets: FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS,
    sourceRunCollisions: { drafts: sourceDraftRows, imports: sourceImportRows },
    draftKeyCollisions: draftKeyRows,
    parentImportIdCollisions: parentImportRows,
    parentStrategy: frozenProductionParentStrategy({ sourceRunCollisionCount, parentIdCollisionCount }),
  });
}
