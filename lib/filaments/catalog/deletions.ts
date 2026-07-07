import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAdminSession } from "@/lib/admin/session";
import { readCatalogDeletions } from "./catalog-deletions-reader";

const DELETIONS_PATH = path.join(
  process.cwd(),
  "data/filaments/catalog-deletions.json",
);

function now(): string {
  return new Date().toISOString();
}

/** Admin-only: mark a product line as deleted in the persistent deletion store. */
export async function deleteProductLine(
  productLineId: string,
  brand: string,
  productLine: string,
  sourceType: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await readAdminSession();
  if (!session || session.role !== "admin") {
    return { ok: false, message: "forbidden" };
  }

  const deletions = await readCatalogDeletions();
  if (
    deletions.some(
      (deletion) =>
        deletion.productLineId === productLineId &&
        deletion.originalSourceType === sourceType,
    )
  ) {
    return { ok: true, message: "already_deleted" };
  }

  deletions.push({
    productLineId,
    deletedAt: now(),
    deletedBy: session.actorId || "admin",
    deleteReason: "manual_catalog_removal",
    originalSourceType: sourceType,
    originalBrand: brand,
    originalProductLine: productLine,
  });

  await mkdir(path.dirname(DELETIONS_PATH), { recursive: true });
  await writeFile(DELETIONS_PATH, JSON.stringify(deletions, null, 2) + "\n", "utf8");
  return { ok: true, message: "deleted" };
}

/** Admin-only: batch-delete product lines. */
export async function deleteProductLinesBatch(
  items: Array<{ productLineId: string; brand: string; productLine: string; sourceType: string }>,
): Promise<{ deletedCount: number; message: string }> {
  const session = await readAdminSession();
  if (!session || session.role !== "admin") {
    return { deletedCount: 0, message: "forbidden" };
  }

  const deletions = await readCatalogDeletions();
  const existing = new Set(
    deletions.map(
      (deletion) =>
        `${deletion.productLineId}:${deletion.originalSourceType}`,
    ),
  );
  let added = 0;

  for (const item of items) {
    const deletionKey = `${item.productLineId}:${item.sourceType}`;
    if (existing.has(deletionKey)) continue;
    deletions.push({
      productLineId: item.productLineId,
      deletedAt: now(),
      deletedBy: session.actorId || "admin",
      deleteReason: "manual_catalog_removal",
      originalSourceType: item.sourceType,
      originalBrand: item.brand,
      originalProductLine: item.productLine,
    });
    existing.add(deletionKey);
    added++;
  }

  await mkdir(path.dirname(DELETIONS_PATH), { recursive: true });
  await writeFile(DELETIONS_PATH, JSON.stringify(deletions, null, 2) + "\n", "utf8");
  return { deletedCount: added, message: `已从目录移除 ${added} 条产品线。` };
}

/** Admin-only: restore a previously deleted product line. */
export async function restoreProductLine(productLineId: string): Promise<{ ok: boolean }> {
  const session = await readAdminSession();
  if (!session || session.role !== "admin") {
    return { ok: false };
  }

  const deletions = await readCatalogDeletions();
  const filtered = deletions.filter((d) => d.productLineId !== productLineId);
  if (filtered.length === deletions.length) return { ok: true };

  await mkdir(path.dirname(DELETIONS_PATH), { recursive: true });
  await writeFile(DELETIONS_PATH, JSON.stringify(filtered, null, 2) + "\n", "utf8");
  return { ok: true };
}
