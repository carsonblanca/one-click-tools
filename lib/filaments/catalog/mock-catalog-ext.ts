import type { CatalogColor, SpoolSpec, Finish, Transparency, ColorFamily, DigitalSwatch, PhysicalSwatch } from "./mock-colors";
import { getAllFilamentColors } from "@/lib/filaments/colors/catalog";
import r3dProductLines from "@/data/filaments/product-lines/r3d.json";
import kexcelledProductLines from "@/data/filaments/product-lines/kexcelled.json";

export type CatalogRecord = {
  id: string;
  brand: string;
  brandZh: string;
  materialType: string;
  materialTypeZh: string;
  variant: string;
  variantZh: string;
  productLine: string;
  productLineId?: string;
  parameterStatus?: "complete" | "partial" | "missing";
  color: CatalogColor;
  spool: SpoolSpec;
  rating: number;
  reviewCount: number;
  createdAt: string;
  published?: {
    sourceRunId: string;
    publicationStatus: "published";
    parameters: Array<{
      canonicalKey: string;
      labelZh: string;
      value: string;
    }>;
    colors: Array<{
      id: string;
      nameZh: string;
      nameEn: string;
      officialColorCode: string;
      imageUrl: string | null;
      color: CatalogColor;
    }>;
    images: Array<{
      id: string;
      role: string;
      url: string;
    }>;
  };
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
      "kexcelled-k11-pei": "PEI",
      "kexcelled-k10-pei": "PEI",
      "kexcelled-k10-peek": "PEEK",
      "kexcelled-k8-pc": "PC",
      "kexcelled-k8-pa-cf": "PA",
      "kexcelled-k7-pet-cf10": "PET",
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
    const hexVal = hexStr || "";
    let rVal: number, gVal: number, bVal: number;
    if (c.rgb && Array.isArray(c.rgb) && c.rgb.length === 3) {
      [rVal, gVal, bVal] = c.rgb;
    } else {
      rVal = 0;
      gVal = 0;
      bVal = 0;
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
          hex: null,
          rgb: null,
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
      productLineId: c.productLineId,
      parameterStatus: getKexcelledParameterStatus(c.productLineId),
      color,
      spool: spool(1000, null, null, null, null, null, null, false, false, "yes", false, null),
      rating: 0,
      reviewCount: 0,
      createdAt: "2026-06-19",
    };
  });
}

function getKexcelledParameterStatus(productLineId: string): "complete" | "partial" | "missing" {
  const record = (kexcelledProductLines.productLines as Array<{ id: string }>).find((line) => line.id === productLineId);
  if (!record) return "missing";
  const knownMissing = new Set([
    "kexcelled-k7-pet-cf10",
    "kexcelled-k8-pa-cf",
    "kexcelled-k8-pc",
    "kexcelled-k10-peek",
    "kexcelled-k10-pei",
    "kexcelled-k11-pei",
    "kexcelled-k7-tpu",
    "kexcelled-k8-tpu",
    "kexcelled-k5-petg-m",
  ]);
  return knownMissing.has(productLineId) ? "missing" : "partial";
}

function buildKexcelledPlaceholderRecords(existingRecords: CatalogRecord[]): CatalogRecord[] {
  const existingIds = new Set(existingRecords.map((record) => record.productLineId));
  return (kexcelledProductLines.productLines as Array<{ id: string; productLine: string; materialType: string; variant: string }>).filter((line) => !existingIds.has(line.id)).map((line) => {
    const materialType = line.id === "kexcelled-k10-peek" ? "PEEK" : line.id === "kexcelled-k10-pei" || line.id === "kexcelled-k11-pei" ? "PEI" : line.materialType;
    const color: CatalogColor = {
      colorNameZh: "颜色信息待补充",
      colorNameEn: "Color information pending",
      colorFamily: "gray",
      hex: null,
      rgb: null,
      finish: "semi-glossy",
      transparency: "opaque",
      hasDigitalSwatch: false,
      hasPhysicalSwatch: false,
      physicalSwatchCount: 0,
      digitalSwatch: null,
      physicalSwatches: [],
    };
    return {
      id: line.id + "-generic",
      brand: "Kexcelled",
      brandZh: "Kexcelled",
      materialType,
      materialTypeZh: materialType,
      variant: line.variant || "Standard",
      variantZh: line.variant || "标准",
      productLine: line.productLine,
      productLineId: line.id,
      parameterStatus: getKexcelledParameterStatus(line.id),
      color,
      spool: spool(1000, null, null, null, null, null, null, false, false, "yes", false, null),
      rating: 0,
      reviewCount: 0,
      createdAt: "2026-06-20",
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
  return (r3dProductLines.productLines as Array<{ id: string; materialType: string; variant: string; productLine: string }>).map(function (pl) {
    var color: CatalogColor = {
      colorNameZh: "颜色信息待补充", colorNameEn: "Color information pending",
      colorFamily: "gray", hex: null, rgb: null,
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

const kexcelledColorRecords = buildKexcelledRecords();

export const CATALOG_RECORDS: CatalogRecord[] = [];

export function getRecordsByBrand(brand: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.brand === brand);
}

export function getRecordsByMaterial(materialType: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.materialType === materialType);
}

export function getRecordsByColorFamily(family: string): CatalogRecord[] {
  return CATALOG_RECORDS.filter((r) => r.color.hasDigitalSwatch && r.color.colorFamily === family);
}

export function getUniqueBrands(): { brand: string; brandZh: string }[] {
  const map = new Map<string, { brand: string; brandZh: string }>();
  for (const r of CATALOG_RECORDS) {
    if (!map.has(r.brand)) map.set(r.brand, { brand: r.brand, brandZh: r.brandZh });
  }
  return [...map.values()];
}

export const DECLARED_COLORS = CATALOG_RECORDS.filter((r) => r.color.hasDigitalSwatch && r.color.hex).map((r) => ({
  id: r.id,
  hex: r.color.hex || "",
  colorNameZh: r.color.colorNameZh,
  colorNameEn: r.color.colorNameEn,
  colorFamily: r.color.colorFamily,
}));
