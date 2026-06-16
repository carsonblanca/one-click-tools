export type ColorFamily =
  | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple"
  | "pink" | "brown" | "black" | "white" | "gray" | "metallic"
  | "transparent" | "fluorescent" | "multi";

export type Finish = "glossy" | "semi-glossy" | "matte" | "silk" | "metallic" | "transparent" | "satin";

export type Transparency = "opaque" | "translucent" | "transparent";

export type SwatchSourceType = "manufacturer" | "uploader" | "community" | "unknown";

export type DigitalSwatch = {
  hex: string;
  rgb: { r: number; g: number; b: number };
  officialColorCode: string;
  sourceType: SwatchSourceType;
  lastVerifiedAt: string | null;
};

export type PhysicalSwatch = {
  imageCount: number;
  uploaderPublicId: string;
  reviewStatus: "approved" | "pending" | "rejected";
  lightSource: string;
  usedGrayCard: boolean;
  declaredPostProcessed: boolean;
};

export type SpoolSpec = {
  netFilamentWeight: number;
  emptySpoolWeight: number | null;
  fullSpoolWeight: number | null;
  spoolOuterDiameter: number | null;
  spoolWidth: number | null;
  hubDiameter: number | null;
  spoolMaterial: string | null;
  refillable: boolean;
  cardboardSpool: boolean;
  amsFit: "yes" | "conditional" | "no";
  adapterRequired: boolean;
  spoolImagePlaceholder: string | null;
};

export type CatalogColor = {
  colorNameZh: string;
  colorNameEn: string;
  colorFamily: ColorFamily;
  hex: string;
  rgb: { r: number; g: number; b: number };
  finish: Finish;
  transparency: Transparency;
  hasDigitalSwatch: boolean;
  hasPhysicalSwatch: boolean;
  physicalSwatchCount: number;
  digitalSwatch: DigitalSwatch | null;
  physicalSwatches: PhysicalSwatch[];
};

export const COLOR_FAMILY_LABELS: Record<ColorFamily, { zh: string; en: string }> = {
  red:        { zh: "红色",   en: "Red" },
  orange:     { zh: "橙色",   en: "Orange" },
  yellow:     { zh: "黄色",   en: "Yellow" },
  green:      { zh: "绿色",   en: "Green" },
  cyan:       { zh: "青色",   en: "Cyan" },
  blue:       { zh: "蓝色",   en: "Blue" },
  purple:     { zh: "紫色",   en: "Purple" },
  pink:       { zh: "粉色",   en: "Pink" },
  brown:      { zh: "棕色",   en: "Brown" },
  black:      { zh: "黑色",   en: "Black" },
  white:      { zh: "白色",   en: "White" },
  gray:       { zh: "灰色",   en: "Gray" },
  metallic:   { zh: "金属色", en: "Metallic" },
  transparent:{ zh: "透明",   en: "Transparent" },
  fluorescent:{ zh: "荧光",   en: "Fluorescent" },
  multi:      { zh: "多色",   en: "Multi" },
};

export const FINISH_LABELS: Record<Finish, { zh: string; en: string }> = {
  glossy:       { zh: "高光",   en: "Glossy" },
  "semi-glossy":{ zh: "半高光", en: "Semi-glossy" },
  matte:        { zh: "哑光",   en: "Matte" },
  silk:         { zh: "丝绸",   en: "Silk" },
  metallic:     { zh: "金属",   en: "Metallic" },
  transparent:  { zh: "透明",   en: "Transparent" },
  satin:        { zh: "缎面",   en: "Satin" },
};
