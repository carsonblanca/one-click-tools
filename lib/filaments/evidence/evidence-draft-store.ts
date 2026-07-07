import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data/filaments/evidence-drafts");
const STORE = path.join(ROOT, "evidence-drafts.json");
const ASSETS = path.join(ROOT, "assets");

export type EvidenceTargetBinding = {
  brandId: string;
  brandLabel: string;
  productLineId: string;
  productLineLabel: string;
  filamentId: string;
  materialType: string;
  evidenceType: string;
  evidenceTypeLabel: string;
  selectedBy: string;
  selectedAt: string;
};

export type FilamentEvidenceDraft = {
  id: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  targetBinding: EvidenceTargetBinding;
  sourceType: string;
  sourceOrigin: string;
  sourceImageName: string;
  sourceImageAssetId: string;
  sourceImageHash: string;
  titleCropAssetId: string;
  cardAssetIds: string[];
  createdAt: string;
  createdBy: string;
  titleEvidence: Record<string, unknown>;
  annotations: Array<Record<string, unknown>>;
  cardCount: number;
  reviewStatus: "pending_review" | "approved" | "rejected";
  reviewedAt: string;
  reviewedBy: string;
  reviewNotes: string;
};

export type EvidenceColorCard = Record<string, unknown> & {
  row: number;
  column: number;
  chineseName?: string;
  englishName?: string;
  officialColorCode?: string;
  allowSync?: boolean;
  notes?: string;
  matchedColorId?: string;
  syncStatus?: "not_synced" | "synced_to_filament";
};

async function readStore() {
  try {
    const value = JSON.parse(await readFile(STORE, "utf8")) as unknown;
    return Array.isArray(value) ? (value as FilamentEvidenceDraft[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeStore(records: FilamentEvidenceDraft[]) {
  await mkdir(ROOT, { recursive: true });
  const temporary = `${STORE}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, STORE);
}

export async function listFilamentEvidenceDrafts() {
  return readStore();
}

export async function getFilamentEvidenceDraft(id: string) {
  return (await readStore()).find((draft) => draft.id === id) || null;
}

export async function updateFilamentEvidenceDraft(
  id: string,
  changes: {
    titleEvidence?: Record<string, unknown>;
    annotations?: EvidenceColorCard[];
  },
) {
  const records = await readStore();
  const index = records.findIndex((draft) => draft.id === id);
  if (index < 0) return null;
  records[index] = {
    ...records[index],
    ...(changes.titleEvidence ? { titleEvidence: changes.titleEvidence } : {}),
    ...(changes.annotations ? { annotations: changes.annotations } : {}),
  };
  await writeStore(records);
  return records[index];
}

export async function deleteFilamentEvidenceDraft(id: string) {
  const records = await readStore();
  const existing = records.find((draft) => draft.id === id);
  if (!existing) return null;
  await writeStore(records.filter((draft) => draft.id !== id));
  await rm(path.join(ASSETS, id), { recursive: true, force: true });
  return existing;
}

export async function findDuplicateEvidenceDraft(input: {
  brandId: string;
  productLineId: string;
  filamentId: string;
  sourceImageHash: string;
}) {
  return (await readStore()).find((draft) =>
    draft.sourceImageHash === input.sourceImageHash
    && draft.targetBinding.brandId === input.brandId
    && draft.targetBinding.productLineId === input.productLineId
    && draft.targetBinding.filamentId === input.filamentId
  ) || null;
}

export function resolveEvidenceDraftAsset(assetId: string) {
  const normalized = assetId.replace(/\\/g, "/");
  if (!/^assets\/evidence-[A-Za-z0-9-]+\/(?:source\.(?:png|jpg|webp)|title-crop\.png|cards\/card-r\d{2}-c\d{2}\.png)$/.test(normalized)) {
    throw new Error("invalid_asset_id");
  }
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(`${path.resolve(ASSETS)}${path.sep}`)) {
    throw new Error("invalid_asset_id");
  }
  return absolute;
}

export async function createFilamentEvidenceDraft(input: {
  targetBinding: EvidenceTargetBinding;
  sourceType: string;
  sourceOrigin: string;
  sourceImageName: string;
  sourceImage: Buffer;
  sourceImageExtension: string;
  titleCrop?: Buffer;
  cardAssets: Array<{ row: number; column: number; bytes: Buffer }>;
  titleEvidence: Record<string, unknown>;
  annotations: Array<Record<string, unknown>>;
  cardCount: number;
  actorId: string;
}) {
  const id = `evidence-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const assetDir = path.join(ASSETS, id);
  await mkdir(assetDir, { recursive: true });
  const sourceImageAssetId = `assets/${id}/source.${input.sourceImageExtension}`;
  await writeFile(path.join(ROOT, sourceImageAssetId), input.sourceImage);
  const sourceImageHash = createHash("sha256").update(input.sourceImage).digest("hex");
  let titleCropAssetId = "";
  if (input.titleCrop?.length) {
    titleCropAssetId = `assets/${id}/title-crop.png`;
    await writeFile(path.join(ROOT, titleCropAssetId), input.titleCrop);
  }
  const cardAssetIds: string[] = [];
  if (input.cardAssets.length) {
    await mkdir(path.join(assetDir, "cards"), { recursive: true });
    for (const card of input.cardAssets) {
      const assetId = `assets/${id}/cards/card-r${String(card.row).padStart(2, "0")}-c${String(card.column).padStart(2, "0")}.png`;
      await writeFile(path.join(ROOT, assetId), card.bytes);
      cardAssetIds.push(assetId);
    }
  }
  const createdAt = new Date().toISOString();
  const draft: FilamentEvidenceDraft = {
    id,
    status: "pending_review",
    targetBinding: input.targetBinding,
    sourceType: input.sourceType,
    sourceOrigin: input.sourceOrigin,
    sourceImageName: input.sourceImageName,
    sourceImageAssetId,
    sourceImageHash,
    titleCropAssetId,
    cardAssetIds,
    createdAt,
    createdBy: input.actorId,
    titleEvidence: input.titleEvidence,
    annotations: input.annotations,
    cardCount: input.cardCount,
    reviewStatus: "pending_review",
    reviewedAt: "",
    reviewedBy: "",
    reviewNotes: "",
  };
  const records = await readStore();
  records.push(draft);
  await writeStore(records);
  return draft;
}
