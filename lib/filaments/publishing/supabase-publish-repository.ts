import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { PublishDraftState } from "@/lib/filaments/publishing/batch-publish";

type PublishDraftRow = {
  id: string;
  source_run_id: string;
  status: string;
  publication_status: string;
};

function mapDraftState(row: PublishDraftRow): PublishDraftState {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    status: row.status,
    publicationStatus: row.publication_status,
  };
}

export async function publishSupabaseFilamentDraft(input: {
  sourceRunId: string;
  draftId: string;
  actorId: string;
}): Promise<PublishDraftState> {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .update({
      status: "published",
      review_status: "approved",
      publication_status: "published",
      updated_by: input.actorId,
    })
    .eq("id", input.draftId)
    .eq("source_run_id", input.sourceRunId)
    .eq("status", "draft")
    .eq("publication_status", "draft")
    .select("id,source_run_id,status,publication_status")
    .maybeSingle<PublishDraftRow>();

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_publish_filament_draft_failed:${code}`);
  }
  if (!data) throw new Error("publish_draft_precondition_failed");
  return mapDraftState(data);
}
