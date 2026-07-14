import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { BRAND_CATALOG, CATALOG_RECORDS } from "@/lib/filaments/catalog";

const sections = [
  { href: "/admin/filaments", label: "耗材管理", description: "查看主线目录中的耗材与颜色记录。" },
  { href: "/admin/brands", label: "品牌管理", description: "按品牌查看目录覆盖情况。" },
  { href: "/admin/filament-evidence", label: "颜色与图片", description: "管理颜色图片和证据。" },
  { href: "/admin/filament-drafts", label: "审核队列", description: "查看待审核的导入草稿。" },
  { href: "/admin/filament-import", label: "导入与同步", description: "导入 FIP 并检查同步结果。" },
];

export default async function AdminHomePage() {
  await requireAdminScope("display.view");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[#667281]">管理后台</p>
        <h1 className="text-2xl font-semibold text-[#18202A]">概览</h1>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
          <p className="text-sm text-[#667281]">目录耗材</p>
          <p className="mt-2 text-3xl font-semibold text-[#18202A]">{CATALOG_RECORDS.length}</p>
        </div>
        <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
          <p className="text-sm text-[#667281]">品牌</p>
          <p className="mt-2 text-3xl font-semibold text-[#18202A]">{BRAND_CATALOG.length}</p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="rounded-xl border border-[#D9E0E7] bg-white p-5 hover:border-[#1F5FAF]">
            <h2 className="font-semibold text-[#18202A]">{section.label}</h2>
            <p className="mt-2 text-sm text-[#667281]">{section.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
