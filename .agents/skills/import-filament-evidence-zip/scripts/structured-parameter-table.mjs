const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "currentProductTitle",
  "tableTitle",
  "sourceImage",
  "columns",
  "rows",
  "productTitleMatch",
  "warnings",
]);

const ROW_DEFINITIONS = [
  ["chamberTemperature", /腔体温度|chamber temperature/i, "°C"],
  ["nozzleTemperature", /喷嘴温度|打印温度|nozzle temperature/i, "°C"],
  ["nozzleDiameter", /喷嘴(?:口径|直径)|nozzle diameter/i, "mm"],
  ["bedTemperature", /热床温度|平台温度|bed temperature/i, "°C"],
  ["coolingFan", /冷却风扇|风扇速度|cooling fan|fan speed/i, "%"],
  ["printingSpeed", /打印速度|print(?:ing)? speed/i, "mm/s"],
  ["retractionDistance", /回抽(?:距离|长度)|retraction distance/i, "mm"],
  ["retractionSpeed", /回抽速度|retraction speed/i, "mm/s"],
  ["buildPlateSurface", /打印平台|平台材质|底板材质|build plate surface/i, ""],
];

function text(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim()
    : "";
}

function normalizeRange(value) {
  return text(value)
    .replace(/[~～—−-]/g, "–")
    .replace(/\s*–\s*/g, "–");
}

function isMissing(value) {
  return !text(value) || /^[/／-]$/.test(text(value));
}

function productSignature(value) {
  const upper = text(value).toUpperCase();
  return {
    model: upper.match(/\bK\d+\b/)?.[0] || "",
    material: upper.match(/\b(?:PLA|PETG|TPU|ABS|ASA|PC|PA|PVA|HIPS)\b/)?.[0] || "",
  };
}

function titlesMatch(left, right) {
  const a = productSignature(left);
  const b = productSignature(right);
  if (!a.model || !b.model || a.model !== b.model) return false;
  return !a.material || !b.material || a.material === b.material;
}

function uniqueCells(row) {
  const cells = Array.isArray(row?.cells) ? row.cells : [];
  const seen = new Set();
  return cells.flatMap((cell) => {
    const column = text(cell?.column);
    const value = text(cell?.value);
    if (isMissing(value)) return [];
    const key = value.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ column, value }];
  });
}

function displayValue(cells) {
  if (cells.length === 1) return cells[0].value;
  return cells.map((cell) => `${cell.column || "值"}: ${cell.value}`).join("; ");
}

function normalizedValue(value, unit) {
  if (!unit) return text(value);
  return normalizeRange(text(value)
    .replace(/℃/g, "°C")
    .replace(new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim());
}

function candidate(canonicalKey, officialRawName, cells, unit, table) {
  const rawValue = displayValue(cells);
  const normalized = cells.length === 1
    ? normalizedValue(cells[0].value, unit)
    : cells.map((cell) => `${cell.column || "值"}: ${normalizedValue(cell.value, unit)}`).join("; ");
  return {
    canonicalKey,
    officialRawName,
    rawValue,
    normalizedValue: normalized,
    unit,
    sourceFile: text(table.sourceImage) || "parameter-tables.json",
    sourceText: `${officialRawName} ${rawValue}`,
  };
}

function splitDrying(row, table) {
  const cells = uniqueCells(row);
  const temperatureCells = [];
  const durationCells = [];
  for (const cell of cells) {
    const temperature = cell.value.match(/([≤≥<>]?\d+(?:\.\d+)?(?:\s*[~～\-–]\s*\d+(?:\.\d+)?)?)\s*(?:℃|°C)/i);
    const duration = cell.value.match(/([≤≥<>]?\d+(?:\.\d+)?(?:\s*[~～\-–]\s*\d+(?:\.\d+)?)?)\s*(?:h|小时)/i);
    if (temperature) temperatureCells.push({ column: cell.column, value: temperature[0] });
    if (duration) durationCells.push({ column: cell.column, value: duration[0] });
  }
  return [
    ...(temperatureCells.length ? [candidate("dryingTemperature", text(row.name), temperatureCells, "°C", table)] : []),
    ...(durationCells.length ? [candidate("dryingDuration", "烘干时间", durationCells, "h", table)] : []),
  ];
}

export function parseStructuredParameterTable(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const extraKeys = Object.keys(value).filter((key) => !ALLOWED_TOP_LEVEL_KEYS.has(key));
  if (extraKeys.length) {
    throw new Error(`parameter-tables.json contains unsupported top-level fields: ${extraKeys.join(", ")}`);
  }
  const rows = Array.isArray(value.rows) ? value.rows : [];
  if (!rows.length) return null;
  const parameters = [];
  for (const row of rows) {
    const name = text(row?.name);
    if (!name) continue;
    if (/烘干参数|干燥参数|烘干温度|干燥温度/i.test(name)) {
      parameters.push(...splitDrying(row, value));
      continue;
    }
    const definition = ROW_DEFINITIONS.find(([, pattern]) => pattern.test(name));
    if (!definition) continue;
    const cells = uniqueCells(row);
    if (!cells.length) continue;
    parameters.push(candidate(definition[0], name, cells, definition[2], value));
  }
  const expectedTitle = text(options.expectedProductTitle);
  const identityMatches = value.productTitleMatch === true
    && (!expectedTitle || (
      titlesMatch(expectedTitle, value.currentProductTitle)
      && titlesMatch(expectedTitle, value.tableTitle)
    ));
  const warnings = Array.isArray(value.warnings) ? value.warnings.map(text).filter(Boolean) : [];
  if (value.productTitleMatch === true && !identityMatches) {
    warnings.push("parameter-tables.json identity does not match the imported product.");
  }
  return {
    table: value,
    parameters: [...new Map(parameters.map((item) => [item.canonicalKey, item])).values()],
    productTitleMatch: identityMatches,
    warnings,
  };
}
