import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DELETIONS_PATH = path.join(
  process.cwd(),
  "data/filaments/catalog-deletions.json",
);

export type CatalogDeletion = {
  productLineId: string;
  deletedAt: string;
  deletedBy: string;
  deleteReason: string;
  originalSourceType: string;
  originalBrand: string;
  originalProductLine: string;
};

/** Server-only: read deletion marks from disk. No auth, no session, no next/headers. */
export async function readCatalogDeletions(): Promise<CatalogDeletion[]> {
  try {
    const raw = await readFile(DELETIONS_PATH, "utf8");
    const parsed = JSON.parse(raw) as CatalogDeletion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Server-only: get set of deleted productLineIds for filtering. */
export async function getDeletedProductLineIds(): Promise<Set<string>> {
  const deletions = await readCatalogDeletions();
  return new Set(deletions.map((d) => d.productLineId));
}
