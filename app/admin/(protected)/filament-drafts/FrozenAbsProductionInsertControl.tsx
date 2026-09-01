"use client";

import { useState } from "react";

type InsertResult = {
  insertOnly?: boolean;
  inserted?: Array<{ sourceRunId: string; parentId: string; draftId: string }>;
  error?: string;
};

export default function FrozenAbsProductionInsertControl() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InsertResult | null>(null);

  async function execute() {
    if (busy || result?.inserted?.length === 4) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/filament-drafts/frozen-production-insert-once", {
        method: "POST",
        headers: { "x-frozen-abs-page-execute": "confirm-frozen-abs-page-insert-only" },
        credentials: "same-origin",
        body: "",
      });
      const payload = await response.json().catch(() => ({ error: "invalid_response" })) as InsertResult;
      if (!response.ok) throw new Error(payload.error || `执行失败（${response.status}）`);
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "执行失败" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
      <h2 className="font-semibold text-amber-950">Frozen ABS 一次性迁移</h2>
      <p className="mt-2 text-sm text-amber-900">
        仅插入四条固定 Frozen ABS 草稿；不会发布、更新、删除或写入图片。请确认当前为 Production Admin 后再执行。
      </p>
      <button
        type="button"
        className="mt-4 rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={busy || result?.inserted?.length === 4}
        onClick={() => void execute()}
      >
        {busy ? "执行中…" : result?.inserted?.length === 4 ? "已完成（不可重复执行）" : "执行 Frozen ABS 一次性迁移"}
      </button>
      {result?.error ? <p className="mt-3 text-sm text-red-700">{result.error}</p> : null}
      {result?.inserted?.length ? <p className="mt-3 text-sm text-emerald-800">已完成 {result.inserted.length}/4 条 insert-only 写入，请继续只读核对。</p> : null}
    </section>
  );
}
