import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";
import { inferIndustryColorNameEn } from "@/lib/filaments/catalog/color-name-inference";
import { resolveImportedProductLineName } from "@/lib/filaments/catalog/product-line-name";
import type { CatalogRecord } from "./mock-catalog-ext";
import type { CatalogColor, ColorFamily } from "./mock-colors";

export type PublicKexcelledAbsProduct = {
  sourceRunId: string;
  productLine: string;
  variant: string;
  materialType: string;
  parameters: Record<string, unknown>;
  parameterEntries: Array<{ key: string; value: string }>;
  defaultColor: string | null;
  colors: Array<{ name: string; code: string; sku: string; hex: string | null; imageUrl: string | null; imageObjectKey: string | null; physicalSwatchUrl: string | null; physicalSwatchStatus: string }>;
  images: string[];
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parameterValue(value: Record<string, unknown>) {
  return text(value.normalizedDisplayValue) || text(value.normalizedValue) || text(value.rawValue) || text(value.value);
}

function firstColor(data: Record<string, unknown>) {
  const colors = Array.isArray(data.canonicalColors) ? data.canonicalColors : Array.isArray(data.colors) ? data.colors : [];
  for (const value of colors) {
    const color = objectValue(value);
    const hex = text(color.hexColor || color.hex || color.colorHex);
    if (hex) return hex.startsWith("#") ? hex : `#${hex}`;
  }
  return null;
}

function mapProduct(row: Record<string, unknown>): PublicKexcelledAbsProduct {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  const rawColors = Array.isArray(data.canonicalColors) ? data.canonicalColors : Array.isArray(data.colors) ? data.colors : [];
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const parameterBlock = objectValue(data.parameters);
  const rawCandidates = Array.isArray(parameterBlock.candidates) ? parameterBlock.candidates : [];
  const parameterFields = objectValue(parameterBlock.fields);
  const parameterEntries = Object.entries(parameterFields).map(([key, value]) => ({ key, value: text(value) }));
  for (const value of rawCandidates) {
    const candidate = objectValue(value);
    const key = text(candidate.canonicalKey) || text(candidate.key);
    const candidateValue = parameterValue(candidate);
    if (key && candidateValue && !parameterEntries.some((entry) => entry.key === key)) {
      parameterEntries.push({ key, value: candidateValue });
    }
  }
  return {
    sourceRunId: text(row.source_run_id),
    productLine: resolveImportedProductLineName({ rowName: row.product_line_name, materialType: row.material_type || productLine.materialType, draftData: data }),
    variant: text(row.variant) || text(productLine.variant),
    materialType: text(row.material_type) || text(productLine.materialType) || "ABS",
    parameters: Object.fromEntries(parameterEntries.map((entry) => [entry.key, entry.value])),
    parameterEntries,
    defaultColor: firstColor(data),
    colors: rawColors.map((value) => {
      const color = objectValue(value);
      const variants = Array.isArray(color.colorVariants) ? color.colorVariants : Array.isArray(color.skuVariants) ? color.skuVariants : [];
      const firstVariant = objectValue(variants[0]);
      return {
        name: text(color.nameZh || color.displayNameZh || color.nameEn),
        code: text(color.officialColorCode || color.colorCode),
        sku: text(color.rawSkuText || firstVariant.rawSkuText),
        hex: text(color.hexColor || color.hex || color.colorHex) || null,
        imageUrl: text(color.publicUrl || color.imageUrl || color.localImagePath) || null,
        imageObjectKey: text(color.imageObjectKey || color.r2ObjectKey || color.localImagePath || color.imagePackagePath || firstVariant.imagePackagePath) || null,
        physicalSwatchUrl: text(color.physicalSwatchUrl || color.physicalColorCardUrl) || null,
        physicalSwatchStatus: text(color.physicalSwatchStatus || color.physicalColorCardStatus),
      };
    }),
    images: rawImages.map((value) => {
      const image = objectValue(value);
      return text(image.publicUrl || image.url || image.imageUrl || image.localImagePath);
    }).filter(Boolean),
  };
}

function colorFamily(hex: string | null): ColorFamily {
  if (!hex) return "gray";
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "gray";
  if (Math.max(r, g, b) - Math.min(r, g, b) < 20) {
    if (r < 40) return "black";
    if (r > 220) return "white";
    return "gray";
  }
  if (r >= g && r >= b) return g > b ? "orange" : "red";
  if (g >= r && g >= b) return b > r ? "cyan" : "green";
  return "blue";
}

function publicColor(color: PublicKexcelledAbsProduct["colors"][number]): CatalogColor {
  const hex = color.hex;
  const clean = hex?.replace("#", "") || "";
  const rgb = clean.length === 6 ? {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  } : null;
  return {
    colorNameZh: color.name || color.code || "颜色信息待补充",
    colorNameEn: inferIndustryColorNameEn(color.name, color.code) || color.code || "Color pending",
    colorFamily: colorFamily(hex),
    hex,
    rgb,
    finish: "semi-glossy",
    transparency: "opaque",
    hasDigitalSwatch: Boolean(hex || color.code),
    hasPhysicalSwatch: Boolean(color.physicalSwatchUrl && color.physicalSwatchStatus === "approved"),
    physicalSwatchCount: color.physicalSwatchUrl && color.physicalSwatchStatus === "approved" ? 1 : 0,
    digitalSwatch: hex || color.code ? {
      hex,
      rgb,
      officialColorCode: color.code,
      sourceType: "manufacturer",
      lastVerifiedAt: null,
    } : null,
    physicalSwatches: color.physicalSwatchUrl && color.physicalSwatchStatus === "approved" ? [{
      imageCount: 1,
      uploaderPublicId: "production",
      reviewStatus: "approved",
      lightSource: "unknown",
      usedGrayCard: false,
      declaredPostProcessed: false,
      }] : [],
  };
}

export function toPublicCatalogRecords(products: PublicKexcelledAbsProduct[]): CatalogRecord[] {
  return products.flatMap((product) => product.colors.map((color, index) => {
    const imageQuery = product.sourceRunId
      ? `sourceRunId=${encodeURIComponent(product.sourceRunId)}${color.imageObjectKey ? `&assetKey=${encodeURIComponent(color.imageObjectKey)}` : ""}`
      : "";
    const spoolImage = imageQuery ? `/api/filaments/product-image?${imageQuery}` : null;
    return {
      id: `${product.sourceRunId}-${color.code || index}`,
      brand: "Kexcelled",
      brandZh: "Kexcelled",
      materialType: product.materialType,
      materialTypeZh: product.materialType,
      variant: product.variant || "Standard",
      variantZh: product.variant || "标准",
      productLine: product.productLine,
      productLineId: product.sourceRunId,
      parameterStatus: Object.keys(product.parameters).length > 0 ? "complete" : "missing",
      color: publicColor(color),
      spool: {
        netFilamentWeight: 1000,
        netWeightMode: "multiple",
        netWeightOptionsG: [500, 1000, 3000, 5000],
        emptySpoolWeight: 220,
        fullSpoolWeight: 1220,
        spoolOuterDiameter: 200,
        spoolWidth: 66,
        hubDiameter: 55,
        spoolMaterial: "新旧料盘随机发货",
        refillable: false,
        cardboardSpool: false,
        amsFit: "conditional",
        adapterRequired: false,
        spoolImagePlaceholder: spoolImage,
      },
      rating: 0,
      reviewCount: 0,
      createdAt: "2026-08-22",
      presetParameters: product.parameters,
      parameterEntries: product.parameterEntries,
      presetDefaultColor: color.hex || product.defaultColor,
      imageSourceRunId: product.sourceRunId,
      imageObjectKey: color.imageObjectKey || undefined,
    };
  }));
}

async function listKexcelledAbsProducts(options: { includePendingDrafts: boolean }) {
  let query = getServerSupabaseClient()
    .from("filament_drafts")
    .select("source_run_id,product_line_name,material_type,variant,draft_data")
    .ilike("brand_id", "kexcelled")
    .eq("material_type", "ABS")
    .order("product_line_name", { ascending: true });

  query = options.includePendingDrafts
    ? query.in("status", ["draft", "pending_review"]).eq("publication_status", "draft")
    : query.eq("status", "published").eq("publication_status", "published");

  const { data, error } = await query;

  if (error) throw new Error("published_kexcelled_abs_read_failed");
  return ((data || []) as Array<Record<string, unknown>>).map(mapProduct);
}

export async function listPublishedKexcelledAbsProducts() {
  return listKexcelledAbsProducts({ includePendingDrafts: false });
}

/**
 * Local-only preview of pending Kexcelled ABS drafts.
 * This function must never be called by a production page.
 */
export async function listLocalPreviewKexcelledAbsProducts() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("local_preview_unavailable_in_production");
  }
  return listKexcelledAbsProducts({ includePendingDrafts: true });
}
