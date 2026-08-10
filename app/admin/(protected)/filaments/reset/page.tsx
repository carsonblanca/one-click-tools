import { requireAdminScope } from "@/lib/admin/auth";
import { FilamentResetPanel } from "@/components/admin/FilamentResetPanel";

export default async function FilamentResetPage() {
  const session = await requireAdminScope("archive.execute");
  if (session.role !== "admin") return null;
  return (
    <div className="space-y-5">
      <header><p className="text-sm text-[#667281]">耗材管理</p><h1 className="text-2xl font-semibold text-[#18202A]">安全备份与清空</h1><p className="mt-2 text-sm text-[#667281]">先盘点、再备份并回读校验，最后才允许按精确快照 ID 清空。Phase A 验收不会执行清空。</p></header>
      <FilamentResetPanel />
    </div>
  );
}
