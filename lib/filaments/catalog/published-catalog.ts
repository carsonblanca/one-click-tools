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
  const publishedRows = await listPublishedFilamentDrafts();
  const published = publishedRows.map(mapPublishedDraftToCatalogRecord);
  return mergePublishedWithStatic(published, CATALOG_RECORDS);
}

export async function getVisibleCatalogRecord(id: string) {
  const records = await getVisibleCatalogRecords();
  return records.find((record) => record.id === id) || null;
}

export async function getVisibleCatalogRecordsByBrand(brand: string) {
  const records = await getVisibleCatalogRecords();
  return records.filter((record) => record.brand.toLowerCase() === brand.toLowerCase());
}
