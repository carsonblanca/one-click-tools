import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { BRAND_CATALOG, CATALOG_RECORDS } from "@/lib/filaments/catalog";

export default async function AdminBrandDetailPage({ params }: { params: Promise<{ brandId: string }> }) {
  await requireAdminScope("display.view");
  const { brandId } = await params;
  const brand = BRAND_CATALOG.find((item) => item.id === brandId);
  if (!brand) notFound();
  const records = CATALOG_RECORDS.filter((record) => record.brand.toLowerCase() === brand.name.toLowerCase());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-[#667281]">品牌管理</p><h1 className="text-2xl font-semibold text-[#18202A]">{brand.name}</h1><p className="mt-1 text-sm text-[#667281]">目录记录：{records.length}</p></div><Link href={`/admin/brands/${brand.id}/filaments/new`} className="rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm text-white">添加耗材</Link></div>
      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        {records.length ? <ul className="divide-y divide-[#E5E9ED]">{records.map((record) => <li key={record.id} className="flex items-center justify-between gap-3 py-3"><span className="text-sm text-[#18202A]">{record.productLine} · {record.color.colorNameZh}</span><Link href={`/admin/filaments/${encodeURIComponent(record.id)}`} className="text-sm text-[#1F5FAF] hover:underline">查看</Link></li>)}</ul> : <p className="text-sm text-[#667281]">该品牌当前没有目录记录。</p>}
      </div>
      <Link href="/admin/brands" className="text-sm text-[#1F5FAF] hover:underline">返回品牌管理</Link>
    </div>
  );
}
