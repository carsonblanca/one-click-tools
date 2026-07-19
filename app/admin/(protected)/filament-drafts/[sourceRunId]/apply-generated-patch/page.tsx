import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { GENERATED_PATCH_TARGET } from "@/lib/filaments/drafts/generated-patch-guard";
import ApplyGeneratedPatchClient from "./ApplyGeneratedPatchClient";

export default async function ApplyGeneratedPatchPage({
  params,
}: {
  params: Promise<{ sourceRunId: string }>;
}) {
  const session = await requireAdminSession();
  if (session.role !== "admin") redirect("/admin/forbidden");
  const { sourceRunId } = await params;
  if (sourceRunId !== GENERATED_PATCH_TARGET.sourceRunId) notFound();

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-amber-700">临时管理员专用入口 · 不发布产品</p>
        <h1 className="text-2xl font-semibold">应用 THE K5 PETG M 已生成补丁</h1>
        <p className="text-sm text-slate-600">
          服务端只接受固定 sourceRunId、固定草稿 ID 和完整的 24 项参数补丁；任何基线或内容不匹配都会在写入前拒绝。
        </p>
        <Link className="text-sm text-blue-700 hover:underline" href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`}>
          返回草稿详情
        </Link>
      </header>
      <ApplyGeneratedPatchClient sourceRunId={sourceRunId} />
    </main>
  );
}
