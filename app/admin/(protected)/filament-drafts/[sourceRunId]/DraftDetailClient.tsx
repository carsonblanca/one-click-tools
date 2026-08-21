"use client";

import { useState, useCallback, useMemo } from "react";

type ColorRow = Record<string, unknown>;
type DraftObject = Record<string, unknown>;

type ProductFields = {
  brandId: string;
  brandName: string;
  productLineName: string;
  material: string;
  variant: string;
  diameter: string;
  netWeight: string;
  description: string;
};

type ManualParameter = {
  id: string;
  labelZh: string;
  labelEn: string;
  value: string;
  unit: string;
  sourceStatus: "official" | "manual" | "missing";
  sourceNote: string;
};

interface NormalizedColor {
  domIndex: number | null;
  nameZh: string;
  nameEn: string;
  officialColorCode: string;
  availability: string;
  displayStatus: string;
  imageDisplayStatus: string;
  imageReviewNote: string;
  imageSelectionReason: string;
  colorIndex: number;
}

interface EditableFields {
  nameZh: string;
  nameEn: string;
  officialColorCode: string;
  availability: string;
  displayStatus: string;
  imageDisplayStatus: string;
  imageReviewNote: string;
  imageSelectionReason: string;
}

interface SaveColorsPayload {
  domIndex: number;
  colorNameZh: string;
  colorNameEn: string;
  officialColorCode: string;
  availability: string;
  displayStatus: string;
  imageDisplayStatus: string;
  imageReviewNote: string;
  imageSelectionReason: string;
}

const DISPLAY_STATUS_OPTIONS = ["pending", "approved", "hidden"] as const;
const IMAGE_STATUS_OPTIONS = ["pending", "approved", "hidden", "no_image"] as const;
const PARAM_SOURCE_OPTIONS = ["official", "manual", "missing"] as const;

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function normalizeProduct({
  brandId,
  brand,
  productLine,
}: {
  brandId: string;
  brand: DraftObject;
  productLine: DraftObject;
}): ProductFields {
  return {
    brandId,
    brandName: text(brand.name) || text(brand.nameZh) || text(brand.nameEn),
    productLineName: text(productLine.name),
    material: text(productLine.materialType),
    variant: text(productLine.variant),
    diameter: text(productLine.diameterMm),
    netWeight: text(productLine.netWeightG),
    description: text(productLine.description),
  };
}

function normalizeColor(color: ColorRow, index: number): NormalizedColor {
  const domIndex =
    color.domIndex != null && !Number.isNaN(Number(color.domIndex))
      ? Number(color.domIndex)
      : null;
  return {
    domIndex,
    nameZh: String(color.nameZh ?? ""),
    nameEn: String(color.nameEn ?? ""),
    officialColorCode: String(color.officialColorCode ?? ""),
    availability: String(color.availability ?? ""),
    displayStatus: String(color.displayStatus ?? "pending"),
    imageDisplayStatus: String(color.imageDisplayStatus ?? "pending"),
    imageReviewNote: String(color.imageReviewNote ?? ""),
    imageSelectionReason: String(color.imageSelectionReason ?? color.imageReviewNote ?? ""),
    colorIndex: index,
  };
}

function isDirty(original: NormalizedColor, current: EditableFields): boolean {
  return (
    current.nameZh !== original.nameZh ||
    current.nameEn !== original.nameEn ||
    current.officialColorCode !== original.officialColorCode ||
    current.availability !== original.availability ||
    current.displayStatus !== original.displayStatus ||
    current.imageDisplayStatus !== original.imageDisplayStatus ||
    current.imageReviewNote !== original.imageReviewNote ||
    current.imageSelectionReason !== original.imageSelectionReason
  );
}

function normalizeManualParameter(value: unknown, index: number): ManualParameter {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const sourceStatus = PARAM_SOURCE_OPTIONS.includes(row.sourceStatus as ManualParameter["sourceStatus"])
    ? row.sourceStatus as ManualParameter["sourceStatus"]
    : "manual";
  return {
    id: text(row.id) || `param-${index + 1}`,
    labelZh: text(row.labelZh),
    labelEn: text(row.labelEn),
    value: text(row.value),
    unit: text(row.unit),
    sourceStatus,
    sourceNote: text(row.sourceNote),
  };
}

function makeParameter(): ManualParameter {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    labelZh: "",
    labelEn: "",
    value: "",
    unit: "",
    sourceStatus: "manual",
    sourceNote: "",
  };
}

export default function DraftDetailClient({
  sourceRunId,
  brandId,
  brand,
  productLine,
  colors: rawColors,
  manualParameters: rawManualParameters,
}: {
  sourceRunId: string;
  brandId: string;
  brand: DraftObject;
  productLine: DraftObject;
  colors: ColorRow[];
  manualParameters: unknown[];
}) {
  const [initial, setInitial] = useState(() => rawColors.map(normalizeColor));
  const [initialProduct, setInitialProduct] = useState(() =>
    normalizeProduct({ brandId, brand, productLine }),
  );

  const [productFields, setProductFields] = useState<ProductFields>(initialProduct);
  const [editable, setEditable] = useState<EditableFields[]>(() =>
    initial.map((c) => ({
      nameZh: c.nameZh,
      nameEn: c.nameEn,
      officialColorCode: c.officialColorCode,
      availability: c.availability,
      displayStatus: c.displayStatus,
      imageDisplayStatus: c.imageDisplayStatus,
      imageReviewNote: c.imageReviewNote,
      imageSelectionReason: c.imageSelectionReason,
    }))
  );
  const [manualParameters, setManualParameters] = useState<ManualParameter[]>(() => {
    const normalized = rawManualParameters.map(normalizeManualParameter);
    if (normalized.length) return normalized;
    return [
      { ...makeParameter(), labelZh: "材料", labelEn: "Material", value: text(productLine.materialType), sourceStatus: "manual" },
      { ...makeParameter(), labelZh: "线径", labelEn: "Diameter", value: text(productLine.diameterMm), unit: "mm", sourceStatus: "manual" },
      { ...makeParameter(), labelZh: "净重", labelEn: "Net Weight", value: text(productLine.netWeightG), unit: "g", sourceStatus: "manual" },
      { ...makeParameter(), labelZh: "表面效果", labelEn: "Finish", value: text(productLine.variant), sourceStatus: "manual" },
      { ...makeParameter(), labelZh: "来源状态", labelEn: "Source Status", value: "manual", sourceStatus: "manual" },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dirtyColors = useMemo<SaveColorsPayload[]>(() => {
    const changed: SaveColorsPayload[] = [];
    initial.forEach((original, idx) => {
      if (original.domIndex == null) return;
      const current = editable[idx];
      if (!current) return;
      if (isDirty(original, current)) {
        changed.push({
          domIndex: original.domIndex,
          colorNameZh: current.nameZh,
          colorNameEn: current.nameEn,
          officialColorCode: current.officialColorCode,
          availability: current.availability,
          displayStatus: current.displayStatus,
          imageDisplayStatus: current.imageDisplayStatus,
          imageReviewNote: current.imageReviewNote,
          imageSelectionReason: current.imageSelectionReason,
        });
      }
    });
    return changed;
  }, [editable, initial]);

  const hasProductChanges = useMemo(() =>
    (Object.keys(productFields) as Array<keyof ProductFields>).some(
      (key) => productFields[key] !== initialProduct[key],
    ),
  [initialProduct, productFields]);

  const hasChanges = dirtyColors.length > 0 || hasProductChanges || manualParameters.length > 0;

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(
        `/api/admin/filament-drafts/${encodeURIComponent(sourceRunId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: productFields,
            colors: editable.map((current, idx) => ({
                domIndex: initial[idx]?.domIndex ?? idx,
              colorNameZh: current.nameZh,
              colorNameEn: current.nameEn,
              officialColorCode: current.officialColorCode,
              availability: current.availability,
              displayStatus: current.displayStatus,
              imageDisplayStatus: current.imageDisplayStatus,
              imageReviewNote: current.imageReviewNote,
              imageSelectionReason: current.imageSelectionReason,
            })),
            manualParameters: manualParameters.filter((parameter) =>
              parameter.labelZh.trim() ||
              parameter.labelEn.trim() ||
              parameter.value.trim() ||
              parameter.unit.trim() ||
              parameter.sourceNote.trim(),
            ),
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "保存失败" }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setInitial((current) => current.map((orig, idx) => ({
        ...orig,
        nameZh: editable[idx].nameZh,
        nameEn: editable[idx].nameEn,
        officialColorCode: editable[idx].officialColorCode,
        availability: editable[idx].availability,
        displayStatus: editable[idx].displayStatus,
        imageDisplayStatus: editable[idx].imageDisplayStatus,
        imageReviewNote: editable[idx].imageReviewNote,
        imageSelectionReason: editable[idx].imageSelectionReason,
      })));
      setInitialProduct(productFields);

      setSaveMessage({ type: "success", text: "已保存" });
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "保存失败",
      });
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, sourceRunId, editable, initial, manualParameters, productFields]);

  const updateColor = useCallback(
    (
      idx: number,
      field: keyof EditableFields,
      value: string
    ) => {
      setEditable((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
      setSaveMessage(null);
    },
    []
  );

  function updateProduct(field: keyof ProductFields, value: string) {
    setProductFields((current) => ({ ...current, [field]: value }));
    setSaveMessage(null);
  }

  function updateParameter(index: number, field: keyof ManualParameter, value: string) {
    setManualParameters((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ));
    setSaveMessage(null);
  }

  function addParameter() {
    setManualParameters((current) => [...current, makeParameter()]);
    setSaveMessage(null);
  }

  function removeParameter(index: number) {
    setManualParameters((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSaveMessage(null);
  }

  return (
    <section className="rounded-lg border border-cyan-200 bg-cyan-50/30 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">保存草稿</h2>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.type === "success"
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {saveMessage.text}
            </span>
          )}
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={handleSave}
            className="rounded bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-40"
          >
            {saving
              ? "保存中..."
              : hasChanges
                ? `保存 (${dirtyColors.length})`
                : "已是最新"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white p-3">
        <h3 className="font-medium">产品基础字段</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["brandId", "品牌 ID"],
            ["brandName", "品牌名称"],
            ["productLineName", "产品线名称"],
            ["material", "材料"],
            ["variant", "变体"],
            ["diameter", "线径"],
            ["netWeight", "净重"],
            ["description", "描述"],
          ] as Array<[keyof ProductFields, string]>).map(([field, label]) => (
            <label key={field} className="text-sm">
              <span className="text-slate-500">{label}</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={productFields[field]}
                onChange={(event) => updateProduct(field, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <h3 className="font-medium">颜色字段</h3>
        {initial.map((color, idx) => {
          if (color.domIndex == null) {
            return (
              <div
                key={idx}
                className="rounded border border-slate-200 p-3 opacity-50"
              >
                <p className="text-sm text-slate-500">
                  {color.nameZh || "颜色名称待补充"} — 缺少 domIndex
                </p>
              </div>
            );
          }

          const edit = editable[idx];

          return (
            <div
              key={color.domIndex}
              className="rounded border border-slate-200 p-3"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium">
                  {color.nameZh || "名称待补充"}
                </span>
                <span className="text-xs text-slate-500">
                  {color.officialColorCode || "暂无官方色号"}
                </span>
                <span className="text-xs text-slate-400">
                  domIndex: {color.domIndex}
                </span>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">
                  <span className="text-slate-500">中文颜色名</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={edit.nameZh}
                    onChange={(e) => updateColor(idx, "nameZh", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">英文颜色名</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={edit.nameEn}
                    onChange={(e) => updateColor(idx, "nameEn", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">官方色号 / SKU</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={edit.officialColorCode}
                    placeholder="暂无官方色号"
                    onChange={(e) => updateColor(idx, "officialColorCode", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">可售状态</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={edit.availability}
                    onChange={(e) => updateColor(idx, "availability", e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <span className="text-slate-500">显示状态:</span>
                  <select
                    value={edit.displayStatus}
                    onChange={(e) =>
                      updateColor(idx, "displayStatus", e.target.value)
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-sm"
                  >
                    {DISPLAY_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <span className="text-slate-500">图片状态:</span>
                  <select
                    value={edit.imageDisplayStatus}
                    onChange={(e) =>
                      updateColor(idx, "imageDisplayStatus", e.target.value)
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-sm"
                  >
                    {IMAGE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">图片选择原因 / 备注</span>
                  <input
                    type="text"
                    value={edit.imageSelectionReason}
                    onChange={(e) =>
                      updateColor(idx, "imageSelectionReason", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    placeholder="备注"
                  />
                </label>
              </div>
            </div>
          );
        })}
        {initial.length === 0 && (
          <p className="text-sm text-slate-500">暂无颜色数据</p>
        )}
      </div>

      <div className="mt-5 rounded border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">手动参数</h3>
          <button
            type="button"
            onClick={addParameter}
            className="rounded border border-cyan-700 px-3 py-1 text-sm text-cyan-800 hover:bg-cyan-50"
          >
            新增参数
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {manualParameters.map((parameter, idx) => (
            <div key={parameter.id} className="rounded border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <label className="text-sm">
                  <span className="text-slate-500">中文标签</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.labelZh} onChange={(event) => updateParameter(idx, "labelZh", event.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">英文标签</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.labelEn} onChange={(event) => updateParameter(idx, "labelEn", event.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">值</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.value} onChange={(event) => updateParameter(idx, "value", event.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">单位</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.unit} onChange={(event) => updateParameter(idx, "unit", event.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-500">来源状态</span>
                  <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.sourceStatus} onChange={(event) => updateParameter(idx, "sourceStatus", event.target.value)}>
                    {PARAM_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={() => removeParameter(idx)} className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">删除</button>
                </div>
                <label className="text-sm sm:col-span-2 lg:col-span-6">
                  <span className="text-slate-500">来源备注</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={parameter.sourceNote} onChange={(event) => updateParameter(idx, "sourceNote", event.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
