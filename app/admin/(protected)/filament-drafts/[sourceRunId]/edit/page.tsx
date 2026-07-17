import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { isCaptureDraftData } from "@/lib/filaments/drafts/capture-draft-patch";
import { getFilamentDraftBySourceRunId } from "@/lib/filaments/imports/supabase-import-repository";
import CaptureDraftEditClient from "./CaptureDraftEditClient";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export default async function EditCaptureDraftPage({
  params,
}: {
  params: Promise<{ sourceRunId: string }>;
}) {
  await requireAdminScope("display.draft.edit");
  const { sourceRunId } = await params;
  const draft = await getFilamentDraftBySourceRunId(sourceRunId);
  if (!draft) notFound();

  const data = objectValue(draft.draft_data);
  if (!isCaptureDraftData(data)) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">此草稿不支持 capture 安全编辑</h1>
        <p className="text-sm text-slate-600">该入口不会把未知或人工草稿转换为 capture 格式。</p>
        <Link className="text-blue-700 hover:underline" href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`}>
          返回草稿详情
        </Link>
      </main>
    );
  }

  const parameters = objectValue(data.parameters);
  const candidates = Array.isArray(parameters.candidates)
    ? parameters.candidates.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">capture 草稿安全编辑</p>
        <h1 className="text-2xl font-semibold">{draft.product_line_name || "未命名耗材"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          仅合并明确修改的参数；颜色、图片、SKU、证据和产品标识不会由此页面提交。
        </p>
      </header>
      <CaptureDraftEditClient
        sourceRunId={sourceRunId}
        initialFields={objectValue(parameters.fields)}
        initialCandidates={candidates}
      />
    </main>
  );
}
