import { bambuFilamentMaterials } from "@/lib/filaments/presets/bambu/material-templates";
import { bambuPrinterTemplates } from "@/lib/filaments/presets/bambu/printers";
import type { Locale } from "@/lib/i18n";

export type SourceType =
  | "manufacturerProvided"
  | "publicVerified"
  | "communityVerified"
  | "marketplaceAggregated"
  | "unknown";

export type ChannelVerificationStatus = "official" | "pending" | "unknown";
export type FactoryStatus = "owned" | "outsourced" | "unknown";
export type TagPolarity = "positive" | "neutral" | "negative";
export type FeedbackCategory =
  | "printingPerformance"
  | "temperatureExtrusion"
  | "bedAdhesion"
  | "materialManagement"
  | "appearanceOdor";

export type LocalizedText = {
  en: string;
  zhCn: string;
  zhTw: string;
};

export type EvidenceSource = {
  id: string;
  sourceType: SourceType;
  label: string;
  url: string | null;
  lastVerifiedAt: string | null;
  crossVerified: boolean;
};

export type OfficialChannel = {
  id?: string;
  platform: string;
  displayName: string;
  url: string | null;
  verificationStatus: ChannelVerificationStatus;
  verifiedAt: string | null;
  sourceType: SourceType;
};


export type LocalizedBrandProfileContent = {
  legalEntity?: string | null;
  countryOrRegion?: string | null;
  headquarters?: string | null;
  productionLocations?: string[];
  productionLocationLabel?: string;
  factoryStatusLabel?: string;
  summary?: string;
  sourceSummary?: string;
  channels?: Record<string, Partial<Pick<OfficialChannel, "platform" | "displayName">>>;
  sourceLabels?: Record<string, string>;
};

export type BrandProfile = {
  id: string;
  name: string;
  legalEntity: string | null;
  countryOrRegion: string | null;
  headquarters: string | null;
  productionLocations: string[];
  factoryStatus: FactoryStatus;
  summary: string;
  website: OfficialChannel | null;
  officialStores: OfficialChannel[];
  socialAccounts: OfficialChannel[];
  sources: EvidenceSource[];
  verificationStatus: "verified" | "partial" | "unverified";
  lastVerifiedAt: string | null;
  localized?: Partial<Record<Locale, LocalizedBrandProfileContent>>;
};

export type RatingSummary = {
  average: number;
  count: number;
  lowSampleThreshold: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type FeedbackTag = {
  id: string;
  label: LocalizedText;
  category: FeedbackCategory;
  polarity: TagPolarity;
  selectionCount: number;
  selectionRate: number;
  sourceType: SourceType;
  lastVerifiedAt: string | null;
  crossVerified: boolean;
};

export type FilamentFact = {
  field: string;
  value: string;
  sourceType: SourceType;
  lastVerifiedAt: string | null;
  crossVerified: boolean;
};

export type FilamentCatalogItem = {
  id: string;
  materialId: string;
  brandId: string;
  shortName: string;
  series: string;
  materialType: string;
  category: string;
  recommendedNozzleTemperature: string;
  bedTemperature: string;
  maxVolumetricSpeed: string;
  flowRatio: string;
  density: string;
  referencePrice: string;
  amsCompatibility: string;
  dryingRecommended: string;
  enclosureRecommended: string;
  hardenedNozzleRequired: string;
  printability: number;
  strength: number;
  toughness: number;
  heatResistance: number;
  surfaceFinish: number;
  verificationLevel: string;
  evidenceCount: number;
  score: number;
  supportedPrinterPresetIds: string[];
  rating: RatingSummary;
  feedbackTags: FeedbackTag[];
  facts: FilamentFact[];
  sourceBreakdown: Record<SourceType, EvidenceSource[]>;
};

const unknownSource: EvidenceSource = {
  id: "unknown-demo-source",
  sourceType: "unknown",
  label: "Static prototype placeholder; reliable public evidence is not attached yet.",
  url: null,
  lastVerifiedAt: null,
  crossVerified: false,
};

export const filamentBrandProfiles: BrandProfile[] = [
  {
    id: "generic-profiles",
    name: "Generic profile templates",
    legalEntity: null,
    countryOrRegion: null,
    headquarters: null,
    productionLocations: [],
    factoryStatus: "unknown",
    summary:
      "Generic profiles are material-type reference profiles used for interface prototyping. They are not a real filament manufacturer.",
    website: null,
    officialStores: [],
    socialAccounts: [],
    sources: [unknownSource],
    verificationStatus: "unverified",
    lastVerifiedAt: null,
  },
  {
    id: "bambu-lab",
    name: "Bambu Lab",
    legalEntity: null,
    countryOrRegion: null,
    headquarters: null,
    productionLocations: [],
    factoryStatus: "unknown",
    summary:
      "Brand profile placeholder for the filament preset library prototype. Company and manufacturing facts must be verified from public sources before production use.",
    website: {
      platform: "Official website",
      displayName: "Bambu Lab website",
      url: "https://bambulab.com",
      verificationStatus: "pending",
      verifiedAt: null,
      sourceType: "unknown",
    },
    officialStores: [
      {
        platform: "Official store",
        displayName: "Bambu Lab online store",
        url: "https://store.bambulab.com",
        verificationStatus: "pending",
        verifiedAt: null,
        sourceType: "unknown",
      },
    ],
    socialAccounts: [
      {
        platform: "YouTube",
        displayName: "Bambu Lab channel",
        url: null,
        verificationStatus: "pending",
        verifiedAt: null,
        sourceType: "unknown",
      },
    ],
    sources: [unknownSource],
    verificationStatus: "unverified",
    lastVerifiedAt: null,
  },
  {
    id: "kexcelled",
    name: "Kexcelled",
    legalEntity: null,
    countryOrRegion: "CN",
    headquarters: "Suzhou, Jiangsu, CN",
    productionLocations: [
      "Nantong, Jiangsu, CN (production base, 2023)",
      "Thailand (factory, 2025)",
    ],
    factoryStatus: "owned",
    summary:
      "Kexcelled is a 3D printing materials manufacturer founded in 2013. Headquartered in Suzhou with production bases in Nantong (2023) and Thailand (2025).",
    website: {
      id: "kexcelled-website",
      platform: "Official website",
      displayName: "kexcelled3d.cn",
      url: "https://www.kexcelled3d.cn/",
      verificationStatus: "official",
      verifiedAt: "2026-06-20",
      sourceType: "manufacturerProvided",
    },
    officialStores: [
      {
        id: "kexcelled-tmall-store",
        platform: "TMall",
        displayName: "Kexcelled TMall store",
        url: "https://detail.tmall.com/item.htm?id=652583113236",
        verificationStatus: "official",
        verifiedAt: "2026-06-20",
        sourceType: "publicVerified",
      },
    ],
    socialAccounts: [
      { id: "kexcelled-facebook", platform: "Facebook", displayName: "Kexcelled", url: "https://www.facebook.com/people/Kexcelled/100090684476972/", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-discord", platform: "Discord", displayName: "Kexcelled", url: "https://discord.com/invite/WBkuvwm9bC", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-instagram", platform: "Instagram", displayName: "kexcelled_3d", url: "https://www.instagram.com/kexcelled_3d/", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-youtube", platform: "YouTube", displayName: "Kexcelled", url: "https://www.youtube.com/@kexcelled", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-linkedin", platform: "LinkedIn", displayName: "Kexcelled 3D", url: "https://www.linkedin.com/company/kexcelled-3d", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-douyin", platform: "Douyin (TikTok CN)", displayName: "Kexcelled", url: "https://www.douyin.com/user/MS4wLjABAAAAknQWyENWlXwXd7AcLLyAxkXG6A2OJZnXJCx46XRrHyA", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-xiaohongshu", platform: "Xiaohongshu (RED)", displayName: "Kexcelled", url: "https://www.xiaohongshu.com/user/profile/6262e2ff0000000021026c52", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-bilibili", platform: "Bilibili", displayName: "Kexcelled", url: "https://space.bilibili.com/1916825928", verificationStatus: "official", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-wechat-account", platform: "WeChat Official Account", displayName: "Official QR-code entry", url: null, verificationStatus: "pending", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
      { id: "kexcelled-wechat-video", platform: "WeChat Video Channel", displayName: "Official QR-code entry", url: null, verificationStatus: "pending", verifiedAt: "2026-06-20", sourceType: "manufacturerProvided" },
    ],
    sources: [
      { id: "kexcelled-about", sourceType: "manufacturerProvided", label: "Kexcelled official About page (kexcelled3d.cn/about-us)", url: "https://www.kexcelled3d.cn/about-us", lastVerifiedAt: "2026-06-20", crossVerified: true },
      { id: "kexcelled-linkedin", sourceType: "publicVerified", label: "Kexcelled LinkedIn company page", url: "https://www.linkedin.com/company/kexcelled-3d", lastVerifiedAt: "2026-06-20", crossVerified: true },
      { id: "kexcelled-social", sourceType: "publicVerified", label: "Official website footer social media links", url: "https://www.kexcelled3d.cn/", lastVerifiedAt: "2026-06-20", crossVerified: false },
    ],
    verificationStatus: "partial",
    lastVerifiedAt: "2026-06-20",
    localized: {
      en: {
        legalEntity: "Official brand pages reviewed did not show a full legal entity name; pending further verification.",
        countryOrRegion: "China",
        headquarters: "Suzhou, Jiangsu, China",
        productionLocationLabel: "Publicly disclosed production layout",
        productionLocations: [
          "Nantong, Jiangsu, China production base, disclosed as launched in 2023",
          "Thailand factory, disclosed as launched in 2025",
        ],
        factoryStatusLabel:
          "The brand website discloses production bases and factory layout. Actual manufacturing location for each SKU should be confirmed from packaging, labels, product pages, or batch information.",
        sourceSummary:
          "This page summarizes information from the brand website, public brand pages, and official-site-linked channels. It reflects publicly accessible information at the time of review and is not an independent guarantee of brand identity, legal entity, production location, product quality, or current business status. For legal entity, actual manufacturing location, certifications, and specific batch details, refer to product packaging, labels, official documents, or relevant registrations.",
        channels: {
          "kexcelled-website": { platform: "Official website" },
          "kexcelled-tmall-store": { platform: "TMall", displayName: "Kexcelled TMall store" },
          "kexcelled-wechat-account": { displayName: "Official QR-code entry" },
          "kexcelled-wechat-video": { displayName: "Official QR-code entry" },
        },
      },
      "zh-cn": {
        legalEntity: "官方品牌页面未见完整法定主体名称，待进一步核验。",
        countryOrRegion: "中国",
        headquarters: "中国江苏苏州",
        productionLocationLabel: "公开披露生产布局",
        productionLocations: [
          "中国江苏南通生产基地，2023 年投产",
          "泰国工厂，2025 年投产",
        ],
        factoryStatusLabel:
          "品牌官网披露其拥有生产基地与工厂布局；具体产品实际生产地应以包装、标签、产品页或批次信息为准。",
        summary:
          "Kexcelled 是 2013 年成立的 3D 打印材料品牌，总部位于中国江苏苏州。公开资料显示，其生产布局包括 2023 年投产的江苏南通生产基地，以及 2025 年投产的泰国工厂。",
        sourceSummary:
          "本页内容整理自品牌官方网站、公开品牌页面及官网关联渠道。信息反映核验时可公开查阅的内容，不构成对品牌、企业主体、生产地点、产品质量或当前经营状态的独立保证。涉及法定主体、实际生产地点、认证资质及特定批次信息，请以产品包装、标签、官方文件或相关登记信息为准。",
        channels: {
          "kexcelled-website": { platform: "官方网站", displayName: "kexcelled3d.cn" },
          "kexcelled-tmall-store": { platform: "天猫", displayName: "Kexcelled 天猫店" },
          "kexcelled-wechat-account": { platform: "微信公众号", displayName: "官网二维码入口" },
          "kexcelled-wechat-video": { platform: "微信视频号", displayName: "官网二维码入口" },
        },
        sourceLabels: {
          "kexcelled-about": "Kexcelled 官方关于页面（kexcelled3d.cn/about-us）",
          "kexcelled-linkedin": "Kexcelled LinkedIn 公司页面",
          "kexcelled-social": "官方网站页脚社交媒体链接",
        },
      },
    },
  },
];

const tag = (
  id: string,
  label: LocalizedText,
  category: FeedbackCategory,
  polarity: TagPolarity,
  selectionCount: number,
  selectionRate: number,
): FeedbackTag => ({
  id,
  label,
  category,
  polarity,
  selectionCount,
  selectionRate,
  sourceType: "marketplaceAggregated",
  lastVerifiedAt: null,
  crossVerified: false,
});

const commonPrinterIds = bambuPrinterTemplates.map((printer) => printer.id);

function firstValue(materialId: string, key: string) {
  const material = bambuFilamentMaterials.find((item) => item.id === materialId);
  const value = material?.template[key];

  if (Array.isArray(value)) {
    return value.join(" / ");
  }

  return value === undefined ? "Inherited" : String(value);
}

function facts(materialId: string): FilamentFact[] {
  return [
    {
      field: "nozzleTemperature",
      value: `${firstValue(materialId, "nozzle_temperature_initial_layer")} / ${firstValue(materialId, "nozzle_temperature")} C`,
      sourceType: "publicVerified",
      lastVerifiedAt: null,
      crossVerified: false,
    },
    {
      field: "bedTemperature",
      value: `Textured PEI ${firstValue(materialId, "textured_plate_temp_initial_layer")} / ${firstValue(materialId, "textured_plate_temp")} C`,
      sourceType: "publicVerified",
      lastVerifiedAt: null,
      crossVerified: false,
    },
    {
      field: "maxVolumetricSpeed",
      value: `${firstValue(materialId, "filament_max_volumetric_speed")} mm3/s`,
      sourceType: "publicVerified",
      lastVerifiedAt: null,
      crossVerified: false,
    },
  ];
}

export const filamentCatalogItems: FilamentCatalogItem[] = [
  {
    id: "generic-pla",
    materialId: "generic-pla",
    brandId: "generic-profiles",
    shortName: "Generic PLA",
    series: "Generic",
    materialType: "PLA",
    category: "Basic",
    recommendedNozzleTemperature: `${firstValue("generic-pla", "nozzle_temperature_range_low")}-${firstValue("generic-pla", "nozzle_temperature_range_high")} C`,
    bedTemperature: `Textured PEI ${firstValue("generic-pla", "textured_plate_temp")} C`,
    maxVolumetricSpeed: `${firstValue("generic-pla", "filament_max_volumetric_speed")} mm3/s`,
    flowRatio: firstValue("generic-pla", "filament_flow_ratio"),
    density: `${firstValue("generic-pla", "filament_density")} g/cm3`,
    referencePrice: `$${firstValue("generic-pla", "filament_cost")}`,
    amsCompatibility: "Generally compatible when spool fit and dryness are acceptable.",
    dryingRecommended: "Optional when brittle or stringing.",
    enclosureRecommended: "No",
    hardenedNozzleRequired: "No",
    printability: 5,
    strength: 2,
    toughness: 2,
    heatResistance: 2,
    surfaceFinish: 4,
    verificationLevel: "Prototype profile, import not yet manually verified",
    evidenceCount: 2,
    score: 86,
    supportedPrinterPresetIds: commonPrinterIds,
    rating: { average: 4.4, count: 18, lowSampleThreshold: 30, distribution: { 1: 0, 2: 1, 3: 2, 4: 6, 5: 9 } },
    feedbackTags: [
      tag("easy-print", { en: "Easy to print", zhCn: "容易打印", zhTw: "容易列印" }, "printingPerformance", "positive", 14, 0.78),
      tag("fine-surface", { en: "Fine surface", zhCn: "表面细腻", zhTw: "表面細緻" }, "appearanceOdor", "positive", 10, 0.56),
      tag("stable-dimensions", { en: "Stable dimensions", zhCn: "尺寸稳定", zhTw: "尺寸穩定" }, "printingPerformance", "positive", 8, 0.44),
    ],
    facts: facts("generic-pla"),
    sourceBreakdown: { manufacturerProvided: [], publicVerified: [unknownSource], communityVerified: [], marketplaceAggregated: [], unknown: [unknownSource] },
  },
  {
    id: "generic-petg",
    materialId: "generic-petg",
    brandId: "generic-profiles",
    shortName: "Generic PETG",
    series: "Generic",
    materialType: "PETG",
    category: "Basic",
    recommendedNozzleTemperature: `${firstValue("generic-petg", "nozzle_temperature_range_low")}-${firstValue("generic-petg", "nozzle_temperature_range_high")} C`,
    bedTemperature: `Textured PEI ${firstValue("generic-petg", "textured_plate_temp")} C`,
    maxVolumetricSpeed: `${firstValue("generic-petg", "filament_max_volumetric_speed")} mm3/s`,
    flowRatio: firstValue("generic-petg", "filament_flow_ratio"),
    density: `${firstValue("generic-petg", "filament_density")} g/cm3`,
    referencePrice: `$${firstValue("generic-petg", "filament_cost")}`,
    amsCompatibility: "Usually compatible when dry; verify spool dimensions.",
    dryingRecommended: "Recommended before important prints.",
    enclosureRecommended: "Usually no",
    hardenedNozzleRequired: "No",
    printability: 4,
    strength: 3,
    toughness: 4,
    heatResistance: 3,
    surfaceFinish: 3,
    verificationLevel: "Prototype profile, import not yet manually verified",
    evidenceCount: 2,
    score: 81,
    supportedPrinterPresetIds: commonPrinterIds,
    rating: { average: 4.1, count: 12, lowSampleThreshold: 30, distribution: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 4 } },
    feedbackTags: [
      tag("stringing", { en: "More stringing", zhCn: "拉丝较多", zhTw: "拉絲較多" }, "temperatureExtrusion", "negative", 7, 0.58),
      tag("bed-sticky", { en: "Strong bed adhesion", zhCn: "比较粘板", zhTw: "比較黏板" }, "bedAdhesion", "neutral", 6, 0.5),
      tag("dry-before-print", { en: "Dry before printing", zhCn: "建议打印前烘干", zhTw: "建議列印前乾燥" }, "materialManagement", "neutral", 8, 0.67),
    ],
    facts: facts("generic-petg"),
    sourceBreakdown: { manufacturerProvided: [], publicVerified: [unknownSource], communityVerified: [], marketplaceAggregated: [], unknown: [unknownSource] },
  },
  {
    id: "generic-asa",
    materialId: "generic-asa",
    brandId: "generic-profiles",
    shortName: "Generic ASA",
    series: "Generic",
    materialType: "ASA",
    category: "Engineering",
    recommendedNozzleTemperature: `${firstValue("generic-asa", "nozzle_temperature_range_low")}-${firstValue("generic-asa", "nozzle_temperature_range_high")} C`,
    bedTemperature: `Textured PEI ${firstValue("generic-asa", "textured_plate_temp")} C`,
    maxVolumetricSpeed: `${firstValue("generic-asa", "filament_max_volumetric_speed")} mm3/s`,
    flowRatio: firstValue("generic-asa", "filament_flow_ratio"),
    density: `${firstValue("generic-asa", "filament_density")} g/cm3`,
    referencePrice: `$${firstValue("generic-asa", "filament_cost")}`,
    amsCompatibility: "Compatible when dry; prefer sealed storage.",
    dryingRecommended: "Recommended.",
    enclosureRecommended: "Yes",
    hardenedNozzleRequired: "No",
    printability: 2,
    strength: 4,
    toughness: 3,
    heatResistance: 5,
    surfaceFinish: 3,
    verificationLevel: "Prototype profile, import not yet manually verified",
    evidenceCount: 2,
    score: 74,
    supportedPrinterPresetIds: commonPrinterIds,
    rating: { average: 3.8, count: 9, lowSampleThreshold: 30, distribution: { 1: 0, 2: 1, 3: 3, 4: 3, 5: 2 } },
    feedbackTags: [
      tag("warp-risk", { en: "Warping risk", zhCn: "容易翘边", zhTw: "容易翹邊" }, "bedAdhesion", "negative", 6, 0.67),
      tag("enclosure", { en: "Enclosure recommended", zhCn: "建议封箱", zhTw: "建議封箱" }, "materialManagement", "neutral", 7, 0.78),
      tag("odor", { en: "Noticeable odor", zhCn: "气味较明显", zhTw: "氣味較明顯" }, "appearanceOdor", "negative", 5, 0.56),
    ],
    facts: facts("generic-asa"),
    sourceBreakdown: { manufacturerProvided: [], publicVerified: [unknownSource], communityVerified: [], marketplaceAggregated: [], unknown: [unknownSource] },
  },
  {
    id: "bambu-pa-cf",
    materialId: "bambu-pa-cf",
    brandId: "bambu-lab",
    shortName: "Bambu PA-CF",
    series: "Bambu",
    materialType: "PA-CF",
    category: "Fiber reinforced",
    recommendedNozzleTemperature: `${firstValue("bambu-pa-cf", "nozzle_temperature_range_low")}-${firstValue("bambu-pa-cf", "nozzle_temperature_range_high")} C`,
    bedTemperature: `Textured PEI ${firstValue("bambu-pa-cf", "textured_plate_temp")} C`,
    maxVolumetricSpeed: `${firstValue("bambu-pa-cf", "filament_max_volumetric_speed")} mm3/s`,
    flowRatio: firstValue("bambu-pa-cf", "filament_flow_ratio"),
    density: `${firstValue("bambu-pa-cf", "filament_density")} g/cm3`,
    referencePrice: `$${firstValue("bambu-pa-cf", "filament_cost")}`,
    amsCompatibility: "Use only with compatible spool and dry filament path.",
    dryingRecommended: "Strongly recommended.",
    enclosureRecommended: "Yes",
    hardenedNozzleRequired: "Yes",
    printability: 2,
    strength: 5,
    toughness: 4,
    heatResistance: 5,
    surfaceFinish: 4,
    verificationLevel: "Prototype profile, import not yet manually verified",
    evidenceCount: 2,
    score: 88,
    supportedPrinterPresetIds: commonPrinterIds,
    rating: { average: 4.6, count: 7, lowSampleThreshold: 30, distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 5 } },
    feedbackTags: [
      tag("high-flow-good", { en: "Good high-flow behavior", zhCn: "高流量表现好", zhTw: "高流量表現好" }, "temperatureExtrusion", "positive", 4, 0.57),
      tag("dry-needed", { en: "Drying recommended", zhCn: "建议打印前烘干", zhTw: "建議列印前乾燥" }, "materialManagement", "neutral", 6, 0.86),
      tag("abrasive", { en: "Hardened nozzle needed", zhCn: "需要耐磨喷嘴", zhTw: "需要耐磨噴嘴" }, "materialManagement", "neutral", 7, 1),
    ],
    facts: facts("bambu-pa-cf"),
    sourceBreakdown: { manufacturerProvided: [], publicVerified: [unknownSource], communityVerified: [], marketplaceAggregated: [], unknown: [unknownSource] },
  },
];

export function getFilamentCatalogItem(id: string) {
  return filamentCatalogItems.find((item) => item.id === id);
}

export function getBrandProfile(id: string) {
  return filamentBrandProfiles.find((brand) => brand.id === id);
}

export function getBrandFilaments(brandId: string) {
  return filamentCatalogItems.filter((item) => item.brandId === brandId);
}

export function getSupportedPrinterNames(ids: string[]) {
  return ids
    .map((id) => bambuPrinterTemplates.find((printer) => printer.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}
