"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { getCatalogRecord, getCompareValue, hasPresetParameters } from "@/lib/filaments/catalog/catalog-view-model";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";
import { getBrandProfile } from "@/lib/filaments/catalog/mock-filament-catalog";
import { getBambuPrinterOptions, generateBambuFilamentPresetSet, getPresetDisplayValue } from "@/lib/bambu-filament-presets";
import { getLocalizedFilamentColorName, getLocalizedVariantEffectLabel } from "@/lib/filaments/catalog/localization";
import BrandLogo from "./BrandLogo";
import type { Locale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { parameterLabel } from "@/lib/filaments/parameters/parameter-labels";

const DETAIL_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    unknown: "No reliable public evidence found yet",
    notFound: "Filament not found",
    back: "← Back to Filament Library",
    productInfo: "Product information",
    brand: "Brand",
    productSeries: "Product series",
    materialType: "Material type",
    category: "Category",
    colorName: "Color name",
    officialColorCode: "Official color code",
    colorFamily: "Color family",
    finish: "Surface finish",
    transparency: "Transparency",
    rating: "Rating",
    reviews: "reviews",
    digitalSwatch: "Digital swatch",
    physicalSwatch: "Physical swatch",
    source: "Source",
    manufacturerData: "Manufacturer data",
    userUpload: "User upload",
    lastVerified: "Last verified",
    notVerified: "Not verified",
    physicalSwatches: "physical swatches",
    reviewStatus: "Review status",
    approved: "Approved",
    pendingReview: "Pending review",
    rejected: "Rejected",
    parameters: "Parameters and presets",
    nozzleTemperature: "Nozzle temperature (first layer / normal)",
    bedTemperature: "Bed temperature (first layer / normal)",
    maxVolumetricSpeed: "Maximum volumetric speed",
    flowRatio: "Flow ratio",
    density: "Density",
    amsCompatible: "AMS compatibility",
    dryingRecommended: "Drying recommended",
    enclosureRecommended: "Enclosure recommended",
    hardenedNozzleRequired: "Hardened nozzle required",
    verificationStatus: "Verification status",
    evidenceCount: "Evidence count",
    score: "Overall score",
    printerDownload: "Printer selection and preset download",
    downloadPreset: "Download preset",
    noPreset: "No preset available",
    paramsPending: "Parameters Pending",
    presetsUnavailable: "Verified print parameters are not yet available.",
    retractionSource: "Retraction source",
    inheritedPrinter: "Inherited from selected printer template",
    nozzleTempShort: "Nozzle temperature",
    flow: "Flow",
    spoolInfo: "Spool information",
    spoolImage: "Spool image",
    netWeight: "Net filament weight",
    emptyWeight: "Empty spool weight",
    fullWeight: "Full spool weight",
    outerDiameter: "Outer diameter",
    width: "Width",
    hubDiameter: "Hub hole diameter",
    spoolMaterial: "Spool material",
    adapterRequired: "Adapter required",
    refillable: "Refillable",
    cardboardSpool: "Cardboard spool",
    amsFit: "AMS fit",
    yes: "Yes",
    no: "No",
    compatible: "Compatible",
    conditional: "Conditional",
    notCompatible: "Not compatible",
    manufacturerInfo: "Manufacturer information",
    legalEntity: "Legal entity",
    countryRegion: "Brand country / region",
    headquarters: "Headquarters",
    productionLocation: "Actual production location",
    factoryStatus: "Factory status",
    officialWebSocial: "Official website",
    officialChannel: "Official channel",
    pendingChannel: "Pending verification",
    officialStore: "Official stores",
    officialSocial: "Official social accounts",
    informationSource: "Information sources",
    sourceType: "Type",
    manufacturerProvided: "Manufacturer provided",
    publicVerified: "Publicly verified",
    communityVerified: "Community verified",
    marketplaceAggregated: "Marketplace aggregated",
    unknownSource: "Unknown",
    crossVerified: "Cross verified",
  },
  "zh-cn": {
    unknown: "暂未获得可靠公开证据",
    notFound: "耗材未找到",
    back: "← 返回 3D 打印耗材库",
    productInfo: "产品信息",
    brand: "品牌",
    productSeries: "产品系列",
    materialType: "材料类型",
    category: "分类",
    colorName: "颜色名称",
    officialColorCode: "官方颜色编号",
    colorFamily: "色系",
    finish: "表面效果",
    transparency: "透明度",
    rating: "评分",
    reviews: "评价",
    digitalSwatch: "电子色卡",
    physicalSwatch: "实物色卡",
    source: "来源",
    manufacturerData: "厂商资料",
    userUpload: "用户上传",
    lastVerified: "最后核验",
    notVerified: "未核验",
    physicalSwatches: "张实物色卡",
    reviewStatus: "审核状态",
    approved: "已通过",
    pendingReview: "待审核",
    rejected: "未通过",
    parameters: "参数与预设",
    nozzleTemperature: "喷嘴温度（首层/常规）",
    bedTemperature: "热床温度（首层/常规）",
    maxVolumetricSpeed: "最大体积流量",
    flowRatio: "流量比例",
    density: "密度",
    amsCompatible: "AMS 兼容",
    dryingRecommended: "需要烘干",
    enclosureRecommended: "需要封箱",
    hardenedNozzleRequired: "需要硬化喷嘴",
    verificationStatus: "验证状态",
    evidenceCount: "测试证据数",
    score: "综合评分",
    printerDownload: "打印机选择与预设下载",
    downloadPreset: "下载预设",
    noPreset: "暂无可用预设",
    paramsPending: "参数待补充",
    presetsUnavailable: "该系列缺少可验证打印参数，暂不可生成预设。",
    retractionSource: "回抽来源",
    inheritedPrinter: "继承自所选打印机模板",
    nozzleTempShort: "喷嘴温度",
    flow: "流量",
    spoolInfo: "料盘信息",
    spoolImage: "料盘图片",
    netWeight: "净线材重量",
    emptyWeight: "空盘重量",
    fullWeight: "满盘重量",
    outerDiameter: "外径",
    width: "宽度",
    hubDiameter: "中心孔直径",
    spoolMaterial: "料盘材质",
    adapterRequired: "是否需要转接环",
    refillable: "可续料",
    cardboardSpool: "纸盘",
    amsFit: "AMS 适配",
    yes: "是",
    no: "否",
    compatible: "兼容",
    conditional: "视料盘情况而定",
    notCompatible: "不兼容",
    manufacturerInfo: "厂商信息",
    legalEntity: "公司主体",
    countryRegion: "品牌所属国家/地区",
    headquarters: "总部所在地",
    productionLocation: "实际生产地",
    factoryStatus: "工厂状态",
    officialWebSocial: "官方网站",
    officialChannel: "官方渠道",
    pendingChannel: "待核验",
    officialStore: "官方旗舰店",
    officialSocial: "官方社交账号",
    informationSource: "信息来源",
    sourceType: "类型",
    manufacturerProvided: "厂商提供",
    publicVerified: "公开验证",
    communityVerified: "社区验证",
    marketplaceAggregated: "市场聚合",
    unknownSource: "未知",
    crossVerified: "交叉验证",
  },
  "zh-tw": {
    unknown: "暫未取得可靠公開證據",
    notFound: "線材未找到",
    back: "← 返回 3D 列印耗材庫",
    productInfo: "產品資訊",
    brand: "品牌",
    productSeries: "產品系列",
    materialType: "材料類型",
    category: "分類",
    colorName: "顏色名稱",
    officialColorCode: "官方顏色編號",
    colorFamily: "色系",
    finish: "表面效果",
    transparency: "透明度",
    rating: "評分",
    reviews: "評價",
    digitalSwatch: "電子色卡",
    physicalSwatch: "實物色卡",
    source: "來源",
    manufacturerData: "廠商資料",
    userUpload: "使用者上傳",
    lastVerified: "最後核驗",
    notVerified: "未核驗",
    physicalSwatches: "張實物色卡",
    reviewStatus: "審核狀態",
    approved: "已通過",
    pendingReview: "待審核",
    rejected: "未通過",
    parameters: "參數與預設",
    nozzleTemperature: "噴嘴溫度（首層/一般）",
    bedTemperature: "熱床溫度（首層/一般）",
    maxVolumetricSpeed: "最大體積流量",
    flowRatio: "流量比例",
    density: "密度",
    amsCompatible: "AMS 相容",
    dryingRecommended: "需要烘乾",
    enclosureRecommended: "建議封箱",
    hardenedNozzleRequired: "需要硬化噴嘴",
    verificationStatus: "核驗狀態",
    evidenceCount: "測試證據數",
    score: "綜合評分",
    printerDownload: "印表機選擇與預設下載",
    downloadPreset: "下載預設",
    noPreset: "暫無可用預設",
    paramsPending: "參數待補充",
    presetsUnavailable: "該系列缺少可驗證列印參數，暫不可產生預設。",
    retractionSource: "回抽來源",
    inheritedPrinter: "繼承自所選印表機模板",
    nozzleTempShort: "噴嘴溫度",
    flow: "流量",
    spoolInfo: "料盤資訊",
    spoolImage: "料盤圖片",
    netWeight: "淨線材重量",
    emptyWeight: "空盤重量",
    fullWeight: "滿盤重量",
    outerDiameter: "外徑",
    width: "寬度",
    hubDiameter: "中心孔直徑",
    spoolMaterial: "料盤材質",
    adapterRequired: "是否需要轉接環",
    refillable: "可續料",
    cardboardSpool: "紙盤",
    amsFit: "AMS 適配",
    yes: "是",
    no: "否",
    compatible: "相容",
    conditional: "視料盤情況而定",
    notCompatible: "不相容",
    manufacturerInfo: "廠商資訊",
    legalEntity: "公司主體",
    countryRegion: "品牌所屬國家/地區",
    headquarters: "總部所在地",
    productionLocation: "實際生產地",
    factoryStatus: "工廠狀態",
    officialWebSocial: "官方網站",
    officialChannel: "官方渠道",
    pendingChannel: "待核驗",
    officialStore: "官方旗艦店",
    officialSocial: "官方社群帳號",
    informationSource: "資訊來源",
    sourceType: "類型",
    manufacturerProvided: "廠商提供",
    publicVerified: "公開核驗",
    communityVerified: "社群核驗",
    marketplaceAggregated: "市場彙整",
    unknownSource: "未知",
    crossVerified: "交叉核驗",
  },
};

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

function DetailSection({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#E5DED0] bg-[#FFFDF7]"} ${className}`}>
      <h3 className={`text-base font-semibold mb-4 ${isDark ? "text-white" : "text-[#18181B]"}`}>{title}</h3>
      {children}
    </div>
  );
}

function FieldRow({ label, value, unknownLabel = DETAIL_LABELS.en.unknown }: { label: string; value: string | number | null | undefined; unknownLabel?: string }) {
  const { isDark } = useTheme();
  const display = value ?? unknownLabel;
  return (
    <div className={`flex justify-between gap-2 py-2 text-sm border-b ${isDark ? "border-white/5 text-white/70" : "border-[#E5DED0]/60 text-[#6B665D]"} last:border-0`}>
      <span className="shrink-0">{label}</span>
      <span className={`text-right font-medium ${isDark ? "text-white/90" : "text-[#18181B]"}`}>{display}</span>
    </div>
  );
}

function brandProfileIdForBrand(brand: string) {
  if (brand === "Bambu Lab") return "bambu-lab";
  if (brand === "Kexcelled") return "kexcelled";
  if (brand === "R3D") return "generic-profiles";
  return "generic-profiles";
}

function formatNetWeightOptions(optionsG: number[]): string {
  // 厂家重量选项，例如 KEXCELLED ABS 的 0.5 / 1 / 3 / 5 kg
  return optionsG.map((g) => (g / 1000).toString()).join(" / ") + " kg";
}

function isPlaceholderValue(value: string | number | null | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !normalized || normalized === "not in mock catalog" || normalized === "parameters pending" || normalized === "0 / 100";
}

export default function FilamentDetailPageContent({
  filamentId,
  record: providedRecord,
  relatedRecords = [],
  locale = "en",
}: {
  filamentId: string;
  record?: CatalogRecord;
  relatedRecords?: CatalogRecord[];
  locale?: Locale;
}) {
  const { isDark } = useTheme();
  const t = DETAIL_LABELS[locale] || DETAIL_LABELS.en;
  const filamentListPath = locale === "en" ? "/filaments" : `/${locale}/filaments`;
  const record = providedRecord || getCatalogRecord(filamentId);
  const printerOptions = useMemo(() => getBambuPrinterOptions(), []);
  const [printerIdGlobal, setPrinterIdGlobal] = useState(printerOptions[0]?.id || "");
  const [userRating, setUserRating] = useState(0);
  const materialType = record?.materialType || "";
  const generated = printerIdGlobal && materialType
    ? generateBambuFilamentPresetSet(printerIdGlobal).find((p) => p.material.type === materialType) || null
    : null;

  if (!record) {
    return (
      <section className="relative mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold">{t.notFound}</h1>
        <Link href={filamentListPath} className={`mt-6 inline-block underline underline-offset-4 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>
          {t.back}
        </Link>
      </section>
    );
  }

  const brandProfile = getBrandProfile(brandProfileIdForBrand(record.brand));
  const brandData = brandProfile || null;
  const c = record.color;
  const colorName = getLocalizedFilamentColorName(c, locale);
  const variantLabel = getLocalizedVariantEffectLabel(record.variant, locale);
  const amsLabel = record.spool.amsFit === "yes" ? t.compatible : record.spool.amsFit === "conditional" ? t.conditional : t.notCompatible;
  const spoolMaterialLabel = record.brand === "Kexcelled" ? (locale === "en" ? "PP / PET / ABS (verify against the actual spool)" : "PP / PET / ABS（以实际料盘为准）") : record.spool.spoolMaterial;
  const hasVerifiedParams = hasPresetParameters(record);
  const parameterKeys = [
    "filamentDiameter", "netWeight", "density", "diameterTolerance",
    "meltFlowIndex", "heatDeflectionTemperature", "vicatSofteningTemperature", "tensileStrength",
    "elongationAtBreak", "flexuralStrength", "flexuralModulus", "unnotchedImpactStrength",
    "notchedImpactStrength", "nozzleTemperature", "bedTemperature", "recommendedPrintSpeed", "coolingFan",
  ];
  const displayedParameterEntries = record.parameterEntries?.length
    ? record.parameterEntries
    : parameterKeys.map((key) => ({ key, value: String(getCompareValue(record, key) ?? "") })).filter((entry) => !isPlaceholderValue(entry.value));
  const otherColorRecords = relatedRecords
    .filter((item) => item.id !== record.id && item.brand === record.brand && item.productLine === record.productLine && item.materialType === record.materialType)
    .slice(0, 10);
  const detailPath = locale === "en" ? "/filaments" : `/${locale}/filaments`;

  const printerOptsThis = getBambuPrinterOptions();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href={filamentListPath}
          className={`inline-flex items-center gap-1 text-sm transition ${
            isDark ? "text-white/50 hover:text-white" : "text-[#6B665D] hover:text-[#18181B]"
          }`}
        >
          {t.back}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <DetailSection title={t.productInfo}>
            <div className="flex items-start gap-4 mb-5">
              {record.spool.spoolImagePlaceholder ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={record.spool.spoolImagePlaceholder} alt={`${colorName} ${t.spoolImage}`} className="h-56 w-56 shrink-0 rounded-2xl border border-current/10 bg-white object-contain p-2" />
              ) : c.hasDigitalSwatch && c.hex ? (
                <div className="h-14 w-14 shrink-0 rounded-2xl border border-current/10" style={{ backgroundColor: c.hex }} />
              ) : (
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed text-xs ${isDark ? "border-white/15 text-white/35" : "border-[#D8CCB8] text-[#8A8173]"}`}>--</div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BrandLogo brand={record.brand} size={24} />
                  <span className={`text-sm ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{record.brand}</span>
                </div>
                <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-[#18181B]"}`}>
                  {colorName}
                </h1>
                <p className={`text-sm mt-0.5 ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>
                  {record.productLine} · {record.materialType} {record.variant}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t.brand} value={record.brand} unknownLabel={t.unknown} />
              <FieldRow label={t.productSeries} value={record.productLine} unknownLabel={t.unknown} />
              <FieldRow label={t.materialType} value={record.materialType} unknownLabel={t.unknown} />
              <FieldRow label={t.category} value={variantLabel} unknownLabel={t.unknown} />
              <FieldRow label={t.colorName} value={colorName} unknownLabel={t.unknown} />
              <FieldRow label="HEX" value={c.hasDigitalSwatch && c.hex ? c.hex : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label="RGB" value={c.hasDigitalSwatch && c.rgb ? `${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.officialColorCode} value={c.digitalSwatch?.officialColorCode || t.unknown} unknownLabel={t.unknown} />
            </div>
            <div className="mt-4 flex items-center gap-2" aria-label={locale === "en" ? "Rate this filament" : "为耗材评分"}>
              <span className={`text-sm ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.rating}</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setUserRating(star)} className="text-xl leading-none text-amber-500" aria-label={`${star} ${locale === "en" ? "stars" : "星"}`}>
                  {star <= userRating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#F5F2EA]"}`}>
                <div className={`text-sm font-medium mb-2 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.digitalSwatch}</div>
                {c.hasDigitalSwatch && c.hex && c.rgb ? (
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 shrink-0 rounded border border-black/10" style={{ backgroundColor: c.hex }} aria-label={`${colorName} color swatch`} />
                    <div>
                      <p className="font-mono text-sm">HEX {c.hex}</p>
                      <p className="font-mono text-sm">RGB {c.rgb.r}, {c.rgb.g}, {c.rgb.b}</p>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.unknown}</p>
                )}
                {c.digitalSwatch?.sourceType !== "manufacturer" ? <p className={`text-xs mt-1 ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{locale === "en" ? "(source: automatic color recognition)" : "（来源：自动识别）"}</p> : null}
              </div>
              <div className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#F5F2EA]"}`}>
                <div className={`text-sm font-medium mb-2 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.physicalSwatch}</div>
                {c.hasPhysicalSwatch ? (
                  <>
                    <p className="text-sm">{c.physicalSwatchCount} {t.physicalSwatches}</p>
                    <p className={`text-xs ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
                      {t.reviewStatus}: {c.physicalSwatches[0]?.reviewStatus === "approved" ? t.approved : c.physicalSwatches[0]?.reviewStatus === "pending" ? t.pendingReview : t.rejected}
                    </p>
                  </>
                ) : (
                  <Link href={record.imageSourceRunId ? `/admin/filament-drafts/${encodeURIComponent(record.imageSourceRunId)}/edit` : "#"} className={`inline-flex rounded-lg border px-3 py-2 text-sm ${isDark ? "border-white/15 text-white/70" : "border-[#D8CCB8] text-[#6B665D]"}`}>
                    {locale === "en" ? "Upload physical swatch (review required)" : "上传实物色卡（审核后展示）"}
                  </Link>
                )}
              </div>
            </div>
          </DetailSection>

          <DetailSection title={t.parameters}>
            {displayedParameterEntries.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {displayedParameterEntries.map((entry) => (
                  <FieldRow key={entry.key} label={parameterLabel(entry.key, locale === "en" ? "en" : "zh-cn")} value={entry.value} unknownLabel={t.unknown} />
                ))}
              </div>
            ) : <p className={`text-sm ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>{locale === "en" ? "No official parameters have been synchronized yet." : "暂未同步官方参数"}</p>}
            <div className="mt-5">
              <div className={`text-sm font-medium mb-3 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.printerDownload}</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={printerIdGlobal}
                  onChange={(e) => setPrinterIdGlobal(e.target.value)}
                  className={`rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                    isDark ? "border-white/10 bg-black/30 text-white" : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B]"
                  }`}
                >
                  {printerOptsThis.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (generated && hasVerifiedParams) downloadJson(buildPresetDownloadFileName(record), generated.preset);
                  }}
                  disabled={!generated || !hasVerifiedParams}
                  className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
                    !generated || !hasVerifiedParams
                      ? "opacity-40 cursor-not-allowed"
                      : isDark ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                  }`}
                >
                  {!hasVerifiedParams ? t.paramsPending : (generated ? t.downloadPreset : t.noPreset)}
                </button>
              </div>
              {generated && (
                <div className={`mt-4 grid gap-2 text-sm sm:grid-cols-2 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>
                  <p>{t.nozzleTempShort}: {getPresetDisplayValue(generated.preset, "nozzle_temperature_initial_layer")} / {getPresetDisplayValue(generated.preset, "nozzle_temperature")} °C</p>
                  <p>{t.flow}: {getPresetDisplayValue(generated.preset, "filament_flow_ratio")}</p>
                  <p className="sm:col-span-2 text-xs opacity-60">{t.retractionSource}: {generated.sources.filament_retraction_length || t.inheritedPrinter}</p>
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection title={t.spoolInfo}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`flex justify-between gap-2 border-b py-2 text-sm ${isDark ? "border-white/5 text-white/70" : "border-[#E5DED0]/60 text-[#6B665D]"}`}>
                <span className="shrink-0">{t.spoolImage}</span>
                {record.spool.spoolImagePlaceholder ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.spool.spoolImagePlaceholder} alt={t.spoolImage} className="h-24 w-24 rounded-xl border border-current/10 bg-white object-contain" />
                ) : (
                  <span className={`text-right font-medium ${isDark ? "text-white/90" : "text-[#18181B]"}`}>{t.unknown}</span>
                )}
              </div>
              <FieldRow label={t.netWeight} value={record.spool.netWeightMode === "multiple" && record.spool.netWeightOptionsG?.length ? formatNetWeightOptions(record.spool.netWeightOptionsG) : record.spool.netFilamentWeight ? `${record.spool.netFilamentWeight} g` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.emptyWeight} value={record.spool.emptySpoolWeight ? `${record.spool.emptySpoolWeight} g` : t.unknown} unknownLabel={t.unknown} />
              {record.spool.netWeightMode !== "multiple" && (
                <FieldRow label={t.fullWeight} value={record.spool.fullSpoolWeight ? `${record.spool.fullSpoolWeight} g` : t.unknown} unknownLabel={t.unknown} />
              )}
              <FieldRow label={t.outerDiameter} value={record.spool.spoolOuterDiameter ? `${record.spool.spoolOuterDiameter} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.width} value={record.spool.spoolWidth ? `${record.spool.spoolWidth} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.hubDiameter} value={record.spool.hubDiameter ? `${record.spool.hubDiameter} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.spoolMaterial} value={spoolMaterialLabel || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.adapterRequired} value={record.spool.adapterRequired ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.refillable} value={record.spool.refillable ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.cardboardSpool} value={record.spool.cardboardSpool ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.amsFit} value={amsLabel} unknownLabel={t.unknown} />
            </div>
          </DetailSection>

          {otherColorRecords.length > 0 ? (
            <DetailSection title={locale === "en" ? "More colors" : "其他颜色"}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-10">
                {otherColorRecords.map((item) => {
                  const itemName = locale === "en" ? item.color.colorNameEn : item.color.colorNameZh;
                  return (
                    <Link key={item.id} href={`${detailPath}/${encodeURIComponent(item.id)}`} className={`group min-w-0 rounded-xl border p-2 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-[#E5DED0] bg-[#FFFDF7]"}`}>
                      {item.spool.spoolImagePlaceholder ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.spool.spoolImagePlaceholder} alt={itemName} className="h-20 w-full rounded-lg bg-white object-contain transition-transform group-hover:scale-105" />
                      ) : <div className="h-20 rounded-lg" style={{ backgroundColor: item.color.hex || "#ddd" }} />}
                      <span className="mt-1 block truncate text-center text-xs">{itemName}</span>
                    </Link>
                  );
                })}
              </div>
            </DetailSection>
          ) : null}
        </div>

        <div className="space-y-6">
          <DetailSection title={t.manufacturerInfo}>
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo brand={record.brand} size={32} />
              <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-[#18181B]"}`}>{record.brand}</span>
            </div>
            <div className="space-y-2">
              <FieldRow label={t.legalEntity} value={brandData?.legalEntity || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.countryRegion} value={brandData?.countryOrRegion || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.headquarters} value={brandData?.headquarters || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.productionLocation} value={brandData?.productionLocations.length ? brandData.productionLocations.join(", ") : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.factoryStatus} value={brandData?.factoryStatus === "unknown" ? t.unknown : brandData?.factoryStatus || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.lastVerified} value={brandData?.lastVerifiedAt || t.unknown} unknownLabel={t.unknown} />
            </div>
            <div className="mt-5 space-y-3">
              <h4 className={`text-sm font-medium ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.officialWebSocial}</h4>
              {brandData?.website ? (
                <div className={`rounded-xl border p-3 text-sm ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                  <p className="font-medium">{brandData.website.displayName}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{brandData.website.platform} · {brandData.website.verificationStatus === "official" ? t.officialChannel : t.pendingChannel}</p>
                  {brandData.website.url ? (
                    <p className="text-xs mt-1 opacity-60">{brandData.website.url}</p>
                  ) : (
                    <p className={`text-xs mt-1 ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>{t.unknown}</p>
                  )}
                </div>
              ) : (
                <p className={`text-sm ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.unknown}</p>
              )}
              <h4 className={`text-sm font-medium ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.officialStore}</h4>
              {brandData?.officialStores && brandData.officialStores.length > 0 ? brandData.officialStores.map((store, i) => (
                <div key={i} className={`rounded-xl border p-3 text-sm ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                  <p className="font-medium">{store.displayName}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{store.platform} · {store.verificationStatus === "official" ? t.officialChannel : t.pendingChannel}</p>
                  {store.url ? <p className="text-xs mt-1 opacity-60">{store.url}</p> : <p className={`text-xs mt-1 ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>{t.unknown}</p>}
                </div>
              )) : <p className={`text-sm ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.unknown}</p>}
            </div>
          </DetailSection>
        </div>
      </div>
    </section>
  );
}
