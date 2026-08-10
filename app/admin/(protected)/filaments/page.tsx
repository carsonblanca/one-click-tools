import Link from "next/link";
import FilamentAdminTable from "@/components/admin/FilamentAdminTable";
import { requireAdminScope } from "@/lib/admin/auth";
import { hasAdminScope } from "@/lib/admin/permissions";
import { summarizeFilamentDraft } from "@/lib/filaments/admin/filament-admin";
import { listAllFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";

export default async function FilamentListPage() {
  const session = await requireAdminScope("display.view");
  const drafts = await listAllFilamentDrafts();
  const items = drafts.map(summarizeFilamentDraft);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-[#18202A]">耗材管理</h1>
        <p className="mt-1 text-sm text-[#667281]">数据库中共 {items.length} 个耗材产品记录，可按品牌、产品线、材料和状态管理。</p></div>
        {session.role === "admin" && hasAdminScope(session.role, "archive.execute") ? <Link href="/admin/filaments/reset" className="rounded-lg border border-[#D16B6B] px-4 py-2 text-sm text-[#8C1D18]">安全备份与清空</Link> : null}
      </header>
      <FilamentAdminTable
        items={items}
        canBatchEdit={session.role === "admin" && hasAdminScope(session.role, "candidate.edit.any")}
      />
    </div>
  );
}
