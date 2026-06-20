import type { CatalogColor, SpoolSpec, Finish, Transparency, ColorFamily, DigitalSwatch, PhysicalSwatch } from "./mock-colors";
import { getAllFilamentColors } from "@/lib/filaments/colors/catalog";
import r3dProductLines from "@/data/filaments/product-lines/r3d.json";

export type CatalogRecord = {
  id: string;
  brand: string;
  brandZh: string;
  materialType: string;
  materialTypeZh: string;
  variant: string;
  variantZh: string;
  productLine: string;
  color: CatalogColor;
  spool: SpoolSpec;
  rating: number;
  reviewCount: number;
  createdAt: string;
};

function dc(
  hex: string, r: number, g: number, b: number,
  colorNameZh: string, colorNameEn: string,
  colorFamily: ColorFamily,
  finish: Finish,
  transparency: Transparency,
  officialCode: string,
  source: "manufacturer" | "uploader" = "manufacturer",
): CatalogColor {
  const ds: DigitalSwatch = {
    hex, rgb: { r, g, b },
    officialColorCode: officialCode,
    sourceType: source,
    lastVerifiedAt: "2026-04-15",
  };
  const psList: PhysicalSwatch[] = source === "manufacturer"
    ? [{
        imageCount: 3, uploaderPublicId: "official",
        reviewStatus: "approved", lightSource: "D65",
        usedGrayCard: true, declaredPostProcessed: false,
      }]
    : [];
  return {
    colorNameZh, colorNameEn, colorFamily, hex, rgb: { r, g, b },
    finish, transparency,
    hasDigitalSwatch: true, hasPhysicalSwatch: psList.length > 0, physicalSwatchCount: psList.length,
    digitalSwatch: ds, physicalSwatches: psList,
  };
}

function spool(
  netWt: number, emptyWt: number | null, fullWt: number | null,
  od: number | null, width: number | null, hub: number | null,
  spoolMat: string | null, refill: boolean, cardboard: boolean, amsFit: "yes" | "conditional" | "no",
  adapter: boolean, img: string | null,
): SpoolSpec {
  return {
    netFilamentWeight: netWt, emptySpoolWeight: emptyWt, fullSpoolWeight: fullWt,
    spoolOuterDiameter: od, spoolWidth: width, hubDiameter: hub, spoolMaterial: spoolMat,
    refillable: refill, cardboardSpool: cardboard, amsFit, adapterRequired: adapter,
    spoolImagePlaceholder: img,
  };
}

const PLACEHOLDER_HEX = "#D9D9D9";
const PLACEHOLDER_RGB = { r: 217, g: 217, b: 217 };

function buildKexcelledRecords(): CatalogRecord[] {
  const colors = getAllFilamentColors().filter((c) => c.brandId === "kexcelled");
  return colors.map((c) => {
    const materialTypeMap: Record<string, string> = {
      "kexcelled-k5-pla": "PLA",
      "kexcelled-k5-pla-m": "PLA",
      "kexcelled-k6-pla": "PLA",
      "kexcelled-k5-pla-p": "PLA",
      "kexcelled-k5-petg-gf": "PETG",
      "kexcelled-k5-petg-m": "PETG",
      "kexcelled-k8-tpu": "TPU",
      "kexcelled-k7-tpu": "TPU",
      "kexcelled-k11-pei": "Other",
      "kexcelled-k10-pei": "Other",
      "kexcelled-k10-peek": "Other",
      "kexcelled-k8-pc": "PC",
      "kexcelled-k8-pa-cf": "PA",
      "kexcelled-k7-pet-cf10": "PETG",
      "kexcelled-k5-pla-magic": "PLA",
      "kexcelled-k6-pla-cf10": "PLA",
      "kexcelled-k5-pla-cf": "PLA",
      "kexcelled-k5-pla-sparkle": "PLA",
      "kexcelled-k5-wood": "PLA",
      "kexcelled-k5-pla-cc": "PLA",
      "kexcelled-k5-pla-silk": "PLA",
      "kexcelled-the-k5-petg": "PETG",
      "kexcelled-the-k6-petg": "PETG",
    };
    const materialType = materialTypeMap[c.productLineId] || "PLA";
    const variantMap: Record<string, string> = {
      "kexcelled-k5-pla": "Standard",
      "kexcelled-k5-pla-m": "Matte",
      "kexcelled-k6-pla": "Tough",
      "kexcelled-k5-pla-p": "Metallic",
      "kexcelled-k5-petg-gf": "Glass Fiber Reinforced",
      "kexcelled-k5-petg-m": "Matte",
      "kexcelled-k8-tpu": "Multi (64D-95A)",
      "kexcelled-k7-tpu": "Standard (64D)",
      "kexcelled-k11-pei": "PEI (Ultem 9085)",
      "kexcelled-k10-pei": "PEI (Ultem 1010)",
      "kexcelled-k10-peek": "PEEK",
      "kexcelled-k8-pc": "Standard",
      "kexcelled-k8-pa-cf": "CF",
      "kexcelled-k7-pet-cf10": "CF",
      "kexcelled-k5-pla-magic": "Marble",
      "kexcelled-k6-pla-cf10": "Carbon Fiber Reinforced",
      "kexcelled-k5-pla-cf": "Carbon Fiber Reinforced",
      "kexcelled-k5-pla-sparkle": "Sparkle",
      "kexcelled-k5-wood": "Wood-filled",
      "kexcelled-k5-pla-cc": "Glow-in-the-dark",
      "kexcelled-k5-pla-silk": "Silk",
      "kexcelled-the-k5-petg": "Standard",
      "kexcelled-the-k6-petg": "High Heat",
    };
    const variantZhMap: Record<string, string> = {
      "kexcelled-k5-pla": "标准",
      "kexcelled-k5-pla-m": "哑光",
      "kexcelled-k6-pla": "高韧性",
      "kexcelled-k5-pla-p": "金属质感",
      "kexcelled-k5-petg-gf": "玻纤增强",
      "kexcelled-k5-petg-m": "哑光",
      "kexcelled-k8-tpu": "多硬度 (64D-95A)",
      "kexcelled-k7-tpu": "标准 (64D)",
      "kexcelled-k11-pei": "PEI (Ultem 9085)",
      "kexcelled-k10-pei": "PEI (Ultem 1010)",
      "kexcelled-k10-peek": "PEEK",
      "kexcelled-k8-pc": "标准",
      "kexcelled-k8-pa-cf": "碳纤维增强",
      "kexcelled-k7-pet-cf10": "碳纤维增强",
      "kexcelled-k5-pla-magic": "大理石",
      "kexcelled-k6-pla-cf10": "碳纤维增强",
      "kexcelled-k5-pla-cf": "碳纤维增强",
      "kexcelled-k5-pla-sparkle": "闪耀",
      "kexcelled-k5-wood": "木质",
      "kexcelled-k5-pla-cc": "夜光",
      "kexcelled-k5-pla-silk": "丝绸",
      "kexcelled-the-k5-petg": "标准",
      "kexcelled-the-k6-petg": "高耐热",
    };
    const productLineMap: Record<string, string> = {
      "kexcelled-k5-pla": "THE K5 PLA",
      "kexcelled-k5-pla-m": "THE K5 PLA M",
      "kexcelled-k6-pla": "THE K6 PLA",
      "kexcelled-k5-pla-p": "THE K5 PLA P",
      "kexcelled-k5-petg-gf": "THE K5 PETG GF",
      "kexcelled-k5-petg-m": "THE K5 PETG M",
      "kexcelled-k8-tpu": "THE K8 TPU",
      "kexcelled-k7-tpu": "THE K7 TPU",
      "kexcelled-k11-pei": "THE K11 PEI",
      "kexcelled-k10-pei": "THE K10 PEI",
      "kexcelled-k10-peek": "THE K10 PEEK",
      "kexcelled-k8-pc": "THE K8 PC",
      "kexcelled-k8-pa-cf": "THE K8 PA CF",
      "kexcelled-k7-pet-cf10": "THE K7 PET CF10",
      "kexcelled-k5-pla-magic": "THE K5 PLA Magic",
      "kexcelled-k6-pla-cf10": "THE K6 PLA CF10",
      "kexcelled-k5-pla-cf": "THE K5 PLA CF",
      "kexcelled-k5-pla-sparkle": "THE K5 PLA Sparkle",
      "kexcelled-k5-wood": "THE K5 WOOD",
      "kexcelled-k5-pla-cc": "THE K5 PLA CC",
      "kexcelled-k5-pla-silk": "THE K5 PLA Silk",
      "kexcelled-the-k5-petg": "THE K5 PETG",
      "kexcelled-the-k6-petg": "THE K6 PETG",
    };
    const variant = variantMap[c.productLineId] || "Standard";
    const variantZh = variantZhMap[c.productLineId] || "标准";
    const productLine = productLineMap[c.productLineId] || c.productLineId;
    const materialTypeZh = materialType;

    const hexStr = c.hex;
    const hasRealHex = hexStr !== null;
    const hexVal = hexStr || PLACEHOLDER_HEX;
    let rVal: number, gVal: number, bVal: number;
    if (c.rgb && Array.isArray(c.rgb) && c.rgb.length === 3) {
      [rVal, gVal, bVal] = c.rgb;
    } else {
      rVal = PLACEHOLDER_RGB.r;
      gVal = PLACEHOLDER_RGB.g;
      bVal = PLACEHOLDER_RGB.b;
    }

    const finish = (c.finish || "semi-glossy") as Finish;
    const transparency = (c.opacity === "translucent" ? "translucent" : "opaque") as Transparency;
    const colorFamily = inferColorFamily(c.officialName, c.hex);

    const color: CatalogColor = hasRealHex
      ? dc(hexVal, rVal, gVal, bVal, c.displayNameZh || c.officialName, c.officialName,
          colorFamily, finish, transparency,
          c.officialColorCode || `KX-${c.id.split("-").pop()?.toUpperCase()}`,
          c.colorValueSource === "official" ? "manufacturer" : "uploader")
      : {
          colorNameZh: c.displayNameZh || c.officialName,
          colorNameEn: c.officialName,
          colorFamily,
          hex: PLACEHOLDER_HEX,
          rgb: PLACEHOLDER_RGB,
          finish, transparency,
          hasDigitalSwatch: false,
          hasPhysicalSwatch: false,
          physicalSwatchCount: 0,
          digitalSwatch: null,
          physicalSwatches: [],
        };

    return {
      id: c.id,
      brand: "Kexcelled",
      brandZh: "Kexcelled",
      materialType,
      materialTypeZh,
      variant,
      variantZh,
      productLine,
      color,
      spool: spool(1000, null, null, null, null, null, null, false, false, "yes", false, null),
      rating: 0,
      reviewCount: 0,
      createdAt: "2026-06-19",
    };
  });
}

function inferColorFamily(name: string, hex: string | null): ColorFamily {
  if (!hex) return "gray";
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) {
    if (r < 40) return "black";
    if (r > 220) return "white";
    return "gray";
  }
  if (r > g && r > b) {
    if (Math.abs(g - b) < 30) return "red";
    if (g > b) return "orange";
    return "pink";
  }
  if (g > r && g > b) return "green";
  if (b > r && b > g) return "blue";
  return "gray";
}

// Variant name maps for R3D (simplified — same as displayed variant)
function r3dVariantZh(variant: string): string {
  var m: Record<string, string> = {
    "Standard": "标准", "Matte": "哑光", "Tough": "高韧性", "Silk": "丝绸",
    "Glow": "夜光", "Marble": "大理石", "Wood": "木质", "Rainbow": "彩虹",
    "Temperature": "温变", "UV": "UV", "CF": "碳纤维", "PEBA": "PEBA",
  };
  return m[variant] || variant;
}

function buildR3dRecords(): CatalogRecord[] {
  return r3dProductLines.productLines.map(function (pl) {
    var color: CatalogColor = {
      colorNameZh: "通用", colorNameEn: "Generic",
      colorFamily: "gray", hex: PLACEHOLDER_HEX, rgb: PLACEHOLDER_RGB,
      finish: "semi-glossy", transparency: "opaque",
      hasDigitalSwatch: false, hasPhysicalSwatch: false, physicalSwatchCount: 0,
      digitalSwatch: null, physicalSwatches: [],
    };
    return {
      id: pl.id + "-generic",
      brand: "R3D", brandZh: "爱三迪",
      materialType: pl.materialType, materialTypeZh: pl.materialType,
      variant: pl.variant, variantZh: r3dVariantZh(pl.variant),
      productLine: pl.productLine,
      color: color,
      spool: spool(1000, null, null, null, null, null, null, false, false, "yes", false, null),
      rating: 0, reviewCount: 0, createdAt: "2026-06-20",
    };
  });
}

export const CATALOG_RECORDS: CatalogRecord[] = [
  {
    id: "bambu-pla-basic-black",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Basic", variantZh: "基础",
    productLine: "PLA Basic",
    color: dc("#1A1A1A", 26, 26, 26, "哑光黑", "Matte Black", "black", "matte", "opaque", "AA0001", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.8, reviewCount: 3520, createdAt: "2023-04-01",
  },
  {
    id: "bambu-pla-basic-white",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Basic", variantZh: "基础",
    productLine: "PLA Basic",
    color: dc("#F2F0E6", 242, 240, 230, "象牙白", "Ivory White", "white", "semi-glossy", "opaque", "AA0003", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.7, reviewCount: 2810, createdAt: "2023-04-01",
  },
  {
    id: "bambu-pla-matte-navy",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Matte", variantZh: "哑光",
    productLine: "PLA Matte",
    color: dc("#1B2A4A", 27, 42, 74, "海军蓝", "Navy Blue", "blue", "matte", "opaque", "AM0001", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.6, reviewCount: 1840, createdAt: "2023-06-01",
  },
  {
    id: "bambu-pla-silk-silver",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Silk", variantZh: "丝绸",
    productLine: "PLA Silk",
    color: dc("#C0C0C0", 192, 192, 192, "金属银", "Metallic Silver", "metallic", "silk", "opaque", "AS0001", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "conditional", false, null),
    rating: 4.5, reviewCount: 1260, createdAt: "2023-08-01",
  },
  {
    id: "bambu-petg-hf-cyan",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PETG", materialTypeZh: "PETG",
    variant: "HF", variantZh: "HF",
    productLine: "PETG HF",
    color: dc("#00A9D1", 0, 169, 209, "天蓝", "Sky Blue", "cyan", "semi-glossy", "opaque", "PH0001", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.4, reviewCount: 980, createdAt: "2024-03-01",
  },
  {
    id: "r3d-petg-basic-black",
    brand: "R3D", brandZh: "R3D",
    materialType: "PETG", materialTypeZh: "PETG",
    variant: "Basic", variantZh: "基础",
    productLine: "R3D ABS+ PETG",
    color: dc("#111111", 17, 17, 17, "炭黑", "Carbon Black", "black", "satin", "opaque", "R3D-001", "manufacturer"),
    spool: spool(1000, 260, 1260, 205, 68, 55, "PC", true, false, "yes", false, null),
    rating: 4.3, reviewCount: 3120, createdAt: "2023-11-01",
  },
  {
    id: "r3d-tpu-basic-white",
    brand: "R3D", brandZh: "R3D",
    materialType: "TPU", materialTypeZh: "TPU",
    variant: "Basic", variantZh: "基础",
    productLine: "R3D TPU-85A",
    color: dc("#E8E4D8", 232, 228, 216, "奶油白", "Cream White", "white", "matte", "opaque", "R3D-105", "manufacturer"),
    spool: spool(500, 200, 700, 205, 55, 55, "ABS", true, false, "conditional", true, null),
    rating: 4.1, reviewCount: 870, createdAt: "2024-01-15",
  },
  {
    id: "jayo-pla-hs-red",
    brand: "JAYO", brandZh: "JAYO",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "High Speed", variantZh: "高速",
    productLine: "JAYO PLA HS",
    color: dc("#CC2936", 204, 41, 54, "中国红", "Chinese Red", "red", "glossy", "opaque", "JY-P001", "manufacturer"),
    spool: spool(1000, 250, 1250, 200, 65, 53, "PET", true, false, "yes", false, null),
    rating: 4.0, reviewCount: 1450, createdAt: "2025-02-01",
  },
  {
    id: "sunlu-pla-matte-green",
    brand: "SUNLU", brandZh: "SUNLU",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Matte", variantZh: "哑光",
    productLine: "SUNLU Meta Matte",
    color: dc("#4A7C59", 74, 124, 89, "橄榄绿", "Olive Green", "green", "matte", "opaque", "SL-M022", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, true, true, "yes", false, null),
    rating: 4.5, reviewCount: 2200, createdAt: "2024-06-01",
  },
  {
    id: "esun-petg-basic-transparent",
    brand: "eSUN", brandZh: "eSUN",
    materialType: "PETG", materialTypeZh: "PETG",
    variant: "Basic", variantZh: "基础",
    productLine: "eSUN PETG",
    color: dc("#D4E8E0", 212, 232, 224, "半透明", "Translucent", "transparent", "transparent", "translucent", "ES-PT01", "manufacturer"),
    spool: spool(1000, 240, 1240, 200, 65, 52, "PET", false, false, "conditional", true, null),
    rating: 4.3, reviewCount: 5600, createdAt: "2022-09-01",
  },
  {
    id: "esun-abs-basic-yellow",
    brand: "eSUN", brandZh: "eSUN",
    materialType: "ABS", materialTypeZh: "ABS",
    variant: "Basic", variantZh: "基础",
    productLine: "eSUN ABS+",
    color: dc("#F5D742", 245, 215, 66, "亮黄", "Bright Yellow", "yellow", "glossy", "opaque", "ES-AB02", "manufacturer"),
    spool: spool(1000, 240, 1240, 200, 65, 52, "ABS", false, false, "no", true, null),
    rating: 4.0, reviewCount: 3200, createdAt: "2023-01-01",
  },
  {
    id: "generic-pla-basic-gray",
    brand: "Generic", brandZh: "Generic",
    materialType: "PLA", materialTypeZh: "PLA",
    variant: "Basic", variantZh: "基础",
    productLine: "Generic PLA",
    color: dc("#9CA3AF", 156, 163, 175, "中灰", "Mid Gray", "gray", "semi-glossy", "opaque", "GN-101", "uploader"),
    spool: spool(1000, 0, null, null, null, null, null, false, false, "yes", false, null),
    rating: 3.8, reviewCount: 210, createdAt: "2025-03-20",
  },
  {
    id: "bambu-petg-hf-orange",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "PETG", materialTypeZh: "PETG",
    variant: "HF", variantZh: "HF",
    productLine: "PETG HF",
    color: dc("#E8721A", 232, 114, 26, "橙色", "Orange", "orange", "semi-glossy", "opaque", "PH0003", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.5, reviewCount: 760, createdAt: "2024-04-01",
  },
  {
    id: "bambu-asa-basic-black",
    brand: "Bambu Lab", brandZh: "Bambu Lab",
    materialType: "ASA", materialTypeZh: "ASA",
    variant: "Basic", variantZh: "基础",
    productLine: "ASA Basic",
    color: dc("#1E1E1E", 30, 30, 30, "黑色", "Black", "black", "matte", "opaque", "AF0001", "manufacturer"),
    spool: spool(1000, 0, null, null, null, null, null, false, true, "yes", false, null),
    rating: 4.6, reviewCount: 430, createdAt: "2024-07-01",
  },
  ...buildKexcelledRecords(),
  ...buildR3dRecords(),
];

export function getRecordsByBrand(brand: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.brand === brand);
}

export function getRecordsByMaterial(materialType: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.materialType === materialType);
}

export function getRecordsByColorFamily(family: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.color.colorFamily === family);
}

export function getUniqueBrands(): { brand: string; brandZh: string }[] {
  const map = new Map<string, { brand: string; brandZh: string }>();
  for (const r of CATALOG_RECORDS) {
    if (!map.has(r.brand)) map.set(r.brand, { brand: r.brand, brandZh: r.brandZh });
  }
  return [...map.values()];
}

export const DECLARED_COLORS = CATALOG_RECORDS.map((r) => ({
  id: r.id,
  hex: r.color.hex,
  colorNameZh: r.color.colorNameZh,
  colorNameEn: r.color.colorNameEn,
  colorFamily: r.color.colorFamily,
}));
