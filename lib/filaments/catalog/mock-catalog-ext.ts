import type { CatalogColor, SpoolSpec, Finish, Transparency, ColorFamily, DigitalSwatch, PhysicalSwatch } from "./mock-colors";

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
    id: "kexcelled-petg-hf-purple",
    brand: "Kexcelled", brandZh: "Kexcelled",
    materialType: "PETG", materialTypeZh: "PETG",
    variant: "HF", variantZh: "HF",
    productLine: "Kexcelled PETG HF",
    color: dc("#8B5CF6", 139, 92, 246, "紫色", "Purple", "purple", "semi-glossy", "opaque", "KX-P008", "manufacturer"),
    spool: spool(1000, 255, 1255, 205, 66, 53, "PC", true, false, "yes", false, null),
    rating: 4.2, reviewCount: 670, createdAt: "2025-01-10",
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
