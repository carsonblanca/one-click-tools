export class ParameterTablesAdapterError extends Error {}

function text(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function productSignature(value) {
  const upper = text(value).toUpperCase();
  return {
    model: upper.match(/\bK\d+\b/)?.[0] || "",
    material: upper.match(/\b(?:PLA|PETG|TPU|ABS|ASA|PC|PA|PVA|HIPS)\b/)?.[0] || "",
  };
}

function filamentIdentityMatches(currentProductTitle, tableProductTitle, tableMaterialType) {
  const current = productSignature(currentProductTitle);
  const represented = productSignature(tableProductTitle);
  const explicitMaterial = productSignature(tableMaterialType).material;
  const representedMaterial = represented.material || explicitMaterial;
  if (!represented.model && !representedMaterial) return false;
  if (represented.model && (!current.model || current.model !== represented.model)) return false;
  if (representedMaterial && (!current.material || current.material !== representedMaterial)) return false;
  return true;
}

function adaptOcrTable(value, index, context) {
  const table = objectValue(value);
  if (!table) throw new ParameterTablesAdapterError(`OCR parameter table ${index + 1} must be an object`);
  if (!Array.isArray(table.rows)) {
    throw new ParameterTablesAdapterError(`OCR parameter table ${index + 1} rows must be an array`);
  }

  const productLine = text(table.productLine);
  const currentProductTitle = text(context.currentProductTitle)
    || text(table.currentProductTitle)
    || productLine;
  const productTitle = text(table.productTitle)
    || (text(context.currentProductTitle) ? "" : productLine);
  const materialType = text(table.materialType);
  const representativeModel = text(table.representativeModel);
  const productTitleMatch = filamentIdentityMatches(
    `${currentProductTitle} ${text(context.materialType)}`.trim(),
    productTitle,
    materialType,
  );
  return {
    schemaVersion: "parameter-tables.v1",
    currentProductTitle,
    productTitle,
    materialType,
    representativeModel,
    tableTitle: text(table.tableTitle) || productTitle || text(table.tableType),
    sourceImage: text(table.sourceImage),
    columns: ["参数", "值"],
    rows: table.rows.map((rowValue) => {
      const row = objectValue(rowValue);
      if (!row) throw new ParameterTablesAdapterError(`OCR parameter table ${index + 1} contains an invalid row`);
      return {
        name: text(row.name) || text(row.canonicalKey),
        cells: [{ column: "值", value: text(row.value) }],
      };
    }),
    productTitleMatch,
    warnings: productTitleMatch
      ? []
      : ["商品标题与参数表耗材身份不一致或无法确认，需要人工审核。"],
  };
}

function adaptStandardTable(value, index) {
  const table = objectValue(value);
  if (!table) throw new ParameterTablesAdapterError(`parameter table ${index + 1} must be an object`);
  const nestedParameterTable = objectValue(table.parameterTable);
  const parameterTableProductTitle = text(nestedParameterTable?.productTitle)
    || text(table.productTitle);
  const parameterTableMaterialType = text(nestedParameterTable?.materialType)
    || text(table.materialType);
  const productTitleMatch = filamentIdentityMatches(
    text(table.currentProductTitle),
    parameterTableProductTitle,
    parameterTableMaterialType,
  );
  const warnings = Array.isArray(table.warnings)
    ? table.warnings.map(text).filter(Boolean)
    : [];
  if (!productTitleMatch) {
    warnings.push("商品标题与参数表产品标题不一致或无法确认，需要人工审核。");
  }
  return {
    ...table,
    productTitleMatch,
    warnings: [...new Set(warnings)],
  };
}

export function adaptParameterTablesInput(value, context = {}) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(adaptStandardTable);
  const source = objectValue(value);
  if (!source) return value;
  if (!Object.hasOwn(source, "tables")) return adaptStandardTable(source, 0);
  if (!Array.isArray(source.tables)) {
    throw new ParameterTablesAdapterError("OCR parameter-tables.json tables must be an array");
  }
  return source.tables.map((table, index) => (
    text(objectValue(table)?.schemaVersion)
      ? adaptStandardTable(table, index)
      : adaptOcrTable(table, index, context)
  ));
}
