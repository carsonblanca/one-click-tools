import { createHash } from "node:crypto";
import type { AdminSession } from "@/lib/admin/types";
import { frozenAssetObjectKeys } from "./frozen-raw-export";
import { FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS } from "./frozen-production-preflight";
import type { JsonValue, RawFilamentDraftRow } from "./supabase-import-repository";

export const FROZEN_ABS_EXECUTABLE_PAYLOAD_SHA256 = "6c84f89bec83e38bbf40387185f1d112a4d9c14fad62ce55d9faf2e1d2444d97";
export const FROZEN_ABS_EXECUTE_HEADER_VALUE = "confirm-frozen-abs-insert-only";

const EXPECTED_RAW_HASHES = new Map([
  ["capture-20260817024719-a9870e0684e1-4b966ba9", { draft: "e9c8394ec7ea34bdd9d7c9c9e1f0e7c3dee92d5b902c7c56ff6b9be6366f7e47", parent: "2ca5df5f6d3e3e7d574f4b0a37a3a56928608989d3c15ac4f84896484aa9d023" }],
  ["capture-20260817024614-e0d318af934a-0037851c", { draft: "a83fca845624ef9d1945980df5607a45a2c6c57bf1c4fad3498399e2ac048c68", parent: "931edd7b68b80e66ea7072dc1a5e0ba09cd8271b5ce4b59e90f9b34cf85009f0" }],
  ["capture-20260817024438-9acb75e7a1e3-d9ed9669", { draft: "888be88eae58f6c648abafaeeada11eb908ac72eb661860924f2c22e5c8a2b1a", parent: "f219eea7d359bde2e7d4c50cc2e0b7bf29c74bb180392a9072563b72c2db39cd" }],
  ["capture-20260817024828-d998ea43cf3a-27ab63c4", { draft: "d805405d47157ded79c8cf42b0d1a4dc445920d53d3c08ecf30c82a81ddfd770", parent: "bbedef46d0f4da45ec708c34a8996116cb9473a46e06ca62c161cbe277ee3466" }],
] as const);

type RawParentImport = {
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
};

export type FrozenProductionInsertRecord = {
  sourceRunId: string;
  draft: RawFilamentDraftRow;
  parentImport: RawParentImport;
  assetKeys: string[];
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRawParentImport(value: unknown): value is RawParentImport {
  if (!isRecord(value)) return false;
  return ["id", "source_run_id", "brand_id", "original_filename", "r2_bucket", "r2_object_key"].every((key) => typeof value[key] === "string")
    && isStringOrNull(value.content_type)
    && (value.byte_size === null || typeof value.byte_size === "number")
    && isRecord(value.manifest)
    && (value.evidence === null || isRecord(value.evidence) || Array.isArray(value.evidence))
    && isStringOrNull(value.error_message);
}

function isRawDraft(value: unknown): value is RawFilamentDraftRow {
  if (!isRecord(value)) return false;
  return ["id", "import_id", "draft_key", "source_run_id", "brand_id", "created_by", "updated_by"].every((key) => typeof value[key] === "string")
    && typeof value.product_index === "number"
    && isStringOrNull(value.product_line_name)
    && isStringOrNull(value.material_type)
    && isStringOrNull(value.variant)
    && isRecord(value.draft_data);
}

export function mayExecuteFrozenProductionInsert(session: AdminSession | null): boolean {
  return session?.actorType === "human" && session.role === "admin";
}

export function parseFrozenProductionExecutablePayload(rawBody: string):
  | { ok: true; records: FrozenProductionInsertRecord[] }
  | { ok: false; code: "payload_hash_mismatch" | "payload_invalid" | "payload_integrity_mismatch" } {
  if (sha256(rawBody) !== FROZEN_ABS_EXECUTABLE_PAYLOAD_SHA256) {
    return { ok: false, code: "payload_hash_mismatch" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, code: "payload_invalid" };
  }
  if (!isRecord(payload) || payload.mode !== "insert_only" || !Array.isArray(payload.records) || payload.records.length !== 4) {
    return { ok: false, code: "payload_invalid" };
  }

  const records: FrozenProductionInsertRecord[] = [];
  for (const target of FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS) {
    const item = payload.records.find((candidate) => isRecord(candidate) && candidate.sourceRunId === target.sourceRunId);
    if (!isRecord(item) || !isRecord(item.sourceRaw) || !isRawDraft(item.sourceRaw.draft) || !isRawParentImport(item.sourceRaw.parentImport) || !Array.isArray(item.sourceRaw.assetKeys) || !item.sourceRaw.assetKeys.every((key) => typeof key === "string")) {
      return { ok: false, code: "payload_invalid" };
    }
    const draft = item.sourceRaw.draft;
    const parentImport = item.sourceRaw.parentImport;
    const assetKeys = [...item.sourceRaw.assetKeys].sort();
    const expectedHashes = EXPECTED_RAW_HASHES.get(target.sourceRunId);
    if (!expectedHashes || draft.source_run_id !== target.sourceRunId || draft.draft_key !== target.draftKey || draft.import_id !== parentImport.id || parentImport.id !== target.parentImportId || parentImport.source_run_id !== target.sourceRunId || sha256(JSON.stringify(draft)) !== expectedHashes.draft || sha256(JSON.stringify(parentImport)) !== expectedHashes.parent || JSON.stringify(assetKeys) !== JSON.stringify(frozenAssetObjectKeys(draft.draft_data))) {
      return { ok: false, code: "payload_integrity_mismatch" };
    }
    records.push({ sourceRunId: target.sourceRunId, draft, parentImport, assetKeys });
  }

  return { ok: true, records };
}
