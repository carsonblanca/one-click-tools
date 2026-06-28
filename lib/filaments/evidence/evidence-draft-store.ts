import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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

export function resolveEvidenceDraftAsset(assetId: string) {
  const normalized = assetId.replace(/\\/g, "/");
  if (!/^assets\/evidence-[A-Za-z0-9-]+\/source\.(png|jpg|webp)$/.test(normalized)) {
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
  const createdAt = new Date().toISOString();
  const draft: FilamentEvidenceDraft = {
    id,
    status: "pending_review",
    targetBinding: input.targetBinding,
    sourceType: input.sourceType,
    sourceOrigin: input.sourceOrigin,
    sourceImageName: input.sourceImageName,
    sourceImageAssetId,
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
