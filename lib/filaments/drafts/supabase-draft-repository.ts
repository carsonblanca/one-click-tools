import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";

export type SupabaseFilamentDraftRow = {
  id: string;
  import_id: string;
  draft_key: string;
  source_run_id: string;
  product_index: number;
  status: string;
  review_status: string;
  publication_status: string;
  brand_id: string;
  product_line_name: string | null;
  material_type: string | null;
  variant: string | null;
  draft_data: unknown;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  revision: number;
};

export async function listSupabaseFilamentDraftRows() {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(
      "id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at,created_by,updated_by,revision",
    )
    .order("updated_at", { ascending: false })
    .returns<SupabaseFilamentDraftRow[]>();

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_list_filament_drafts_failed:${code}`);
  }
  return data ?? [];
}

const DRAFT_SELECT =
  "id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at,created_by,updated_by,revision";

export async function getSupabaseFilamentDraftRowBySourceRunId(sourceRunId: string) {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(DRAFT_SELECT)
    .eq("source_run_id", sourceRunId)
    .order("product_index", { ascending: true })
    .limit(1)
    .maybeSingle()
    .returns<SupabaseFilamentDraftRow | null>();

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_get_filament_draft_failed:${code}`);
  }
  return data ?? null;
}

export async function listPublishedSupabaseFilamentDraftRows() {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(DRAFT_SELECT)
    .in("publication_status", ["directory_preview", "complete_profile", "published"])
    .order("updated_at", { ascending: false })
    .returns<SupabaseFilamentDraftRow[]>();

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_list_published_filament_drafts_failed:${code}`);
  }
  return data ?? [];
}

export async function updateSupabaseFilamentDraftRow(input: {
  sourceRunId: string;
  draftData: unknown;
  status?: string;
  reviewStatus?: string;
  publicationStatus?: string;
  productLineName?: string | null;
  materialType?: string | null;
  variant?: string | null;
  updatedBy: string;
}) {
  const patch: Record<string, unknown> = {
    draft_data: input.draftData,
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (input.status) patch.status = input.status;
  if (input.reviewStatus) patch.review_status = input.reviewStatus;
  if (input.publicationStatus) patch.publication_status = input.publicationStatus;
  if (input.productLineName !== undefined) patch.product_line_name = input.productLineName;
  if (input.materialType !== undefined) patch.material_type = input.materialType;
  if (input.variant !== undefined) patch.variant = input.variant;

  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .update(patch)
    .eq("source_run_id", input.sourceRunId)
    .select(DRAFT_SELECT)
    .limit(1)
    .single()
    .returns<SupabaseFilamentDraftRow>();

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_update_filament_draft_failed:${code}`);
  }
  return data;
}
