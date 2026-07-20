"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  ToolLabel,
  ToolPanel,
} from "@/components/tool-ui/ToolUI";

import {
  CATALOG_RECORDS,
  filterCatalogRecords,
  resolveCatalogColorInput,
  BRAND_CATALOG,
  searchBrands,
  sortBrands,
  type BrandSort,
  getLocalizedFinishLabel,
  getLocalizedTransparencyLabel,
  getLocalizedVariantEffectLabel,
  getCatalogColorCards,
  getCatalogOfficialColorCount,
  getCatalogProductLineCount,
  type CatalogRecord,
} from "@/lib/filaments/catalog";
import type { Finish } from "@/lib/filaments/catalog/mock-colors";
import type { Locale } from "@/lib/i18n";
import BrandLogo from "./BrandLogo";
import ColorCard from "./ColorCard";

type MaterialVariantMap = Record<string, string[]>;

const MATERIAL_VARIANTS: MaterialVariantMap = {
  PLA: ["Basic", "Matte", "Silk", "High Speed", "Tough", "Aero", "CF", "Glow", "Wood", "Marble"],
  PETG: ["Basic", "HF", "CF", "GF", "Translucent", "ESD"],
  PET: ["CF"],
  TPU: ["85A", "90A", "95A", "98A", "AMS Compatible"],
  ABS: ["Basic"],
  ASA: ["Basic"],
  PA: ["Basic", "CF", "GF"],
  PC: ["Basic"],
  PVA: ["Basic"],
  HIPS: ["Basic"],
  Support: ["Basic"],
  PEEK: ["Basic"],
  PEI: ["Basic"],
  Other: ["Basic"],
};

const MATERIAL_TYPES = ["PLA", "PETG", "PET", "TPU", "ABS", "ASA", "PA", "PC", "PEEK", "PEI", "PVA", "HIPS", "Support", "Other"];

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
}

function slugifyPresetFileName(value: string) {
  return value
    .replace(/[\/:*?"<>|\\]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildPresetDownloadFileName(record: { brand: string; productLine: string; variant: string }) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = yy + mm + dd;

  const brand = slugifyPresetFileName(record.brand);
  const line = slugifyPresetFileName(record.productLine);
  const variant = slugifyPresetFileName(record.variant);

  return "OneClick-" + brand + "-" + line + "-" + variant + "-" + dateStr + ".json";
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-amber-400" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= Math.round(value) ? "\u2605" : "\u2606"}</span>
      ))}
    </span>
  );
}

function getBrandProfilePath(brand: string) {
  if (brand === "Bambu Lab") return "/filaments/brands/bambu-lab";
  if (brand === "Generic") return "/filaments/brands/generic-profiles";
  return null;
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    catalogTitle: "3D Printing Filament Library",
    catalogIntro: "Browse filaments by brand, material, or performance. Search colors, compare specs, and download Bambu Studio presets.",
    brandPanelTitle: "Brand",
    brandSearchPlaceholder: "Search brand name or alias\u2026",
    brandSortLabel: "Sort:",
    brandSortPopular: "Popular",
    brandSortAZ: "A\u2013Z",
    brandSortZA: "Z\u2013A",
    brandSortCount: "Most filaments",
    allBrands: "All Brands",
    brandOrderNotice: "Current popularity order is based on platform compilation and will be dynamically updated based on site browsing, search, and preset download data in the future.",
    filters: "Filters",
    close: "Close",
    apply: "Apply",
    clear: "Clear",
    clearAll: "Clear all filters",
    rating: "Minimum Rating",
    finish: "Surface Finish",
    colorSearch: "Color Search",
    colorPlaceholder: "Color name, color code, or upload image to match",
    searchColor: "Search",
    mockNotice: "Image color matching is a demo feature. Results are for reference only.",
    download: "Download Preset",
    downloadPreset: "Download Preset",
    noPreset: "No preset available",
    detail: "Details",
    noResults: "No matching filaments found.",
    remove: "Remove",
    addCompare: "Add to Compare",
    materialType: "Material Type",
    materialVariant: "Material Variant",
    selectMaterialFirst: "Please select a material first",
    results: "filaments found",
    brands: "Brands",
    sortLabel: "Sort",
    uploadImage: "Upload image",
    any: "Any",
    colorCode: "Color code",
    images: "images",
    selectPrinter: "Select printer",
    paramsPending: "Parameters Pending",
    presetsUnavailable: "Verified print parameters are not yet available.",
    presetNoGcode: "Filament preset only. No G-code is included.",
  },
  "zh-cn": {
    catalogTitle: "3D 打印耗材库",
    catalogIntro: "按品牌、材料或用途浏览耗材。搜索颜色、对比规格，可下载 Bambu Studio 预设。",
    brandPanelTitle: "品牌",
    brandSearchPlaceholder: "搜索品牌名称或别名\u2026",
    brandSortLabel: "排序：",
    brandSortPopular: "热门优先",
    brandSortAZ: "A\u2013Z",
    brandSortZA: "Z\u2013A",
    brandSortCount: "耗材最多",
    allBrands: "全部品牌",
    brandOrderNotice: "当前热门顺序为平台整理结果，后续将根据站内浏览、搜索和预设下载数据动态更新。",
    filters: "筛选",
    close: "关闭",
    apply: "应用",
    clear: "清除",
    clearAll: "清除全部筛选",
    rating: "最低评分",
    finish: "表面效果",
    colorSearch: "颜色搜索",
    colorPlaceholder: "颜色名称、颜色编号或上传图片匹配",
    searchColor: "搜索",
    mockNotice: "图片颜色匹配目前为演示功能，结果仅供参考。",
    download: "下载预设",
    downloadPreset: "下载预设",
    noPreset: "暂无可用预设",
    detail: "查看详情",
    noResults: "没有匹配的耗材。",
    remove: "移除",
    addCompare: "加入对比",
    materialType: "材料类型",
    materialVariant: "材料细分",
    selectMaterialFirst: "请先选择材料",
    results: "款耗材",
    brands: "品牌",
    sortLabel: "排序",
    uploadImage: "上传图片",
    any: "不限",
    colorCode: "颜色编码",
    images: "张图片",
    selectPrinter: "选择打印机",
    paramsPending: "参数待补充",
    presetsUnavailable: "该系列缺少可验证打印参数，暂不可生成预设。",
    presetNoGcode: "仅生成耗材预设，不包含 G-code。",
  },
  "zh-tw": {
    catalogTitle: "3D 列印耗材庫",
    catalogIntro: "依品牌、材料或用途瀏覽線材。搜尋顏色、比較規格，可下載 Bambu Studio 預設。",
    brandPanelTitle: "品牌",
    brandSearchPlaceholder: "搜尋品牌名稱或別名\u2026",
    brandSortLabel: "排序：",
    brandSortPopular: "熱門優先",
    brandSortAZ: "A\u2013Z",
    brandSortZA: "Z\u2013A",
    brandSortCount: "線材最多",
    allBrands: "全部品牌",
    brandOrderNotice: "目前熱門順序為平台整理結果，後續將根據站內瀏覽、搜尋和預設下載資料動態更新。",
    filters: "篩選",
    close: "關閉",
    apply: "套用",
    clear: "清除",
    clearAll: "清除全部篩選",
    rating: "最低評分",
    finish: "表面效果",
    colorSearch: "顏色搜尋",
    colorPlaceholder: "顏色名稱、顏色編號或上傳圖片配對",
    searchColor: "搜尋",
    mockNotice: "圖片顏色配對目前為示範功能，結果僅供參考。",
    download: "下載預設",
    downloadPreset: "下載預設",
    noPreset: "暫無可用預設",
    detail: "查看詳情",
    noResults: "沒有符合條件的線材。",
    remove: "移除",
    addCompare: "加入比較",
    materialType: "材料類型",
    materialVariant: "材料細分",
    selectMaterialFirst: "請先選擇材料",
    results: "款線材",
    brands: "品牌",
    sortLabel: "排序",
    uploadImage: "上傳圖片",
    any: "不限",
    colorCode: "顏色編碼",
    images: "張圖片",
    selectPrinter: "選擇印表機",
    paramsPending: "參數待補充",
    presetsUnavailable: "該系列缺少可驗證列印參數，暫不可產生預設。",
    presetNoGcode: "僅產生線材預設，不包含 G-code。",
  },
};

const SORT_OPTIONS: { id: BrandSort; labelKey: string }[] = [
  { id: "popular", labelKey: "brandSortPopular" },
  { id: "a-z", labelKey: "brandSortAZ" },
  { id: "z-a", labelKey: "brandSortZA" },
  { id: "count", labelKey: "brandSortCount" },
];

const BRAND_SHORT_MAP: Record<string, string> = {
  "Bambu Lab": "Bambu",
};

function getDisplayBrand(brand: string): string {
  return BRAND_SHORT_MAP[brand] || brand;
}

function variantCount(records: CatalogRecord[], materialType: string, variant: string): number {
  return records.filter((r) => r.materialType === materialType && r.variant === variant).length;
}

function materialCount(records: CatalogRecord[], materialType: string): number {
  return records.filter((r) => r.materialType === materialType).length;
}

export default function BambuFilamentCatalogExperience({
  locale = "en",
  catalogRecords = CATALOG_RECORDS,
}: {
  locale?: Locale;
  catalogRecords?: CatalogRecord[];
}) {
  const { isDark } = useTheme();
  const t = LABELS[locale] || LABELS.en;

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    minRating: 0,
    selectedFinish: null as Finish | null,
  });
  const [colorQuery, setColorQuery] = useState("");
  const [searchHex, setSearchHex] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [mobileBrandOpen, setMobileBrandOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brandSearch, setBrandSearch] = useState("");
  const [brandSort, setBrandSort] = useState<BrandSort>("popular");

  const filteredBrands = useMemo(() => {
    const searched = searchBrands(BRAND_CATALOG, brandSearch);
    return sortBrands(searched, brandSort);
  }, [brandSearch, brandSort]);

  const realBrandCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of catalogRecords) {
      map.set(r.brand, (map.get(r.brand) || 0) + 1);
    }
    return map;
  }, [catalogRecords]);

  const availableVariants = useMemo(() => {
    if (!selectedMaterial) return [];
    const all = MATERIAL_VARIANTS[selectedMaterial] || [];
    return all.filter((v) => variantCount(catalogRecords, selectedMaterial, v) > 0);
  }, [catalogRecords, selectedMaterial]);

  const records = useMemo(
    () => filterCatalogRecords({
      selectedMaterial,
      selectedVariant,
      selectedBrand,
      selectedColorFamily: null,
      searchHex,
      minRating: filters.minRating,
      selectedFinish: filters.selectedFinish,
      selectedPerformanceTags: [],
    }, catalogRecords),
    [catalogRecords, selectedMaterial, selectedVariant, selectedBrand, searchHex, filters],
  );

  const colorCards = useMemo(() => getCatalogColorCards(records), [records]);
  const productLineCount = useMemo(() => getCatalogProductLineCount(records), [records]);
  const officialColorCount = useMemo(() => getCatalogOfficialColorCount(records), [records]);

  const sidePanelClass = `min-w-0 rounded-[22px] border p-4 shadow-sm ${
    isDark ? "border-white/10 bg-white/[0.04]" : "border-[#E2DACB] bg-[#FFFDF8] shadow-[#D8CCB8]/20"
  }`;
  const softButtonClass = isDark
    ? "border border-white/10 bg-white/[0.04] text-white/70"
    : "border border-[#E2DACB] bg-[#FFFDF8] text-[#6B665D]";
  const activeClass = isDark ? "bg-lime-300 text-black" : "bg-[#2563EB] text-white";
  const inactiveClass = isDark ? "border border-white/10 text-white/60" : "border border-[#E5DED0] text-[#6B665D]";
  const brandActiveBg = isDark ? "bg-lime-300/20 text-lime-200" : "bg-[#2563EB]/10 text-[#2563EB]";
  const brandHoverBg = isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#F5F2EA]";

  const runColorSearch = () => {
    if (!colorQuery.trim()) return;
    const resolved = resolveCatalogColorInput(colorQuery);
    if (resolved.hex) setSearchHex(resolved.hex);
  };

  const handleImageFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
      const searchableRecords = catalogRecords.filter((record) => record.color.hasDigitalSwatch && record.color.hex);
      const next = searchableRecords[Math.floor(Math.random() * searchableRecords.length)];
      if (next?.color.hex) setSearchHex(next.color.hex);
    };
    reader.readAsDataURL(file);
  };

  const resetFilters = () => {
    setSelectedMaterial(null);
    setSelectedVariant(null);
    setSelectedBrand(null);
    setSearchHex(null);
    setColorQuery("");
    setImagePreview(null);
    setImageFileName(null);
    setBrandSearch("");
    setBrandSort("popular");
    setFilters({ minRating: 0, selectedFinish: null });
  };

  const hasActiveFilters = selectedBrand || selectedMaterial || selectedVariant || searchHex
    || filters.minRating > 0 || filters.selectedFinish;

  const summaryParts: string[] = [];
  if (selectedBrand) summaryParts.push(selectedBrand);
  if (selectedMaterial) summaryParts.push(selectedMaterial);
  if (selectedVariant) summaryParts.push(getLocalizedVariantEffectLabel(selectedVariant, locale));

  const btnClass = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm whitespace-nowrap transition ${active ? activeClass : inactiveClass}`;

  const submitButtonClass = isDark
    ? "w-full rounded-2xl px-5 py-3 text-sm font-medium bg-lime-300 text-black hover:bg-lime-200 transition"
    : "w-full rounded-2xl px-5 py-3 text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition";

  /* ───────────── left sidebar: brand panel ───────────── */
  const brandPanel = (
    <div className={`${sidePanelClass} flex flex-col`} style={{ maxHeight: "calc(100vh - 12rem)" }}>
      <div className="shrink-0 space-y-3">
        <h3 className="text-sm font-semibold">{t.brandPanelTitle}</h3>
        <input
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          placeholder={t.brandSearchPlaceholder}
          className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${
            isDark ? "border-white/10 bg-black/30 text-white placeholder:text-white/30" : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173]"
          }`}
        />
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.id} onClick={() => setBrandSort(opt.id)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                brandSort === opt.id ? activeClass : inactiveClass
              }`}
            >{t[opt.labelKey as keyof typeof t] as string}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1 overflow-y-auto overscroll-contain min-h-0"
        style={{ scrollbarWidth: "thin" }}
      >
        <button onClick={() => { setSelectedBrand(null); setBrandSearch(""); }}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm leading-5 transition ${
            !selectedBrand ? brandActiveBg : `${isDark ? "text-white/70" : "text-[#6B665D]"} ${brandHoverBg}`
          }`}
        >
          {t.allBrands}
        </button>
        {filteredBrands.map((entry) => {
          const count = realBrandCounts.get(entry.name) ?? 0;
          const active = selectedBrand === entry.name;
          return (
            <button key={entry.id} onClick={() => setSelectedBrand(active ? null : entry.name)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm leading-5 transition ${
                active ? brandActiveBg : `${isDark ? "text-white/70" : "text-[#6B665D]"} ${brandHoverBg}`
              }`}
            >
              <BrandLogo brand={entry.name} size={20} />
              <span className="min-w-0 truncate">{locale === "en" ? entry.name : entry.nameZh}</span>
              <span className={`shrink-0 text-xs ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
                {count > 0 ? count : "\u2014"}
              </span>
            </button>
          );
        })}
      </div>
      <div className={`shrink-0 mt-3 pt-3 border-t text-[10px] leading-relaxed ${
        isDark ? "border-white/10 text-white/30" : "border-[#E5DED0] text-[#8A8173]"
      }`}>
        {t.brandOrderNotice}
      </div>
    </div>
  );

  /* ───────────── right sidebar: filters ───────────── */
  const filterPanel = (
    <div className="space-y-5">
      <div className={sidePanelClass}>
        <h3 className="text-sm font-semibold mb-3">{t.colorSearch}</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={colorQuery}
              onChange={(e) => setColorQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runColorSearch(); }}
              placeholder={t.colorPlaceholder}
              className={`w-full rounded-2xl border px-3 py-3 text-sm outline-none pr-10 ${
                isDark ? "border-white/10 bg-black/30 text-white placeholder:text-white/30" : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173]"
              }`}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition"
              title={t.uploadImage}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? "text-white/40" : "text-[#8A8173]"}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0])} />
          </div>
          <button onClick={runColorSearch}
            className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium ${isDark ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"}`}
          >
            {t.searchColor}
          </button>
        </div>
        {imageFileName && (
          <div className={`mt-2 flex items-center gap-2 text-xs ${isDark ? "text-white/50" : "text-[#6B665D]"}`}>
            <span className="truncate">{"\uD83D\uDCF7"} {imageFileName}</span>
            <button onClick={() => { setImagePreview(null); setImageFileName(null); }} className="underline underline-offset-2">{t.clear}</button>
          </div>
        )}
        {searchHex && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="h-4 w-4 rounded-full border border-current/20 shrink-0" style={{ backgroundColor: searchHex }} />
            <span className={isDark ? "text-white/60" : "text-[#6B665D]"}>{searchHex}</span>
            <button onClick={() => { setSearchHex(null); setColorQuery(""); }} className="ml-auto text-xs underline underline-offset-2">{t.clear}</button>
          </div>
        )}
        <p className={`mt-2 text-xs ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>{t.mockNotice}</p>
      </div>

      <div className={sidePanelClass}>
        <ToolLabel>{t.materialType}</ToolLabel>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {MATERIAL_TYPES.map((mat) => {
            const count = materialCount(catalogRecords, mat);
            return (
              <button key={mat} onClick={() => {
                setSelectedMaterial(selectedMaterial === mat ? null : mat);
                setSelectedVariant(null);
              }}
                className={`rounded-xl px-3 py-2 text-sm transition ${selectedMaterial === mat ? activeClass : inactiveClass}`}
              >
                {mat}
                {count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className={sidePanelClass}>
        <ToolLabel>{t.materialVariant}</ToolLabel>
        <div className="mt-2">
          {!selectedMaterial ? (
            <p className={`text-xs ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.selectMaterialFirst}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {MATERIAL_VARIANTS[selectedMaterial]?.map((v) => {
                const count = variantCount(catalogRecords, selectedMaterial, v);
                return (
                  <button key={v} onClick={() => setSelectedVariant(selectedVariant === v ? null : v)}
                    className={`rounded-xl px-3 py-2 text-sm transition ${selectedVariant === v ? activeClass : inactiveClass}`}
                  >
                    {getLocalizedVariantEffectLabel(v, locale)}
                    {count > 0 ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={sidePanelClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t.filters}</h3>
          <button onClick={resetFilters} className="text-xs underline underline-offset-4">{t.clear}</button>
        </div>
        <div className="space-y-4">
          <div>
            <ToolLabel>{t.rating}</ToolLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {[0, 3, 3.5, 4, 4.5].map((rating) => (
                <button key={rating} onClick={() => setFilters((prev) => ({ ...prev, minRating: rating }))}
                  className={btnClass(filters.minRating === rating)}
                >
                  {rating === 0 ? t.any : `${rating}+`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <ToolLabel>{t.finish}</ToolLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={() => setFilters((prev) => ({ ...prev, selectedFinish: null }))}
                className={btnClass(!filters.selectedFinish)}
              >{t.any}</button>
              {(["matte", "semi-glossy", "glossy", "silk", "satin", "transparent"] as Finish[]).map((f) => {
                const active = filters.selectedFinish === f;
                return (
                  <button key={f} onClick={() => setFilters((prev) => ({ ...prev, selectedFinish: f }))}
                    className={btnClass(active)}
                  >{getLocalizedFinishLabel(f, locale)}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ToolPanel>
      <div className="pb-32 lg:pb-8">
        <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
            {brandPanel}
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold leading-tight">{t.catalogTitle}</h2>
                <p className={isDark ? "mt-2 max-w-4xl text-sm leading-6 text-white/55" : "mt-2 max-w-4xl text-sm leading-6 text-[#6B665D]"}>
                  {t.catalogIntro}
                </p>
                <p className={`mt-2 text-sm font-medium ${isDark ? "text-white/70" : "text-[#18181B]"}`}>
                  {locale === "zh-cn"
                    ? `已收录 ${productLineCount} 个产品系列 · 共 ${officialColorCount} 种官方颜色`
                    : `${productLineCount} product line${productLineCount === 1 ? "" : "s"} · ${officialColorCount} official color${officialColorCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex gap-2 lg:hidden">
                <button onClick={() => setMobileBrandOpen(true)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium ${softButtonClass}`}
                >{t.brands}</button>
                <button onClick={() => setMobileFiltersOpen(true)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium ${softButtonClass}`}
                >{t.filters}</button>
              </div>
            </div>

            {/* Filter summary */}
            {hasActiveFilters && (
              <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-[#E5DED0] bg-[#F7F2E8]"
              }`}>
                {summaryParts.length > 0 && (
                  <span className={`font-medium ${isDark ? "text-white" : "text-[#18181B]"}`}>
                    {summaryParts.join(" \u00B7 ")}
                  </span>
                )}
                <span className={isDark ? "text-white/50" : "text-[#8A8173]"}>
                  {"\u00B7"} {colorCards.length} {t.results}
                </span>
                <button onClick={resetFilters}
                  className={`ml-auto text-xs underline underline-offset-4 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}
                >{t.clearAll}</button>
              </div>
            )}

            <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {colorCards.map((card) => (
                <ColorCard key={card.id} card={card} locale={locale} />
              ))}
            </div>

            {colorCards.length === 0 ? (
              <div className={`mt-5 rounded-2xl border p-6 text-sm ${softButtonClass}`}>{t.noResults}</div>
            ) : null}

          </section>

          <aside className="hidden min-w-0 2xl:sticky 2xl:top-24 2xl:block 2xl:self-start">
            {filterPanel}
          </aside>
        </div>
      </div>

      {/* Mobile brand drawer */}
      {mobileBrandOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <button aria-label={t.close} className="absolute inset-0 bg-black/40" onClick={() => setMobileBrandOpen(false)} />
          <div className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border p-5 ${
            isDark ? "border-white/10 bg-[#101114]" : "border-[#E5DED0] bg-[#FFFDF7]"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.brands}</h2>
              <button onClick={() => setMobileBrandOpen(false)} className={`rounded-2xl px-4 py-2 text-sm ${softButtonClass}`}>{t.close}</button>
            </div>
            {brandPanel}
            <button onClick={() => setMobileBrandOpen(false)} className={`mt-4 ${submitButtonClass}`}>{t.apply}</button>
          </div>
        </div>
      )}

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <button aria-label={t.close} className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border p-5 ${
            isDark ? "border-white/10 bg-[#101114]" : "border-[#E5DED0] bg-[#FFFDF7]"
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.filters}</h2>
              <div className="flex gap-2">
                <button onClick={resetFilters} className={`rounded-2xl px-4 py-2 text-sm ${softButtonClass}`}>{t.clear}</button>
                <button onClick={() => setMobileFiltersOpen(false)} className={`rounded-2xl px-4 py-2 text-sm ${softButtonClass}`}>{t.close}</button>
              </div>
            </div>
            {filterPanel}
            <button onClick={() => setMobileFiltersOpen(false)} className={`mt-4 ${submitButtonClass}`}>{t.apply}</button>
          </div>
        </div>
      )}

    </ToolPanel>
  );
}
