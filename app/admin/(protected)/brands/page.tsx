import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { listBrandEntries, listBrandFilamentDirectory } from "@/lib/filaments/catalog/brand-store";

export default async function AdminBrandsPage() {
  await requireAdminScope("display.draft.create");
  const brands = await listBrandEntries();
  const directories = await Promise.all(brands.map(async (brand) => [brand.id, await listBrandFilamentDirectory(brand.id)] as const));
  const directoryByBrand = new Map(directories);
  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">品牌管理</p>
          <h1 className="text-2xl font-semibold">选择品牌添加耗材</h1>
        </div>
        <Link
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
          href="/admin/brands/new"
        >
          新增品牌
        </Link>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {brands.map((brand) => (
          <article key={brand.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold">{brand.nameZh} · {brand.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{brand.nameEn || brand.name} · {brand.status || "active"}</p>
            </div>
            <div className="mt-4 rounded border border-slate-100 bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-700">已发布耗材目录</div>
              <div className="mt-2 space-y-1 text-sm">
                {(directoryByBrand.get(brand.id) || []).length ? (directoryByBrand.get(brand.id) || []).map((filament) => (
                  <div key={filament.sourceRunId} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate" title={filament.nameZh || filament.nameEn}>
                      {filament.nameZh || filament.nameEn}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{filament.materialType || "—"}</span>
                  </div>
                )) : <span className="text-slate-500">暂无已发布耗材</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Link className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" href={`/admin/brands/${brand.id}`}>
                查看品牌
              </Link>
              <Link className="rounded border border-cyan-700 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50" href={`/admin/brands/${brand.id}/edit`}>
                编辑品牌
              </Link>
              <Link className="rounded bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-800" href={`/admin/brands/${brand.id}/filaments/new`}>
                添加耗材
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
