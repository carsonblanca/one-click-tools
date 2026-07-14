import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { BRAND_CATALOG } from "@/lib/filaments/catalog";

export default async function NewBrandFilamentPage({ params }: { params: Promise<{ brandId: string }> }) {
  await requireAdminScope("display.draft.create");
  const { brandId } = await params;
  const brand = BRAND_CATALOG.find((item) => item.id === brandId);
  if (!brand) notFound();

  return (
    <div className="space-y-5">
      <header><p className="text-sm text-[#667281]">{brand.name} · 添加耗材</p><h1 className="text-2xl font-semibold text-[#18202A]">选择现有录入流程</h1><p className="mt-2 text-sm text-[#667281]">当前只恢复后台页面层，不新增保存或上传接口。请通过现有 FIP 导入流程创建草稿。</p></header>
      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5"><h2 className="font-semibold text-[#18202A]">FIP 导入</h2><p className="mt-2 text-sm text-[#667281]">导入后可在审核队列查看并进入详情。</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/filament-import" className="rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm text-white">前往导入与同步</Link><Link href="/admin/filament-drafts" className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">查看审核队列</Link></div></div>
      <Link href={`/admin/brands/${brand.id}`} className="text-sm text-[#1F5FAF] hover:underline">返回品牌详情</Link>
    </div>
  );
}
