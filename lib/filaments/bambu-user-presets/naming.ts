import type { FilamentRecord, PrinterCompatibilityProfile } from "./types";

const unsafeFileChars = /[<>:"/\\|?*\u0000-\u001F]/g;

export function normalizePresetToken(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(unsafeFileChars, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildBambuPresetDisplayName(
  filament: FilamentRecord,
  printer: PrinterCompatibilityProfile,
) {
  const brand = normalizePresetToken(filament.brand);
  const materialType = normalizePresetToken(filament.materialType);
  const category = normalizePresetToken(filament.category);
  const revisionDate = normalizePresetToken(filament.revisionDate);

  return `[+]${brand}-${materialType}-${category}-${revisionDate} @${printer.preciseName}`;
}

export function buildBambuPresetFileName(
  filament: FilamentRecord,
  printer: PrinterCompatibilityProfile,
) {
  const safeName = buildBambuPresetDisplayName(filament, printer)
    .replace(/^\[\+\]/, "plus-")
    .replace(/\s*@\s*/, "_")
    .replace(/\s+/g, "-")
    .replace(unsafeFileChars, "-")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^-|-$/g, "");

  return `${safeName}.json`;
}

function fnv1aHash(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function buildStableFilamentId(
  filament: FilamentRecord,
  printer: PrinterCompatibilityProfile,
) {
  const base = [
    "oneclick",
    filament.brand,
    filament.materialType,
    filament.category,
    filament.revisionDate,
    printer.preciseName,
  ]
    .map((part) => normalizePresetToken(part).toLowerCase())
    .join("-");
  const hash = fnv1aHash(base);

  return `${base}-${hash}`.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}
