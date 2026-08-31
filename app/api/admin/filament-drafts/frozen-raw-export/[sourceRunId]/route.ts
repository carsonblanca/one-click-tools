import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import {
  frozenAssetObjectKeys,
  mayReadFrozenRawExport,
} from "@/lib/filaments/imports/frozen-raw-export";
import {
  getFilamentDraftRawBySourceRunId,
  getFilamentImportRawById,
} from "@/lib/filaments/imports/supabase-import-repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceRunId: string }> },
) {
  const { sourceRunId } = await params;
  const session = await readAdminSession();
  if (!mayReadFrozenRawExport(session, sourceRunId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await getFilamentDraftRawBySourceRunId(sourceRunId);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parentImport = await getFilamentImportRawById(draft.import_id);
  if (!parentImport) {
    return NextResponse.json({ error: "Frozen import parent missing" }, { status: 404 });
  }

  return NextResponse.json({
    draft,
    parentImport,
    assetKeys: frozenAssetObjectKeys(draft.draft_data),
  });
}
