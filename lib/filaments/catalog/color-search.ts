export const CHINESE_COLOR_NAMES: Record<string, string> = {
  "哑光黑":   "black",
  "炭黑":     "black",
  "黑色":     "black",
  "象牙白":   "white",
  "奶油白":   "white",
  "米白":     "white",
  "白色":     "white",
  "海军蓝":   "blue",
  "藏蓝":     "blue",
  "天蓝":     "cyan",
  "浅蓝":     "cyan",
  "樱花粉":   "pink",
  "浅粉":     "pink",
  "橄榄绿":   "green",
  "军绿":     "green",
  "金属银":   "metallic",
  "银灰":     "gray",
  "荧光黄":   "fluorescent",
  "亮黄":     "yellow",
  "透明红":   "transparent",
  "半透明红": "transparent",
  "透明":     "transparent",
  "半透明":   "transparent",
  "深红":     "red",
  "酒红":     "red",
  "中国红":   "red",
  "深蓝":     "blue",
  "宝蓝":     "blue",
  "浅绿":     "green",
  "草绿":     "green",
  "荧光绿":   "fluorescent",
  "荧光橙":   "fluorescent",
  "金色":     "metallic",
  "古铜":     "metallic",
  "香槟金":   "metallic",
  "渐变":     "multi",
  "彩虹":     "multi",
  "哑光白":   "white",
  "米黄":     "white",
  "浅灰":     "gray",
  "中灰":     "gray",
  "深灰":     "gray",
  "紫":       "purple",
  "淡紫":     "purple",
  "深紫":     "purple",
  "粉紫":     "purple",
  "橙色":     "orange",
  "橘色":     "orange",
  "棕色":     "brown",
  "咖啡":     "brown",
};

export const ENGLISH_COLOR_SYNONYMS: Record<string, string> = {
  "matte black":     "black",
  "carbon black":    "black",
  "ivory":           "white",
  "cream":           "white",
  "off white":       "white",
  "navy blue":       "blue",
  "sky blue":        "cyan",
  "light blue":      "cyan",
  "sakura pink":     "pink",
  "light pink":      "pink",
  "olive green":     "green",
  "military green":  "green",
  "metallic silver": "gray",
  "silver gray":     "gray",
  "fluorescent yellow": "fluorescent",
  "glow":            "fluorescent",
  "transparent red": "transparent",
  "clear":           "transparent",
  "translucent":     "transparent",
  "deep red":        "red",
  "wine red":        "red",
  "crimson":         "red",
  "dark blue":       "blue",
  "royal blue":      "blue",
  "light green":     "green",
  "fluorescent green": "fluorescent",
  "gold":            "metallic",
  "bronze":          "metallic",
  "champagne":       "metallic",
  "rainbow":         "multi",
  "gradient":        "multi",
  "purple":          "purple",
  "light purple":    "purple",
  "dark purple":     "purple",
  "violet":          "purple",
  "lavender":        "purple",
  "orange":          "orange",
  "brown":           "brown",
  "coffee":          "brown",
};

export function searchColorFamilyByChineseName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  for (const [key, family] of Object.entries(CHINESE_COLOR_NAMES)) {
    if (key.includes(normalized) || normalized.includes(key)) return family;
  }
  return null;
}

export function searchColorFamilyByEnglishName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  for (const [key, family] of Object.entries(ENGLISH_COLOR_SYNONYMS)) {
    if (key.includes(normalized) || normalized.includes(key)) return family;
  }
  return null;
}

export function resolveColorFamily(input: string): string | null {
  return searchColorFamilyByChineseName(input) || searchColorFamilyByEnglishName(input) || null;
}

export function approximateColorDistance(hex1: string, hex2: string): number {
  const toRgb = (h: string) => {
    const c = h.replace("#", "");
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16),
    };
  };
  const a = toRgb(hex1);
  const b = toRgb(hex2);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function sortByColorDistance(referenceHex: string, candidates: { hex: string }[]) {
  return [...candidates].sort(
    (a, b) => approximateColorDistance(referenceHex, a.hex) - approximateColorDistance(referenceHex, b.hex),
  );
}
