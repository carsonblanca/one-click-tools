"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PublishDraftButton({ sourceRunId, draftId }: { sourceRunId: string; draftId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/filament-drafts/batch-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drafts: [{ sourceRunId, draftId }] }),
      });
      const payload = await response.json().catch(() => null) as { published?: string[]; failed?: Array<{ error: string }>; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "发布失败。");
      if (payload?.published?.includes(sourceRunId)) {
        setMessage("已发布");
        router.refresh();
      } else {
        setMessage(payload?.failed?.[0]?.error || "发布未完成。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void publish()} disabled={busy} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "发布中…" : "发布耗材"}
      </button>
      {message ? <span className="text-xs text-slate-600">{message}</span> : null}
    </span>
  );
}
