import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildFilamentResetBackup,
  buildFilamentResetDryRun,
  getFilamentResetConfirmationPhrase,
  parseFilamentResetBackup,
  resetSha256,
  stableResetJson,
  validateFilamentResetClear,
} from "../lib/filaments/admin/filament-reset.ts";

const snapshot = {
  imports: [{ id: "import-1", source_run_id: "run-1", r2_object_key: "imports/one.zip", created_at: "2026-01-01" }],
  drafts: [{
    id: "draft-1",
    source_run_id: "run-1",
    publication_status: "published",
    product_line_name: "THE K5 PETG M",
    draft_data: {
      productKey: "kexcelled-k5-petg-m",
      colors: [{ colorCode: "BLK", localImagePath: "images/black.webp" }],
      images: [{ r2ObjectKey: "filament-imports/kexcelled/image.webp" }],
      parameters: { fields: { materialType: "PETG" }, candidates: [{ field: "materialType" }], sourceEvidence: [{ id: "e-1" }] },
      evidence: [{ id: "top-1" }],
    },
  }],
};

const dryRun = buildFilamentResetDryRun(snapshot, "preview");
assert.equal(dryRun.counts.imports, 1);
assert.equal(dryRun.counts.draftRowsTotal, 1);
assert.equal(dryRun.counts.drafts, 0);
assert.equal(dryRun.counts.published, 1);
assert.equal(dryRun.counts.otherPublicationStates, 0);
assert.equal(dryRun.counts.products, 1);
assert.equal(dryRun.counts.colors, 1);
assert.equal(dryRun.counts.images, 1);
assert.equal(dryRun.counts.colorImageRelations, 1);
assert.equal(dryRun.counts.parameterFields, 1);
assert.equal(dryRun.confirmationPhrase, "CLEAR PREVIEW FILAMENT DATA");

const reordered = { imports: [...snapshot.imports], drafts: [{ ...snapshot.drafts[0], draft_data: { ...snapshot.drafts[0].draft_data } }] };
assert.equal(buildFilamentResetDryRun(reordered, "preview").snapshotDigest, dryRun.snapshotDigest);

const backup = buildFilamentResetBackup({ snapshot, environment: "preview", actorId: "admin:one", createdAt: "2026-01-02T03:04:05.000Z" });
assert.equal(parseFilamentResetBackup(JSON.parse(JSON.stringify(backup))).snapshotDigest, dryRun.snapshotDigest);
const backupBytes = new TextEncoder().encode(stableResetJson(backup));
const backupSha256 = resetSha256(backupBytes);

const valid = validateFilamentResetClear({
  backup,
  backupBytes,
  backupSha256,
  actorId: "admin:one",
  environment: "preview",
  confirmationPhrase: getFilamentResetConfirmationPhrase("preview"),
  snapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest,
  expectedCounts: dryRun.counts,
});
assert.deepEqual(valid.draftIds, ["draft-1"]);
assert.deepEqual(valid.importIds, ["import-1"]);

assert.throws(() => validateFilamentResetClear({
  backup, backupBytes, backupSha256, actorId: "admin:one", environment: "preview",
  confirmationPhrase: "CLEAR PRODUCTION FILAMENT DATA", snapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest, expectedCounts: dryRun.counts,
}), /confirmation_mismatch/);
assert.throws(() => validateFilamentResetClear({
  backup, backupBytes, backupSha256, actorId: "different-admin", environment: "preview",
  confirmationPhrase: getFilamentResetConfirmationPhrase("preview"), snapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest, expectedCounts: dryRun.counts,
}), /actor_mismatch/);
assert.throws(() => validateFilamentResetClear({
  backup, backupBytes, backupSha256: "0".repeat(64), actorId: "admin:one", environment: "preview",
  confirmationPhrase: getFilamentResetConfirmationPhrase("preview"), snapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest, expectedCounts: dryRun.counts,
}), /hash_mismatch/);

const internallyTamperedBackup = { ...backup, drafts: [{ ...backup.drafts[0], id: "different-draft" }] };
const internallyTamperedBytes = new TextEncoder().encode(stableResetJson(internallyTamperedBackup));
assert.throws(() => validateFilamentResetClear({
  backup: internallyTamperedBackup,
  backupBytes: internallyTamperedBytes,
  backupSha256: resetSha256(internallyTamperedBytes),
  actorId: "admin:one",
  environment: "preview",
  confirmationPhrase: getFilamentResetConfirmationPhrase("preview"),
  snapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest,
  expectedCounts: dryRun.counts,
}), /backup_content_mismatch/);

const changedSnapshot = { ...snapshot, drafts: [{ ...snapshot.drafts[0], product_line_name: "Changed" }] };
assert.throws(() => validateFilamentResetClear({
  backup, backupBytes, backupSha256, actorId: "admin:one", environment: "preview",
  confirmationPhrase: getFilamentResetConfirmationPhrase("preview"), snapshot: changedSnapshot,
  expectedSnapshotDigest: dryRun.snapshotDigest, expectedCounts: dryRun.counts,
}), /snapshot_changed/);

assert.deepEqual(dryRun.deletionScope.preserves, ["admin_audit_logs", "R2 objects", "Storage buckets", "users", "roles", "schema"]);
const routeSource = readFileSync(new URL("../app/api/admin/filaments/reset/route.ts", import.meta.url), "utf8");
assert.match(routeSource, /session\.role !== "admin"/);
assert.match(routeSource, /hasAdminScope\(session\.role, "archive\.execute"\)/);
assert.doesNotMatch(routeSource, /deleteFipAsset|deleteImportObject|DeleteObjectCommand/);
console.log("filament reset safety tests: 24/24 passed");
