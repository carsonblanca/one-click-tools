"use client";

import { useMemo, useState } from "react";

type BrandDefaults = {
  name?: string;
  slug?: string;
  logo?: string;
  legalEntity?: string;
  website?: string;
  description?: string;
  spoolAndPackaging?: Record<string, unknown>;
  evidence?: unknown[];
};

type Props = {
  brandId: string;
  draftIds: string[];
  initialDefaults: BrandDefaults;
};

function pretty(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function BrandDefaultsEditor({ brandId, draftIds, initialDefaults }: Props) {
  const [name, setName] = useState(initialDefaults.name ?? brandId);
  const [slug, setSlug] = useState(initialDefaults.slug ?? brandId);
  const [logo, setLogo] = useState(initialDefaults.logo ?? "");
  const [legalEntity, setLegalEntity] = useState(initialDefaults.legalEntity ?? "");
  const [website, setWebsite] = useState(initialDefaults.website ?? "");
  const [description, setDescription] = useState(initialDefaults.description ?? "");
  const [spool, setSpool] = useState(pretty(initialDefaults.spoolAndPackaging));
  const [evidence, setEvidence] = useState(JSON.stringify(initialDefaults.evidence ?? [], null, 2));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => ({
    name: name.trim(), slug: slug.trim().toLowerCase(), logo: logo.trim(), legalEntity: legalEntity.trim(),
    website: website.trim(), description: description.trim(),
  }), [name, slug, logo, legalEntity, website, description]);

  async function save() {
    if (!draftIds.length) return;
    let spoolAndPackaging: Record<string, unknown>;
    let evidenceValue: unknown[];
    try {
      spoolAndPackaging = JSON.parse(spool || "{}");
      evidenceValue = JSON.parse(evidence || "[]");
      if (!spoolAndPackaging || Array.isArray(spoolAndPackaging) || typeof spoolAndPackaging !== "object") throw new Error("料盘与包装必须是 JSON 对象");
      if (!Array.isArray(evidenceValue)) throw new Error("证据必须是 JSON 数组");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 格式错误");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(preview.slug)) {
      setMessage("Slug 只能使用小写字母、数字和连字符");
      return;
    }
    const summary = `将把品牌默认资料同步到 ${draftIds.length} 个现有产品。产品自己的 productOverrides 仍优先。继续吗？`;
    if (!window.confirm(summary)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/filaments/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftIds,
          confirmed: true,
          patch: {
            brandId: preview.slug,
            brandDefaults: { ...preview, spoolAndPackaging, evidence: evidenceValue },
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "品牌默认资料保存失败");
      const failures = payload.results?.filter((item: { ok: boolean }) => !item.ok) ?? [];
      setMessage(`已处理 ${payload.selectedCount} 个产品；成功 ${payload.selectedCount - failures.length}，失败 ${failures.length}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "品牌默认资料保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#D9E0E7] bg-white p-5">
      <div>
        <h2 className="font-semibold text-[#18202A]">品牌默认资料</h2>
        <p className="mt-1 text-xs text-[#667281]">当前无独立品牌表；保存会把同一份默认快照写入该品牌的 {draftIds.length} 个现有产品，产品 override 优先。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["品牌名称", name, setName], ["Slug", slug, setSlug], ["Logo 路径", logo, setLogo],
          ["公司主体", legalEntity, setLegalEntity], ["官网", website, setWebsite],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="text-sm text-[#667281]">{label as string}
            <input value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-[#18202A]" />
          </label>
        ))}
      </div>
      <label className="block text-sm text-[#667281]">品牌介绍
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 text-[#18202A]" />
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm text-[#667281]">料盘与包装（JSON）
          <textarea value={spool} onChange={(event) => setSpool(event.target.value)} rows={10} spellCheck={false} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 font-mono text-xs text-[#18202A]" />
        </label>
        <label className="text-sm text-[#667281]">品牌证据（JSON 数组）
          <textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={10} spellCheck={false} className="mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 font-mono text-xs text-[#18202A]" />
        </label>
      </div>
      <div className="rounded-lg bg-[#F4F6F8] p-3 text-xs text-[#44505E]">将影响：{draftIds.length} 个现有产品。新导入产品需要再次应用品牌默认；零产品品牌无法在当前无 Schema 模式下单独保存。</div>
      <button disabled={busy || !draftIds.length} onClick={save} className="rounded-lg bg-[#1F5FAF] px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "保存中…" : "预览并应用品牌默认"}</button>
      {message ? <p className="text-sm text-[#44505E]">{message}</p> : null}
    </section>
  );
}
