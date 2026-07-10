import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { manualFilamentBrands } from "@/lib/filaments/manual-filament-types";

export default async function AdminBrandsPage() {
  await requireAdminScope("display.draft.create");
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理</p>
        <h1 className="text-2xl font-semibold">选择品牌添加耗材</h1>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {manualFilamentBrands.map((brand) => (
          <article key={brand.brandId} className="rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold">{brand.brandName}</h2>
              <p className="mt-1 text-sm text-slate-600">{brand.brandNameZh} · {brand.brandNameEn}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" href={`/admin/brands/${brand.brandId}`}>
                查看品牌
              </Link>
              <Link className="rounded bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-800" href={`/admin/brands/${brand.brandId}/filaments/new`}>
                添加耗材
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
