import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { listRecentFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";

export default async function FilamentDraftsPage() {
  await requireAdminScope("candidate.view");
  const drafts = await listRecentFilamentDrafts(100);

  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold text-[#18202A]">审核队列</h1><p className="mt-1 text-sm text-[#667281]">最近 {drafts.length} 条耗材草稿。</p></header>
      <div className="overflow-x-auto rounded-xl border border-[#D9E0E7] bg-white">
        <table className="min-w-full text-left text-sm"><thead className="bg-[#F4F6F8] text-[#667281]"><tr><th className="px-4 py-3">品牌</th><th className="px-4 py-3">产品线</th><th className="px-4 py-3">材料</th><th className="px-4 py-3">审核状态</th><th className="px-4 py-3">更新时间</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody className="divide-y divide-[#E5E9ED]">{drafts.map((draft) => <tr key={draft.id}><td className="px-4 py-3 font-medium text-[#18202A]">{draft.brand_id}</td><td className="px-4 py-3">{draft.product_line_name || "—"}</td><td className="px-4 py-3">{draft.material_type || "—"}</td><td className="px-4 py-3">{draft.review_status}</td><td className="px-4 py-3">{new Date(draft.updated_at).toLocaleString("zh-CN")}</td><td className="px-4 py-3"><Link href={`/admin/filament-drafts/${encodeURIComponent(draft.source_run_id)}`} className="text-[#1F5FAF] hover:underline">查看</Link></td></tr>)}</tbody>
        </table>
        {!drafts.length ? <p className="p-6 text-sm text-[#667281]">暂无草稿。</p> : null}
      </div>
    </div>
  );
}
