import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { listAllFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function AdminBrandsPage() {
  await requireAdminScope("display.view");
  const drafts = await listAllFilamentDrafts();
  const brands = new Map<string, { id: string; name: string; productCount: number; publishedCount: number }>();
  for (const draft of drafts) {
    const data = objectValue(draft.draft_data);
    const defaults = objectValue(data.brandDefaults);
    const brand = objectValue(data.brand);
    const id = draft.brand_id || String(brand.id || "unknown-brand");
    const name = String(defaults.name || brand.name || id);
    const current = brands.get(id) ?? { id, name, productCount: 0, publishedCount: 0 };
    current.productCount += 1;
    if (draft.publication_status === "published") current.publishedCount += 1;
    brands.set(id, current);
  }
  const rows = [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold text-[#18202A]">品牌管理</h1><p className="mt-1 text-sm text-[#667281]">管理数据库中的耗材品牌资料与现有产品默认快照。</p></header>
      {rows.length ? <section className="grid gap-4 md:grid-cols-2">
        {rows.map((brand) => (
          <article key={brand.id} className="rounded-xl border border-[#D9E0E7] bg-white p-5">
            <h2 className="font-semibold text-[#18202A]">{brand.name}</h2>
            <p className="mt-1 text-sm text-[#667281]">{brand.productCount} 个产品 · {brand.publishedCount} 个已发布</p>
            <Link className="mt-4 inline-flex text-sm text-[#1F5FAF] hover:underline" href={`/admin/brands/${encodeURIComponent(brand.id)}`}>管理品牌</Link>
          </article>
        ))}
      </section> : <div className="rounded-xl border border-dashed border-[#CBD3DC] bg-white p-8 text-center text-sm text-[#667281]">当前没有耗材品牌记录。</div>}
    </div>
  );
}
