import Link from "next/link";
import { requireAdminScope } from "@/lib/admin/auth";
import { listRecentFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";

type DraftListItem = {
  id: string;
  source_run_id: string;
  status: string;
  review_status: string;
  brand_id: string;
  product_line_name: string | null;
  material_type: string | null;
  created_at: string;
  updated_at: string;
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "未填写";
}

function displayTime(value: string | null | undefined) {
  if (!value) return "未填写";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未填写";

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export default async function FilamentDraftsPage() {
  await requireAdminScope("candidate.view");

  let drafts: DraftListItem[] = [];
  let loadFailed = false;

  try {
    drafts = await listRecentFilamentDrafts(100);
  } catch (error) {
    loadFailed = true;
    console.error("filament_draft_list_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">耗材草稿</p>
        <h1 className="text-2xl font-semibold">审核队列</h1>
        <p className="mt-2 text-sm text-slate-600">
          查看现有草稿，并进入详情或继续编辑。
        </p>
      </header>

      {loadFailed ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          草稿列表读取失败，请稍后重试。
        </section>
      ) : null}

      {!loadFailed && drafts.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
          暂无待处理草稿
        </section>
      ) : null}

      {!loadFailed && drafts.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">品牌 / 产品</th>
                  <th className="px-4 py-3 font-medium">材料</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 font-medium">sourceRunId</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drafts.map((draft) => {
                  const sourceRunId = draft.source_run_id?.trim() || "";
                  const detailHref = sourceRunId
                    ? `/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`
                    : "";

                  return (
                    <tr key={draft.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {displayValue(draft.brand_id).toUpperCase()}
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {displayValue(draft.product_line_name)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {displayValue(draft.material_type)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {displayValue(draft.status)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {displayValue(draft.review_status)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{displayTime(draft.updated_at || draft.created_at)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          创建：{displayTime(draft.created_at)}
                        </p>
                      </td>
                      <td className="max-w-xs break-all px-4 py-4 font-mono text-xs text-slate-600">
                        {displayValue(sourceRunId)}
                      </td>
                      <td className="px-4 py-4">
                        {detailHref ? (
                          <div className="flex min-w-max gap-3">
                            <Link className="text-blue-700 hover:underline" href={detailHref}>
                              查看详情
                            </Link>
                            <Link className="text-cyan-700 hover:underline" href={`${detailHref}/edit`}>
                              继续编辑
                            </Link>
                          </div>
                        ) : (
                          <span className="text-slate-400">链接不可用</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
