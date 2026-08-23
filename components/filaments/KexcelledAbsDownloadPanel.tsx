"use client";

import { useMemo, useState } from "react";
import { generateKexcelledAbsPreset } from "@/lib/filaments/presets/bambu/kexcelled-abs";
import { getBambuPrinterOptions } from "@/lib/bambu-filament-presets";
import type { PublicKexcelledAbsProduct } from "@/lib/filaments/catalog/published-kexcelled";

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function KexcelledAbsDownloadPanel({ product }: { product: PublicKexcelledAbsProduct }) {
  const printers = useMemo(() => getBambuPrinterOptions(), []);
  const [printerId, setPrinterId] = useState(printers[0]?.id || "");
  const generated = printerId ? generateKexcelledAbsPreset({
    productLine: product.productLine,
    parameters: product.parameters,
    defaultColor: product.defaultColor,
    printerId,
  }) : null;

  return (
    <div className="rounded-2xl border border-[#E5DED0] bg-[#FFFDF7] p-5">
      <h2 className="text-lg font-semibold">下载 Bambu Studio 预设</h2>
      <p className="mt-2 text-sm text-[#6B665D]">选择打印机后生成对应的 JSON 预设。</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select value={printerId} onChange={(event) => setPrinterId(event.target.value)} className="rounded-xl border border-[#E5DED0] bg-[#F5F2EA] px-4 py-3 text-sm">
          {printers.map((printer) => <option key={printer.id} value={printer.id}>{printer.name}</option>)}
        </select>
        <button
          type="button"
          disabled={!generated}
          onClick={() => generated && downloadJson(generated.fileName, generated.preset)}
          className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          下载预设
        </button>
      </div>
      <p className="mt-3 text-xs text-[#8A8173]">默认颜色：{product.defaultColor || "未设置"}</p>
    </div>
  );
}
