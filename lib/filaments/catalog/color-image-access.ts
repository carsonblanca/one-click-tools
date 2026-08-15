function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function enabled(value: unknown) {
  return value !== false && text(value).toLowerCase() !== "false";
}

export function resolvePublishedColorAsset(
  draftDataValue: unknown,
  input: {
    productKey: string;
    officialColorCode: string;
    colorId: string;
  },
) {
  const draftData = objectValue(draftDataValue);
  const productLine = objectValue(draftData.productLine);
  const storedProductKey = text(draftData.productKey)
    || text(productLine.productKey)
    || text(productLine.productLineId);
  if (storedProductKey !== input.productKey) return null;

  const color = (Array.isArray(draftData.colors) ? draftData.colors : [])
    .map(objectValue)
    .find((candidate) => (
      enabled(candidate.enabled)
      && text(candidate.colorId) === input.colorId
      && text(candidate.productLineId) === input.productKey
      && text(candidate.officialColorCode) === input.officialColorCode
    ));
  const assetKey = text(color?.localImagePath);
  if (!assetKey.startsWith("filament-imports/")) return null;

  const image = (Array.isArray(draftData.images) ? draftData.images : [])
    .map(objectValue)
    .find((candidate) => (
      text(candidate.role) === "color"
      && text(candidate.productLineId) === input.productKey
      && text(candidate.r2ObjectKey) === assetKey
    ));
  return image ? assetKey : null;
}
