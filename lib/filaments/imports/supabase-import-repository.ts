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
