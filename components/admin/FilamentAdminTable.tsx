"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FILAMENT_PARAMETER_DEFINITIONS } from "@/lib/filaments/parameters/normalized-parameters";

export type FilamentAdminListItem = {
  id: string;
  sourceRunId: string;
  productKey: string;
  productName: string;
  brandId: string;
  materialType: string;
  variant: string;
  reviewStatus: string;
  publicationStatus: string;
  status: string;
  enabled: boolean;
  colorCount: number;
  parameterCount: number;
  imageCount: number;
  updatedAt: string;
};

type SortKey = "productName" | "brandId" | "materialType" | "colorCount" | "parameterCount" | "publicationStatus" | "updatedAt";
type BatchField = "materialType" | "brandId" | "reviewStatus" | "publicationStatus" | "enabled" | "parameter" | "notes" | "spoolAndPackaging" | "compatibility" | "productOverrides";

const statusLabels: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  hidden: "已隐藏",
  archived: "已归档",
  pending_review: "待审核",
  approved: "已审核",
  rejected: "已拒绝",
};

function label(value: string) {
  return statusLabels[value] || value || "—";
}

function parseBatchValue(field: BatchField, rawValue: string, clearValue: boolean) {
  if (clearValue) {
    if (field === "parameter") return null;
    if (field === "spoolAndPackaging" || field === "compatibility" || field === "productOverrides") return null;
    if (field === "notes") return "";
    throw new Error("当前字段不能清空，请改为设置明确值。");
  }
  if (field === "enabled") {
    if (rawValue !== "true" && rawValue !== "false") throw new Error("启用状态必须选择启用或禁用。");
    return rawValue === "true";
  }
  if (field === "spoolAndPackaging" || field === "compatibility" || field === "productOverrides") {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("请输入 JSON 对象。");
    return parsed;
  }
  if (!rawValue.trim()) throw new Error("请输入要设置的值。");
  return rawValue.trim();
}

export default function FilamentAdminTable({ items, canBatchEdit }: { items: FilamentAdminListItem[]; canBatchEdit: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [material, setMaterial] = useState("all");
  const [publication, setPublication] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchField, setBatchField] = useState<BatchField>("materialType");
  const [batchValue, setBatchValue] = useState("");
  const [parameterKey, setParameterKey] = useState(FILAMENT_PARAMETER_DEFINITIONS[0].canonicalKey);
  const [clearValue, setClearValue] = useState(false);
  const [batching, setBatching] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ draftId: string; ok: boolean; error?: string }>>([]);
  const [message, setMessage] = useState("");

  const brands = useMemo(() => [...new Set(items.map((item) => item.brandId).filter(Boolean))].sort(), [items]);
  const materials = useMemo(() => [...new Set(items.map((item) => item.materialType).filter(Boolean))].sort(), [items]);
  const publications = useMemo(() => [...new Set(items.map((item) => item.publicationStatus).filter(Boolean))].sort(), [items]);
  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    return items
      .filter((item) => !keyword || [item.productName, item.productKey, item.brandId, item.materialType, item.variant, item.sourceRunId]
        .some((value) => value.toLocaleLowerCase("zh-CN").includes(keyword)))
      .filter((item) => brand === "all" || item.brandId === brand)
      .filter((item) => material === "all" || item.materialType === material)
      .filter((item) => publication === "all" || item.publicationStatus === publication)
      .sort((left, right) => {
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "zh-CN", { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [brand, items, material, publication, query, sortDirection, sortKey]);

  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const previewValue = clearValue ? "清空" : batchValue || "尚未填写";

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filteredItems.forEach((item) => next.delete(item.id));
      else filteredItems.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function submitBatch() {
    setMessage("");
    setBatchResults([]);
    if (!selectedItems.length) {
      setMessage("请先选择至少一个耗材。");
      return;
    }
    let value: unknown;
    try {
      value = parseBatchValue(batchField, batchValue, clearValue);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量值格式不正确。");
      return;
    }
    const patch = batchField === "parameter"
      ? clearValue
        ? { clearParameterKeys: [parameterKey] }
        : { parameterUpdates: { [parameterKey]: value } }
      : { [batchField]: value };
    const fieldLabel = batchField === "parameter" ? `参数 ${parameterKey}` : batchField;
    const preview = `将修改 ${selectedItems.length} 个耗材\n字段：${fieldLabel}\n新值：${clearValue ? "（清空）" : typeof value === "string" ? value : JSON.stringify(value)}\n\n确认继续吗？`;
    if (!window.confirm(preview)) return;
    setBatching(true);
    try {
      const response = await fetch("/api/admin/filaments/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftIds: selectedItems.map((item) => item.id), patch, confirmed: true }),
      });
      const payload = await response.json() as { error?: string; results?: Array<{ draftId: string; ok: boolean; error?: string }> };
      if (!response.ok) throw new Error(payload.error || "批量修改失败。");
      const results = payload.results || [];
      setBatchResults(results);
      const succeeded = results.filter((result) => result.ok).length;
      setMessage(`批量修改完成：成功 ${succeeded}，失败 ${results.length - succeeded}。`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量修改失败。");
    } finally {
      setBatching(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-xl border border-[#D9E0E7] bg-white p-4 lg:grid-cols-[minmax(16rem,2fr)_repeat(4,minmax(9rem,1fr))]">
        <label className="text-xs font-medium text-[#667281]">搜索
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="产品、productKey、品牌、sourceRunId" className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm text-[#18202A]" />
        </label>
        <label className="text-xs font-medium text-[#667281]">品牌
          <select value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm text-[#18202A]"><option value="all">全部品牌</option>{brands.map((value) => <option key={value}>{value}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-[#667281]">材料
          <select value={material} onChange={(event) => setMaterial(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm text-[#18202A]"><option value="all">全部材料</option>{materials.map((value) => <option key={value}>{value}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-[#667281]">发布状态
          <select value={publication} onChange={(event) => setPublication(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm text-[#18202A]"><option value="all">全部状态</option>{publications.map((value) => <option key={value}>{label(value)}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-[#667281]">排序
          <div className="mt-1 flex gap-1"><select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="min-w-0 flex-1 rounded-lg border border-[#CBD3DC] bg-white px-2 py-2 text-sm text-[#18202A]"><option value="updatedAt">更新时间</option><option value="productName">产品线</option><option value="brandId">品牌</option><option value="materialType">材料</option><option value="colorCount">颜色数</option><option value="parameterCount">参数数</option><option value="publicationStatus">发布状态</option></select><button type="button" onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")} className="rounded-lg border border-[#CBD3DC] px-3 text-sm" aria-label="切换排序方向">{sortDirection === "asc" ? "↑" : "↓"}</button></div>
        </label>
      </section>

      {canBatchEdit ? <section className="rounded-xl border border-[#D9E0E7] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-[#18202A]">批量修改</h2><p className="mt-1 text-sm text-[#667281]">已选 {selectedItems.length} 个耗材。提交前会显示修改预览并二次确认。</p></div><button type="button" disabled={!selectedItems.length || batching} onClick={submitBatch} className="rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{batching ? "正在处理…" : "预览并确认"}</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,2fr)_auto]">
          <label className="text-xs font-medium text-[#667281]">修改字段
            <select value={batchField} onChange={(event) => { setBatchField(event.target.value as BatchField); setBatchValue(""); setClearValue(false); }} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm text-[#18202A]"><option value="materialType">材料类型</option><option value="brandId">品牌</option><option value="reviewStatus">审核状态</option><option value="publicationStatus">发布状态</option><option value="enabled">启用状态</option><option value="parameter">单个参数</option><option value="notes">备注</option><option value="spoolAndPackaging">料盘与包装（JSON）</option><option value="compatibility">兼容性（JSON）</option><option value="productOverrides">产品默认覆盖（JSON）</option></select>
          </label>
          <label className="text-xs font-medium text-[#667281]">新值
            {batchField === "enabled" ? <select value={batchValue} disabled={clearValue} onChange={(event) => setBatchValue(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="">请选择</option><option value="true">启用</option><option value="false">禁用</option></select> : batchField === "reviewStatus" ? <select value={batchValue} disabled={clearValue} onChange={(event) => setBatchValue(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="">请选择</option><option value="pending_review">待审核</option><option value="approved">已审核</option><option value="rejected">已拒绝</option></select> : batchField === "publicationStatus" ? <select value={batchValue} disabled={clearValue} onChange={(event) => setBatchValue(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="">请选择</option><option value="draft">草稿</option><option value="published">已发布（逐条校验）</option><option value="hidden">隐藏</option><option value="archived">归档</option></select> : batchField === "parameter" ? <span className="mt-1 flex gap-2"><select value={parameterKey} onChange={(event) => setParameterKey(event.target.value)} className="min-w-44 rounded-lg border border-[#CBD3DC] bg-white px-2 py-2 text-sm">{FILAMENT_PARAMETER_DEFINITIONS.map((definition) => <option key={definition.canonicalKey} value={definition.canonicalKey}>{definition.zhCNLabel}</option>)}</select><input value={batchValue} disabled={clearValue} onChange={(event) => setBatchValue(event.target.value)} placeholder="参数值（含单位）" className="min-w-0 flex-1 rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm disabled:bg-[#F4F6F8]" /></span> : <input value={batchValue} disabled={clearValue} onChange={(event) => setBatchValue(event.target.value)} placeholder={batchField === "spoolAndPackaging" || batchField === "compatibility" || batchField === "productOverrides" ? "请输入 JSON 对象" : "请输入新值"} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm disabled:bg-[#F4F6F8]" />}
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-[#18202A]"><input type="checkbox" checked={clearValue} disabled={!(["parameter", "notes", "spoolAndPackaging", "compatibility", "productOverrides"] as BatchField[]).includes(batchField)} onChange={(event) => setClearValue(event.target.checked)} />清除此字段</label>
        </div>
        <p className="mt-3 rounded-lg bg-[#F4F6F8] px-3 py-2 text-xs text-[#667281]">修改预览：{selectedItems.length} 条 · {batchField} → {previewValue}</p>
        {message ? <p className="mt-3 text-sm text-[#334155]" role="status">{message}</p> : null}
        {batchResults.length ? <ul className="mt-3 max-h-36 space-y-1 overflow-auto text-xs">{batchResults.map((result) => <li key={result.draftId} className={result.ok ? "text-emerald-700" : "text-red-700"}>{result.draftId}: {result.ok ? "成功" : result.error || "失败"}</li>)}</ul> : null}
      </section> : null}

      <div className="overflow-x-auto rounded-xl border border-[#D9E0E7] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F4F6F8] text-[#667281]"><tr>{canBatchEdit ? <th className="px-4 py-3"><input type="checkbox" aria-label="选择当前结果" checked={allVisibleSelected} onChange={toggleVisible} /></th> : null}<th className="px-4 py-3">品牌</th><th className="px-4 py-3">产品线</th><th className="px-4 py-3">材料</th><th className="px-4 py-3">颜色</th><th className="px-4 py-3">参数</th><th className="px-4 py-3">审核 / 发布</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody className="divide-y divide-[#E5E9ED]">{filteredItems.map((item) => <tr key={item.id} className={selectedIds.has(item.id) ? "bg-blue-50/50" : undefined}>{canBatchEdit ? <td className="px-4 py-3"><input type="checkbox" aria-label={`选择 ${item.productName}`} checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} /></td> : null}<td className="px-4 py-3 font-medium text-[#18202A]">{item.brandId}</td><td className="px-4 py-3"><p className="font-medium text-[#18202A]">{item.productName || "未命名产品"}</p><p className="mt-0.5 text-xs text-[#667281]">{item.productKey}</p></td><td className="px-4 py-3">{item.materialType || "—"}</td><td className="px-4 py-3 tabular-nums">{item.colorCount}</td><td className="px-4 py-3 tabular-nums">{item.parameterCount}</td><td className="px-4 py-3"><p>{label(item.reviewStatus)}</p><p className="text-xs text-[#667281]">{label(item.publicationStatus)}</p></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${item.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.enabled ? "启用" : "禁用"}</span></td><td className="px-4 py-3"><Link className="text-[#1F5FAF] hover:underline" href={`/admin/filaments/${encodeURIComponent(item.id)}`}>查看 / 编辑</Link></td></tr>)}</tbody>
        </table>
        {!filteredItems.length ? <p className="p-6 text-sm text-[#667281]">没有符合条件的耗材。</p> : null}
      </div>
    </div>
  );
}
