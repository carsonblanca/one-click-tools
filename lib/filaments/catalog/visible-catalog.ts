import "server-only";

import {
  STATIC_CATALOG_RECORDS,
  buildPublishedCatalogRecords,
  type CatalogRecord,
} from "./mock-catalog-ext";
import { readCatalogDeletions } from "./catalog-deletions-reader";
import {
  canonicalBrandName,
  canonicalProductLineId,
} from "./catalog-identifiers";
import { readPublishedFilamentCatalog } from "@/lib/filaments/publishing/published-catalog";

export async function getVisibleCatalog(): Promise<CatalogRecord[]> {
  const [deletions, published] = await Promise.all([
    readCatalogDeletions(),
    readPublishedFilamentCatalog(),
  ]);
  const normalizeRecord = (
    record: CatalogRecord,
    catalogSource: "static" | "published",
  ): CatalogRecord => ({
    ...record,
    brand: canonicalBrandName(record.brand),
    productLineId:
      record.productLineId ||
      canonicalProductLineId(record.brand, record.productLine),
    catalogSource,
  });
  const staticRecords = STATIC_CATALOG_RECORDS.map((record) =>
    normalizeRecord(record, "static"),
  );
  const publishedRecords = buildPublishedCatalogRecords(
    published as unknown as Array<Record<string, unknown>>,
  ).map((record) => normalizeRecord(record, "published"));
  const publishedProductLineIds = new Set(
    publishedRecords.map((record) => record.productLineId).filter(Boolean),
  );
  const merged = [
    ...staticRecords.filter(
      (record) => !publishedProductLineIds.has(record.productLineId),
    ),
    ...publishedRecords,
  ];
  return merged.filter((record) => {
    const matchingDeletions = deletions.filter(
      (deletion) => deletion.productLineId === record.productLineId,
    );
    if (matchingDeletions.length === 0) return true;
    if (record.catalogSource === "published") {
      return !matchingDeletions.some(
        (deletion) =>
          !deletion.originalSourceType ||
          deletion.originalSourceType === "published",
      );
    }
    return false;
  });
}
