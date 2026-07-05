import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
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

export default async function FilamentDraftPage({
  params,
}: {
  params: Promise<{ sourceRunId: string }>;
}) {
  await requireAdminScope("candidate.view");
  const { sourceRunId } = await params;
  const draft = await getFilamentDraftBySourceRunId(sourceRunId);
  if (!draft) notFound();

  const data = objectValue(draft.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(objectValue(data.parameters).fields);
  const canonicalColors = arrayValue(data.canonicalColors);
  const colors = canonicalColors.length ? canonicalColors : arrayValue(data.colors);

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
    </main>
  );
}
