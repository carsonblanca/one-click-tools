import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { hasAdminScope } from "@/lib/admin/permissions";
import { summarizeFilamentDraft } from "@/lib/filaments/admin/filament-admin";
import { getFilamentDraftById } from "@/lib/filaments/imports/supabase-import-repository";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function FilamentDetailPage({ params }: { params: Promise<{ filamentId: string }> }) {
  const session = await requireAdminScope("display.view");
  const { filamentId } = await params;
  const draft = await getFilamentDraftById(filamentId);
  if (!draft) notFound();

  const summary = summarizeFilamentDraft(draft);
  const data = objectValue(draft.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(data.parameters);
  const fieldsObject = objectValue(parameters.fields);
  const colors = arrayValue(data.colors).length ? arrayValue(data.colors) : arrayValue(data.canonicalColors);
  const images = arrayValue(data.images);
  const evidence = arrayValue(data.evidence);
  const canEdit = hasAdminScope(session.role, draft.publication_status === "published" ? "display.published.edit" : "display.draft.edit");
  const fields = [
    ["productKey", summary.productKey], ["品牌", summary.brandId], ["产品线", summary.productName],
    ["材料", summary.materialType], ["系列", String(productLine.series || "")], ["变体", summary.variant],
    ["净重", productLine.netWeightG ? `${productLine.netWeightG} g` : "—"],
    ["多重量规格", Array.isArray(productLine.netWeightOptionsG) ? `${productLine.netWeightOptionsG.join(" / ")} g` : "—"],
    ["线径", productLine.diameterMm ? `${productLine.diameterMm} mm` : "—"],
    ["审核状态", draft.review_status], ["发布状态", draft.publication_status], ["启用状态", summary.enabled ? "启用" : "禁用"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-[#667281]">耗材详情</p><h1 className="text-2xl font-semibold text-[#18202A]">{summary.productName || "未命名耗材"}</h1><p className="mt-1 text-xs text-[#667281]">草稿 ID：{draft.id} · sourceRunId：{draft.source_run_id}</p></div>
        {canEdit ? <Link href={`/admin/filaments/${encodeURIComponent(draft.id)}/edit`} className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">编辑全部业务字段</Link> : null}
      </div>
      <dl className="grid gap-4 rounded-xl border border-[#D9E0E7] bg-white p-5 sm:grid-cols-2">
        {fields.map(([label, value]) => <div key={label}><dt className="text-xs text-[#667281]">{label}</dt><dd className="mt-1 text-sm font-medium text-[#18202A]">{value || "—"}</dd></div>)}
      </dl>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "颜色", value: colors.length }, { label: "正式参数", value: Object.keys(fieldsObject).length }, { label: "图片", value: images.length }, { label: "证据", value: evidence.length }].map((item) => <article key={item.label} className="rounded-xl border border-[#D9E0E7] bg-white p-4"><p className="text-xs text-[#667281]">{item.label}</p><p className="mt-2 text-2xl font-semibold text-[#18202A]">{item.value}</p></article>)}
      </section>
      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <h2 className="font-semibold text-[#18202A]">当前正式参数</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(fieldsObject).map(([key, value]) => <div key={key} className="rounded-lg bg-[#F4F6F8] p-3"><dt className="text-xs text-[#667281]">{key}</dt><dd className="mt-1 break-words text-sm font-medium text-[#18202A]">{typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value)}</dd></div>)}
          {!Object.keys(fieldsObject).length ? <p className="text-sm text-[#667281]">暂无正式参数。</p> : null}
        </dl>
      </section>
      <Link href="/admin/filaments" className="text-sm text-[#1F5FAF] hover:underline">返回耗材管理</Link>
    </div>
  );
}
