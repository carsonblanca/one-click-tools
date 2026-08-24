import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import DraftDetailClient from "./DraftDetailClient";
import { resolveImportedProductLineName } from "@/lib/filaments/catalog/product-line-name";
import { parameterLabel } from "@/lib/filaments/parameters/parameter-labels";

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

function manualColorImageUrl(color: Record<string, unknown>): string {
  const image = color.image;
  if (image && typeof image === "object" && !Array.isArray(image)) {
    return text((image as Record<string, unknown>).url);
  }
  return "";
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
  const sourceType = text(data.sourceType);
  const brand = objectValue(data.brand);
  const productLine = objectValue(data.productLine);
  const parameterBlock = objectValue(data.parameters);
  const parameters = objectValue(parameterBlock.fields);
  const parameterCandidates = arrayValue(parameterBlock.candidates);
  const manualParameters = arrayValue(parameterBlock.manualParameters);
  const manualParameterItems = arrayValue(parameterBlock.items);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">导入草稿</p>
            <h1 className="text-2xl font-semibold">
          {resolveImportedProductLineName({ rowName: draft.product_line_name, materialType: draft.material_type, draftData: data }) || "未命名耗材"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {draft.brand_id.toUpperCase()} · {draft.material_type || text(productLine.materialType) || "材料待补充"} · {draft.publication_status === "published" ? "已发布" : "未发布"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              href="/admin/filament-drafts"
            >
              返回审核队列
            </Link>
            <Link
              className="rounded bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
              href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}/edit`}
            >
              编辑草稿
            </Link>
          </div>
        </div>
      </header>

      {sourceType !== "manual" ? (
        <DraftDetailClient
          sourceRunId={sourceRunId}
          brandId={draft.brand_id}
          brand={brand}
          productLine={productLine}
          colors={colors}
          manualParameters={manualParameters}
          parameterFields={parameters}
          parameterCandidates={parameterCandidates}
          parameterStatus={text(parameterBlock.status) || "missing"}
          parameterSourceType={text(parameterBlock.sourceType) || "missing"}
          parameterSourceEvidence={arrayValue(parameterBlock.sourceEvidence)}
          parameterReviewNote={text(parameterBlock.reviewNote)}
        />
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">基础资料</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">线径</dt><dd>{String(productLine.diameterMm ?? "—")} mm</dd></div>
          <div><dt className="text-xs text-slate-500">净重</dt><dd>{String(productLine.netWeightG ?? "—")} g</dd></div>
          <div><dt className="text-xs text-slate-500">草稿 ID</dt><dd className="break-all">{draft.id}</dd></div>
          <div><dt className="text-xs text-slate-500">状态</dt><dd>{draft.status}</dd></div>
        </dl>
      </section>

      {sourceType !== "manual" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">参数候选{parameterCandidates.length ? `（${parameterCandidates.length}）` : ""}</h2>
          {parameterCandidates.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">参数字段</th>
                    <th className="py-2 pr-3 font-medium">来源原文</th>
                    <th className="py-2 font-medium">审核状态</th>
                  </tr>
                </thead>
                <tbody>
                  {parameterCandidates.map((candidate, index) => (
                    <tr className="border-b border-slate-100" key={text(candidate.candidateId) || text(candidate.canonicalKey) || index}>
                      <td className="py-2 pr-3 font-medium">
                        {parameterLabel(text(candidate.canonicalKey) || text(candidate.fieldCandidate) || text(candidate.field) || text(candidate.key), "zh-cn")}
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate text-slate-600" title={text(candidate.rawValue) || text(objectValue(candidate.source).snippet)}>
                        {text(candidate.normalizedDisplayValue) || text(candidate.normalizedValue) || text(candidate.rawValue) || text(candidate.value) || "—"}
                        {text(candidate.unit) ? ` ${text(candidate.unit)}` : ""}
                      </td>
                      <td className="py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          text(candidate.reviewStatus) === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : text(candidate.reviewStatus) === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {text(candidate.reviewStatus) || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">暂无参数候选</p>
          )}
          {Object.keys(parameters).length ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-500">已提取参数（{Object.keys(parameters).length} 项）</summary>
              <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                {Object.entries(parameters).map(([key, value]) => (
                  <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd>{String(value)}</dd></div>
                ))}
              </dl>
            </details>
          ) : null}
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">手动参数（{manualParameterItems.length}）</h2>
          {manualParameterItems.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {manualParameterItems.map((item, index) => (
                <div key={text(item.key) || index} className="rounded border border-slate-200 p-3">
                  <p className="font-medium">{text(item.labelZh) || "未命名字段"}</p>
                  <p className="text-sm text-slate-500">{text(item.labelEn)}</p>
                  <p className="mt-1 text-sm">
                    {text(item.value) || "—"}
                    {text(item.unit) ? ` ${text(item.unit)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{text(item.sourceStatus)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">暂无手动参数</p>
          )}
        </section>
      )}

      {sourceType === "manual" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">颜色资料（{colors.length}）</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colors.map((color, index) => {
              const imageUrl = text(color.imageCandidateUrl);
              const variants = arrayValue(color.colorVariants || color.skuVariants);
              const variantCount = variants.length || arrayValue(color.skuVariants).length || 0;
              const spoolCount = variants.filter((v) => text(v.spoolType) === "spool").length || (variantCount > 0 ? variantCount : 0);
              const refillCount = variants.filter((v) => text(v.spoolType) === "refill").length;
              return (
                <article className="flex gap-3 rounded border border-slate-200 p-3" key={`${text(color.officialColorCode)}-${index}`}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-16 w-16 shrink-0 rounded border object-cover" src={imageUrl} />
                  ) : <div className="h-16 w-16 shrink-0 rounded border bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{text(color.nameZh) || "颜色名称待补充"}</p>
                    <p className="truncate text-sm text-slate-500">{text(color.nameEn) || "英文名待补充"}</p>
                    <p className="text-sm">{text(color.officialColorCode) || "暂无官方色号"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {variantCount > 0 ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {variantCount} SKU
                        </span>
                      ) : null}
                      {spoolCount > 0 ? (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">有盘</span>
                      ) : null}
                      {refillCount > 0 ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">补充装</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">颜色资料（{colors.length}）</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colors.map((color, index) => {
              const imageUrl = manualColorImageUrl(color);
              return (
                <article className="flex gap-3 rounded border border-slate-200 p-3" key={`${text(color.colorNameZh)}-${index}`}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-16 w-16 shrink-0 rounded border object-cover" src={imageUrl} />
                  ) : <div className="h-16 w-16 shrink-0 rounded border bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{text(color.colorNameZh) || "颜色名称待补充"}</p>
                    <p className="truncate text-sm text-slate-500">{text(color.colorNameEn) || "英文名待补充"}</p>
                    <p className="text-sm">{text(color.officialColorCode) || "暂无官方色号"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {sourceType !== "manual" ? (
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
      ) : null}
    </main>
  );
}
