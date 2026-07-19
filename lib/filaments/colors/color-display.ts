function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function manufacturerColorDisplay(value: unknown) {
  const color = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    nameZh: text(color.nameZh) || text(color.displayNameZhCN) || "颜色名称待补充",
    nameEn: text(color.nameEn) || text(color.displayNameEn) || null,
    manufacturerCode: text(color.officialColorCode) || null,
  };
}
