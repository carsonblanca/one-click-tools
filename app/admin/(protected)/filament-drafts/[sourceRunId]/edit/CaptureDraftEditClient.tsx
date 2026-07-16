"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ParameterRow = { id: string; key: string; value: string };

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function rowsFromFields(fields: Record<string, unknown>): ParameterRow[] {
  return Object.entries(fields).map(([key, value], index) => ({
    id: `field-${index}`,
    key,
    value: text(value),
  }));
}

export default function CaptureDraftEditClient({
  sourceRunId,
  initialFields,
  candidateCount,
}: {
  sourceRunId: string;
  initialFields: Record<string, unknown>;
  candidateCount: number;
}) {
  const initial = useRef({ ...initialFields });
  const [rows, setRows] = useState<ParameterRow[]>(() => rowsFromFields(initialFields));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const changedFields = useMemo(() => Object.fromEntries(
    rows
      .filter((row) => row.key.trim())
      .filter((row) => text(initial.current[row.key.trim()]) !== row.value)
      .map((row) => [row.key.trim(), row.value]),
  ), [rows]);
  const hasChanges = Object.keys(changedFields).length > 0;

  function updateRow(id: string, patch: Partial<ParameterRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
    setMessage(null);
  }

  function addRow() {
    setRows((current) => [...current, { id: `new-${Date.now()}`, key: "", value: "" }]);
  }

  async function save() {
    if (!hasChanges || saving) return;
    const duplicateKeys = rows
      .map((row) => row.key.trim())
      .filter(Boolean)
      .filter((key, index, keys) => keys.indexOf(key) !== index);
    if (duplicateKeys.length) {
      setMessage({ type: "error", text: `参数名重复：${duplicateKeys[0]}` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: { fields: changedFields } }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || `保存失败 HTTP ${response.status}`);

      initial.current = { ...initial.current, ...changedFields };
      setMessage({ type: "success", text: "已保存到原 capture 草稿。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">参数字段</h2>
          <p className="text-xs text-slate-500">现有证据候选 {candidateCount} 项，本页面不会覆盖它们。</p>
        </div>
        <Link className="text-sm text-blue-700 hover:underline" href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`}>
          返回详情
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)]" key={row.id}>
            <input
              aria-label="参数名"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="参数名"
              value={row.key}
              onChange={(event) => updateRow(row.id, { key: event.target.value })}
            />
            <input
              aria-label="参数值"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="参数值"
              value={row.value}
              onChange={(event) => updateRow(row.id, { value: event.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={addRow}>
          添加参数
        </button>
        <button
          type="button"
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!hasChanges || saving}
          onClick={save}
        >
          {saving ? "保存中…" : "保存明确修改"}
        </button>
        {message ? (
          <span className={message.type === "success" ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
            {message.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
