import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { CATALOG_RECORDS, type CatalogRecord } from "./mock-catalog-ext";
import { listPublishedFilamentDrafts } from "@/lib/filaments/imports/supabase-import-repository";
import {
  mapPublishedDraftToCatalogRecord,
  mergePublishedWithStatic,
} from "@/lib/filaments/publishing/minimal-publish";

export async function getVisibleCatalogRecords(): Promise<CatalogRecord[]> {
  noStore();
  let publishedRows: Awaited<ReturnType<typeof listPublishedFilamentDrafts>> = [];
  try {
    publishedRows = await listPublishedFilamentDrafts();
  } catch {
    // A transient catalog read failure must not hide the static catalog.
  }
  const published = publishedRows.flatMap((row) => {
    const record = mapPublishedDraftToCatalogRecord(row);
    const colors = Array.isArray(record.published?.colors) ? record.published.colors : [];
    if (!colors.length) return [record];
    return colors.map((entry, index) => {
      const color = entry && typeof entry === "object" && "color" in entry ? (entry as { color: CatalogRecord["color"] }).color : record.color;
      const code = entry && typeof entry === "object" && "officialColorCode" in entry
        ? String((entry as { officialColorCode?: unknown }).officialColorCode || index + 1)
        : String(index + 1);
      return { ...record, id: `${record.productLineId}?color=${encodeURIComponent(code)}`, color };
    });
  });
  return mergePublishedWithStatic(published, CATALOG_RECORDS);
}

export async function getVisibleCatalogRecord(id: string) {
  const records = await getVisibleCatalogRecords();
  return records.find((record) => record.id === id || record.productLineId === id || record.id.startsWith(`${id}?color=`)) || null;
}

export async function getVisibleCatalogRecordsByBrand(brand: string) {
  const records = await getVisibleCatalogRecords();
  return records.filter((record) => record.brand.toLowerCase() === brand.toLowerCase());
}
