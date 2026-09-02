"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DraftItem = { draftId: string; sourceRunId: string; name: string; published: boolean };

export default function DraftPublishControls({ drafts }: { drafts: DraftItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = drafts.filter((item) => !item.published);

  async function publish(items: DraftItem[]) {
    if (!items.length || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/filament-drafts/batch-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drafts: items.map(({ draftId, sourceRunId }) => ({ draftId, sourceRunId })) }),
      });
      const payload = await response.json().catch(() => null) as { published?: string[]; failed?: Array<{ error: string }> ; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "发布失败。");
      const failed = payload?.failed?.length || 0;
      setMessage(`发布完成：${payload?.published?.length || 0} 条${failed ? `，失败 ${failed} 条` : ""}。`);
      setSelected([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {pending.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
          {pending.map((item) => (
            <label key={item.draftId} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(item.draftId)}
                disabled={busy}
                onChange={(event) => {
                  setSelected((current) => event.target.checked
                    ? [...current, item.draftId]
                    : current.filter((draftId) => draftId !== item.draftId));
                }}
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="rounded bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={busy || selected.length === 0}
        onClick={() => void publish(pending.filter((item) => selected.includes(item.draftId)))}
      >
        {busy ? "发布中…" : `批量发布${selected.length ? `（${selected.length}）` : ""}`}
      </button>
      <button
        type="button"
        className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        disabled={busy || pending.length === 0}
        onClick={() => setSelected(selected.length === pending.length ? [] : pending.map((item) => item.draftId))}
      >
        {selected.length === pending.length && pending.length ? "取消全选" : "选择全部未发布"}
      </button>
      {message ? <span className="text-sm text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}
