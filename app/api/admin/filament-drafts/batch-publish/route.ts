import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  countFilamentDrafts,
  countFilamentImports,
  getFilamentDraftBySourceRunId,
  listPublishedFilamentDrafts,
  publishFilamentDraft,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  GOLDEN_DRAFT_ID,
  validateDraftForPublish,
  validateSinglePublishRequest,
} from "@/lib/filaments/publishing/minimal-publish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "publish.execute") || session.role !== "admin") {
    return NextResponse.json({ error: "无权发布耗材。" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const requestIssues = validateSinglePublishRequest(body);
  if (requestIssues.length) {
    return NextResponse.json({ error: requestIssues.join(" ") }, { status: 400 });
  }
  const sourceRunId = (body as { sourceRunIds: string[] }).sourceRunIds[0];

  try {
    const [draftCount, importCount, sourceMatchCount, current, publishedRows] = await Promise.all([
      countFilamentDrafts(),
      countFilamentImports(),
      countFilamentDrafts(sourceRunId),
      getFilamentDraftBySourceRunId(sourceRunId),
      listPublishedFilamentDrafts(),
    ]);
    if (draftCount !== 1 || importCount !== 1 || sourceMatchCount !== 1) {
      return NextResponse.json({
        error: "发布前数据库数量门禁不一致。",
        counts: { drafts: draftCount, imports: importCount, sourceMatches: sourceMatchCount },
      }, { status: 409 });
    }

    const issues = validateDraftForPublish(current, publishedRows);
    if (issues.length) {
      return NextResponse.json({ error: "草稿未通过发布校验。", issues }, { status: 409 });
    }

    await publishFilamentDraft({
      sourceRunId,
      draftId: GOLDEN_DRAFT_ID,
      actorId: session.actorId,
    });

    const [readback, draftsAfter, importsAfter, sourceMatchesAfter] = await Promise.all([
      getFilamentDraftBySourceRunId(sourceRunId),
      countFilamentDrafts(),
      countFilamentImports(),
      countFilamentDrafts(sourceRunId),
    ]);
    if (!readback
      || readback.id !== GOLDEN_DRAFT_ID
      || readback.publication_status !== "published"
      || draftsAfter !== 1
      || importsAfter !== 1
      || sourceMatchesAfter !== 1) {
      return NextResponse.json({ error: "发布写后回读不一致。" }, { status: 500 });
    }

    try {
      await appendAdminAuditLog({
        actorId: session.actorId,
        action: "filament_draft.published",
        entityType: "filament_draft",
        entityId: readback.id,
        details: { sourceRunId },
      });
    } catch {
      // Audit failure must not repeat or roll back an already successful publication.
    }

    return NextResponse.json({
      published: [sourceRunId],
      readback: {
        draftId: readback.id,
        sourceRunId: readback.source_run_id,
        publicationStatus: readback.publication_status,
        drafts: draftsAfter,
        imports: importsAfter,
        sourceMatches: sourceMatchesAfter,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "publish_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
