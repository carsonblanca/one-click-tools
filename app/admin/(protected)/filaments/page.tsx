import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { CATALOG_RECORDS } from "@/lib/filaments/catalog";

export default async function FilamentListPage() {
  await requireAdminScope("display.view");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#18202A]">耗材管理</h1>
        <p className="mt-1 text-sm text-[#667281]">主线目录共 {CATALOG_RECORDS.length} 条耗材颜色记录。</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-[#D9E0E7] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F4F6F8] text-[#667281]">
            <tr><th className="px-4 py-3">品牌</th><th className="px-4 py-3">产品线</th><th className="px-4 py-3">材料</th><th className="px-4 py-3">颜色</th><th className="px-4 py-3">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9ED]">
            {CATALOG_RECORDS.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3 font-medium text-[#18202A]">{record.brand}</td>
                <td className="px-4 py-3">{record.productLine}</td>
                <td className="px-4 py-3">{record.materialType}</td>
                <td className="px-4 py-3">{record.color.colorNameZh || record.color.colorNameEn}</td>
                <td className="px-4 py-3"><Link className="text-[#1F5FAF] hover:underline" href={`/admin/filaments/${encodeURIComponent(record.id)}`}>查看</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
