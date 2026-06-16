import type { Locale } from "@/lib/i18n";
import {
  COLOR_FAMILY_LABELS,
  FINISH_LABELS,
  type CatalogColor,
  type ColorFamily,
  type Finish,
  type Transparency,
} from "./mock-colors";

type ColorWithLocalizedNames = CatalogColor & {
  names?: {
    en?: string | null;
    zhCN?: string | null;
    zhTW?: string | null;
  };
  officialName?: string | null;
};

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

export function getLocalizedFilamentColorName(color: ColorWithLocalizedNames, locale: Locale) {
  if (locale === "en") {
    return firstText(color.names?.en, color.colorNameEn, color.officialName, color.colorNameZh, "Unknown color");
  }

  if (locale === "zh-cn") {
    return firstText(color.names?.zhCN, color.colorNameZh, color.officialName, color.colorNameEn, "未知颜色");
  }

  return firstText(color.names?.zhTW, color.officialName, color.colorNameEn, color.colorNameZh, "未知顏色");
}

const colorFamilyZhTW: Record<ColorFamily, string> = {
  red: "紅色",
  orange: "橙色",
  yellow: "黃色",
  green: "綠色",
  cyan: "青色",
  blue: "藍色",
  purple: "紫色",
  pink: "粉色",
  brown: "棕色",
  black: "黑色",
  white: "白色",
  gray: "灰色",
  metallic: "金屬色",
  transparent: "透明",
  fluorescent: "螢光",
  multi: "多色",
};

const finishZhTW: Record<Finish, string> = {
  glossy: "高光",
  "semi-glossy": "半高光",
  matte: "霧面",
  silk: "絲綢",
  metallic: "金屬",
  transparent: "透明",
  satin: "緞面",
};

const transparencyLabels: Record<Locale, Record<Transparency, string>> = {
  en: {
    opaque: "Opaque",
    translucent: "Translucent",
    transparent: "Transparent",
  },
  "zh-cn": {
    opaque: "不透明",
    translucent: "半透明",
    transparent: "透明",
  },
  "zh-tw": {
    opaque: "不透明",
    translucent: "半透明",
    transparent: "透明",
  },
};

const variantEffectLabels: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "zh-cn": {
    Basic: "标准",
    Matte: "哑光",
    Silk: "丝绸",
    "High Speed": "高速",
    "High Flow": "高流量",
    HF: "HF",
    Tough: "高韧",
    Aero: "轻量",
    Lightweight: "轻量",
    Transparent: "透明",
    Translucent: "半透明",
    Glow: "夜光",
    CF: "碳纤增强",
    GF: "玻纤增强",
  },
  "zh-tw": {
    Basic: "標準",
    Matte: "霧面",
    Silk: "絲綢",
    "High Speed": "高速",
    "High Flow": "高流量",
    HF: "HF",
    Tough: "高韌",
    Aero: "輕量",
    Lightweight: "輕量",
    Transparent: "透明",
    Translucent: "半透明",
    Glow: "夜光",
    CF: "碳纖增強",
    GF: "玻纖增強",
  },
};

export function getLocalizedColorFamilyLabel(family: ColorFamily, locale: Locale) {
  if (locale === "en") return COLOR_FAMILY_LABELS[family]?.en ?? family;
  if (locale === "zh-tw") return colorFamilyZhTW[family] ?? family;
  return COLOR_FAMILY_LABELS[family]?.zh ?? family;
}

export function getLocalizedFinishLabel(finish: Finish, locale: Locale) {
  if (locale === "en") return FINISH_LABELS[finish]?.en ?? finish;
  if (locale === "zh-tw") return finishZhTW[finish] ?? finish;
  return FINISH_LABELS[finish]?.zh ?? finish;
}

export function getLocalizedTransparencyLabel(transparency: Transparency, locale: Locale) {
  return transparencyLabels[locale]?.[transparency] ?? transparency;
}

export function getLocalizedVariantEffectLabel(variant: string, locale: Locale) {
  if (locale === "en") return variant;
  return variantEffectLabels[locale]?.[variant] ?? variant;
}
