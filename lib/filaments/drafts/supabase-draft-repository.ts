import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";

export type UpdateDraftInput = {
  sourceRunId: string;
  draftData: unknown;
  status?: string;
  reviewStatus?: string;
  publicationStatus?: string;
  productLineName?: string | null;
  materialType?: string | null;
  variant?: string | null;
  updatedBy: string;
};

export async function updateSupabaseFilamentDraftRow(input: UpdateDraftInput) {
  const updatePayload: Record<string, unknown> = {
    draft_data: input.draftData,
    updated_by: input.updatedBy,
  };
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.reviewStatus !== undefined) updatePayload.review_status = input.reviewStatus;
  if (input.publicationStatus !== undefined) updatePayload.publication_status = input.publicationStatus;
  if (input.productLineName !== undefined) updatePayload.product_line_name = input.productLineName;
  if (input.materialType !== undefined) updatePayload.material_type = input.materialType;
  if (input.variant !== undefined) updatePayload.variant = input.variant;

  const { error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .update(updatePayload)
    .eq("source_run_id", input.sourceRunId);

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_update_filament_draft_failed:${code}`);
  }
}
