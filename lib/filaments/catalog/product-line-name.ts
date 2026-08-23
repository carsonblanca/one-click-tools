type AnyObject = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function objectValue(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyObject : {};
}

export function resolveImportedProductLineName(input: { rowName?: unknown; materialType?: unknown; draftData?: unknown }): string {
  const data = objectValue(input.draftData);
  const productLine = objectValue(data.productLine);
  const manifest = objectValue(data.manifest);
  const direct = [input.rowName, productLine.name, productLine.productLineName, productLine.productLine, data.productLineName, data.productLineLabel, manifest.productLine]
    .map(text).find(Boolean);
  if (direct) return direct;

  const material = text(input.materialType || productLine.materialType).toUpperCase();
  const colors = Array.isArray(data.canonicalColors) ? data.canonicalColors : Array.isArray(data.colors) ? data.colors : [];
  const colorNames = colors.map((color) => {
    const row = objectValue(color);
    return text(row.nameZh || row.displayNameZh);
  });
  if (material === "ABS" && colorNames.length > 0 && colorNames.every((name) => name.startsWith("透明"))) return "THE K5™ ABS T";
  return material === "ABS" ? "THE K5 ABS" : material ? `THE K5 ${material}` : "";
}
