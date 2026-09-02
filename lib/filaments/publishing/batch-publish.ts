export const MAX_PUBLISH_BATCH_SIZE = 20;

export type PublishDraftState = {
  id: string;
  sourceRunId: string;
  status: string;
  publicationStatus: string;
};

export type PublishFailure = {
  sourceRunId: string;
  error: string;
};

export type BatchPublishResult = {
  published: string[];
  validated: string[];
  failed: PublishFailure[];
  dryRun: boolean;
};

export type BatchPublishDependencies = {
  readDraft(sourceRunId: string, draftId?: string): Promise<PublishDraftState | null>;
  publishDraft(input: {
    sourceRunId: string;
    draftId: string;
    actorId: string;
  }): Promise<PublishDraftState>;
  appendAuditLog?(input: {
    actorId: string;
    draftId: string;
    sourceRunId: string;
  }): Promise<void>;
};

type ParsedBatchPublishRequest =
  | { ok: true; items: Array<{ sourceRunId: string; draftId?: string }> }
  | { ok: false; error: string };

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function sourceRunId(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(normalized)
    ? normalized
    : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "publish_failed";
}

export function parseBatchPublishRequest(value: unknown): ParsedBatchPublishRequest {
  const body = objectValue(value);
  if (Array.isArray(body.drafts)) {
    if (body.drafts.length === 0 || body.drafts.length > MAX_PUBLISH_BATCH_SIZE) {
      return { ok: false, error: `单次最多发布 ${MAX_PUBLISH_BATCH_SIZE} 条草稿。` };
    }
    const items = body.drafts.map((item) => {
      const row = objectValue(item);
      return { sourceRunId: sourceRunId(row.sourceRunId), draftId: sourceRunId(row.draftId) };
    });
    if (items.some((item) => !item.sourceRunId || !item.draftId)) return { ok: false, error: "草稿绑定信息无效。" };
    if (new Set(items.map((item) => item.draftId)).size !== items.length) return { ok: false, error: "草稿不得重复。" };
    return { ok: true, items };
  }
  if (!Array.isArray(body.sourceRunIds)) {
    return { ok: false, error: "sourceRunIds 必须是数组。" };
  }
  if (body.sourceRunIds.length === 0) {
    return { ok: false, error: "至少需要一个 sourceRunId。" };
  }
  if (body.sourceRunIds.length > MAX_PUBLISH_BATCH_SIZE) {
    return { ok: false, error: `单次最多发布 ${MAX_PUBLISH_BATCH_SIZE} 条草稿。` };
  }

  const sourceRunIds = body.sourceRunIds.map(sourceRunId);
  if (sourceRunIds.some((item) => !item)) {
    return { ok: false, error: "sourceRunIds 包含无效值。" };
  }
  if (new Set(sourceRunIds).size !== sourceRunIds.length) {
    return { ok: false, error: "sourceRunIds 不得重复。" };
  }
  const draftId = body.draftId === undefined ? undefined : sourceRunId(body.draftId);
  if (body.draftId !== undefined && !draftId) {
    return { ok: false, error: "draftId 格式无效。" };
  }
  if (draftId && sourceRunIds.length !== 1) {
    return { ok: false, error: "draftId 仅适用于单条发布。" };
  }
  return { ok: true, items: sourceRunIds.map((sourceRunIdValue) => ({ sourceRunId: sourceRunIdValue, ...(draftId ? { draftId } : {}) })) };
}

function validateDraftState(
  sourceRunIdValue: string,
  draft: PublishDraftState | null,
  expectedDraftId?: string,
): string[] {
  if (!draft) return ["草稿不存在。"];
  const issues: string[] = [];
  if (draft.sourceRunId !== sourceRunIdValue) issues.push("sourceRunId 不匹配。");
  if (expectedDraftId && draft.id !== expectedDraftId) issues.push("draftId 不匹配。");
  if (draft.status !== "draft") issues.push("status 必须为 draft。");
  if (draft.publicationStatus !== "draft") issues.push("publication_status 必须为 draft。");
  return issues;
}

export async function publishDraftBatch(
  input: {
    sourceRunIds: string[];
    actorId: string;
    dryRun?: boolean;
    draftId?: string;
    drafts?: Array<{ sourceRunId: string; draftId: string }>;
  },
  dependencies: BatchPublishDependencies,
): Promise<BatchPublishResult> {
  const items = input.drafts?.length
    ? input.drafts
    : input.sourceRunIds.map((sourceRunIdValue) => ({ sourceRunId: sourceRunIdValue, draftId: input.draftId }));
  const preflight = await Promise.all(items.map(async (item) => {
    try {
      const draft = await dependencies.readDraft(item.sourceRunId, item.draftId);
      return {
        sourceRunId: item.sourceRunId,
        draftId: item.draftId,
        draft,
        issues: validateDraftState(item.sourceRunId, draft, item.draftId),
      };
    } catch (error) {
      return { sourceRunId: item.sourceRunId, draftId: item.draftId, draft: null, issues: [errorMessage(error)] };
    }
  }));

  const failedPreflight = preflight.flatMap((item) => item.issues.length
    ? [{ sourceRunId: item.sourceRunId, error: item.issues.join(" ") }]
    : []);
  const validated = preflight
    .filter((item) => item.issues.length === 0)
    .map((item) => item.sourceRunId);

  if (failedPreflight.length > 0) {
    return { published: [], validated, failed: failedPreflight, dryRun: Boolean(input.dryRun) };
  }
  if (input.dryRun) {
    return { published: [], validated, failed: [], dryRun: true };
  }

  const published: string[] = [];
  const failed: PublishFailure[] = [];
  for (const item of preflight) {
    try {
      const updated = await dependencies.publishDraft({
        sourceRunId: item.sourceRunId,
        draftId: item.draft!.id,
        actorId: input.actorId,
      });
      if (updated.status !== "published" || updated.publicationStatus !== "published") {
        throw new Error("发布写后回读不一致。");
      }
      published.push(item.sourceRunId);
      try {
        await dependencies.appendAuditLog?.({
          actorId: input.actorId,
          draftId: updated.id,
          sourceRunId: item.sourceRunId,
        });
      } catch {
        // Audit failure must not cause an already published draft to be retried.
      }
    } catch (error) {
      failed.push({ sourceRunId: item.sourceRunId, error: errorMessage(error) });
    }
  }

  return { published, validated, failed, dryRun: false };
}
