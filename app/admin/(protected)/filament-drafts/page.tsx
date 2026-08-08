import { requireAdminScope } from "@/lib/admin/auth";
import { readAdminSession } from "@/lib/admin/session";
import { listRecentFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import FilamentDraftsReviewQueue from "./FilamentDraftsReviewQueue";

type DraftListItem = {
  id: string;
  source_run_id: string;
  status: string;
  review_status: string;
  publication_status: string;
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
  const session = await readAdminSession();
  const isAdmin = session?.role === "admin";

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
        <FilamentDraftsReviewQueue drafts={drafts} isAdmin={isAdmin} />
      ) : null}
    </main>
  );
}
