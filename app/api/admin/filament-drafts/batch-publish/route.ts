import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  appendAdminAuditLog,
  getFilamentDraftByIdAndSourceRunId,
  getFilamentDraftBySourceRunId,
} from "@/lib/filaments/imports/supabase-import-repository";
import {
  parseBatchPublishRequest,
  publishDraftBatch,
  type PublishDraftState,
} from "@/lib/filaments/publishing/batch-publish";
import { publishSupabaseFilamentDraft } from "@/lib/filaments/publishing/supabase-publish-repository";

export const runtime = "nodejs";

function draftState(row: NonNullable<Awaited<ReturnType<typeof getFilamentDraftBySourceRunId>>>): PublishDraftState {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    status: row.status,
    publicationStatus: row.publication_status,
  };
}

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

  const parsed = parseBatchPublishRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, published: [], failed: [] }, { status: 400 });
  }

  const result = await publishDraftBatch({
    sourceRunIds: parsed.items.map((item) => item.sourceRunId),
    actorId: session.actorId,
    draftId: parsed.items.length === 1 ? parsed.items[0].draftId : undefined,
    drafts: parsed.items.every((item): item is { sourceRunId: string; draftId: string } => Boolean(item.draftId))
      ? parsed.items as Array<{ sourceRunId: string; draftId: string }>
      : undefined,
  }, {
    async readDraft(sourceRunId, draftId) {
      const row = draftId
        ? await getFilamentDraftByIdAndSourceRunId(draftId, sourceRunId)
        : await getFilamentDraftBySourceRunId(sourceRunId);
      return row ? draftState(row) : null;
    },
    publishDraft: publishSupabaseFilamentDraft,
    async appendAuditLog({ actorId, draftId, sourceRunId }) {
      await appendAdminAuditLog({
        actorId,
        action: "filament_draft.published",
        entityType: "filament_draft",
        entityId: draftId,
        details: { sourceRunId },
      });
    },
  });

  return NextResponse.json(result);
}
