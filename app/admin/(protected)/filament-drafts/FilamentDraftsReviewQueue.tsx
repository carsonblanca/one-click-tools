"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type DraftItem = {
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

function isPublishable(item: DraftItem, isAdmin: boolean) {
  return (
    isAdmin &&
    item.publication_status === "draft" &&
    ["pending_review", "approved"].includes(item.review_status)
  );
}

type PublishResult = {
  sourceRunId: string;
  name: string;
  ok: boolean;
  message: string;
};

export default function FilamentDraftsReviewQueue({
  drafts,
  isAdmin,
}: {
  drafts: DraftItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PublishResult[] | null>(null);

  const publishableItems = useMemo(
    () => drafts.filter((d) => isPublishable(d, isAdmin)),
    [drafts, isAdmin],
  );

  const allSelected =
    publishableItems.length > 0 &&
    publishableItems.every((d) => selected.has(d.source_run_id));
  const someSelected = publishableItems.some((d) => selected.has(d.source_run_id));

  const toggle = (sourceRunId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceRunId)) next.delete(sourceRunId);
      else next.add(sourceRunId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(() => {
      if (allSelected) return new Set();
      return new Set(publishableItems.map((d) => d.source_run_id));
    });
  };

  const selectedItems = useMemo(
    () => drafts.filter((d) => selected.has(d.source_run_id)),
    [drafts, selected],
  );

  const runBatchPublish = async () => {
    if (busy || selectedItems.length === 0) return;
    const confirmed = window.confirm(
      `即将发布 ${selectedItems.length} 个耗材草稿到 Preview：\n\n` +
        selectedItems.map((d) => `- ${displayValue(d.product_line_name)}`).join("\n") +
        `\n\n确认发布？`,
    );
    if (!confirmed) return;

    setBusy(true);
    setResults(null);
    const collected: PublishResult[] = [];
    for (const item of selectedItems) {
      try {
        const response = await fetch("/api/admin/filament-drafts/batch-publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ sourceRunIds: [item.source_run_id] }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: string[];
        };
        if (!response.ok) {
          const message =
            body.error ||
            (Array.isArray(body.issues) ? body.issues.join("；") : "") ||
            `HTTP ${response.status}`;
          collected.push({
            sourceRunId: item.source_run_id,
            name: displayValue(item.product_line_name),
            ok: false,
            message,
          });
        } else {
          collected.push({
            sourceRunId: item.source_run_id,
            name: displayValue(item.product_line_name),
            ok: true,
            message: "已发布",
          });
        }
      } catch (error) {
        collected.push({
          sourceRunId: item.source_run_id,
          name: displayValue(item.product_line_name),
          ok: false,
          message: error instanceof Error ? error.message : "网络异常",
        });
      }
    }
    setResults(collected);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of collected) {
        if (r.ok) next.delete(r.sourceRunId);
      }
      return next;
    });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runBatchPublish}
          disabled={busy || selectedItems.length === 0}
          className="inline-flex items-center rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "发布中…" : "批量发布到 Preview"}
        </button>
        <span className="text-sm text-slate-500">
          {selectedItems.length > 0 ? `已选择 ${selectedItems.length} 项` : "未选择草稿"}
        </span>
      </div>

      {results ? (
        <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          {results.map((r) => (
            <li key={r.sourceRunId} className="flex items-center gap-2">
              <span className={r.ok ? "text-emerald-700" : "text-red-700"}>
                {r.ok ? "✅" : "❌"}
              </span>
              <span className="font-medium text-slate-800">{r.name}</span>
              <span className={r.ok ? "text-emerald-700" : "text-red-700"}>
                {r.ok ? "已发布" : `发布失败：${r.message}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="全选可发布草稿"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    disabled={publishableItems.length === 0}
                  />
                </th>
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
                const canPublish = isPublishable(draft, isAdmin);

                return (
                  <tr
                    key={draft.id}
                    className={canPublish ? "align-top" : "align-top opacity-70"}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${displayValue(draft.product_line_name)}`}
                        checked={canPublish && selected.has(sourceRunId)}
                        onChange={() => canPublish && toggle(sourceRunId)}
                        disabled={!canPublish}
                      />
                    </td>
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
    </div>
  );
}
