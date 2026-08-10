"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { FilamentColorBatchEditor } from "@/components/admin/FilamentColorBatchEditor";
import { FilamentImageUploader } from "@/components/admin/FilamentImageUploader";

export type FilamentAdminEditorDraft = {
  id: string;
  sourceRunId: string;
  productName: string;
  productKey: string;
  brandId: string;
  materialType: string;
  series: string;
  variant: string;
  netWeightG: number | null;
  netWeightOptionsG: number[];
  filamentDiameterMm: number | null;
  colors: Array<Record<string, unknown>>;
  parameters: Record<string, unknown>;
  images: Array<Record<string, unknown>>;
  spoolAndPackaging: Record<string, unknown> | null;
  compatibility: Record<string, unknown> | null;
  brandDefaults: Record<string, unknown> | null;
  productOverrides: Record<string, unknown> | null;
  notes: string;
  evidence: Array<Record<string, unknown>>;
  reviewStatus: string;
  publicationStatus: string;
  enabled: boolean;
  updatedAt: string;
  parameterCandidateCount: number;
  parameterEvidenceCount: number;
};

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseObject(value: string, field: string, nullable = false) {
  if (nullable && !value.trim()) return null;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${field} 必须是 JSON 对象。`);
  return parsed as Record<string, unknown>;
}

function parseArray(value: string, field: string) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`${field} 必须是 JSON 对象数组。`);
  }
  return parsed as Array<Record<string, unknown>>;
}

function optionalPositiveNumber(value: string, field: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${field} 必须是正数。`);
  return parsed;
}

function numberList(value: string) {
  if (!value.trim()) return [];
  const parsed = value.split(/[,，\s]+/).filter(Boolean).map(Number);
  if (parsed.some((item) => !Number.isFinite(item) || item <= 0)) throw new Error("多重量规格必须是逗号分隔的正数。");
  return [...new Set(parsed)].sort((left, right) => left - right);
}

function JsonEditor({ label, description, value, onChange, rows = 10 }: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm font-medium text-[#334155]">
      {label}
      {description ? <span className="ml-2 text-xs font-normal text-[#667281]">{description}</span> : null}
      <textarea rows={rows} spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-[#FAFBFC] px-3 py-2 font-mono text-xs leading-5 text-[#18202A]" />
    </label>
  );
}

export default function FilamentAdminEditor({ draft }: { draft: FilamentAdminEditorDraft }) {
  const router = useRouter();
  const [productName, setProductName] = useState(draft.productName);
  const [productKey, setProductKey] = useState(draft.productKey);
  const [brandId, setBrandId] = useState(draft.brandId);
  const [materialType, setMaterialType] = useState(draft.materialType);
  const [series, setSeries] = useState(draft.series);
  const [variant, setVariant] = useState(draft.variant);
  const [netWeightG, setNetWeightG] = useState(draft.netWeightG?.toString() || "");
  const [netWeightOptionsG, setNetWeightOptionsG] = useState(draft.netWeightOptionsG.join(", "));
  const [filamentDiameterMm, setFilamentDiameterMm] = useState(draft.filamentDiameterMm?.toString() || "");
  const [colors, setColors] = useState(pretty(draft.colors));
  const [parameters, setParameters] = useState(pretty(draft.parameters));
  const [images, setImages] = useState(pretty(draft.images));
  const [spoolAndPackaging, setSpoolAndPackaging] = useState(draft.spoolAndPackaging ? pretty(draft.spoolAndPackaging) : "");
  const [compatibility, setCompatibility] = useState(draft.compatibility ? pretty(draft.compatibility) : "");
  const [brandDefaults, setBrandDefaults] = useState(draft.brandDefaults ? pretty(draft.brandDefaults) : "");
  const [productOverrides, setProductOverrides] = useState(draft.productOverrides ? pretty(draft.productOverrides) : "");
  const [notes, setNotes] = useState(draft.notes);
  const [evidence, setEvidence] = useState(pretty(draft.evidence));
  const [reviewStatus, setReviewStatus] = useState(draft.reviewStatus);
  const [publicationStatus, setPublicationStatus] = useState(draft.publicationStatus);
  const [enabled, setEnabled] = useState(draft.enabled);
  const [updatedAt, setUpdatedAt] = useState(draft.updatedAt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const summary = useMemo(() => `${draft.colors.length} 个颜色 · ${Object.keys(draft.parameters).length} 个正式参数 · ${draft.parameterCandidateCount} 个候选 · ${draft.parameterEvidenceCount} 条参数证据 · ${draft.images.length} 张图片`, [draft]);
  const colorOptions = useMemo(() => draft.colors.map((color, index) => {
    const key = String(color.colorId || color.matchKey || color.officialColorCode || color.colorCode || color.sku || color.rawSkuId || `color-${index + 1}`);
    const name = String(color.displayNameZhCN || color.nameZh || color.colorNameZh || color.displayNameEn || color.nameEn || key);
    return { key, label: `${name} (${String(color.officialColorCode || color.colorCode || key)})` };
  }), [draft.colors]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    let patch: Record<string, unknown>;
    try {
      patch = {
        productName: productName.trim(),
        productKey: productKey.trim(),
        brandId: brandId.trim(),
        materialType: materialType.trim(),
        series: series.trim(),
        variant: variant.trim(),
        netWeightG: optionalPositiveNumber(netWeightG, "净重"),
        netWeightOptionsG: numberList(netWeightOptionsG),
        filamentDiameterMm: optionalPositiveNumber(filamentDiameterMm, "线径"),
        colors: parseArray(colors, "颜色"),
        parameters: parseObject(parameters, "参数"),
        images: parseArray(images, "图片"),
        spoolAndPackaging: parseObject(spoolAndPackaging, "料盘与包装", true),
        compatibility: parseObject(compatibility, "兼容性", true),
        brandDefaults: parseObject(brandDefaults, "品牌默认快照", true),
        productOverrides: parseObject(productOverrides, "产品覆盖值", true),
        notes,
        evidence: parseArray(evidence, "证据"),
        reviewStatus,
        publicationStatus,
        enabled,
      };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "表单格式不正确。");
      return;
    }
    const changeSummary = [
      `产品：${productName || "未命名"}`,
      `品牌 / 材料：${brandId} / ${materialType}`,
      `颜色：${(patch.colors as unknown[]).length}`,
      `参数：${Object.keys(patch.parameters as Record<string, unknown>).length}`,
      `图片：${(patch.images as unknown[]).length}`,
      `审核 / 发布：${reviewStatus} / ${publicationStatus}`,
    ].join("\n");
    if (!window.confirm(`即将保存以下耗材业务数据：\n\n${changeSummary}\n\n该操作会直接更新当前草稿记录，确认继续吗？`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/filaments/${encodeURIComponent(draft.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch, expectedUpdatedAt: updatedAt }),
      });
      const payload = await response.json() as { error?: string; draft?: { updated_at?: string } };
      if (!response.ok) throw new Error(payload.error || "保存失败。");
      if (payload.draft?.updated_at) setUpdatedAt(payload.draft.updated_at);
      setMessage("保存成功。页面数据已从数据库更新。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#18202A]">产品资料</h2><p className="mt-1 text-sm text-[#667281]">{summary}</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />启用此耗材</label></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[{ label: "产品名称", value: productName, setter: setProductName }, { label: "productKey", value: productKey, setter: setProductKey }, { label: "品牌 Slug", value: brandId, setter: setBrandId }, { label: "材料类型", value: materialType, setter: setMaterialType }, { label: "系列", value: series, setter: setSeries }, { label: "变体", value: variant, setter: setVariant }, { label: "净重（g）", value: netWeightG, setter: setNetWeightG }, { label: "多重量规格（g，逗号分隔）", value: netWeightOptionsG, setter: setNetWeightOptionsG }, { label: "线径（mm）", value: filamentDiameterMm, setter: setFilamentDiameterMm }].map((field) => <label key={field.label} className="text-sm font-medium text-[#334155]">{field.label}<input value={field.value} onChange={(event) => field.setter(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-[#18202A]" /></label>)}
        </div>
      </section>

      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5"><h2 className="text-lg font-semibold text-[#18202A]">颜色与图片</h2><p className="mt-1 text-sm text-[#667281]">可维护名称、厂家色名/编码、HEX、图片关系、显示顺序和启用状态。请保留证据图片的非展示角色。</p><div className="mt-4 space-y-4"><FilamentImageUploader draftId={draft.id} colors={colorOptions} /><FilamentColorBatchEditor value={colors} onChange={setColors} /><JsonEditor label="颜色原始数据（JSON）" description="高级编辑：名称、厂家编码、HEX、图片关系、顺序、状态" value={colors} onChange={setColors} rows={16} /><JsonEditor label="图片（JSON）" description="包含产品图、颜色图与 evidence-only 图" value={images} onChange={setImages} rows={16} /></div></section>

      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5"><h2 className="text-lg font-semibold text-[#18202A]">参数与兼容性</h2><p className="mt-1 text-sm text-[#667281]">只保存当前参数字典已支持的字段；空字段不会在前台展示。候选与 sourceEvidence 会原样保留。</p><div className="mt-4 space-y-4"><JsonEditor label="正式参数 fields（JSON）" value={parameters} onChange={setParameters} rows={16} /><JsonEditor label="兼容性（JSON，可留空）" value={compatibility} onChange={setCompatibility} /></div></section>

      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5"><h2 className="text-lg font-semibold text-[#18202A]">料盘、包装与追溯</h2><div className="mt-4 space-y-4"><JsonEditor label="料盘与包装（JSON，可留空）" value={spoolAndPackaging} onChange={setSpoolAndPackaging} /><JsonEditor label="品牌默认快照（JSON，可留空）" description="品牌页批量传播；产品覆盖值优先" value={brandDefaults} onChange={setBrandDefaults} /><JsonEditor label="产品覆盖值（JSON，可留空）" description="只覆盖本产品的品牌/料盘等默认值" value={productOverrides} onChange={setProductOverrides} /><label className="block text-sm font-medium text-[#334155]">备注<textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm" /></label><JsonEditor label="证据（JSON）" description="人工改值不删除既有 Evidence" value={evidence} onChange={setEvidence} rows={14} /></div></section>

      <section className="rounded-xl border border-[#D9E0E7] bg-white p-5"><h2 className="text-lg font-semibold text-[#18202A]">状态</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-[#334155]">审核状态<select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2"><option value="pending_review">待审核</option><option value="approved">已审核</option><option value="rejected">已拒绝</option></select></label><label className="text-sm font-medium text-[#334155]">发布状态<select value={publicationStatus} onChange={(event) => setPublicationStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2"><option value="draft">草稿</option><option value="published">已发布（保存时执行现有发布资格校验）</option><option value="hidden">隐藏</option><option value="archived">归档</option></select></label></div></section>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#CBD3DC] bg-white/95 p-4 shadow-lg backdrop-blur"><div><p className="text-sm font-medium text-[#18202A]">草稿 ID：<span className="font-mono text-xs">{draft.id}</span></p><p className="mt-1 text-xs text-[#667281]">sourceRunId：{draft.sourceRunId} · 乐观锁：{updatedAt}</p>{message ? <p className="mt-2 text-sm text-[#334155]" role="status">{message}</p> : null}</div><button disabled={saving} type="submit" className="rounded-lg bg-[#1F5FAF] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? "正在保存…" : "预览并保存"}</button></div>
    </form>
  );
}
