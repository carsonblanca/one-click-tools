import type { CatalogRecord } from "./mock-catalog-ext";

function normalizeIdentityPart(value: string): string {
  return value.trim().toLowerCase().replace(/[™®]/g, "").replace(/\s+/g, " ");
}

/** Stable product-level identity; colors/SKUs are deliberately excluded. */
export function canonicalProductKey(record: CatalogRecord): string {
  return [
    normalizeIdentityPart(record.brand),
    normalizeIdentityPart(record.productLine),
    normalizeIdentityPart(record.materialType),
    normalizeIdentityPart(record.variant || ""),
  ].join("|");
}

export function uniqueCanonicalProducts(records: CatalogRecord[]): CatalogRecord[] {
  const byKey = new Map<string, CatalogRecord>();
  for (const record of records) {
    const key = canonicalProductKey(record);
    if (!byKey.has(key)) byKey.set(key, record);
  }
  return [...byKey.values()];
}

export function countCanonicalProducts(
  records: CatalogRecord[],
  predicate: (record: CatalogRecord) => boolean,
): number {
  return uniqueCanonicalProducts(records.filter(predicate)).length;
}
