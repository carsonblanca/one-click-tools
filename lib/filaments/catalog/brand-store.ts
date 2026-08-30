import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";
import { BRAND_CATALOG, type BrandEntry } from "./brand-catalog";
import { resolveImportedProductLineName } from "./product-line-name";

type StoredBrand = {
  brand_id: string;
  slug: string;
  name: string;
  name_zh: string;
  name_en: string;
  name_zh_tw: string | null;
  aliases: string[];
  logo_url: string | null;
  website_url: string | null;
  origin: string | null;
  contact_info: string | null;
  official_store_url: string | null;
  official_store_name: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: "active" | "inactive" | "archived";
  sort_order: number;
};

function toBrandEntry(row: StoredBrand): BrandEntry {
  return {
    id: row.brand_id,
    name: row.name,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    slug: row.slug,
    nameZhTw: row.name_zh_tw || undefined,
    aliases: row.aliases || [],
    popularityRank: row.sort_order,
    filamentCount: 0,
    verificationStatus: "verified",
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    origin: row.origin,
    contactInfo: row.contact_info,
    officialStoreUrl: row.official_store_url,
    officialStoreName: row.official_store_name,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status,
    sortOrder: row.sort_order,
  };
}

export async function listBrandEntries(): Promise<BrandEntry[]> {
  const fallback = BRAND_CATALOG.map((brand) => ({ ...brand }));
  try {
    const { data, error } = await getServerSupabaseClient()
      .from("filament_brands")
      .select("brand_id,slug,name,name_zh,name_en,name_zh_tw,aliases,logo_url,website_url,origin,contact_info,official_store_url,official_store_name,description,seo_title,seo_description,status,sort_order")
      .order("sort_order", { ascending: true });
    if (error || !data) return fallback;

    const overrides = new Map((data as StoredBrand[]).map((row) => [row.brand_id, toBrandEntry(row)]));
    const merged = fallback.map((brand) => ({ ...brand, ...(overrides.get(brand.id) || {}) }));
    for (const brand of overrides.values()) {
      if (!fallback.some((item) => item.id === brand.id)) merged.push(brand);
    }
    return merged.filter((brand) => brand.status !== "archived");
  } catch {
    return fallback;
  }
}

export async function getBrandEntry(brandId: string) {
  const brands = await listBrandEntries();
  return brands.find((brand) => brand.id === brandId) || null;
}

type DraftData = Record<string, unknown>;

function objectValue(value: unknown): DraftData {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DraftData : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function resolveOfficialChineseName(row: { product_line_name: string | null; material_type: string | null; draft_data: unknown }): string {
  const data = objectValue(row.draft_data);
  const productLine = objectValue(data.productLine);
  return [
    productLine.nameZh,
    productLine.nameZhCN,
    productLine.productLineNameZhCN,
    productLine.productLineNameZh,
    data.productLineNameZhCN,
    data.productLineNameZh,
    data.productLineLabelZh,
  ].map(text).find(Boolean) || "";
}

export type BrandFilamentDirectoryItem = {
  sourceRunId: string;
  materialType: string;
  nameZh: string;
  nameEn: string;
};

export async function listBrandFilamentDirectory(brandId: string): Promise<BrandFilamentDirectoryItem[]> {
  try {
    const { data, error } = await getServerSupabaseClient()
      .from("filament_drafts")
      .select("source_run_id,product_line_name,material_type,draft_data")
      .eq("brand_id", brandId)
      .eq("publication_status", "published")
      .order("product_line_name", { ascending: true });
    if (error || !data) return [];

    return data.map((row) => {
      const nameZh = resolveOfficialChineseName(row);
      const nameEn = resolveImportedProductLineName({
        rowName: row.product_line_name,
        materialType: row.material_type,
        draftData: row.draft_data,
      }) || row.material_type || "未命名耗材";
      return {
        sourceRunId: row.source_run_id,
        materialType: row.material_type || "",
        nameZh,
        nameEn,
      };
    });
  } catch {
    return [];
  }
}

export async function saveBrandEntry(input: {
  brandId: string;
  slug: string;
  name: string;
  nameZh: string;
  nameEn: string;
  nameZhTw?: string;
  aliases?: string[];
  logoUrl?: string;
  websiteUrl?: string;
  origin?: string;
  contactInfo?: string;
  officialStoreUrl?: string;
  officialStoreName?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  status: "active" | "inactive" | "archived";
  sortOrder: number;
}) {
  const { data, error } = await getServerSupabaseClient()
    .from("filament_brands")
    .upsert({
      brand_id: input.brandId,
      slug: input.slug,
      name: input.name,
      name_zh: input.nameZh,
      name_en: input.nameEn,
      name_zh_tw: input.nameZhTw || null,
      aliases: input.aliases || [],
      logo_url: input.logoUrl || null,
      website_url: input.websiteUrl || null,
      origin: input.origin || null,
      contact_info: input.contactInfo || null,
      official_store_url: input.officialStoreUrl || null,
      official_store_name: input.officialStoreName || null,
      description: input.description || null,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      status: input.status,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    }, { onConflict: "brand_id" })
    .select("brand_id,slug,name,name_zh,name_en,name_zh_tw,aliases,logo_url,website_url,origin,contact_info,official_store_url,official_store_name,description,seo_title,seo_description,status,sort_order")
    .single();
  if (error || !data) throw new Error(`brand_save_failed:${error?.code || "unknown"}`);
  return toBrandEntry(data as StoredBrand);
}
