import { createHash, timingSafeEqual } from "node:crypto";
import type { JsonValue } from "../imports/supabase-import-repository";

export const FILAMENT_RESET_BACKUP_SCHEMA_VERSION = 1;

export type FilamentResetEnvironment = "development" | "preview" | "production";

export type FilamentBusinessSnapshot = {
  imports: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
};

export type FilamentResetCounts = {
  imports: number;
  draftRowsTotal: number;
  drafts: number;
  published: number;
  otherPublicationStates: number;
  products: number;
  colors: number;
  images: number;
  colorImageRelations: number;
  uniqueImageReferences: number;
  parameterFields: number;
  parameterCandidates: number;
  parameterEvidence: number;
  topLevelEvidence: number;
  importPackageReferences: number;
  records: Array<{
    id: string;
    sourceRunId: string;
    productKey: string;
    productName: string;
    publicationStatus: string;
  }>;
};

export type FilamentResetBackup = {
  schemaVersion: typeof FILAMENT_RESET_BACKUP_SCHEMA_VERSION;
  kind: "filament-business-reset-backup";
  environment: FilamentResetEnvironment;
  actorId: string;
  createdAt: string;
  snapshotDigest: string;
  counts: FilamentResetCounts;
  imports: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function stableResetJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

export function resetSha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeDigestEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function canonicalSnapshot(snapshot: FilamentBusinessSnapshot) {
  const byId = (left: Record<string, unknown>, right: Record<string, unknown>) =>
    String(left.id || "").localeCompare(String(right.id || ""));
  return {
    imports: [...snapshot.imports].sort(byId),
    drafts: [...snapshot.drafts].sort(byId),
  };
}

function productKeyFromData(data: Record<string, unknown>, fallback: string) {
  const productLine = objectValue(data.productLine);
  return String(data.productKey || productLine.productKey || productLine.productLineId || fallback);
}

export function summarizeResetSnapshot(snapshot: FilamentBusinessSnapshot): FilamentResetCounts {
  const productKeys = new Set<string>();
  const objectRefs = new Set<string>();
  let colors = 0;
  let images = 0;
  let colorImageRelations = 0;
  let parameterFields = 0;
  let parameterCandidates = 0;
  let parameterEvidence = 0;
  let topLevelEvidence = 0;

  const records = snapshot.drafts.map((row) => {
    const data = objectValue(row.draft_data);
    const productLine = objectValue(data.productLine);
    const productKey = productKeyFromData(data, String(row.id || ""));
    if (productKey) productKeys.add(productKey);
    const colorRows = Array.isArray(data.canonicalColors) && data.canonicalColors.length
      ? data.canonicalColors
      : Array.isArray(data.colors) ? data.colors : [];
    const imageRows = Array.isArray(data.images) ? data.images : [];
    colors += colorRows.length;
    images += imageRows.length;

    for (const item of colorRows) {
      const color = objectValue(item);
      const relation = color.localImagePath || color.imagePath || color.imageId;
      if (typeof relation === "string" && relation) {
        colorImageRelations += 1;
        objectRefs.add(relation);
      }
    }
    for (const item of imageRows) {
      const image = objectValue(item);
      const objectKey = image.r2ObjectKey || image.objectKey || image.path;
      if (typeof objectKey === "string" && objectKey) objectRefs.add(objectKey);
    }

    const parameters = objectValue(data.parameters);
    parameterFields += Object.keys(objectValue(parameters.fields)).length;
    parameterCandidates += Array.isArray(parameters.candidates) ? parameters.candidates.length : 0;
    parameterEvidence += Array.isArray(parameters.sourceEvidence) ? parameters.sourceEvidence.length : 0;
    topLevelEvidence += Array.isArray(data.evidence) ? data.evidence.length : 0;

    return {
      id: String(row.id || ""),
      sourceRunId: String(row.source_run_id || ""),
      productKey,
      productName: String(row.product_line_name || productLine.name || ""),
      publicationStatus: String(row.publication_status || ""),
    };
  });

  const published = snapshot.drafts.filter((row) => row.publication_status === "published").length;
  const drafts = snapshot.drafts.filter((row) => row.publication_status === "draft").length;
  return {
    imports: snapshot.imports.length,
    draftRowsTotal: snapshot.drafts.length,
    drafts,
    published,
    otherPublicationStates: snapshot.drafts.length - drafts - published,
    products: productKeys.size,
    colors,
    images,
    colorImageRelations,
    uniqueImageReferences: objectRefs.size,
    parameterFields,
    parameterCandidates,
    parameterEvidence,
    topLevelEvidence,
    importPackageReferences: snapshot.imports.filter((row) => Boolean(row.r2_object_key)).length,
    records,
  };
}

export function getFilamentResetEnvironment(value = process.env.VERCEL_ENV): FilamentResetEnvironment {
  if (value === "production") return "production";
  if (value === "preview") return "preview";
  return "development";
}

export function getFilamentResetConfirmationPhrase(environment: FilamentResetEnvironment) {
  return `CLEAR ${environment.toUpperCase()} FILAMENT DATA`;
}

export function buildFilamentResetDryRun(
  snapshot: FilamentBusinessSnapshot,
  environment: FilamentResetEnvironment,
) {
  const canonical = canonicalSnapshot(snapshot);
  return {
    environment,
    snapshotDigest: resetSha256(stableResetJson(canonical)),
    counts: summarizeResetSnapshot(canonical),
    confirmationPhrase: getFilamentResetConfirmationPhrase(environment),
    deletionScope: {
      databaseTables: ["filament_drafts", "filament_imports"],
      preserves: ["admin_audit_logs", "R2 objects", "Storage buckets", "users", "roles", "schema"],
    },
  };
}

export function buildFilamentResetBackup(input: {
  snapshot: FilamentBusinessSnapshot;
  environment: FilamentResetEnvironment;
  actorId: string;
  createdAt?: string;
}): FilamentResetBackup {
  const canonical = canonicalSnapshot(input.snapshot);
  const dryRun = buildFilamentResetDryRun(canonical, input.environment);
  return {
    schemaVersion: FILAMENT_RESET_BACKUP_SCHEMA_VERSION,
    kind: "filament-business-reset-backup",
    environment: input.environment,
    actorId: input.actorId,
    createdAt: input.createdAt || new Date().toISOString(),
    snapshotDigest: dryRun.snapshotDigest,
    counts: dryRun.counts,
    imports: canonical.imports,
    drafts: canonical.drafts,
  };
}

export function parseFilamentResetBackup(value: unknown): FilamentResetBackup {
  if (!isRecord(value)
    || value.schemaVersion !== FILAMENT_RESET_BACKUP_SCHEMA_VERSION
    || value.kind !== "filament-business-reset-backup"
    || !["development", "preview", "production"].includes(String(value.environment))
    || typeof value.actorId !== "string"
    || typeof value.createdAt !== "string"
    || typeof value.snapshotDigest !== "string"
    || !isRecord(value.counts)
    || !Array.isArray(value.imports)
    || !Array.isArray(value.drafts)
    || value.imports.some((row) => !isRecord(row))
    || value.drafts.some((row) => !isRecord(row))) {
    throw new Error("invalid_filament_reset_backup");
  }
  return value as unknown as FilamentResetBackup;
}

function idList(rows: Array<Record<string, unknown>>, label: string) {
  const ids = rows.map((row) => row.id);
  if (ids.some((id) => typeof id !== "string" || !id)) throw new Error(`backup_${label}_id_missing`);
  const strings = ids as string[];
  if (new Set(strings).size !== strings.length) throw new Error(`backup_${label}_id_duplicate`);
  return strings;
}

export function validateFilamentResetClear(input: {
  backup: FilamentResetBackup;
  backupBytes: Uint8Array;
  backupSha256: string;
  actorId: string;
  environment: FilamentResetEnvironment;
  confirmationPhrase: string;
  snapshot: FilamentBusinessSnapshot;
  expectedSnapshotDigest: string;
  expectedCounts: FilamentResetCounts;
}) {
  if (input.confirmationPhrase !== getFilamentResetConfirmationPhrase(input.environment)) {
    throw new Error("filament_reset_confirmation_mismatch");
  }
  if (!safeDigestEqual(resetSha256(input.backupBytes), input.backupSha256)) {
    throw new Error("filament_reset_backup_hash_mismatch");
  }
  if (input.backup.actorId !== input.actorId) throw new Error("filament_reset_backup_actor_mismatch");
  if (input.backup.environment !== input.environment) throw new Error("filament_reset_backup_environment_mismatch");

  const backupSnapshot = {
    imports: input.backup.imports,
    drafts: input.backup.drafts,
  };
  const backupDryRun = buildFilamentResetDryRun(backupSnapshot, input.environment);
  if (!safeDigestEqual(backupDryRun.snapshotDigest, input.backup.snapshotDigest)
    || stableResetJson(backupDryRun.counts) !== stableResetJson(input.backup.counts)) {
    throw new Error("filament_reset_backup_content_mismatch");
  }

  const current = buildFilamentResetDryRun(input.snapshot, input.environment);
  if (!safeDigestEqual(current.snapshotDigest, input.expectedSnapshotDigest)
    || !safeDigestEqual(current.snapshotDigest, input.backup.snapshotDigest)) {
    throw new Error("filament_reset_snapshot_changed");
  }
  if (stableResetJson(current.counts) !== stableResetJson(input.expectedCounts)
    || stableResetJson(current.counts) !== stableResetJson(input.backup.counts)) {
    throw new Error("filament_reset_counts_changed");
  }

  return {
    draftIds: idList(input.backup.drafts, "draft"),
    importIds: idList(input.backup.imports, "import"),
    current,
  };
}

export async function createFilamentResetBackup(input: {
  snapshot: FilamentBusinessSnapshot;
  environment: FilamentResetEnvironment;
  actorId: string;
}) {
  const backup = buildFilamentResetBackup(input);
  const bytes = new TextEncoder().encode(stableResetJson(backup));
  const sha256 = resetSha256(bytes);
  const timestamp = backup.createdAt.replace(/[^0-9]/g, "").slice(0, 14);
  const filename = `filament-reset-${input.environment}-${timestamp}-${backup.snapshotDigest.slice(0, 12)}`;
  const { uploadFilamentBusinessBackup, readFilamentBusinessBackup } = await import("../../storage/r2");
  const stored = await uploadFilamentBusinessBackup({ bytes, filename });
  const readback = await readFilamentBusinessBackup(stored.objectKey);
  const readbackSha256 = resetSha256(readback);
  if (!safeDigestEqual(readbackSha256, sha256)) throw new Error("filament_reset_backup_readback_mismatch");
  return {
    backup,
    backupKey: stored.objectKey,
    backupSha256: sha256,
    backupSize: stored.size,
  };
}

export async function executeFilamentReset(input: {
  backupKey: string;
  backupSha256: string;
  actorId: string;
  environment: FilamentResetEnvironment;
  confirmationPhrase: string;
  expectedSnapshotDigest: string;
  expectedCounts: FilamentResetCounts;
  beforeDelete?: (details: { draftCount: number; importCount: number; snapshotDigest: string }) => Promise<void>;
}) {
  const repository = await import("../imports/supabase-import-repository");
  const { readFilamentBusinessBackup } = await import("../../storage/r2");
  const backupBytes = await readFilamentBusinessBackup(input.backupKey);
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(backupBytes));
  } catch {
    throw new Error("invalid_filament_reset_backup_json");
  }
  const backup = parseFilamentResetBackup(parsed);
  const snapshot = await repository.readFilamentBusinessSnapshot();
  const validated = validateFilamentResetClear({
    ...input,
    backup,
    backupBytes,
    snapshot,
  });
  await input.beforeDelete?.({
    draftCount: validated.draftIds.length,
    importCount: validated.importIds.length,
    snapshotDigest: validated.current.snapshotDigest,
  });
  const deleted = await repository.clearExactFilamentBusinessRecords({
    draftIds: validated.draftIds,
    importIds: validated.importIds,
  });
  if (deleted.deletedDrafts !== validated.draftIds.length
    || deleted.deletedImports !== validated.importIds.length) {
    throw new Error("filament_reset_delete_count_mismatch");
  }
  const remaining = await repository.readFilamentBusinessSnapshot();
  if (remaining.imports.length || remaining.drafts.length) throw new Error("filament_reset_not_empty");
  return { deleted, remaining: { imports: 0, drafts: 0 }, snapshotDigest: validated.current.snapshotDigest };
}

export function resetAuditDetails(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
