function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function recordsForProductLine(value: unknown, productLineId: string) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => {
    const existingProductLineId = text(objectValue(item).productLineId);
    return !existingProductLineId || existingProductLineId === productLineId;
  });
}

export function productLineScopeMatches(value: unknown, productLineId: string) {
  const existingProductLineId = text(objectValue(value).productLineId);
  return !existingProductLineId || existingProductLineId === productLineId;
}
