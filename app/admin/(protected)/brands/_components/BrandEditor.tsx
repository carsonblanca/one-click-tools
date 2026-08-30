"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandForm from "./BrandForm";
import type { BrandEntry } from "@/lib/filaments/catalog/brand-catalog";
import type { BrandFormValues } from "@/lib/filaments/brand-form-types";

function toFormValues(brand?: BrandEntry): BrandFormValues {
  return {
    brandId: brand?.id || "",
    slug: brand?.slug || brand?.id || "",
    name: brand?.name || "",
    nameZh: brand?.nameZh || "",
    nameEn: brand?.nameEn || brand?.name || "",
    nameZhTw: brand?.nameZhTw || "",
    aliasesText: brand?.aliases.join(", ") || "",
    logoUrl: brand?.logoUrl || "",
    websiteUrl: brand?.websiteUrl || "",
    origin: brand?.origin || "",
    contactInfo: brand?.contactInfo || "",
    officialStoreUrl: brand?.officialStoreUrl || "",
    officialStoreName: brand?.officialStoreName || "",
    description: brand?.description || "",
    seoTitle: brand?.seoTitle || "",
    seoDescription: brand?.seoDescription || "",
    status: brand?.status || "active",
    sortOrder: brand?.sortOrder ?? brand?.popularityRank ?? 0,
  };
}

export default function BrandEditor({ mode, brand }: { mode: "create" | "edit"; brand?: BrandEntry }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function save(values: BrandFormValues) {
    setMessage(null);
    try {
      const response = await fetch(mode === "create" ? "/api/admin/brands" : `/api/admin/brands/${encodeURIComponent(values.brandId)}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          aliases: (values.aliasesText || "").split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "品牌保存失败。");
      setMessage("品牌信息已保存，前台和后台将使用同一份数据。");
      router.refresh();
      if (mode === "create") router.push(`/admin/brands/${encodeURIComponent(values.brandId)}/edit`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "品牌保存失败。");
    }
  }

  return (
    <>
      {message ? <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
      <BrandForm
        mode={mode}
        initialValues={toFormValues(brand)}
        onSubmit={save}
        onCancel={() => router.push("/admin/brands")}
        submitLabel={mode === "create" ? "保存品牌" : "保存品牌修改"}
      />
    </>
  );
}
