import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { BrandDefaultsEditor } from "@/components/admin/BrandDefaultsEditor";
import { listAllFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import { summarizeFilamentDraft } from "@/lib/filaments/admin/filament-admin";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function AdminBrandDetailPage({ params }: { params: Promise<{ brandId: string }> }) {
  await requireAdminScope("display.view");
  const { brandId } = await params;
  const decodedBrandId = decodeURIComponent(brandId);
  const drafts = (await listAllFilamentDrafts()).filter((draft) => draft.brand_id === decodedBrandId);
  if (!drafts.length) notFound();
  const summaries = drafts.map(summarizeFilamentDraft);
  const defaults = objectValue(objectValue(drafts[0].draft_data).brandDefaults);
  const name = String(defaults.name || decodedBrandId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-[#667281]">品牌管理</p><h1 className="text-2xl font-semibold text-[#18202A]">{name}</h1><p className="mt-1 text-sm text-[#667281]">现有产品：{drafts.length}</p></div>
        <Link href={`/admin/brands/${encodeURIComponent(decodedBrandId)}/filaments/new`} className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">导入新耗材</Link>
      </div>
      <BrandDefaultsEditor brandId={decodedBrandId} draftIds={drafts.map((draft) => draft.id)} initialDefaults={defaults} />
      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <h2 className="font-semibold text-[#18202A]">现有产品</h2>
        <ul className="mt-3 divide-y divide-[#E5E9ED]">
          {summaries.map((record) => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="text-sm text-[#18202A]">{record.productName} · {record.materialType} · {record.colorCount} 色 · {record.publicationStatus}</span><Link href={`/admin/filaments/${encodeURIComponent(record.id)}`} className="text-sm text-[#1F5FAF] hover:underline">查看</Link></li>)}
        </ul>
      </section>
      <Link href="/admin/brands" className="text-sm text-[#1F5FAF] hover:underline">返回品牌管理</Link>
    </div>
  );
}
