import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FilamentImportRecord = {
  id: string;
  sourceRunId: string;
  brandId: string;
  originalFilename: string;
  r2Bucket: string;
  r2ObjectKey: string;
  contentType: string | null;
  byteSize: number | null;
  status: string;
  manifest: JsonValue;
  evidence: JsonValue | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
};

export type CreateFilamentImportInput = Omit<
  FilamentImportRecord,
  "createdAt" | "errorMessage"
> & {
  errorMessage?: string | null;
};

type FilamentImportRow = {
  id: string;
  source_run_id: string;
  brand_id: string;
  original_filename: string;
  r2_bucket: string;
  r2_object_key: string;
  content_type: string | null;
  byte_size: number | null;
  status: string;
  manifest: JsonValue;
  evidence: JsonValue | null;
  error_message: string | null;
  created_at: string;
  created_by: string;
};

function mapImportRow(row: FilamentImportRow): FilamentImportRecord {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    brandId: row.brand_id,
    originalFilename: row.original_filename,
    r2Bucket: row.r2_bucket,
    r2ObjectKey: row.r2_object_key,
    contentType: row.content_type,
    byteSize: row.byte_size,
    status: row.status,
    manifest: row.manifest,
    evidence: row.evidence,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function repositoryError(operation: string) {
  return new Error(`supabase_${operation}_failed`);
}

export async function createFilamentImport(
  input: CreateFilamentImportInput,
): Promise<FilamentImportRecord> {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_imports")
    .insert({
      id: input.id,
      source_run_id: input.sourceRunId,
      brand_id: input.brandId,
      original_filename: input.originalFilename,
      r2_bucket: input.r2Bucket,
      r2_object_key: input.r2ObjectKey,
      content_type: input.contentType,
      byte_size: input.byteSize,
      status: input.status,
      manifest: input.manifest,
      evidence: input.evidence,
      error_message: input.errorMessage ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single<FilamentImportRow>();

  if (error || !data) throw repositoryError("create_import");
  return mapImportRow(data);
}

export async function listRecentFilamentImports(limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getServerSupabaseClient()
    .from("filament_imports")
    .select("*")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .returns<FilamentImportRow[]>();

  if (error) throw repositoryError("list_imports");
  return (data ?? []).map(mapImportRow);
}

export async function getFilamentImportBySourceRunId(sourceRunId: string) {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_imports")
    .select("*")
    .eq("source_run_id", sourceRunId)
    .maybeSingle<FilamentImportRow>();
  if (error) throw repositoryError("get_import");
  return data ? mapImportRow(data) : null;
}

export async function updateFilamentImportBySourceRunId(input: {
  sourceRunId: string;
  originalFilename?: string;
  byteSize?: number | null;
  manifest?: JsonValue;
}) {
  const updatePayload: Record<string, unknown> = {};
  if (input.originalFilename !== undefined) updatePayload.original_filename = input.originalFilename;
  if (input.byteSize !== undefined) updatePayload.byte_size = input.byteSize;
  if (input.manifest !== undefined) updatePayload.manifest = input.manifest;

  const { error } = await getServerSupabaseClient()
    .from("filament_imports")
    .update(updatePayload)
    .eq("source_run_id", input.sourceRunId);

  if (error) {
    const code = error.code || "unknown";
    throw new Error(`supabase_update_import_failed:${code}`);
  }
}

export async function listRecentFilamentDrafts(limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(
      "id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at,created_by,updated_by",
    )
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw repositoryError("list_drafts");
  return (data ?? []) as Array<{
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
    draft_data: JsonValue;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
  }>;
}

export async function appendAdminAuditLog(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details?: JsonValue | null;
}) {
  const { error } = await getServerSupabaseClient()
    .from("admin_audit_logs")
    .insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      details: input.details ?? null,
    });

  if (error) throw repositoryError("append_audit_log");
}

export type CreateFilamentDraftInput = {
  id: string;
  importId: string;
  draftKey: string;
  sourceRunId: string;
  productIndex: number;
  brandId: string;
  productLineName: string | null;
  materialType: string | null;
  variant: string | null;
  draftData: JsonValue;
  actorId: string;
};

export async function createFilamentDrafts(inputs: CreateFilamentDraftInput[]) {
  if (!inputs.length) return [];
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .insert(inputs.map((input) => ({
      id: input.id,
      import_id: input.importId,
      draft_key: input.draftKey,
      source_run_id: input.sourceRunId,
      product_index: input.productIndex,
      status: "draft",
      review_status: "pending_review",
      publication_status: "draft",
      brand_id: input.brandId,
      product_line_name: input.productLineName,
      material_type: input.materialType,
      variant: input.variant,
      draft_data: input.draftData,
      created_by: input.actorId,
      updated_by: input.actorId,
    })))
    .select("id,draft_key,source_run_id,product_index");
  if (error || !data) throw repositoryError("create_drafts");
  return data as Array<{
    id: string;
    draft_key: string;
    source_run_id: string;
    product_index: number;
  }>;
}

export async function deleteFilamentImport(id: string) {
  const { error } = await getServerSupabaseClient()
    .from("filament_imports")
    .delete()
    .eq("id", id);
  if (error) throw repositoryError("delete_import");
}

export async function deleteFilamentDraftsBySourceRunId(sourceRunId: string) {
  const { error, count } = await getServerSupabaseClient()
    .from("filament_drafts")
    .delete({ count: "exact" })
    .eq("source_run_id", sourceRunId);
  if (error) throw repositoryError("delete_drafts");
  return count ?? 0;
}

export async function getFilamentDraftBySourceRunId(sourceRunId: string) {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(
      "id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at",
    )
    .eq("source_run_id", sourceRunId)
    .order("product_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw repositoryError("get_draft");
  return data as {
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
    draft_data: JsonValue;
    created_at: string;
    updated_at: string;
  } | null;
}
