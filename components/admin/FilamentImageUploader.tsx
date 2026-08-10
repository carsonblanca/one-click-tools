"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ColorOption = { key: string; label: string };

export function FilamentImageUploader({ draftId, colors }: { draftId: string; colors: ColorOption[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("product");
  const [colorKey, setColorKey] = useState(colors[0]?.key || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    if (!file || (role === "color" && !colorKey)) { setMessage("请选择图片和目标颜色。"); return; }
    if (!window.confirm(`将上传 ${file.name}，角色为 ${role}${role === "color" ? `，并更新颜色 ${colorKey} 的图片关系` : ""}。继续吗？`)) return;
    const form = new FormData(); form.set("file", file); form.set("role", role); if (role === "color") form.set("colorKey", colorKey);
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/filaments/${encodeURIComponent(draftId)}/image`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "图片上传失败");
      setMessage("图片已保存；产品图/颜色图会按角色展示，evidence-only 仅保留作证据。"); setFile(null); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "图片上传失败"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-lg border border-[#E5E9ED] bg-[#FAFBFC] p-4"><div><h3 className="text-sm font-semibold text-[#18202A]">上传替换/新增图片</h3><p className="mt-1 text-xs text-[#667281]">仅支持 JPEG、PNG、WebP、AVIF，最大 15 MB。不会删除原图。</p></div><div className="flex flex-wrap gap-2"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFile(event.target.files?.[0] || null)} className="max-w-full text-sm" /><select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="product">产品展示图</option><option value="color">颜色图</option><option value="evidence-only">仅证据图</option></select>{role === "color" ? <select value={colorKey} onChange={(event) => setColorKey(event.target.value)} className="rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"><option value="">选择颜色</option>{colors.map((color) => <option key={color.key} value={color.key}>{color.label}</option>)}</select> : null}<button type="button" disabled={busy || !file} onClick={upload} className="rounded-lg bg-[#1F5FAF] px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "上传中…" : "确认上传"}</button></div>{message ? <p className="text-xs text-[#44505E]">{message}</p> : null}</div>;
}
