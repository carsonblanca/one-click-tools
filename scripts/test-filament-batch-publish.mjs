import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  parseBatchPublishRequest,
  publishDraftBatch,
} from "../lib/filaments/publishing/batch-publish.ts";

const routeUrl = new URL("../app/api/admin/filament-drafts/batch-publish/route.ts", import.meta.url);
await access(routeUrl);
const routeSource = await readFile(routeUrl, "utf8");
assert.match(routeSource, /export async function POST/);
assert.equal(fileURLToPath(routeUrl).endsWith("app/api/admin/filament-drafts/batch-publish/route.ts"), true);

const batchIds = Array.from({ length: 9 }, (_, index) => `opencode-dry-run-${index + 1}`);
assert.deepEqual(parseBatchPublishRequest({ sourceRunIds: batchIds }), {
  ok: true,
  sourceRunIds: batchIds,
});
assert.equal(parseBatchPublishRequest({ sourceRunIds: [] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: ["../invalid"] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: [batchIds[0], batchIds[0]] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: batchIds, draftId: "draft-1" }).ok, false);
assert.deepEqual(parseBatchPublishRequest({ sourceRunIds: [batchIds[0]], draftId: "draft-1" }), {
  ok: true,
  sourceRunIds: [batchIds[0]],
  draftId: "draft-1",
});

const rows = new Map(batchIds.map((sourceRunId, index) => [sourceRunId, {
  id: `draft-${index + 1}`,
  sourceRunId,
  status: "draft",
  publicationStatus: "draft",
}]));
let writeCount = 0;
const dependencies = {
  async readDraft(sourceRunId) {
    return rows.get(sourceRunId) || null;
  },
  async publishDraft({ sourceRunId }) {
    writeCount += 1;
    const row = rows.get(sourceRunId);
    return { ...row, status: "published", publicationStatus: "published" };
  },
};

const dryRun = await publishDraftBatch({
  sourceRunIds: batchIds,
  actorId: "test-admin",
  dryRun: true,
}, dependencies);
assert.deepEqual(dryRun.validated, batchIds);
assert.deepEqual(dryRun.published, []);
assert.deepEqual(dryRun.failed, []);
assert.equal(writeCount, 0);

const invalidDraft = await publishDraftBatch({
  sourceRunIds: [batchIds[0], "missing-source-run"],
  actorId: "test-admin",
}, dependencies);
assert.deepEqual(invalidDraft.published, []);
assert.equal(invalidDraft.failed.length, 1);
assert.equal(invalidDraft.failed[0].sourceRunId, "missing-source-run");
assert.equal(writeCount, 0);

rows.set("schema-invalid", {
  id: "draft-schema-invalid",
  sourceRunId: "schema-invalid",
  status: "draft",
  publicationStatus: "draft",
  validationIssues: ["parameterSchemaVersion 不兼容。"],
});
const invalidSchema = await publishDraftBatch({
  sourceRunIds: ["schema-invalid"],
  actorId: "test-admin",
}, dependencies);
assert.deepEqual(invalidSchema.published, []);
assert.match(invalidSchema.failed[0].error, /parameterSchemaVersion/);
assert.equal(writeCount, 0);

const single = await publishDraftBatch({
  sourceRunIds: [batchIds[0]],
  actorId: "test-admin",
  draftId: "draft-1",
}, dependencies);
assert.deepEqual(single.published, [batchIds[0]]);
assert.deepEqual(single.failed, []);
assert.equal(writeCount, 1);

const batch = await publishDraftBatch({
  sourceRunIds: [batchIds[1], batchIds[2]],
  actorId: "test-admin",
}, dependencies);
assert.deepEqual(batch.published, [batchIds[1], batchIds[2]]);
assert.deepEqual(batch.failed, []);
assert.equal(writeCount, 3);

const wrongDraftId = await publishDraftBatch({
  sourceRunIds: [batchIds[1]],
  actorId: "test-admin",
  draftId: "wrong-draft",
}, dependencies);
assert.deepEqual(wrongDraftId.published, []);
assert.match(wrongDraftId.failed[0].error, /draftId 不匹配/);
assert.equal(writeCount, 3);

console.log("filament batch publish route tests passed");
