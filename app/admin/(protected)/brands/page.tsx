import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { BRAND_CATALOG } from "@/lib/filaments/catalog";

export default async function AdminBrandsPage() {
  await requireAdminScope("display.view");
  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold text-[#18202A]">品牌管理</h1><p className="mt-1 text-sm text-[#667281]">查看主线品牌目录及耗材覆盖。</p></header>
      <section className="grid gap-4 md:grid-cols-2">
        {BRAND_CATALOG.map((brand) => (
          <article key={brand.id} className="rounded-xl border border-[#D9E0E7] bg-white p-5">
            <h2 className="font-semibold text-[#18202A]">{brand.name}</h2><p className="mt-1 text-sm text-[#667281]">{brand.nameZh} · {brand.filamentCount} 条</p>
            <Link className="mt-4 inline-flex text-sm text-[#1F5FAF] hover:underline" href={`/admin/brands/${brand.id}`}>查看品牌</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
