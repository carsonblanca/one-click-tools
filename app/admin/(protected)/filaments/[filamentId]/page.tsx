import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getCatalogRecord } from "@/lib/filaments/catalog";

export default async function FilamentDetailPage({ params }: { params: Promise<{ filamentId: string }> }) {
  await requireAdminScope("display.view");
  const { filamentId } = await params;
  const record = getCatalogRecord(filamentId);
  if (!record) notFound();

  const fields = [
    ["品牌", record.brand], ["产品线", record.productLine], ["材料", record.materialType],
    ["变体", record.variant], ["颜色中文名", record.color.colorNameZh],
    ["颜色英文名", record.color.colorNameEn], ["官方颜色代码", record.color.digitalSwatch?.officialColorCode || "—"],
    ["净重", `${record.spool.netFilamentWeight} g`],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-[#667281]">耗材详情</p><h1 className="text-2xl font-semibold text-[#18202A]">{record.productLine} · {record.color.colorNameZh}</h1></div>
        <Link href={`/admin/filaments/${encodeURIComponent(record.id)}/edit`} className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">编辑页面</Link>
      </div>
      <dl className="grid gap-4 rounded-xl border border-[#D9E0E7] bg-white p-5 sm:grid-cols-2">
        {fields.map(([label, value]) => <div key={label}><dt className="text-xs text-[#667281]">{label}</dt><dd className="mt-1 text-sm font-medium text-[#18202A]">{value || "—"}</dd></div>)}
      </dl>
      <Link href="/admin/filaments" className="text-sm text-[#1F5FAF] hover:underline">返回耗材管理</Link>
    </div>
  );
}
