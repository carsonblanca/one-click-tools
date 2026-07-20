import { bambuFilamentMaterials } from "@/lib/filaments/presets/bambu/material-templates";
import { bambuPrinterTemplates } from "@/lib/filaments/presets/bambu/printers";
import { CATALOG_RECORDS, type CatalogRecord } from "./mock-catalog-ext";
import { approximateColorDistance, resolveColorFamily } from "./color-search";
import type { ColorFamily, Finish } from "./mock-colors";

export type PerformanceTag =
  | "easy-print" | "high-speed" | "high-strength" | "high-toughness"
  | "heat-resistant" | "weather-resistant" | "flexible"
  | "transparent" | "matte-finish" | "silk-gloss"
  | "engineering-parts" | "decorative" | "needs-drying"
  | "hardened-nozzle" | "low-warping";

export const PERFORMANCE_TAGS: { id: PerformanceTag; zh: string; en: string; test: (r: CatalogRecord) => boolean }[] = [
  { id: "easy-print",       zh: "容易打印",      en: "Easy to print",    test: (r) => r.rating >= 4.5 },
  { id: "high-speed",       zh: "高速打印",      en: "High speed",       test: (r) => r.variant.includes("High Speed") },
  { id: "high-strength",    zh: "高强度",        en: "High strength",    test: (r) => r.materialType === "ASA" || r.materialType.includes("CF") || r.materialType === "PC" || r.materialType === "PA" },
  { id: "high-toughness",   zh: "高韧性",        en: "High toughness",   test: (r) => r.materialType === "PETG" || r.materialType === "TPU" || r.materialType === "PA" },
  { id: "heat-resistant",   zh: "耐高温",        en: "Heat resistant",   test: (r) => r.materialType === "ASA" || r.materialType === "PC" || r.materialType.includes("PA") },
  { id: "weather-resistant",zh: "户外耐候",      en: "Weather resistant",test: (r) => r.materialType === "ASA" },
  { id: "flexible",         zh: "柔性材料",      en: "Flexible",         test: (r) => r.materialType === "TPU" },
  { id: "transparent",      zh: "透明效果",      en: "Transparent",      test: (r) => r.color.transparency !== "opaque" },
  { id: "matte-finish",     zh: "哑光外观",      en: "Matte finish",     test: (r) => r.color.finish === "matte" },
  { id: "silk-gloss",       zh: "丝绸光泽",      en: "Silk gloss",       test: (r) => r.color.finish === "silk" },
  { id: "engineering-parts",zh: "工程零件",      en: "Engineering parts",test: (r) => ["ABS", "ASA", "PA", "PC"].includes(r.materialType) || r.materialType.includes("CF") },
  { id: "decorative",       zh: "装饰模型",      en: "Decorative",       test: (r) => r.color.finish === "silk" || r.color.finish === "glossy" },
  { id: "needs-drying",     zh: "需要烘干",      en: "Needs drying",     test: (r) => r.materialType === "PA" || r.materialType === "PC" || r.materialType.includes("CF") },
  { id: "hardened-nozzle",  zh: "需要硬化喷嘴",  en: "Hardened nozzle",  test: (r) => r.materialType.includes("CF") },
  { id: "low-warping",      zh: "低翘曲",        en: "Low warping",      test: (r) => r.materialType === "PLA" || r.materialType === "TPU" || r.materialType === "PETG" },
];

export type ProductVariant =
  | "basic" | "matte" | "silk" | "high-speed" | "cf" | "gf" | "hf" | "ams";

export const PRODUCT_VARIANTS: { id: ProductVariant; zh: string; en: string; test: (r: CatalogRecord) => boolean }[] = [
  { id: "basic",      zh: "基础",    en: "Basic",      test: (r) => r.variant === "Basic" },
  { id: "matte",      zh: "哑光",    en: "Matte",       test: (r) => r.variant === "Matte" },
  { id: "silk",       zh: "丝绸",    en: "Silk",        test: (r) => r.variant === "Silk" },
  { id: "high-speed", zh: "高速",    en: "High Speed",  test: (r) => r.variant === "High Speed" },
  { id: "cf",         zh: "碳纤维",  en: "Carbon Fiber",test: (r) => r.variant.includes("CF") || r.materialType.includes("CF") },
  { id: "hf",         zh: "HF",      en: "HF",          test: (r) => r.variant === "HF" },
];

const pendingParameterKeys = new Set([
  "nozzleTemperature",
  "bedTemperature",
  "maxVolumetricSpeed",
  "flowRatio",
  "density",
  "dryingRecommended",
  "enclosureRecommended",
  "hardenedNozzleRequired",
  "supportedPrinterPresets",
]);

export function hasPresetParameters(record: CatalogRecord) {
  if (record.brand === "R3D") return false;
  if (record.brand === "Kexcelled" && record.parameterStatus === "missing") return false;
  return true;
}

export function parameterStatusLabel(record: CatalogRecord) {
  return hasPresetParameters(record) ? "Available" : "Parameters pending";
}

function firstValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (Array.isArray(value)) return value.join(" / ");
  if (value === undefined || value === null || value === "") return "Not in mock catalog";
  return String(value);
}

function templateFor(record: CatalogRecord) {
  return bambuFilamentMaterials.find((material) => material.type === record.materialType)
    || bambuFilamentMaterials[0];
}

export function getCatalogRecord(id: string, records: CatalogRecord[] = CATALOG_RECORDS) {
  return records.find((record) => record.id === id);
}

export function getCatalogRecords(ids: string[]) {
  return ids
    .map((id) => getCatalogRecord(id))
    .filter((record): record is CatalogRecord => Boolean(record));
}

export function getCatalogBrands() {
  const brands = new Map<string, { brand: string; brandZh: string; count: number }>();
  for (const record of CATALOG_RECORDS) {
    const current = brands.get(record.brand);
    brands.set(record.brand, { brand: record.brand, brandZh: record.brandZh, count: (current?.count || 0) + 1 });
  }
  return [...brands.values()].sort((first, second) => first.brand.localeCompare(second.brand));
}

export function getCatalogMaterials() {
  const materials = new Map<string, { materialType: string; materialTypeZh: string; count: number }>();
  for (const record of CATALOG_RECORDS) {
    const current = materials.get(record.materialType);
    materials.set(record.materialType, { materialType: record.materialType, materialTypeZh: record.materialTypeZh, count: (current?.count || 0) + 1 });
  }
  return [...materials.values()].sort((first, second) => first.materialType.localeCompare(second.materialType));
}

export function getCatalogColorFamilies() {
  const families = new Map<ColorFamily, number>();
  for (const record of CATALOG_RECORDS) {
    if (!record.color.hasDigitalSwatch) continue;
    families.set(record.color.colorFamily, (families.get(record.color.colorFamily) || 0) + 1);
  }
  return [...families.entries()].map(([family, count]) => ({ family, count })).sort((first, second) => first.family.localeCompare(second.family));
}

export function getCompareValue(record: CatalogRecord, key: string) {
  if (!hasPresetParameters(record) && pendingParameterKeys.has(key)) {
    return "Not in mock catalog";
  }

  const material = templateFor(record);
  switch (key) {
    case "brand": return record.brand;
    case "series": return record.productLine;
    case "materialType": return record.materialType;
    case "category": return record.variant;
    case "nozzleTemperature": return `${firstValue(material.template, "nozzle_temperature_initial_layer")} / ${firstValue(material.template, "nozzle_temperature")} °C`;
    case "bedTemperature": return `Textured PEI ${firstValue(material.template, "textured_plate_temp_initial_layer")} / ${firstValue(material.template, "textured_plate_temp")} °C`;
    case "maxVolumetricSpeed": return `${firstValue(material.template, "filament_max_volumetric_speed")} mm³/s`;
    case "flowRatio": return firstValue(material.template, "filament_flow_ratio");
    case "density": return `${firstValue(material.template, "filament_density")} g/cm³`;
    case "referencePrice": return firstValue(material.template, "filament_cost") === "Not in mock catalog" ? "Not in mock catalog" : `$${firstValue(material.template, "filament_cost")}`;
    case "amsCompatibility": return record.spool.amsFit === "yes" ? "Compatible" : record.spool.amsFit === "conditional" ? "Conditional" : "Not compatible";
    case "dryingRecommended": return material.drying;
    case "enclosureRecommended": return material.enclosureRecommendation;
    case "hardenedNozzleRequired": return material.hardenedNozzleRecommendation;
    case "printability": return `${Math.round(record.rating)} / 5`;
    case "strength": return record.materialType.includes("CF") || record.materialType === "ASA" ? "High" : "Medium";
    case "toughness": return record.materialType === "PETG" || record.materialType === "TPU" ? "High" : "Medium";
    case "heatResistance": return record.materialType === "ASA" || record.materialType.includes("PA") ? "High" : "Medium";
    case "surfaceFinish": return `${record.color.finish} / ${record.color.transparency}`;
    case "verificationLevel": return hasPresetParameters(record) ? (record.color.digitalSwatch?.sourceType === "manufacturer" ? "Digital swatch from manufacturer mock" : "Uploader mock, unverified") : "Parameters pending";
    case "evidenceCount": return hasPresetParameters(record) ? String((record.color.hasDigitalSwatch ? 1 : 0) + record.color.physicalSwatchCount) : "0";
    case "score": return `${Math.round(record.rating * 20)} / 100`;
    case "supportedPrinterPresets": return bambuPrinterTemplates.map((printer) => printer.name).join(", ");
    default: return "Not in mock catalog";
  }
}

export function filterCatalogRecords({
  selectedMaterial,
  selectedVariant,
  selectedBrand,
  selectedColorFamily,
  minRating,
  selectedFinish,
  hasPhysicalSwatch,
  hasVerifiedPreset,
  selectedPerformanceTags,
  searchHex,
}: {
  selectedMaterial: string | null;
  selectedVariant: string | null;
  selectedBrand: string | null;
  selectedColorFamily: ColorFamily | null;
  minRating: number;
  selectedFinish: Finish | null;
  hasPhysicalSwatch: boolean;
  hasVerifiedPreset: boolean;
  selectedPerformanceTags: PerformanceTag[];
  searchHex: string | null;
}, sourceRecords: CatalogRecord[] = CATALOG_RECORDS) {
  let records = [...sourceRecords];

  if (selectedMaterial) {
    records = records.filter((record) => record.materialType === selectedMaterial);
  }
  if (selectedVariant) {
    records = records.filter((record) => record.variant === selectedVariant);
  }
  if (selectedBrand) {
    records = records.filter((record) => record.brand === selectedBrand);
  }
  if (selectedColorFamily) {
    records = records.filter((record) => record.color.hasDigitalSwatch && record.color.colorFamily === selectedColorFamily);
  }
  if (minRating > 0) {
    records = records.filter((record) => record.rating >= minRating);
  }
  if (selectedFinish) {
    records = records.filter((record) => record.color.finish === selectedFinish);
  }
  if (hasPhysicalSwatch) {
    records = records.filter((record) => record.color.hasPhysicalSwatch);
  }
  if (hasVerifiedPreset) {
    records = records.filter((record) => record.color.digitalSwatch?.sourceType === "manufacturer");
  }
  if (selectedPerformanceTags.length > 0) {
    records = records.filter((record) =>
      selectedPerformanceTags.every((tagId) => {
        const tag = PERFORMANCE_TAGS.find((t) => t.id === tagId);
        return tag ? tag.test(record) : true;
      }),
    );
  }
  if (searchHex) {
    records = records
      .filter((record) => record.color.hasDigitalSwatch && record.color.hex)
      .sort((first, second) =>
        approximateColorDistance(searchHex, first.color.hex || "") - approximateColorDistance(searchHex, second.color.hex || ""),
      );
  }
  return records;
}

export function resolveCatalogColorInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return { family: null, hex: null };
  const cleanHex = trimmed.replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(cleanHex)) {
    return { family: null, hex: `#${cleanHex.toUpperCase()}` };
  }
  const rgbParts = trimmed.match(/\d+/g);
  if (rgbParts && rgbParts.length >= 3) {
    const [r, g, b] = rgbParts.slice(0, 3).map((part) => Math.max(0, Math.min(255, Number(part))));
    return { family: null, hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase() };
  }
  return { family: resolveColorFamily(trimmed) as ColorFamily | null, hex: null };
}
