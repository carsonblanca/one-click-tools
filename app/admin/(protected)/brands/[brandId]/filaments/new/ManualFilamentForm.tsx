"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ManualBrand } from "@/lib/filaments/manual-filament-types";
import type { ManualParameterTemplateItem } from "@/lib/filaments/manual-parameter-template";

type ParameterRow = ManualParameterTemplateItem & {
  value: string;
  sourceStatus: "manual" | "official" | "missing";
  sourceNote: string;
};

type UploadedAsset = {
  id: string;
  kind: "image" | "preset";
  fileName: string;
  objectKey: string;
  url: string;
  contentType: string;
  size: number;
};

type ColorRow = {
  id: string;
  colorNameZh: string;
  colorNameEn: string;
  officialColorCode: string;
  availability: string;
  image: UploadedAsset | null;
  note: string;
};

type PresetRow = {
  id: string;
  name: string;
  fileName: string;
  objectKey: string;
  url: string;
  fileType: string;
  size: number;
  note: string;
};

function makeColor(): ColorRow {
  return {
    id: `color-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    colorNameZh: "",
    colorNameEn: "",
    officialColorCode: "",
    availability: "available",
    image: null,
    note: "",
  };
}

function groupParameters(rows: ParameterRow[]) {
  const groups = new Map<string, ParameterRow[]>();
  for (const row of rows) {
    const current = groups.get(row.category) || [];
    current.push(row);
    groups.set(row.category, current);
  }
  return [...groups.entries()];
}

export default function ManualFilamentForm({
  brand,
  parameterTemplate,
}: {
  brand: ManualBrand;
  parameterTemplate: ManualParameterTemplateItem[];
}) {
  const router = useRouter();
  const [productLine, setProductLine] = useState({
    productLineId: "",
    productLineName: "",
    material: "",
    variant: "",
    diameter: "1.75",
    netWeight: "1000",
    description: "",
    officialUrl: "",
    datasheetUrl: "",
    note: "",
  });
  const [parameters, setParameters] = useState<ParameterRow[]>(() =>
    parameterTemplate.map((item) => ({
      ...item,
      value: "",
      sourceStatus: "manual",
      sourceNote: "",
    })),
  );
  const [colors, setColors] = useState<ColorRow[]>(() => [
    { ...makeColor(), colorNameZh: "黑色", colorNameEn: "Black" },
    { ...makeColor(), colorNameZh: "白色", colorNameEn: "White" },
  ]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const groupedParameters = useMemo(() => groupParameters(parameters), [parameters]);

  function updateProduct(field: keyof typeof productLine, value: string) {
    setProductLine((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function updateParameter(key: string, patch: Partial<ParameterRow>) {
    setParameters((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
    setMessage(null);
  }

  function updateColor(id: string, patch: Partial<ColorRow>) {
    setColors((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setMessage(null);
  }

  async function uploadAsset(file: File, kind: "image" | "preset") {
    const form = new FormData();
    form.append("file", file);
    form.append("brandId", brand.brandId);
    form.append("kind", kind);
    const response = await fetch("/api/admin/filament-assets", {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => null) as { asset?: UploadedAsset; error?: string } | null;
    if (!response.ok || !body?.asset) {
      throw new Error(body?.error || `上传失败 HTTP ${response.status}`);
    }
    return body.asset;
  }

  async function handleColorImageUpload(colorId: string, file: File | null) {
    if (!file) return;
    setMessage(null);
    try {
      const asset = await uploadAsset(file, "image");
      updateColor(colorId, { image: asset });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "图片上传失败" });
    }
  }

  async function handlePresetUpload(file: File | null) {
    if (!file) return;
    setMessage(null);
    try {
      const asset = await uploadAsset(file, "preset");
      setPresets((current) => [...current, {
        id: asset.id,
        name: file.name,
        fileName: asset.fileName,
        objectKey: asset.objectKey,
        url: asset.url,
        fileType: asset.contentType,
        size: asset.size,
        note: "",
      }]);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "预设上传失败" });
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/manual-filaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: brand.brandId,
          productLine,
          parameters,
          colors: colors.map((color) => ({
            id: color.id,
            colorNameZh: color.colorNameZh,
            colorNameEn: color.colorNameEn,
            officialColorCode: color.officialColorCode,
            availability: color.availability,
            image: color.image ? {
              objectKey: color.image.objectKey,
              url: color.image.url,
              fileName: color.image.fileName,
              contentType: color.image.contentType,
              size: color.image.size,
              displayMode: "contain",
            } : null,
            note: color.note,
          })),
          presets,
        }),
      });
      const body = await response.json().catch(() => null) as { redirectUrl?: string; error?: string } | null;
      if (!response.ok || !body?.redirectUrl) {
        throw new Error(body?.error || `保存失败 HTTP ${response.status}`);
      }
      setMessage({ type: "success", text: "已保存手动耗材草稿。" });
      router.push(body.redirectUrl);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">品牌管理 / 添加耗材</p>
        <h1 className="text-2xl font-semibold">添加耗材：{brand.brandName}</h1>
        <p className="mt-2 text-sm text-slate-600">人工录入草稿，不触发 FIP、OCR、Evidence 队列或发布。</p>
      </header>

      {message ? (
        <div className={`rounded border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">基础信息</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {([
            ["productLineName", "产品线名称 *"],
            ["material", "材料 *"],
            ["variant", "变体"],
            ["diameter", "线径"],
            ["netWeight", "净重"],
            ["productLineId", "产品线 ID"],
            ["description", "简介"],
            ["officialUrl", "官方商品链接"],
            ["datasheetUrl", "官方资料链接"],
            ["note", "备注"],
          ] as Array<[keyof typeof productLine, string]>).map(([field, label]) => (
            <label key={field} className="text-sm">
              <span className="text-slate-600">{label}</span>
              <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={productLine[field]} onChange={(event) => updateProduct(field, event.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">参数模板（{parameterTemplate.length}）</h2>
        <p className="mt-1 text-sm text-slate-500">只填写 value 的参数会进入展示候选；空值会保留在草稿中，但后续前台必须过滤。</p>
        <div className="mt-4 space-y-5">
          {groupedParameters.map(([category, rows]) => (
            <div key={category} className="rounded border border-slate-200 p-4">
              <h3 className="font-medium">{category}</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {rows.map((row) => (
                  <div key={row.key} className="rounded bg-slate-50 p-3">
                    <div className="text-sm font-medium">{row.labelZh} <span className="text-slate-400">/ {row.labelEn}</span></div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_80px_120px]">
                      <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="填写参数值，空值不展示" value={row.value} onChange={(event) => updateParameter(row.key, { value: event.target.value })} />
                      <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="单位" value={row.unit || ""} onChange={(event) => updateParameter(row.key, { unit: event.target.value })} />
                      <select className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={row.sourceStatus} onChange={(event) => updateParameter(row.key, { sourceStatus: event.target.value as ParameterRow["sourceStatus"] })}>
                        <option value="manual">manual</option>
                        <option value="official">official</option>
                        <option value="missing">missing</option>
                      </select>
                    </div>
                    <input className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="来源备注" value={row.sourceNote} onChange={(event) => updateParameter(row.key, { sourceNote: event.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">颜色管理</h2>
          <button type="button" className="rounded border border-cyan-700 px-3 py-1 text-sm text-cyan-800" onClick={() => setColors((current) => [...current, makeColor()])}>添加颜色</button>
        </div>
        <div className="mt-4 space-y-4">
          {colors.map((color) => (
            <div key={color.id} className="rounded border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="中文颜色名" value={color.colorNameZh} onChange={(event) => updateColor(color.id, { colorNameZh: event.target.value })} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="英文颜色名" value={color.colorNameEn} onChange={(event) => updateColor(color.id, { colorNameEn: event.target.value })} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="暂无官方色号" value={color.officialColorCode} onChange={(event) => updateColor(color.id, { officialColorCode: event.target.value })} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="available" value={color.availability} onChange={(event) => updateColor(color.id, { availability: event.target.value })} />
                <input className="rounded border border-slate-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="备注" value={color.note} onChange={(event) => updateColor(color.id, { note: event.target.value })} />
                <label className="text-sm">
                  <span className="text-slate-600">颜色图片</span>
                  <input className="mt-1 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void handleColorImageUpload(color.id, event.target.files?.[0] || null)} />
                </label>
                <button type="button" className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700" onClick={() => setColors((current) => current.filter((item) => item.id !== color.id))}>删除颜色</button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
                {color.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={color.image.url} alt="" className="h-16 w-16 rounded border object-contain" />
                    <span>{color.image.fileName}</span>
                  </>
                ) : <span>未上传图片</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">预设文件</h2>
        <input className="mt-3 block text-sm" type="file" accept=".json,.bbscfg,.3mf,.zip,.txt,.ini" onChange={(event) => void handlePresetUpload(event.target.files?.[0] || null)} />
        <div className="mt-3 space-y-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex flex-wrap items-center gap-3 rounded border border-slate-200 p-3 text-sm">
              <input className="rounded border border-slate-300 px-2 py-1.5" value={preset.name} onChange={(event) => setPresets((current) => current.map((item) => item.id === preset.id ? { ...item, name: event.target.value } : item))} />
              <span className="text-slate-500">{preset.fileName}</span>
              <button type="button" className="text-red-700" onClick={() => setPresets((current) => current.filter((item) => item.id !== preset.id))}>删除</button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={() => void handleSave()} className="rounded bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-50">
          {saving ? "保存中..." : "保存草稿"}
        </button>
      </div>
    </main>
  );
}
