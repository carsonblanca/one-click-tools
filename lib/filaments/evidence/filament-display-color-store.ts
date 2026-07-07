import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveEvidenceDraftAsset } from "@/lib/filaments/evidence/evidence-draft-store";

const STORE = path.join(process.cwd(), "data/filaments/display-colors.json");
const ASSETS = path.join(process.cwd(), "data/filaments/display-color-assets");

export type FilamentDisplayColor = {
  id: string;
  filamentId: string;
  productLineId: string;
  evidenceId: string;
  colorCardId: string;
  chineseName: string;
  englishName: string;
  officialColorCode: string;
  colorImagePath: string;
  sourceImagePath: string;
  sourceCrop: Record<string, unknown> | null;
  logicalCardBounds: Record<string, unknown> | null;
  safeCropBounds: Record<string, unknown> | null;
  row: number;
  column: number;
  visualColumn: number | null;
  cropStatus: string;
  cropStrategy: string;
  sourceType: string;
  sourceOrigin: string;
  evidenceStatus: "draft" | "pending_review" | "confirmed" | "rejected";
  syncStatus: "not_synced" | "synced_to_filament" | "superseded" | "revoked";
  syncedAt: string;
  syncedBy: string;
  updatedAt: string;
  updatedBy: string;
  notes: string;
  hasManualCorrection: boolean;
  correctedAt: string;
  correctedBy: string;
  correctionFields: string[];
};

async function readStore() {
  try {
    const parsed = JSON.parse(await readFile(STORE, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed as FilamentDisplayColor[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeStore(records: FilamentDisplayColor[]) {
  await mkdir(path.dirname(STORE), { recursive: true });
  const temporary = `${STORE}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, STORE);
}

export async function listFilamentDisplayColors(filamentId?: string) {
  const records = await readStore();
  return filamentId
    ? records.filter((record) => record.filamentId === filamentId && record.syncStatus !== "revoked")
    : records;
}

export async function getFilamentDisplayColor(id: string) {
  return (await readStore()).find((record) => record.id === id) || null;
}

export function resolveDisplayColorAsset(assetPath: string) {
  const normalized = assetPath.replace(/\\/g, "/");
  if (!/^display-color-[A-Za-z0-9-]+\/(?:color|source)\.png$/.test(normalized)) {
    throw new Error("invalid_display_color_asset");
  }
  const absolute = path.resolve(ASSETS, normalized);
  if (!absolute.startsWith(`${path.resolve(ASSETS)}${path.sep}`)) {
    throw new Error("invalid_display_color_asset");
  }
  return absolute;
}

async function archiveDisplayAssets(
  id: string,
  sourceImagePath: string,
  colorImagePath: string,
) {
  const directory = path.join(ASSETS, id);
  await mkdir(directory, { recursive: true });
  const archivedColor = `${id}/color.png`;
  const archivedSource = `${id}/source.png`;
  await copyFile(resolveEvidenceDraftAsset(colorImagePath), resolveDisplayColorAsset(archivedColor));
  await copyFile(resolveEvidenceDraftAsset(sourceImagePath), resolveDisplayColorAsset(archivedSource));
  return { colorImagePath: archivedColor, sourceImagePath: archivedSource };
}

export async function syncEvidenceColors(input: {
  evidenceId: string;
  filamentId: string;
  productLineId: string;
  sourceType: string;
  sourceOrigin: string;
  sourceImagePath: string;
  cardImagePaths: string[];
  cards: Array<Record<string, unknown>>;
  actorId: string;
  conflictAction?: "skip" | "update" | "create_pending";
}) {
  const records = await readStore();
  const created: FilamentDisplayColor[] = [];
  const skipped: Array<{ cardId: string; reason: string }> = [];
  const now = new Date().toISOString();
  for (const [index, card] of input.cards.entries()) {
    if (!card.allowSync) continue;
    const row = Number(card.row || 0);
    const column = Number(card.column || 0);
    const colorCardId = `${row}-${column}`;
    const chineseName = String(card.chineseName || "").trim();
    const englishName = String(card.englishName || "").trim();
    const officialColorCode = String(card.officialColorCode || "").trim();
    if (!chineseName && !englishName && !officialColorCode && !card.matchedColorId) continue;
    const conflictIndex = records.findIndex((existing) =>
      existing.filamentId === input.filamentId
      && (
        (officialColorCode && existing.officialColorCode === officialColorCode)
        || (chineseName && englishName && existing.chineseName === chineseName && existing.englishName === englishName)
        || (existing.evidenceId === input.evidenceId && existing.colorCardId === colorCardId)
        || (
          JSON.stringify(existing.sourceCrop) === JSON.stringify(card.sourceCrop || null)
          && existing.sourceImagePath === input.sourceImagePath
        )
      )
    );
    if (conflictIndex >= 0 && (!input.conflictAction || input.conflictAction === "skip")) {
      skipped.push({ cardId: colorCardId, reason: "conflict_default_skipped" });
      continue;
    }
    const id = conflictIndex >= 0 && input.conflictAction === "update"
      ? records[conflictIndex].id
      : `display-color-${randomUUID()}`;
    const cardImagePath = input.cardImagePaths[index] || "";
    if (!cardImagePath) {
      skipped.push({ cardId: colorCardId, reason: "card_image_missing" });
      continue;
    }
    const archivedAssets = await archiveDisplayAssets(id, input.sourceImagePath, cardImagePath);
    const base: FilamentDisplayColor = {
      id,
      filamentId: input.filamentId,
      productLineId: input.productLineId,
      evidenceId: input.evidenceId,
      colorCardId,
      chineseName,
      englishName,
      officialColorCode,
      colorImagePath: archivedAssets.colorImagePath,
      sourceImagePath: archivedAssets.sourceImagePath,
      sourceCrop: card.sourceCrop as Record<string, unknown> || null,
      logicalCardBounds: card.logicalCardBounds as Record<string, unknown> || null,
      safeCropBounds: card.safeCropBounds as Record<string, unknown> || null,
      row,
      column,
      visualColumn: typeof card.visualColumn === "number" ? card.visualColumn : null,
      cropStatus: String(card.cropStatus || ""),
      cropStrategy: String(card.cropStrategy || ""),
      sourceType: input.sourceType,
      sourceOrigin: input.sourceOrigin,
      evidenceStatus: input.conflictAction === "create_pending" ? "pending_review" : "confirmed",
      syncStatus: "synced_to_filament",
      syncedAt: now,
      syncedBy: input.actorId,
      updatedAt: now,
      updatedBy: input.actorId,
      notes: String(card.notes || ""),
      hasManualCorrection: false,
      correctedAt: "",
      correctedBy: "",
      correctionFields: [],
    };
    if (conflictIndex >= 0 && input.conflictAction === "update") records[conflictIndex] = base;
    else records.push(base);
    created.push(base);
  }
  await writeStore(records);
  return { synced: created, skipped };
}

export async function updateFilamentDisplayColor(
  id: string,
  changes: Partial<Pick<FilamentDisplayColor, "chineseName" | "englishName" | "officialColorCode" | "evidenceStatus" | "notes">>,
  actorId: string,
) {
  const records = await readStore();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return null;
  const correctionFields = Object.keys(changes).filter((key) =>
    changes[key as keyof typeof changes] !== records[index][key as keyof FilamentDisplayColor]
  );
  records[index] = {
    ...records[index],
    ...changes,
    hasManualCorrection: correctionFields.length > 0 || records[index].hasManualCorrection,
    correctedAt: correctionFields.length ? new Date().toISOString() : records[index].correctedAt,
    correctedBy: correctionFields.length ? actorId : records[index].correctedBy,
    correctionFields: [...new Set([...records[index].correctionFields, ...correctionFields])],
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };
  await writeStore(records);
  return records[index];
}

export async function revokeFilamentDisplayColor(id: string, actorId: string) {
  return updateFilamentDisplayColor(id, { evidenceStatus: "rejected" }, actorId).then(async (record) => {
    if (!record) return null;
    const records = await readStore();
    const index = records.findIndex((item) => item.id === id);
    records[index].syncStatus = "revoked";
    await writeStore(records);
    return records[index];
  });
}
