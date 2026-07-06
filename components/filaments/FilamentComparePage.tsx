"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  CATALOG_RECORDS,
  getCatalogRecords,
  getCompareValue,
  getLocalizedFilamentColorName,
  type CatalogRecord,
} from "@/lib/filaments/catalog";
import type { Locale } from "@/lib/i18n";

const COMPARE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    unknown: "No reliable public evidence found yet",
    back: "← Back to Filament Library",
    title: "Filament comparison",
    intro: "Compare 2 to 4 filaments side by side. This is simulated catalog data and is not a product recommendation.",
    mobileHint: "Use a larger screen to view the full comparison table",
    parameter: "Parameter",
    brand: "Brand",
    series: "Series",
    materialType: "Material type",
    category: "Category",
    nozzleTemperature: "Nozzle temperature (first layer / normal)",
    bedTemperature: "Bed temperature (first layer / normal)",
    maxVolumetricSpeed: "Maximum volumetric speed",
    flowRatio: "Flow ratio",
    density: "Density",
    referencePrice: "Reference price",
    amsCompatibility: "AMS compatibility",
    dryingRecommended: "Drying recommended",
    enclosureRecommended: "Enclosure recommended",
    hardenedNozzleRequired: "Hardened nozzle required",
    printability: "Printability",
    strength: "Strength",
    toughness: "Toughness",
    heatResistance: "Heat resistance",
    surfaceFinish: "Surface finish",
    verificationLevel: "Verification level",
    evidenceCount: "Evidence count",
    score: "Overall score",
    supportedPrinterPresets: "Supported printer presets",
  },
  "zh-cn": {
    unknown: "暂未获得可靠公开证据",
    back: "← 返回 3D 打印耗材库",
    title: "耗材对比",
    intro: "选择 2 到 4 款耗材进行参数对比。数据为模拟目录数据，不构成产品推荐。",
    mobileHint: "请在大屏幕上查看详细对比表格",
    parameter: "参数",
    brand: "品牌",
    series: "产品系列",
    materialType: "材料类型",
    category: "分类",
    nozzleTemperature: "喷嘴温度（首层/常规）",
    bedTemperature: "热床温度（首层/常规）",
    maxVolumetricSpeed: "最大体积流量",
    flowRatio: "流量比例",
    density: "密度",
    referencePrice: "参考价格",
    amsCompatibility: "AMS 兼容",
    dryingRecommended: "建议烘干",
    enclosureRecommended: "建议封箱",
    hardenedNozzleRequired: "需要硬化喷嘴",
    printability: "打印性",
    strength: "强度",
    toughness: "韧性",
    heatResistance: "耐热性",
    surfaceFinish: "表面效果",
    verificationLevel: "验证级别",
    evidenceCount: "证据数",
    score: "综合评分",
    supportedPrinterPresets: "支持的打印机",
  },
  "zh-tw": {
    unknown: "暫未取得可靠公開證據",
    back: "← 返回 3D 列印耗材庫",
    title: "線材比較",
    intro: "選擇 2 到 4 款線材進行參數比較。資料為模擬目錄資料，不構成產品推薦。",
    mobileHint: "請在大螢幕上查看詳細比較表格",
    parameter: "參數",
    brand: "品牌",
    series: "產品系列",
    materialType: "材料類型",
    category: "分類",
    nozzleTemperature: "噴嘴溫度（首層/一般）",
    bedTemperature: "熱床溫度（首層/一般）",
    maxVolumetricSpeed: "最大體積流量",
    flowRatio: "流量比例",
    density: "密度",
    referencePrice: "參考價格",
    amsCompatibility: "AMS 相容",
    dryingRecommended: "建議烘乾",
    enclosureRecommended: "建議封箱",
    hardenedNozzleRequired: "需要硬化噴嘴",
    printability: "列印性",
    strength: "強度",
    toughness: "韌性",
    heatResistance: "耐熱性",
    surfaceFinish: "表面效果",
    verificationLevel: "核驗級別",
    evidenceCount: "證據數",
    score: "綜合評分",
    supportedPrinterPresets: "支援的印表機",
  },
};

function hasDifference(values: string[]) {
  return new Set(values).size > 1;
}

export default function FilamentComparePage({ ids, locale = "en" }: { ids: string[]; locale?: Locale }) {
  const { isDark } = useTheme();
  const t = COMPARE_LABELS[locale] || COMPARE_LABELS.en;
  const selected = useMemo(() => {
    const requested = getCatalogRecords(ids).slice(0, 4);
    return requested.length >= 2 ? requested : CATALOG_RECORDS.slice(0, 2);
  }, [ids]);

  const panelClass = `rounded-2xl border ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#E5DED0] bg-[#FFFDF7]"}`;
  const diffClass = isDark ? "bg-lime-300/10" : "bg-blue-50";

  const compareFields: Array<{
    label: string;
    key: string;
    value: (item: CatalogRecord) => string;
  }> = [
    { label: t.brand, key: "brand", value: (item) => getCompareValue(item, "brand") },
    { label: t.series, key: "series", value: (item) => getCompareValue(item, "series") },
    { label: t.materialType, key: "materialType", value: (item) => getCompareValue(item, "materialType") },
    { label: t.category, key: "category", value: (item) => getCompareValue(item, "category") },
    { label: t.nozzleTemperature, key: "nozzleTemperature", value: (item) => getCompareValue(item, "nozzleTemperature") },
    { label: t.bedTemperature, key: "bedTemperature", value: (item) => getCompareValue(item, "bedTemperature") },
    { label: t.maxVolumetricSpeed, key: "maxVolumetricSpeed", value: (item) => getCompareValue(item, "maxVolumetricSpeed") },
    { label: t.flowRatio, key: "flowRatio", value: (item) => getCompareValue(item, "flowRatio") },
    { label: t.density, key: "density", value: (item) => getCompareValue(item, "density") },
    { label: t.referencePrice, key: "referencePrice", value: (item) => getCompareValue(item, "referencePrice") },
    { label: t.amsCompatibility, key: "amsCompatibility", value: (item) => getCompareValue(item, "amsCompatibility") },
    { label: t.dryingRecommended, key: "dryingRecommended", value: (item) => getCompareValue(item, "dryingRecommended") },
    { label: t.enclosureRecommended, key: "enclosureRecommended", value: (item) => getCompareValue(item, "enclosureRecommended") },
    { label: t.hardenedNozzleRequired, key: "hardenedNozzleRequired", value: (item) => getCompareValue(item, "hardenedNozzleRequired") },
    { label: t.printability, key: "printability", value: (item) => getCompareValue(item, "printability") },
    { label: t.strength, key: "strength", value: (item) => getCompareValue(item, "strength") },
    { label: t.toughness, key: "toughness", value: (item) => getCompareValue(item, "toughness") },
    { label: t.heatResistance, key: "heatResistance", value: (item) => getCompareValue(item, "heatResistance") },
    { label: t.surfaceFinish, key: "surfaceFinish", value: (item) => getCompareValue(item, "surfaceFinish") },
    { label: t.verificationLevel, key: "verificationLevel", value: (item) => getCompareValue(item, "verificationLevel") },
    { label: t.evidenceCount, key: "evidenceCount", value: (item) => getCompareValue(item, "evidenceCount") },
    { label: t.score, key: "score", value: (item) => getCompareValue(item, "score") },
    { label: t.supportedPrinterPresets, key: "supportedPrinterPresets", value: (item) => getCompareValue(item, "supportedPrinterPresets") },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t.title}</h1>
          <p className={isDark ? "mt-3 max-w-3xl text-white/60" : "mt-3 max-w-3xl text-[#6B665D]"}>
            {t.intro}
          </p>
        </div>
        <Link
          href="/tools/bambu-filament-preset-generator"
          className={`rounded-2xl px-5 py-3 text-sm font-medium whitespace-nowrap ${
            isDark ? "border border-white/10 text-white/70" : "border border-[#E5DED0] text-[#6B665D]"
          }`}
        >
          {t.back}
        </Link>
      </div>

      {/* Mobile card view */}
      <div className={`${panelClass} mt-8 block lg:hidden`}>
        <div className="space-y-6">
          {selected.map((item) => (
            <Link
              key={item.id}
              href={`/filaments/${item.id}`}
              className={`block rounded-2xl border p-4 ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}
            >
              <div className="flex items-center gap-3">
                {item.color.hasDigitalSwatch && item.color.hex ? (
                  <div className="h-8 w-8 shrink-0 rounded-xl border border-current/10" style={{ backgroundColor: item.color.hex }} />
                ) : (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed text-[10px] ${isDark ? "border-white/15 text-white/35" : "border-[#D8CCB8] text-[#8A8173]"}`}>
                    --
                  </div>
                )}
                <div>
                  <div className="font-semibold">{item.brand} {item.productLine}</div>
                  <div className={`text-sm opacity-60 ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>{getLocalizedFilamentColorName(item.color, locale)} · {item.materialType} {item.variant}</div>
                </div>
              </div>
            </Link>
          ))}
          {selected.length >= 2 && (
            <p className={`text-center text-sm opacity-50 ${isDark ? "text-white/50" : "text-[#6B665D]"}`}>
              {t.mobileHint}
            </p>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className={`${panelClass} mt-8 hidden overflow-hidden lg:block`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={isDark ? "border-b border-white/10" : "border-b border-[#E5DED0]"}>
              <th className="w-56 px-4 py-4 text-left font-semibold">{t.parameter}</th>
              {selected.map((item) => (
                <th key={item.id} className="px-4 py-4 text-left font-semibold">
                  <Link href={`/filaments/${item.id}`} className="hover:underline underline-offset-2">
                    {item.brand} {item.productLine}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareFields.map((field) => {
              const values = selected.map((item) => field.value(item));
              const differs = hasDifference(values);
              return (
                <tr key={field.key} className={differs ? diffClass : ""}>
                  <td className={`border-b px-4 py-3 font-medium ${isDark ? "border-white/5" : "border-[#E5DED0]"}`}>
                    {field.label} {differs ? "↗" : ""}
                  </td>
                  {selected.map((item) => (
                    <td key={item.id} className={`border-b px-4 py-3 ${isDark ? "border-white/5" : "border-[#E5DED0]"}`}>
                      {field.value(item) || t.unknown}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
