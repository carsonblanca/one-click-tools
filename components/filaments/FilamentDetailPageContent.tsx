"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { getCatalogRecord, getCompareValue, hasPresetParameters, splitPublishedParameters } from "@/lib/filaments/catalog/catalog-view-model";
import { getBrandProfile } from "@/lib/filaments/catalog/mock-filament-catalog";
import { getBambuPrinterOptions, generateBambuFilamentPresetSet, getPresetDisplayValue } from "@/lib/bambu-filament-presets";
import { getParameterDefinition } from "@/lib/filaments/parameters/normalized-parameters";
import BrandLogo from "./BrandLogo";
import type { Locale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";

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
    officialImage: "Official spool image",
    officialColors: "Official colors",
    noImage: "No image available",
    selectColor: "Select color",
    productParameters: "Product parameters",
    printParameters: "Recommended print parameters (from official data)",
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
    officialStore: "Official stores",
    informationSource: "Information sources",
    sourceType: "Type",
    manufacturerProvided: "Manufacturer provided",
    publicVerified: "Publicly verified",
    communityVerified: "Community verified",
    marketplaceAggregated: "Marketplace aggregated",
    unknownSource: "Unknown",
    crossVerified: "Cross verified",
    lastVerified: "Last verified",
    notVerified: "Not verified",
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
    officialColorCode: "厂家颜色编码",
    officialImage: "官方料盘图",
    officialColors: "官方颜色",
    noImage: "暂无实物图",
    selectColor: "选择颜色",
    productParameters: "产品参数",
    printParameters: "建议打印参数（来自官方数据）",
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
    officialStore: "官方旗舰店",
    informationSource: "信息来源",
    sourceType: "类型",
    manufacturerProvided: "厂商提供",
    publicVerified: "公开验证",
    communityVerified: "社区验证",
    marketplaceAggregated: "市场聚合",
    unknownSource: "未知",
    crossVerified: "交叉验证",
    lastVerified: "最后核验",
    notVerified: "未核验",
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
    officialColorCode: "廠家顏色編碼",
    officialImage: "官方料盤圖",
    officialColors: "官方顏色",
    noImage: "暫無實物圖",
    selectColor: "選擇顏色",
    productParameters: "產品參數",
    printParameters: "建議列印參數（來自官方資料）",
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
    officialStore: "官方旗艦店",
    informationSource: "資訊來源",
    sourceType: "類型",
    manufacturerProvided: "廠商提供",
    publicVerified: "公開核驗",
    communityVerified: "社群核驗",
    marketplaceAggregated: "市場彙整",
    unknownSource: "未知",
    crossVerified: "交叉核驗",
    lastVerified: "最後核驗",
    notVerified: "未核驗",
  },
};

const PARAMETER_LABELS_EN: Record<string, string> = {
  materialType: "Material type",
  filamentDiameter: "Filament diameter",
  netWeight: "Net weight",
  density: "Density",
  diameterTolerance: "Diameter tolerance",
  meltFlowIndex: "Melt flow index",
  nozzleTemperature: "Nozzle temperature",
  nozzleDiameter: "Nozzle diameter",
  bedTemperature: "Bed temperature",
  coolingFan: "Cooling fan",
  printingSpeed: "Printing speed",
  retractionDistance: "Retraction distance",
  retractionSpeed: "Retraction speed",
  buildPlateSurface: "Build plate surface",
  tensileStrength: "Tensile strength",
  elongationAtBreak: "Elongation at break",
  impactStrength: "Impact strength",
  unnotchedImpactStrength: "Unnotched impact strength",
  notchedImpactStrength: "Notched impact strength",
  flexuralStrength: "Flexural strength",
  flexuralModulus: "Flexural modulus",
  heatDeflectionTemperature: "Heat deflection temperature",
  vicatSofteningTemperature: "Vicat softening temperature",
  dryingTemperature: "Drying temperature",
  dryingTime: "Drying time",
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

function normalizeForKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "");
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

function getParameterLabel(canonicalKey: string, labelZh: string, locale: Locale) {
  if (locale === "zh-cn" || locale === "zh-tw") return labelZh;
  return PARAMETER_LABELS_EN[canonicalKey] ?? canonicalKey;
}

function sortParameters(parameters: { canonicalKey: string; labelZh: string; value: string }[]) {
  return [...parameters].sort((a, b) => {
    const defA = getParameterDefinition(a.canonicalKey);
    const defB = getParameterDefinition(b.canonicalKey);
    const orderA = defA?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = defB?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

type OfficialColor = {
  id: string;
  nameZh: string;
  nameEn: string;
  officialColorCode: string;
  imageUrl: string | null;
};

function getOfficialColors(record: CatalogRecord): OfficialColor[] {
  if (record.published && record.published.colors.length > 0) {
    return record.published.colors.map((color) => ({
      id: color.id,
      nameZh: color.nameZh,
      nameEn: color.nameEn,
      officialColorCode: color.officialColorCode,
      imageUrl: color.imageUrl,
    }));
  }
  return [{
    id: record.id,
    nameZh: record.color.colorNameZh,
    nameEn: record.color.colorNameEn,
    officialColorCode: record.color.digitalSwatch?.officialColorCode || "",
    imageUrl: record.spool.spoolImagePlaceholder,
  }];
}

function findColorIndex(colors: OfficialColor[], colorParam: string | null) {
  if (!colorParam) return -1;
  const decoded = decodeURIComponent(colorParam).trim();
  return colors.findIndex((color) =>
    color.officialColorCode === decoded ||
    color.id === decoded ||
    normalizeForKey(color.nameZh) === normalizeForKey(decoded)
  );
}

function colorParamFor(color: OfficialColor) {
  return encodeURIComponent(color.officialColorCode || color.id || normalizeForKey(color.nameZh));
}

function ImageWithPlaceholder({
  src,
  alt,
  className,
  containerClassName,
  objectClassName,
  noImageLabel,
}: {
  src: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  objectClassName?: string;
  noImageLabel: string;
}) {
  const { isDark } = useTheme();
  const [error, setError] = useState(false);
  const hasImage = Boolean(src) && !error;
  return (
    <div className={`relative overflow-hidden ${containerClassName ?? ""} ${className ?? ""}`}>
      {hasImage ? (
        <img src={src!} alt={alt} className={objectClassName ?? "h-full w-full object-contain"} onError={() => setError(true)} />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${isDark ? "bg-white/5 text-white/30" : "bg-slate-100 text-slate-400"}`}>
          <span className="text-sm">{noImageLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function FilamentDetailPageContent({
  filamentId,
  locale = "en",
  catalogRecord,
}: {
  filamentId: string;
  locale?: Locale;
  catalogRecord?: CatalogRecord | null;
}) {
  const { isDark } = useTheme();
  const t = DETAIL_LABELS[locale] || DETAIL_LABELS.en;
  const record = catalogRecord || getCatalogRecord(filamentId);

  if (!record) {
    return (
      <section className="relative mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold">{t.notFound}</h1>
        <Link href="/tools/bambu-filament-preset-generator" className={`mt-6 inline-block underline underline-offset-4 ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>
          {t.back}
        </Link>
      </section>
    );
  }

  return <ResolvedFilamentDetailPage record={record} locale={locale} />;
}

function ResolvedFilamentDetailPage({ record, locale }: { record: CatalogRecord; locale: Locale }) {
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = DETAIL_LABELS[locale] || DETAIL_LABELS.en;

  const colors = useMemo(() => getOfficialColors(record), [record]);
  const colorQuery = searchParams?.get("color") ?? null;
  const matchedIndex = findColorIndex(colors, colorQuery);
  const selectedIndex = matchedIndex >= 0 ? matchedIndex : colors.findIndex((color) => color.imageUrl) ?? 0;
  const currentColor = colors[selectedIndex] || colors[0];

  const setColor = (color: OfficialColor) => {
    const param = colorParamFor(color);
    const url = `${pathname}?color=${param}`;
    router.replace(url, { scroll: false });
  };

  const printerOptions = useMemo(() => getBambuPrinterOptions(), []);
  const [printerIdGlobal, setPrinterIdGlobal] = useState(printerOptions[0]?.id || "");

  const brandProfile = getBrandProfile(brandProfileIdForBrand(record.brand));
  const brandData = brandProfile || null;
  const amsLabel = record.spool.amsFit === "yes" ? t.compatible : record.spool.amsFit === "conditional" ? t.conditional : t.notCompatible;
  const hasVerifiedParams = hasPresetParameters(record);

  const generated = useMemo(() => {
    if (!printerIdGlobal) return null;
    const all = generateBambuFilamentPresetSet(printerIdGlobal);
    const match = all.find((p) => p.material.type === record.materialType);
    return match || null;
  }, [printerIdGlobal, record.materialType]);

  const { product: productParameters, print: printParameters } = record.published
    ? splitPublishedParameters(record.published.parameters)
    : { product: [], print: [] };

  const sortedProductParameters = sortParameters(productParameters);
  const sortedPrintParameters = sortParameters(printParameters);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/tools/bambu-filament-preset-generator"
          className={`inline-flex items-center gap-1 text-sm transition ${isDark ? "text-white/50 hover:text-white" : "text-[#6B665D] hover:text-[#18181B]"}`}
        >
          {t.back}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <DetailSection title={t.officialImage}>
            <ImageWithPlaceholder
              src={currentColor?.imageUrl || null}
              alt={currentColor?.nameZh || record.productLine}
              containerClassName="rounded-xl border aspect-square w-full flex items-center justify-center"
              objectClassName="h-full w-full object-contain"
              noImageLabel={t.noImage}
            />
          </DetailSection>

          <DetailSection title={`${t.officialColors} (${colors.length})`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {colors.map((color, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={color.id}
                    onClick={() => setColor(color)}
                    className={`text-left rounded-xl border p-3 transition ${
                      selected
                        ? isDark
                          ? "border-lime-300/70 bg-lime-300/10"
                          : "border-[#2563EB] bg-[#2563EB]/5"
                        : isDark
                          ? "border-white/10 bg-black/20 hover:bg-white/[0.07]"
                          : "border-[#E5DED0] bg-[#F5F2EA] hover:bg-[#EDE8DD]"
                    }`}
                  >
                    <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg border border-current/10">
                      <ImageWithPlaceholder
                        src={color.imageUrl}
                        alt={color.nameZh}
                        containerClassName="h-full w-full"
                        objectClassName="h-full w-full object-cover object-[50%_60%]"
                        noImageLabel={t.noImage}
                      />
                    </div>
                    <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-[#18181B]"}`}>{color.nameZh}</p>
                    <p className="text-xs opacity-60 truncate">{t.officialColorCode}: {color.officialColorCode || "—"}</p>
                  </button>
                );
              })}
            </div>
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.productInfo}>
            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0">
                <BrandLogo brand={record.brand} size={40} />
              </div>
              <div>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{record.brand}</p>
                <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-[#18181B]"}`}>{record.productLine}</h1>
                <p className={`text-sm mt-0.5 ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>
                  {record.materialType} · {record.variant}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t.brand} value={record.brand} unknownLabel={t.unknown} />
              <FieldRow label={t.productSeries} value={record.productLine} unknownLabel={t.unknown} />
              <FieldRow label={t.materialType} value={record.materialType} unknownLabel={t.unknown} />
              <FieldRow label={t.category} value={record.variant} unknownLabel={t.unknown} />
              <FieldRow label={t.colorName} value={currentColor?.nameZh} unknownLabel={t.unknown} />
              <FieldRow label={t.officialColorCode} value={currentColor?.officialColorCode || t.unknown} unknownLabel={t.unknown} />
            </div>
          </DetailSection>

          {record.published ? (
            <>
              <DetailSection title={t.productParameters}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedProductParameters.map((parameter) => (
                    <FieldRow
                      key={parameter.canonicalKey}
                      label={getParameterLabel(parameter.canonicalKey, parameter.labelZh, locale)}
                      value={parameter.value}
                      unknownLabel={t.unknown}
                    />
                  ))}
                </div>
              </DetailSection>

              <DetailSection title={t.printParameters}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedPrintParameters.map((parameter) => (
                    <FieldRow
                      key={parameter.canonicalKey}
                      label={getParameterLabel(parameter.canonicalKey, parameter.labelZh, locale)}
                      value={parameter.value}
                      unknownLabel={t.unknown}
                    />
                  ))}
                </div>
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
                      {printerOptions.map((p) => (
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
            </>
          ) : (
            <DetailSection title={t.parameters}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label={t.nozzleTemperature} value={getCompareValue(record, "nozzleTemperature")} unknownLabel={t.unknown} />
                <FieldRow label={t.bedTemperature} value={getCompareValue(record, "bedTemperature")} unknownLabel={t.unknown} />
                <FieldRow label={t.maxVolumetricSpeed} value={getCompareValue(record, "maxVolumetricSpeed")} unknownLabel={t.unknown} />
                <FieldRow label={t.flowRatio} value={getCompareValue(record, "flowRatio")} unknownLabel={t.unknown} />
                <FieldRow label={t.density} value={getCompareValue(record, "density")} unknownLabel={t.unknown} />
                <FieldRow label={t.amsCompatible} value={amsLabel} unknownLabel={t.unknown} />
                <FieldRow label={t.dryingRecommended} value={getCompareValue(record, "dryingRecommended")} unknownLabel={t.unknown} />
                <FieldRow label={t.enclosureRecommended} value={getCompareValue(record, "enclosureRecommended")} unknownLabel={t.unknown} />
                <FieldRow label={t.hardenedNozzleRequired} value={getCompareValue(record, "hardenedNozzleRequired")} unknownLabel={t.unknown} />
              </div>
            </DetailSection>
          )}

          <DetailSection title={t.spoolInfo}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label={t.spoolImage} value={record.spool.spoolImagePlaceholder || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.netWeight} value={record.spool.netFilamentWeight ? `${record.spool.netFilamentWeight} g` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.emptyWeight} value={record.spool.emptySpoolWeight ? `${record.spool.emptySpoolWeight} g` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.fullWeight} value={record.spool.fullSpoolWeight ? `${record.spool.fullSpoolWeight} g` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.outerDiameter} value={record.spool.spoolOuterDiameter ? `${record.spool.spoolOuterDiameter} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.width} value={record.spool.spoolWidth ? `${record.spool.spoolWidth} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.hubDiameter} value={record.spool.hubDiameter ? `${record.spool.hubDiameter} mm` : t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.spoolMaterial} value={record.spool.spoolMaterial || t.unknown} unknownLabel={t.unknown} />
              <FieldRow label={t.adapterRequired} value={record.spool.adapterRequired ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.refillable} value={record.spool.refillable ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.cardboardSpool} value={record.spool.cardboardSpool ? t.yes : t.no} unknownLabel={t.unknown} />
              <FieldRow label={t.amsFit} value={amsLabel} unknownLabel={t.unknown} />
            </div>
          </DetailSection>

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
              <h4 className={`text-sm font-medium ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.officialStore}</h4>
              {brandData?.officialStores && brandData.officialStores.length > 0 ? (
                brandData.officialStores.map((store, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-sm ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                    <p className="font-medium">{store.displayName}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{store.platform}</p>
                    {store.url ? <p className="text-xs mt-1 opacity-60">{store.url}</p> : <p className={`text-xs mt-1 ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>{t.unknown}</p>}
                  </div>
                ))
              ) : (
                <p className={`text-sm ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.unknown}</p>
              )}
              <h4 className={`text-sm font-medium ${isDark ? "text-white/60" : "text-[#6B665D]"}`}>{t.informationSource}</h4>
              {brandData?.sources && brandData.sources.length > 0 ? (
                brandData.sources.map((src, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-sm ${isDark ? "border-white/10" : "border-[#E5DED0]"}`}>
                    <p className="font-medium">{src.label}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
                      {t.sourceType}: {src.sourceType === "manufacturerProvided" ? t.manufacturerProvided : src.sourceType === "publicVerified" ? t.publicVerified : src.sourceType === "communityVerified" ? t.communityVerified : src.sourceType === "marketplaceAggregated" ? t.marketplaceAggregated : t.unknownSource}
                      · {t.crossVerified}: {src.crossVerified ? t.yes : t.no}
                      · {t.lastVerified}: {src.lastVerifiedAt || t.notVerified}
                    </p>
                  </div>
                ))
              ) : (
                <p className={`text-sm ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>{t.unknown}</p>
              )}
            </div>
          </DetailSection>
        </div>
      </div>
    </section>
  );
}
