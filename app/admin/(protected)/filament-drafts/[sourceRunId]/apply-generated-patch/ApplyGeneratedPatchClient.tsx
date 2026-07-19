"use client";

import { useEffect, useState } from "react";

type Summary = {
  importCount: number;
  draftCount: number;
  matchingDraftCount: number;
  sourceRunId: string;
  draftId: string;
  productName: string;
  publicationStatus: string;
  fieldCount: number;
  candidateCount: number;
  parameterEvidenceCount: number;
  colorCount: number;
  imageCount: number;
  colorImageRelationCount: number;
  pcK7Count: number;
};

type Result = { summary?: Summary; blockers?: string[]; issues?: string[]; error?: string; ok?: boolean };

export default function ApplyGeneratedPatchClient({ sourceRunId }: { sourceRunId: string }) {
  const endpoint = `/api/admin/filament-drafts/${encodeURIComponent(sourceRunId)}/apply-generated-patch`;
  const [patch, setPatch] = useState<unknown>(null);
  const [filename, setFilename] = useState("");
  const [preflight, setPreflight] = useState<Result | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(endpoint, { credentials: "include" })
      .then(async (response) => ({ response, body: await response.json() as Result }))
      .then(({ response, body }) => {
        if (!active) return;
        setPreflight(response.ok ? body : { ...body, error: body.error || `预检失败 HTTP ${response.status}` });
      })
      .catch((error) => active && setPreflight({ error: error instanceof Error ? error.message : "预检失败" }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [endpoint]);

  async function selectFile(file: File | undefined) {
    setPatch(null);
    setFilename(file?.name || "");
    setResult(null);
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setResult({ error: "补丁文件超过 1 MiB，已拒绝。" });
      return;
    }
    try {
      setPatch(JSON.parse(await file.text()));
    } catch {
      setResult({ error: "无法解析该 JSON 文件。" });
    }
  }

  async function applyOnce() {
    if (!patch || submitting || result?.ok) return;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await response.json().catch(() => null) as Result | null;
      setResult(body ? { ...body, error: response.ok ? body.error : body.error || `提交失败 HTTP ${response.status}` } : { error: `提交失败 HTTP ${response.status}` });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "提交失败" });
    } finally {
      setSubmitting(false);
    }
  }

  const blockers = preflight?.blockers || [];
  const canApply = Boolean(patch) && !loading && !preflight?.error && blockers.length === 0 && !submitting && !result?.ok;

  return (
    <section className="space-y-5 rounded-lg border border-amber-300 bg-white p-5">
      <div>
        <h2 className="font-semibold">写入前只读预检</h2>
        {loading ? <p className="text-sm text-slate-600">正在读取目标草稿…</p> : null}
        {preflight?.error ? <p className="text-sm text-red-700">{preflight.error}</p> : null}
        {preflight?.summary ? <SummaryView summary={preflight.summary} /> : null}
        {blockers.map((item) => <p className="text-sm text-red-700" key={item}>{item}</p>)}
      </div>

      <label className="block space-y-2 text-sm font-medium">
        <span>选择已验证的 draft-patch.json</span>
        <input accept="application/json,.json" type="file" onChange={(event) => void selectFile(event.target.files?.[0])} />
      </label>
      {filename ? <p className="text-xs text-slate-500">已选择：{filename}</p> : null}

      <button
        className="rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canApply}
        onClick={() => void applyOnce()}
        type="button"
      >
        {submitting ? "正在应用并回读…" : "仅应用到唯一黄金样本草稿"}
      </button>

      {result?.error ? <p className="text-sm text-red-700">{result.error}</p> : null}
      {result?.issues?.map((item) => <p className="text-sm text-red-700" key={item}>{item}</p>)}
      {result?.ok && result.summary ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">补丁已应用并通过写后回读。</p>
          <SummaryView summary={result.summary} />
        </div>
      ) : null}
    </section>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">草稿 / 导入总数</dt><dd>{summary.draftCount} / {summary.importCount}</dd></div>
      <div><dt className="text-slate-500">sourceRunId 匹配</dt><dd>{summary.matchingDraftCount}</dd></div>
      <div><dt className="text-slate-500">草稿 ID</dt><dd className="break-all">{summary.draftId}</dd></div>
      <div><dt className="text-slate-500">发布状态</dt><dd>{summary.publicationStatus}</dd></div>
      <div><dt className="text-slate-500">参数 / 候选 / 证据</dt><dd>{summary.fieldCount} / {summary.candidateCount} / {summary.parameterEvidenceCount}</dd></div>
      <div><dt className="text-slate-500">颜色 / 图片 / 关系</dt><dd>{summary.colorCount} / {summary.imageCount} / {summary.colorImageRelationCount}</dd></div>
      <div><dt className="text-slate-500">PC K7</dt><dd>{summary.pcK7Count}</dd></div>
      <div><dt className="text-slate-500">产品</dt><dd>{summary.productName}</dd></div>
    </dl>
  );
}
