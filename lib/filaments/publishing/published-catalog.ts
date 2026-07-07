import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AdminFilamentDraft, PublicationLevel } from "@/lib/filaments/drafts/admin-drafts";
import { canShowPresetDownload } from "@/lib/filaments/drafts/admin-drafts";
import {
  canonicalBrandName,
  canonicalProductLineId,
} from "@/lib/filaments/catalog/catalog-identifiers";

export type PublishedFilamentRecord = {
  sourceRunId: string;
  productLineId: string;
  publicationStatus: PublicationLevel;
  productLine: AdminFilamentDraft["productLine"];
  brand: AdminFilamentDraft["brand"];
  colors: AdminFilamentDraft["colors"];
  parameters: AdminFilamentDraft["parameters"];
  parameterStatus: string;
  sourceZipName: string;
  sourceEvidencePath: string;
  publishedAt: string;
  publishedBy: string;
  canShowPresetDownload: boolean;
};

const PUBLISHED_PATH = "data/filaments/published-filament-catalog.json";

function publishedPath() {
  return path.join(process.cwd(), PUBLISHED_PATH);
}

export async function readPublishedFilamentCatalog(): Promise<PublishedFilamentRecord[]> {
  try {
    const raw = await readFile(publishedPath(), "utf8");
    const parsed = JSON.parse(raw) as PublishedFilamentRecord[];
    if (!Array.isArray(parsed)) {
      throw new Error("published catalog must be an array");
    }
    return parsed.filter((record) => record.publicationStatus === "directory_preview" || record.publicationStatus === "complete_profile");
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writePublishedFilamentCatalog(records: PublishedFilamentRecord[]) {
  const file = publishedPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(records, null, 2) + "\n", "utf8");
}

export async function upsertPublishedFilamentRecord(draft: AdminFilamentDraft, level: PublicationLevel) {
  const records = await readPublishedFilamentCatalog();
  const brandName = canonicalBrandName(draft.brand.name);
  const productLineId = canonicalProductLineId(brandName, draft.productLine.name);
  const nextRecord: PublishedFilamentRecord = {
    sourceRunId: draft.sourceRunId,
    productLineId,
    publicationStatus: level,
    productLine: draft.productLine,
    brand: {
      ...draft.brand,
      name: brandName,
      nameZh: draft.brand.nameZh || brandName,
    },
    colors: draft.colors,
    parameters: draft.parameters,
    parameterStatus: draft.parameterStatus,
    sourceZipName: draft.sourceZipName,
    sourceEvidencePath: draft.sourceEvidencePath,
    publishedAt: draft.publishedAt,
    publishedBy: draft.publishedBy,
    canShowPresetDownload: canShowPresetDownload(draft),
  };
  const index = records.findIndex((record) =>
    record.sourceRunId === draft.sourceRunId || record.productLineId === productLineId
  );
  const next = [...records];
  if (index >= 0) {
    next[index] = nextRecord;
  } else {
    next.push(nextRecord);
  }
  await writePublishedFilamentCatalog(next);
  return nextRecord;
}

export async function removePublishedFilamentRecord(sourceRunId: string) {
  const records = await readPublishedFilamentCatalog();
  const next = records.filter((record) => record.sourceRunId !== sourceRunId);
  await writePublishedFilamentCatalog(next);
  return records.length - next.length;
}
