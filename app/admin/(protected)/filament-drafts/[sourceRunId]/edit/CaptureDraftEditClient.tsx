"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  FILAMENT_PARAMETER_DEFINITIONS,
  normalizeParameterCandidate,
} from "@/lib/filaments/parameters/normalized-parameters";

type ParameterRow = {
  id: string;
  key: string;
  label: string;
  category: string;
  value: string;
};

const candidateStatusLabels: Record<string, string> = {
  approved: "已批准候选",
  candidate: "候选",
  conflict: "身份或数值冲突",
  sku_candidate: "SKU 候选",
  rejected: "污染/已拒绝",
  unmapped: "待归类",
};

const sourceTypeLabels: Record<string, string> = {
  sku: "SKU",
  ocr: "OCR",
  structured_capture: "结构化采集",
  contamination: "来源污染",
  unknown: "来源未识别",
};

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function rowsFromFields(fields: Record<string, unknown>): ParameterRow[] {
  return FILAMENT_PARAMETER_DEFINITIONS.map((item) => ({
    id: `field-${item.canonicalKey}`,
    key: item.canonicalKey,
    label: item.zhCNLabel,
    category: item.category,
    value: text(fields[item.canonicalKey]),
  }));
}

export default function CaptureDraftEditClient({
  sourceRunId,
  initialFields,
  initialCandidates,
  initialUnmappedFields,
}: {
  sourceRunId: string;
  initialFields: Record<string, unknown>;
  initialCandidates: Array<Record<string, unknown>>;
  initialUnmappedFields: Record<string, unknown>;
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
  const normalizedCandidates = useMemo(
    () => initialCandidates.map(normalizeParameterCandidate),
    [initialCandidates],
  );
  const candidatesByKey = useMemo(() => {
    const result = new Map<string, ReturnType<typeof normalizeParameterCandidate>[]>();
    for (const candidate of normalizedCandidates) {
      const key = candidate.canonicalKey || "unmapped";
      result.set(key, [...(result.get(key) || []), candidate]);
    }
    return result;
  }, [normalizedCandidates]);

  function updateRow(id: string, patch: Partial<ParameterRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
    setMessage(null);
  }

  async function save() {
    if (!hasChanges || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parameters: {
            fields: changedFields,
          },
        }),
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
          <p className="text-xs text-slate-500">现有证据候选 {initialCandidates.length} 项；保存时会原样保留并补齐对应来源摘要。</p>
        </div>
        <Link className="text-sm text-blue-700 hover:underline" href={`/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`}>
          返回详情
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const candidates = candidatesByKey.get(row.key) || [];
          return (
          <div className="rounded border border-slate-200 p-3" key={row.id}>
            <div className="grid gap-2 sm:grid-cols-[minmax(200px,1fr)_minmax(220px,2fr)] sm:items-center">
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-slate-500">{row.key} · {row.category}</p>
              </div>
              <input
                aria-label={`${row.label}参数值`}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder={candidates.length ? "候选值待人工确认" : "缺失/待补充"}
                value={row.value}
                onChange={(event) => updateRow(row.id, { value: event.target.value })}
              />
            </div>
            {candidates.map((candidate, index) => (
              <p className="mt-1 text-xs text-amber-700" key={`${row.key}-${index}`}>
                {candidateStatusLabels[candidate.candidateStatus] || candidate.candidateStatus}：
                {candidate.normalizedDisplayValue || "无可显示值"} · {sourceTypeLabels[candidate.sourceType] || candidate.sourceType}
              </p>
            ))}
          </div>
          );
        })}
        {Object.entries(initialUnmappedFields).map(([key, value]) => (
          <div className="rounded border border-amber-200 bg-amber-50 p-3" key={`unmapped-${key}`}>
            <p className="text-sm font-medium text-amber-900">待归类参数</p>
            <p className="text-xs text-amber-700">{key}：{text(value)}</p>
          </div>
        ))}
        {candidatesByKey.get("unmapped")?.map((candidate, index) => (
          <div className="rounded border border-amber-200 bg-amber-50 p-3" key={`unmapped-candidate-${index}`}>
            <p className="text-sm font-medium text-amber-900">待归类候选</p>
            <p className="text-xs text-amber-700">
              {text(candidate.field) || text(candidate.key) || "未知字段"}：{candidate.normalizedDisplayValue || "无可显示值"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
