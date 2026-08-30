import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { listRecentFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import { getManualBrand } from "@/lib/filaments/manual-filament-types";
import { resolveImportedProductLineName } from "@/lib/filaments/catalog/product-line-name";
import DraftPublishControls from "./DraftPublishControls";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sourceTypeFromDraftData(draftData: unknown): string {
  const data = draftData && typeof draftData === "object" && !Array.isArray(draftData)
    ? (draftData as Record<string, unknown>)
    : {};
  return text(data.sourceType) || "unknown";
}

function publicCatalogHref(draft: { brand_id: string; material_type: string | null; product_line_name: string | null; variant: string | null }) {
  const params = new URLSearchParams();
  params.set("brand", draft.brand_id === "kexcelled" ? "Kexcelled" : draft.brand_id);
  if (draft.material_type) params.set("material", draft.material_type);
  const productName = draft.product_line_name || "";
  if (/\bpetg[\s-]*m\b/i.test(productName)) params.set("finish", "matte");
  else if (/silk/i.test(productName)) params.set("finish", "silk");
  else if (/sparkle/i.test(productName)) params.set("finish", "glossy");
  return `/zh-cn/filaments?${params.toString()}`;
}

export default async function FilamentDraftsPage() {
  await requireAdminScope("candidate.view");
  const drafts = await listRecentFilamentDrafts(100);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">审核队列</p>
        <h1 className="text-2xl font-semibold">耗材草稿列表</h1>
        <p className="mt-2 text-sm text-slate-600">包含手动录入和 FIP 导入的未发布草稿。</p>
        <div className="mt-4">
          <DraftPublishControls drafts={drafts.map((draft) => ({
            sourceRunId: draft.source_run_id,
            name: resolveImportedProductLineName({ rowName: draft.product_line_name, materialType: draft.material_type, draftData: draft.draft_data }) || "未命名耗材",
            published: draft.publication_status === "published",
          }))} />
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">耗材名称</th>
                <th className="p-3">品牌</th>
                <th className="p-3">耗材类型</th>
                <th className="p-3">状态</th>
                <th className="p-3">来源</th>
                <th className="p-3">更新时间</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => {
                const brand = getManualBrand(draft.brand_id);
                const brandLabel = brand?.brandName || draft.brand_id;
                const sourceType = sourceTypeFromDraftData(draft.draft_data);
                return (
                  <tr key={draft.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{resolveImportedProductLineName({ rowName: draft.product_line_name, materialType: draft.material_type, draftData: draft.draft_data }) || "未命名"}</td>
                    <td className="p-3">{brandLabel}</td>
                    <td className="p-3">{draft.material_type || "—"}</td>
                    <td className="p-3">{draft.publication_status === "published" ? "已发布" : "待审核"}</td>
                    <td className="p-3">{sourceType === "manual" ? "手动录入" : sourceType}</td>
                    <td className="p-3">{new Date(draft.updated_at).toLocaleString("zh-CN")}</td>
                    <td className="p-3">
                      <Link
                        className="text-[#1F5FAF] hover:underline"
                        href={publicCatalogHref(draft)}
                      >
                        查看
                      </Link>
                      <Link
                        className="ml-3 text-cyan-700 hover:underline"
                        href={`/admin/filament-drafts/${encodeURIComponent(draft.source_run_id)}/edit`}
                      >
                        {sourceType === "manual" ? "继续编辑" : "编辑导入草稿"}
                      </Link>
                      {draft.publication_status !== "published" ? <span className="ml-3 text-xs text-amber-700">可发布</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {drafts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">暂无草稿</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
