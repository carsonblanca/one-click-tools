import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getCatalogRecord } from "@/lib/filaments/catalog";

export default async function FilamentEditPage({ params }: { params: Promise<{ filamentId: string }> }) {
  await requireAdminScope("display.view");
  const { filamentId } = await params;
  const record = getCatalogRecord(filamentId);
  if (!record) notFound();

  return (
    <div className="space-y-5">
      <header><p className="text-sm text-[#667281]">耗材管理</p><h1 className="text-2xl font-semibold text-[#18202A]">编辑 {record.productLine}</h1><p className="mt-2 text-sm text-[#667281]">当前仅恢复页面层；为避免绕过既有审核与发布流程，本页暂为只读。</p></header>
      <div className="grid gap-4 rounded-xl border border-[#D9E0E7] bg-white p-5 sm:grid-cols-2">
        {[['品牌', record.brand], ['产品线', record.productLine], ['材料', record.materialType], ['变体', record.variant], ['颜色', record.color.colorNameZh], ['官方颜色代码', record.color.digitalSwatch?.officialColorCode || '']].map(([label, value]) => (
          <label key={label} className="text-sm text-[#667281]">{label}<input readOnly value={value} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-[#F4F6F8] px-3 py-2 text-[#18202A]" /></label>
        ))}
      </div>
      <Link href={`/admin/filaments/${encodeURIComponent(record.id)}`} className="text-sm text-[#1F5FAF] hover:underline">返回耗材详情</Link>
    </div>
  );
}
