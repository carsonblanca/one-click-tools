import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { isCaptureDraftData } from "@/lib/filaments/drafts/capture-draft-patch";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function safeLink(value: unknown) {
  const href = text(value);
  return href.startsWith("https://") || href.startsWith("http://") || href.startsWith("/")
    ? href
    : "";
}

function draftLookupFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown_error";
  if (message.startsWith("missing_supabase_")) {
    return { category: "supabase_config", summary: message };
  }
  if (message === "supabase_get_draft_failed") {
    return { category: "supabase_query", summary: message };
  }
  return { category: "unknown", summary: "unexpected_draft_lookup_failure" };
}

export default async function FilamentDraftPage({
  params,
}: {
  params: Promise<{ sourceRunId: string }>;
}) {
  await requireAdminScope("candidate.view");
  const { sourceRunId } = await params;
  const requestId = randomUUID();
  let draft;
  try {
    draft = await getFilamentDraftBySourceRunId(sourceRunId);
  } catch (error) {
    const failure = draftLookupFailure(error);
    console.error("filament_draft_detail_failed", {
      requestId,
      stage: "draft_lookup",
      category: failure.category,
      error: failure.summary,
      sourceRunIdSuffix: sourceRunId.slice(-8),
    });
    throw new Error(`filament_draft_detail_failed:${requestId}`, { cause: error });
  }
  if (!draft) notFound();

  const data = objectValue(draft.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(objectValue(data.parameters).fields);
  const canonicalColors = arrayValue(data.canonicalColors);
  const colors = canonicalColors.length ? canonicalColors : arrayValue(data.colors);
  const images = arrayValue(data.images);
  const evidence = arrayValue(data.evidence);
  const assetLinks = new Map(images.flatMap((image) => {
    const assetId = text(image.assetId);
    const objectKey = text(image.r2ObjectKey);
    return assetId && objectKey
      ? [[assetId, `/api/admin/filament-import/kexcelled-evidence/asset?key=${encodeURIComponent(objectKey)}`] as const]
      : [];
  }));

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">导入草稿</p>
        <h1 className="text-2xl font-semibold">
          {draft.product_line_name || text(productLine.name) || "未命名耗材"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {draft.brand_id.toUpperCase()} · {draft.material_type || text(productLine.materialType) || "材料待补充"} · 未发布
        </p>
        {isCaptureDraftData(data) ? (
          <Link
            className="mt-4 inline-flex rounded bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
            href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}/edit`}
          >
            编辑 capture 草稿
          </Link>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">基础资料</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">线径</dt><dd>{String(productLine.diameterMm ?? "—")} mm</dd></div>
          <div><dt className="text-xs text-slate-500">净重</dt><dd>{String(productLine.netWeightG ?? "—")} g</dd></div>
          <div><dt className="text-xs text-slate-500">草稿 ID</dt><dd className="break-all">{draft.id}</dd></div>
          <div><dt className="text-xs text-slate-500">状态</dt><dd>{draft.status}</dd></div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">参数候选</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(parameters).map(([key, value]) => (
            <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd>{String(value)}</dd></div>
          ))}
          {Object.keys(parameters).length === 0 ? <p className="text-sm text-slate-500">暂无参数候选</p> : null}
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">颜色资料（{colors.length}）</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colors.map((color, index) => {
            const imageUrl = text(color.imageCandidateUrl);
            return (
              <article className="flex gap-3 rounded border border-slate-200 p-3" key={`${text(color.officialColorCode)}-${index}`}>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-16 w-16 shrink-0 object-cover" src={imageUrl} />
                ) : <div className="h-16 w-16 shrink-0 bg-slate-100" />}
                <div>
                  <p className="font-medium">{text(color.nameZh) || "颜色名称待补充"}</p>
                  <p className="text-sm text-slate-500">{text(color.nameEn) || "英文名待补充"}</p>
                  <p className="text-sm">{text(color.officialColorCode) || "暂无官方色号"}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">证据候选（{evidence.length}）</h2>
        <div className="mt-4 space-y-3">
          {evidence.map((item, index) => {
            const sourceType = text(item.sourceType);
            const extractionMethod = text(item.extractionMethod);
            const summary = text(item.title)
              || text(item.summary)
              || text(item.ocrText)
              || text(item.notes);
            const sourcePath = text(item.sourceRelativePath);
            const bindings = textArray(item.fieldBindings);
            const associations = [
              text(item.productId),
              text(item.colorId),
              text(item.parameterField),
              ...bindings,
            ].filter(Boolean);
            const sourceUrl = safeLink(item.sourceUrl);
            const assetUrl = assetLinks.get(text(item.extractedAssetId)) || "";
            return (
              <article className="rounded border border-slate-200 p-3" key={text(item.evidenceId) || index}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">
                    {[sourceType, extractionMethod].filter(Boolean).join(" · ") || "证据类型未标注"}
                  </p>
                  {text(item.evidenceId) ? (
                    <p className="text-xs text-slate-500">{text(item.evidenceId)}</p>
                  ) : null}
                </div>
                {summary ? <p className="mt-2 text-sm text-slate-700">{summary}</p> : null}
                {associations.length ? (
                  <p className="mt-2 text-sm text-slate-600">关联：{associations.join(" · ")}</p>
                ) : null}
                {sourcePath ? <p className="mt-2 text-xs text-slate-500">{sourcePath}</p> : null}
                {sourceUrl || assetUrl ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {sourceUrl ? <a className="text-blue-700 hover:underline" href={sourceUrl}>原始链接</a> : null}
                    {assetUrl ? <a className="text-blue-700 hover:underline" href={assetUrl}>资产链接</a> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {!evidence.length ? <p className="text-sm text-slate-500">暂无证据候选</p> : null}
        </div>
      </section>
    </main>
  );
}
