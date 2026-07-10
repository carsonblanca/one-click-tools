import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getManualBrand } from "@/lib/filaments/manual-filament-types";

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  await requireAdminScope("display.draft.create");
  const { brandId } = await params;
  const brand = getManualBrand(brandId);
  if (!brand) notFound();

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理</p>
        <h1 className="text-2xl font-semibold">{brand.brandName}</h1>
        <p className="mt-2 text-sm text-slate-600">{brand.brandNameZh} · {brand.brandNameEn}</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">人工录入</h2>
        <p className="mt-2 text-sm text-slate-600">
          从这里手动创建耗材草稿。不会触发 FIP、OCR、Evidence 队列或发布。
        </p>
        <Link className="mt-4 inline-flex rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800" href={`/admin/brands/${brand.brandId}/filaments/new`}>
          添加耗材
        </Link>
      </section>
    </main>
  );
}
