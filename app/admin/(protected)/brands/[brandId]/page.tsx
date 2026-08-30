import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getBrandEntry } from "@/lib/filaments/catalog/brand-store";

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  await requireAdminScope("display.draft.create");
  const { brandId } = await params;
  const brand = await getBrandEntry(brandId);
  if (!brand) notFound();

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理</p>
        <h1 className="text-2xl font-semibold">{brand.nameZh}</h1>
        <p className="mt-2 text-sm text-slate-600">{brand.nameEn || brand.name} · {brand.websiteUrl || "未设置官网"}</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">品牌资料</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-slate-500">品牌 ID</dt><dd>{brand.id}</dd></div>
          <div><dt className="text-slate-500">Logo</dt><dd className="break-all">{brand.logoUrl || "使用已核验内置 Logo"}</dd></div>
          <div><dt className="text-slate-500">别名</dt><dd>{brand.aliases.join("、") || "无"}</dd></div>
          <div><dt className="text-slate-500">状态</dt><dd>{brand.status || "active"}</dd></div>
        </dl>
        <Link className="mt-4 inline-flex rounded border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50" href={`/admin/brands/${brand.id}/edit`}>
          编辑品牌资料与 Logo
        </Link>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">人工录入</h2>
        <p className="mt-2 text-sm text-slate-600">
          从这里手动创建耗材草稿。不会触发 FIP、OCR、Evidence 队列或发布。
        </p>
        <Link className="mt-4 inline-flex rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800" href={`/admin/brands/${brand.id}/filaments/new`}>
          添加耗材
        </Link>
      </section>
    </main>
  );
}
