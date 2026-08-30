import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getBrandEntry } from "@/lib/filaments/catalog/brand-store";
import BrandEditor from "../../_components/BrandEditor";

export default async function EditBrandPage({ params }: { params: Promise<{ brandId: string }> }) {
  await requireAdminScope("display.draft.create");
  const { brandId } = await params;
  const brand = await getBrandEntry(brandId);
  if (!brand) notFound();
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理 / 编辑</p>
        <h1 className="text-2xl font-semibold">编辑 {brand.nameZh}</h1>
        <p className="mt-2 text-sm text-slate-600">Logo、中文名、英文名、别名、官网、状态和排序保存后会同步到前台品牌列表。</p>
      </header>
      <BrandEditor mode="edit" brand={brand} />
    </main>
  );
}
