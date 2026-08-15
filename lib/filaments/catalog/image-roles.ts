import type { CatalogRecord } from "./mock-catalog-ext";

export function getColorCardImageUrl(record: CatalogRecord) {
  const productKey = record.productLineId?.trim() || "";
  const officialColorCode = record.color.digitalSwatch?.officialColorCode?.trim() || "";
  if (!productKey || !officialColorCode) return null;

  const matching = record.published?.colors.find((color) => (
    color.productLineId === productKey
    && color.officialColorCode === officialColorCode
    && (!record.publishedColorId || color.id === record.publishedColorId)
  ));
  return matching?.imageUrl?.startsWith("/api/filaments/color-image?")
    ? matching.imageUrl
    : null;
}
