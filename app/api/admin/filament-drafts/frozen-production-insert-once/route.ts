import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import {
  FROZEN_ABS_EXECUTE_HEADER_VALUE,
  mayExecuteFrozenProductionInsert,
  parseFrozenProductionExecutablePayload,
} from "@/lib/filaments/imports/frozen-production-insert-once";
import {
  createFilamentDrafts,
  createFilamentImport,
  getFilamentDraftBySourceRunId,
  getFilamentDraftCollisionRowsByDraftKeys,
  getFilamentDraftCollisionRowsBySourceRunIds,
  getFilamentImportCollisionRowsByIds,
  getFilamentImportCollisionRowsBySourceRunIds,
  getFilamentImportRawById,
} from "@/lib/filaments/imports/supabase-import-repository";
import { FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS } from "@/lib/filaments/imports/frozen-production-preflight";
import { frozenAbsExecutablePayloadRaw } from "@/lib/filaments/imports/frozen-production-executable-payload";

export const runtime = "nodejs";

const PAGE_EXECUTE_HEADER_VALUE = "confirm-frozen-abs-page-insert-only";

function isProduction() {
  return process.env.VERCEL_ENV === "production";
}

async function collisionState() {
  const sourceRunIds = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.sourceRunId);
  const draftKeys = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.draftKey);
  const parentIds = FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS.map((target) => target.parentImportId);
  const [sourceDrafts, draftKeysFound, sourceImports, parentIdsFound] = await Promise.all([
    getFilamentDraftCollisionRowsBySourceRunIds(sourceRunIds),
    getFilamentDraftCollisionRowsByDraftKeys(draftKeys),
    getFilamentImportCollisionRowsBySourceRunIds(sourceRunIds),
    getFilamentImportCollisionRowsByIds(parentIds),
  ]);
  return { sourceDrafts, draftKeysFound, sourceImports, parentIdsFound };
}

export async function POST(request: Request) {
  const session = await readAdminSession();
  const actorId = session?.actorId;
  if (!mayExecuteFrozenProductionInsert(session) || !actorId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestBody = await request.text();
  const pageExecution = requestBody.length === 0 && request.headers.get("x-frozen-abs-page-execute") === PAGE_EXECUTE_HEADER_VALUE;
  const payload = parseFrozenProductionExecutablePayload(pageExecution ? frozenAbsExecutablePayloadRaw() : requestBody);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.code }, { status: 400 });
  }

  const collisions = await collisionState();
  if (collisions.sourceDrafts.length || collisions.draftKeysFound.length || collisions.sourceImports.length || collisions.parentIdsFound.length) {
    return NextResponse.json({ error: "collision_detected", collisions }, { status: 409 });
  }

  if (!isProduction()) {
    return NextResponse.json({ dryRun: true, insertOnly: true, sourceCount: payload.records.length });
  }
  if (!pageExecution && request.headers.get("x-frozen-abs-execute") !== FROZEN_ABS_EXECUTE_HEADER_VALUE) {
    return NextResponse.json({ error: "explicit_execute_confirmation_required" }, { status: 409 });
  }

  const inserted = [] as Array<{ sourceRunId: string; parentId: string; draftId: string }>;
  for (const record of payload.records) {
    const parentId = randomUUID();
    const draftId = randomUUID();
    const parent = record.parentImport;
    const draft = record.draft;
    await createFilamentImport({
      id: parentId,
      sourceRunId: record.sourceRunId,
      brandId: parent.brand_id,
      originalFilename: parent.original_filename,
      r2Bucket: parent.r2_bucket,
      r2ObjectKey: parent.r2_object_key,
      contentType: parent.content_type,
      byteSize: parent.byte_size,
      status: "draft",
      manifest: parent.manifest,
      evidence: parent.evidence,
      errorMessage: parent.error_message,
      createdBy: actorId,
    });
    await createFilamentDrafts([{
      id: draftId,
      importId: parentId,
      draftKey: draft.draft_key,
      sourceRunId: record.sourceRunId,
      productIndex: draft.product_index,
      brandId: draft.brand_id,
      productLineName: draft.product_line_name,
      materialType: draft.material_type,
      variant: draft.variant,
      draftData: draft.draft_data,
      actorId,
    }]);
    const [readbackDraft, readbackParent] = await Promise.all([
      getFilamentDraftBySourceRunId(record.sourceRunId),
      getFilamentImportRawById(parentId),
    ]);
    if (!readbackDraft || !readbackParent || readbackDraft.id !== draftId || readbackDraft.import_id !== parentId || readbackDraft.draft_key !== draft.draft_key || readbackDraft.status !== "draft" || readbackDraft.review_status !== "pending_review" || readbackDraft.publication_status !== "draft" || readbackParent.source_run_id !== record.sourceRunId || readbackParent.status !== "draft") {
      return NextResponse.json({ error: "post_insert_readback_failed", inserted }, { status: 500 });
    }
    inserted.push({ sourceRunId: record.sourceRunId, parentId, draftId });
  }

  return NextResponse.json({ insertOnly: true, inserted });
}
