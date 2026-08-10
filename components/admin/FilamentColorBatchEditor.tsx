"use client";

import { useMemo, useState } from "react";

type ColorRow = Record<string, unknown>;

function colorText(row: ColorRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function colorKey(row: ColorRow, index: number) {
  return colorText(row, "colorId", "matchKey", "colorCode", "officialColorCode", "sku", "rawSkuId") || `color-${index + 1}`;
}

export function FilamentColorBatchEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("enable");
  const [actionValue, setActionValue] = useState("");
  const [message, setMessage] = useState("");
  const parsed = useMemo(() => {
    try {
      const rows = JSON.parse(value);
      return Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object" && !Array.isArray(row)) as ColorRow[] : [];
    } catch { return []; }
  }, [value]);
  const keyed = parsed.map((row, index) => ({ row, index, key: colorKey(row, index) }));

  function updateRows(transform: (row: ColorRow, index: number, key: string) => ColorRow) {
    onChange(JSON.stringify(keyed.map((item) => transform(item.row, item.index, item.key)), null, 2));
  }

  function apply() {
    if (!selected.size) { setMessage("请先选择颜色。"); return; }
    if ((action === "imageStatus" || action === "imagePath") && !actionValue.trim()) { setMessage("请输入要设置的值。"); return; }
    updateRows((row, _index, key) => {
      if (!selected.has(key)) return row;
      if (action === "enable") return { ...row, enabled: true };
      if (action === "disable") return { ...row, enabled: false };
      if (action === "imageStatus") return { ...row, imageStatus: actionValue.trim() };
      if (action === "imagePath") return { ...row, localImagePath: actionValue.trim() };
      if (action === "clearImagePath") {
        const next = { ...row };
        delete next.localImagePath;
        return next;
      }
      return row;
    });
    setMessage(`已在表单中修改 ${selected.size} 个颜色；点击页面底部保存后才会写入数据库。`);
  }

  function normalizeOrder() {
    updateRows((row, index) => ({ ...row, displayOrder: index + 1 }));
    setMessage(`已按当前顺序设置 ${keyed.length} 个颜色的 displayOrder；尚未保存。`);
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#E5E9ED] bg-[#FAFBFC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-[#18202A]">颜色批量编辑</h3><p className="mt-1 text-xs text-[#667281]">已选 {selected.size} / {keyed.length}；不会生成图片或复制其他颜色图片。</p></div><button type="button" onClick={normalizeOrder} className="rounded-lg border border-[#CBD3DC] px-3 py-2 text-xs text-[#18202A]">按当前顺序重排</button></div>
      <div className="flex flex-wrap gap-2">
        <select value={action} onChange={(event) => { setAction(event.target.value); setActionValue(""); }} className="rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="enable">启用</option><option value="disable">禁用</option><option value="imageStatus">设置图片状态</option><option value="imagePath">设置图片引用</option><option value="clearImagePath">清除图片引用</option></select>
        {action === "imageStatus" ? <select value={actionValue} onChange={(event) => setActionValue(event.target.value)} className="rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="">请选择</option><option value="available">有效图片</option><option value="placeholder">官方占位</option><option value="download_failed">下载失败</option><option value="mapping_missing">映射缺失</option></select> : null}
        {action === "imagePath" ? <input value={actionValue} onChange={(event) => setActionValue(event.target.value)} placeholder="仅填写当前草稿已有图片引用" className="min-w-72 rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm" /> : null}
        <button type="button" onClick={apply} className="rounded-lg bg-[#1F5FAF] px-3 py-2 text-sm text-white">应用到表单</button>
      </div>
      <div className="max-h-72 overflow-auto rounded-lg border border-[#E5E9ED] bg-white">
        <table className="min-w-full text-left text-xs"><thead className="sticky top-0 bg-[#F4F6F8] text-[#667281]"><tr><th className="p-2"><input type="checkbox" aria-label="选择全部颜色" checked={Boolean(keyed.length) && selected.size === keyed.length} onChange={(event) => setSelected(event.target.checked ? new Set(keyed.map((item) => item.key)) : new Set())} /></th><th className="p-2">颜色</th><th className="p-2">厂家编码 / SKU</th><th className="p-2">状态</th><th className="p-2">顺序</th><th className="p-2">图片引用</th></tr></thead><tbody>{keyed.map(({ row, key, index }) => <tr key={`${key}-${index}`} className="border-t border-[#E5E9ED]"><td className="p-2"><input type="checkbox" checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} /></td><td className="p-2">{colorText(row, "displayNameZhCN", "nameZh", "colorNameZh", "displayNameEn", "nameEn") || key}</td><td className="p-2">{colorText(row, "officialColorCode", "colorCode")} {colorText(row, "sku", "rawSkuId", "rawSkuText")}</td><td className="p-2">{row.enabled === false ? "禁用" : "启用"} · {colorText(row, "imageStatus") || "未标记"}</td><td className="p-2">{typeof row.displayOrder === "number" ? row.displayOrder : index + 1}</td><td className="max-w-64 truncate p-2 font-mono">{colorText(row, "localImagePath") || "—"}</td></tr>)}</tbody></table>
      </div>
      {message ? <p className="text-xs text-[#44505E]">{message}</p> : null}
    </div>
  );
}
