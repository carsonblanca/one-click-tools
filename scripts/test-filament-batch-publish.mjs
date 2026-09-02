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
const listPageSource = await readFile(new URL("../app/admin/(protected)/filament-drafts/page.tsx", import.meta.url), "utf8");
const detailPageSource = await readFile(new URL("../app/admin/(protected)/filament-drafts/[sourceRunId]/page.tsx", import.meta.url), "utf8");
const detailClientSource = await readFile(new URL("../app/admin/(protected)/filament-drafts/[sourceRunId]/DraftDetailClient.tsx", import.meta.url), "utf8");
assert.match(listPageSource, /draftId: draft\.id/);
assert.match(listPageSource, /\?draftId=\$\{encodeURIComponent\(draft\.id\)\}/);
assert.match(detailPageSource, /getFilamentDraftById\(draftId\)/);
assert.match(detailClientSource, /\?draftId=\$\{encodeURIComponent\(draftId\)\}/);

const batchIds = Array.from({ length: 9 }, (_, index) => `opencode-dry-run-${index + 1}`);
assert.deepEqual(parseBatchPublishRequest({ sourceRunIds: batchIds }), {
  ok: true,
  items: batchIds.map((sourceRunId) => ({ sourceRunId })),
});
assert.equal(parseBatchPublishRequest({ sourceRunIds: [] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: ["../invalid"] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: [batchIds[0], batchIds[0]] }).ok, false);
assert.equal(parseBatchPublishRequest({ sourceRunIds: batchIds, draftId: "draft-1" }).ok, false);
assert.deepEqual(parseBatchPublishRequest({ sourceRunIds: [batchIds[0]], draftId: "draft-1" }), {
  ok: true,
  items: [{ sourceRunId: batchIds[0], draftId: "draft-1" }],
});

assert.deepEqual(parseBatchPublishRequest({ drafts: [
  { sourceRunId: "capture-X", draftId: "draft-a" },
  { sourceRunId: "capture-X", draftId: "draft-b" },
] }), {
  ok: true,
  items: [
    { sourceRunId: "capture-X", draftId: "draft-a" },
    { sourceRunId: "capture-X", draftId: "draft-b" },
  ],
});

const rows = new Map(batchIds.map((sourceRunId, index) => [sourceRunId, {
  id: `draft-${index + 1}`,
  sourceRunId,
  status: "draft",
  publicationStatus: "draft",
}]));
let writeCount = 0;
const dependencies = {
  async readDraft(sourceRunId, draftId) {
    const row = rows.get(sourceRunId) || null;
    return draftId && row?.id !== draftId ? null : row;
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
assert.match(wrongDraftId.failed[0].error, /草稿不存在/);
assert.equal(writeCount, 3);

const sameSourceRows = new Map([
  ["draft-a", { id: "draft-a", sourceRunId: "capture-X", status: "draft", publicationStatus: "draft" }],
  ["draft-b", { id: "draft-b", sourceRunId: "capture-X", status: "draft", publicationStatus: "draft" }],
]);
const sameSourceDependencies = {
  async readDraft(sourceRunId, draftId) {
    const row = sameSourceRows.get(draftId);
    return row?.sourceRunId === sourceRunId ? row : null;
  },
  async publishDraft({ draftId }) {
    writeCount += 1;
    const row = sameSourceRows.get(draftId);
    return { ...row, status: "published", publicationStatus: "published" };
  },
};
const sameSourceBatch = await publishDraftBatch({
  sourceRunIds: ["capture-X", "capture-X"],
  drafts: [
    { sourceRunId: "capture-X", draftId: "draft-a" },
    { sourceRunId: "capture-X", draftId: "draft-b" },
  ],
  actorId: "test-admin",
}, sameSourceDependencies);
assert.deepEqual(sameSourceBatch.published, ["capture-X", "capture-X"]);
assert.equal(writeCount, 5);

console.log("filament batch publish route tests passed");
