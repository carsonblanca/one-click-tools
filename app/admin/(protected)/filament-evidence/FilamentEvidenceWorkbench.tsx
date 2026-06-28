"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { FilamentEvidenceDraft } from "@/lib/filaments/evidence/evidence-draft-store";

type BrandOption = {
  id: string;
  label: string;
  productLines: Array<{ id: string; label: string; materialType: string }>;
};

const EVIDENCE_TYPES = [
  ["official_color_reference", "官方颜色参考图"],
  ["product_detail_color_card", "商品详情色卡图"],
  ["parameter_sheet", "参数表"],
  ["product_title", "产品标题 / 型号图"],
  ["color_code_supplement", "色号补充图"],
  ["other", "其他补充证据"],
] as const;

export default function FilamentEvidenceWorkbench({
  brands,
  initialDrafts,
  actorId,
}: {
  brands: BrandOption[];
  initialDrafts: FilamentEvidenceDraft[];
  actorId: string;
}) {
  const [brandId, setBrandId] = useState("");
  const [productLineId, setProductLineId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [message, setMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const brand = brands.find((item) => item.id === brandId);
  const product = brand?.productLines.find((item) => item.id === productLineId);
  const evidenceLabel = EVIDENCE_TYPES.find(([id]) => id === evidenceType)?.[1] || "";
  const binding = useMemo(() => brand && product && materialType && evidenceType ? {
    brandId: brand.id,
    brandLabel: brand.label,
    productLineId: product.id,
    productLineLabel: product.label,
    filamentId: "",
    materialType,
    evidenceType,
    evidenceTypeLabel: evidenceLabel,
    selectedBy: actorId,
    selectedAt: new Date().toISOString(),
  } : null, [actorId, brand, evidenceLabel, evidenceType, materialType, product]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "filament-evidence:save") return;
      try {
        const dataUrl = String(event.data.sourceImageDataUrl || "");
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const form = new FormData();
        form.set("sourceImage", new File([blob], event.data.sourceImageName || "source.png", { type: blob.type }));
        const payload = { ...event.data };
        delete payload.sourceImageDataUrl;
        delete payload.type;
        form.set("payload", JSON.stringify(payload));
        const saved = await fetch("/api/admin/filament-evidence", { method: "POST", body: form });
        const body = await saved.json();
        if (!saved.ok) throw new Error(body.error || "保存失败");
        setDrafts((current) => [...current, body.draft]);
        setMessage("已保存为待审核证据草稿");
        iframeRef.current?.contentWindow?.postMessage(
          { type: "filament-evidence:saved", draftId: body.draft.id },
          window.location.origin,
        );
      } catch (error) {
        const text = error instanceof Error ? error.message : "保存失败";
        setMessage(text);
        iframeRef.current?.contentWindow?.postMessage(
          { type: "filament-evidence:save-error", message: text },
          window.location.origin,
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const injectBinding = () => {
    if (!binding) {
      setMessage("请完整选择品牌、产品系列、材料类型和证据类型。");
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(
      { type: "filament-evidence:init", targetBinding: binding },
      window.location.origin,
    );
    setMessage("目标已绑定，可开始标注。");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">证据采集工作台</h1>
        <p className="mt-1 text-sm text-[#667281]">人工标注只保存为待审核证据，不会写入正式颜色数据。</p>
      </div>
      <section className="grid gap-3 border-y border-[#D9E0E7] py-4 md:grid-cols-4">
        <label className="text-sm">品牌
          <select className="mt-1 w-full border p-2" value={brandId} onChange={(event) => {
            setBrandId(event.target.value); setProductLineId(""); setMaterialType("");
          }}>
            <option value="">请选择</option>
            {brands.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm">产品系列
          <select className="mt-1 w-full border p-2" value={productLineId} disabled={!brand} onChange={(event) => {
            setProductLineId(event.target.value);
            const selected = brand?.productLines.find((item) => item.id === event.target.value);
            setMaterialType(selected?.materialType || "");
          }}>
            <option value="">请选择</option>
            {brand?.productLines.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm">材料类型
          <select className="mt-1 w-full border p-2" value={materialType} onChange={(event) => setMaterialType(event.target.value)}>
            <option value="">请选择</option>
            {["PLA","PETG","ABS","TPU","ASA","PA","PC","其他"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm">证据类型
          <select className="mt-1 w-full border p-2" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
            <option value="">请选择</option>
            {EVIDENCE_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>当前目标：{binding ? `${binding.brandLabel} / ${binding.productLineLabel} / ${binding.materialType} / ${binding.evidenceTypeLabel}` : "待选择"}</p>
          <button className="border border-[#1F5FAF] px-4 py-2 text-[#1F5FAF] disabled:opacity-40" disabled={!binding} onClick={injectBinding}>进入标注工作台</button>
        </div>
        {message && <p className="md:col-span-4 text-sm text-[#1F5FAF]">{message}</p>}
      </section>
      <iframe
        ref={iframeRef}
        title="人工色卡标注器"
        src="/api/admin/filament-evidence/annotator"
        className="h-[760px] w-full border border-[#D9E0E7]"
        onLoad={injectBinding}
      />
      <section>
        <h2 className="text-lg font-semibold">证据草稿</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">目标</th><th className="p-2">标题</th><th className="p-2">卡片</th><th className="p-2">状态</th><th className="p-2">原图</th></tr></thead>
            <tbody>{drafts.slice().reverse().map((draft) => (
              <tr key={draft.id} className="border-b">
                <td className="p-2">{draft.targetBinding.brandLabel} / {draft.targetBinding.productLineLabel} / {draft.targetBinding.materialType}</td>
                <td className="p-2">{String(draft.titleEvidence.confirmedTitle || "未确认")}</td>
                <td className="p-2">{draft.cardCount}</td>
                <td className="p-2">{draft.reviewStatus === "pending_review" ? "待审核" : draft.reviewStatus}</td>
                <td className="p-2"><Link className="text-[#1F5FAF] hover:underline" href={`/admin/filament-evidence/${draft.id}`}>查看原图与标注</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
