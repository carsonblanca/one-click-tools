export type VerificationStatus = "verified" | "partial" | "pending";
export type PresetDataSource = "official" | "community" | "generated" | null;

export type FilamentProductLine = {
  id: string;
  brandId: string;
  brandName: string;
  brandNameZh: string | null;
  aliases: string[];
  regionalNames?: Record<string, string>;
  materialType: string;
  series: string | null;
  variant: string;
  productLine: string;
  displayName: string;
  officialProductUrl: string | null;
  technicalDataUrl: string | null;
  officialStoreUrl: string | null;
  countryOrRegion: string | null;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  knownColorCount: number | null;
  hasOfficialColorChart: boolean;
  hasTechnicalDataSheet: boolean;
  hasSpoolSpecs: boolean;
  hasPresetData: boolean;
  presetDataSource: PresetDataSource;
  sourceNotes: string;
  evidence?: {
    officialColorChartUrl?: string | null;
    technicalDataUrl?: string | null;
    spoolSpecsUrl?: string | null;
    presetDataUrl?: string | null;
  };
};

export type BrandProductLines = {
  brandId: string;
  brandName: string;
  brandNameZh: string | null;
  countryOrRegion: string | null;
  website: string | null;
  officialStore: string | null;
  verifiedAt: string | null;
  productLines: FilamentProductLine[];
};

export const ALLOWED_MATERIAL_TYPES = [
  "PLA",
  "PETG",
  "TPU",
  "ABS",
  "ASA",
  "PA",
  "PC",
  "PP",
  "PE",
  "POM",
  "PVA",
  "HIPS",
  "TPE",
  "Support",
  "Composite",
  "Other",
] as const;

export type MaterialType = (typeof ALLOWED_MATERIAL_TYPES)[number];
