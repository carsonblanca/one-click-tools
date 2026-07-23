import { NextRequest, NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin/auth";
import { hasAdminScope } from "@/lib/admin/permissions";
import {
  appendAdminAuditLog,
  countFilamentDrafts,
  countFilamentImports,
  getFilamentDraftBySourceRunId,
  listPublishedFilamentDrafts,
  publishFilamentDraft,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  validateDraftForPublish,
  validateSinglePublishRequest,
} from "@/lib/filaments/publishing/minimal-publish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await readAdminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: "需要认证。" }, { status: 401 });
  }
  if (!hasAdminScope(session.role, "publish.execute") || session.role !== "admin") {
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
  const publishRequest = body as { sourceRunIds: string[]; draftId?: string };
  const sourceRunId = publishRequest.sourceRunIds[0];

  try {
    const [draftCount, importCount, sourceMatchCount, current, publishedRows] = await Promise.all([
      countFilamentDrafts(),
      countFilamentImports(),
      countFilamentDrafts(sourceRunId),
      getFilamentDraftBySourceRunId(sourceRunId),
      listPublishedFilamentDrafts(),
    ]);
    if (sourceMatchCount !== 1) {
      return NextResponse.json({
        error: sourceMatchCount === 0 ? "草稿不存在。" : "sourceRunId 匹配到多条草稿。",
        counts: { drafts: draftCount, imports: importCount, sourceMatches: sourceMatchCount },
      }, { status: 409 });
    }

    const issues = validateDraftForPublish(current, publishedRows, {
      sourceRunId,
      draftId: publishRequest.draftId,
    });
    if (issues.length) {
      return NextResponse.json({ error: "草稿未通过发布校验。", issues }, { status: 409 });
    }

    await publishFilamentDraft({
      sourceRunId,
      draftId: current!.id,
      actorId: session.actorId,
    });

    const [readback, draftsAfter, importsAfter, sourceMatchesAfter] = await Promise.all([
      getFilamentDraftBySourceRunId(sourceRunId),
      countFilamentDrafts(),
      countFilamentImports(),
      countFilamentDrafts(sourceRunId),
    ]);
    if (!readback
      || readback.id !== current!.id
      || readback.source_run_id !== sourceRunId
      || readback.publication_status !== "published"
      || draftsAfter !== draftCount
      || importsAfter !== importCount
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
