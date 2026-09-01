type PublishedKexcelledRow = Record<string, unknown>;

const FROZEN_ABS_SOURCE_BY_PRODUCT_LINE = new Map([
  ["thek5absp", "capture-20260817024719-a9870e0684e1-4b966ba9"],
  ["thek5abs夜光系列", "capture-20260817024614-e0d318af934a-0037851c"],
  ["thek5abst", "capture-20260817024438-9acb75e7a1e3-d9ed9669"],
  ["thek5abs高安定性", "capture-20260817024828-d998ea43cf3a-27ab63c4"],
]);

function productLineKey(row: PublishedKexcelledRow): string {
  const draftData = row.draft_data && typeof row.draft_data === "object" && !Array.isArray(row.draft_data)
    ? row.draft_data as PublishedKexcelledRow
    : {};
  const productLine = draftData.productLine && typeof draftData.productLine === "object" && !Array.isArray(draftData.productLine)
    ? draftData.productLine as PublishedKexcelledRow
    : {};
  return String(row.product_line_name || productLine.name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function selectCanonicalPublishedKexcelledRows(rows: PublishedKexcelledRow[]): PublishedKexcelledRow[] {
  const selectedFrozen = new Set<string>();
  return rows.filter((row) => {
    const frozenSourceRunId = FROZEN_ABS_SOURCE_BY_PRODUCT_LINE.get(productLineKey(row));
    if (!frozenSourceRunId) return true;
    if (String(row.source_run_id ?? "") !== frozenSourceRunId) return false;
    if (selectedFrozen.has(frozenSourceRunId)) return false;
    selectedFrozen.add(frozenSourceRunId);
    return true;
  });
}
