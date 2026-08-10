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
  const { data, error } = await getServerSupabaseClient()
    .from("filament_imports")
    .select("*")
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

/** Read-only catalog source: only explicitly published drafts are visible publicly. */
export async function listPublishedFilamentDrafts() {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select("id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at")
    .eq("publication_status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw repositoryError("list_published_drafts");
  return (data ?? []) as Array<{
    id: string; import_id: string; draft_key: string; source_run_id: string; product_index: number;
    status: string; review_status: string; publication_status: string; brand_id: string;
    product_line_name: string | null; material_type: string | null; variant: string | null;
    draft_data: JsonValue; created_at: string; updated_at: string;
  }>;
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


export type FilamentDraftRow = {
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
};

const FILAMENT_DRAFT_COLUMNS = "id,import_id,draft_key,source_run_id,product_index,status,review_status,publication_status,brand_id,product_line_name,material_type,variant,draft_data,created_at,updated_at,created_by,updated_by";

export async function listAllFilamentDrafts(limit = 5000): Promise<FilamentDraftRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20_000));
  const pageSize = 500;
  const rows: FilamentDraftRow[] = [];
  for (let offset = 0; offset < safeLimit; offset += pageSize) {
    const last = Math.min(offset + pageSize, safeLimit) - 1;
    const { data, error } = await getServerSupabaseClient()
      .from("filament_drafts")
      .select(FILAMENT_DRAFT_COLUMNS)
      .order("updated_at", { ascending: false })
      .range(offset, last);
    if (error) throw repositoryError("list_all_drafts");
    const page = (data ?? []) as FilamentDraftRow[];
    rows.push(...page);
    if (page.length < last - offset + 1) break;
  }
  return rows;
}

export async function getFilamentDraftById(id: string): Promise<FilamentDraftRow | null> {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_drafts")
    .select(FILAMENT_DRAFT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw repositoryError("get_draft_by_id");
  return data as FilamentDraftRow | null;
}

export async function updateFilamentDraftById(input: {
  id: string;
  expectedUpdatedAt?: string;
  actorId: string;
  brandId: string;
  productLineName: string | null;
  materialType: string | null;
  variant: string | null;
  reviewStatus: string;
  publicationStatus: string;
  status: string;
  draftData: JsonValue;
}): Promise<FilamentDraftRow> {
  let query = getServerSupabaseClient()
    .from("filament_drafts")
    .update({
      brand_id: input.brandId,
      product_line_name: input.productLineName,
      material_type: input.materialType,
      variant: input.variant,
      review_status: input.reviewStatus,
      publication_status: input.publicationStatus,
      status: input.status,
      draft_data: input.draftData,
      updated_by: input.actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (input.expectedUpdatedAt) query = query.eq("updated_at", input.expectedUpdatedAt);
  const { data, error } = await query.select(FILAMENT_DRAFT_COLUMNS).maybeSingle();
  if (error) throw repositoryError("update_draft_by_id");
  if (!data) throw new Error("filament_draft_update_conflict");
  return data as FilamentDraftRow;
}

async function readAllSnapshotRows(table: "filament_imports" | "filament_drafts") {
  const pageSize = 500;
  const rows: Array<Record<string, JsonValue>> = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getServerSupabaseClient()
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw repositoryError(`snapshot_${table}`);
    const page = (data ?? []) as Array<Record<string, JsonValue>>;
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function readFilamentBusinessSnapshot() {
  const [imports, drafts] = await Promise.all([
    readAllSnapshotRows("filament_imports"),
    readAllSnapshotRows("filament_drafts"),
  ]);
  return { imports, drafts };
}

async function deleteExactIds(table: "filament_drafts" | "filament_imports", ids: string[]) {
  let removed = 0;
  for (let index = 0; index < ids.length; index += 100) {
    const batch = ids.slice(index, index + 100);
    if (!batch.length) continue;
    const { count, error } = await getServerSupabaseClient()
      .from(table)
      .delete({ count: "exact" })
      .in("id", batch);
    if (error) throw repositoryError(`clear_${table}`);
    removed += count ?? 0;
  }
  return removed;
}

export async function clearExactFilamentBusinessRecords(input: {
  draftIds: string[];
  importIds: string[];
}) {
  const deletedDrafts = await deleteExactIds("filament_drafts", input.draftIds);
  const deletedImports = await deleteExactIds("filament_imports", input.importIds);
  return { deletedDrafts, deletedImports };
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
