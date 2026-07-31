import { resolveCanonicalParameterKey } from "../../../../lib/filaments/parameters/normalized-parameters.ts";

export class ParameterEnrichmentError extends Error {}

function text(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function emptyResult() {
  return {
    candidates: [],
    evidence: [],
    warnings: [],
    requiresManualReview: false,
  };
}

function normalizedCellValue(value) {
  const raw = text(value).replace(/\s+/g, " ");
  return raw && !/^[\/／]$/.test(raw) ? raw : "";
}

function valueParts(rawValue) {
  const raw = text(rawValue);
  const unitMatches = raw.match(/(?:mm\/s|g\/10\s*min|g\/cm[³3]|kJ\/m[²2]|MPa|℃|°C|mm|kg|g|%|\bh\b)/gi) || [];
  if (unitMatches.length !== 1) return { normalizedValue: raw, unit: "" };
  const matchedUnit = unitMatches[0];
  const normalizedUnit = /^℃|°c$/i.test(matchedUnit)
    ? "°C"
    : matchedUnit.replace("cm3", "cm³").replace("m2", "m²").replace(/\s+/g, "");
  const unitAtEnd = new RegExp(`${matchedUnit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  return {
    normalizedValue: raw.replace(unitAtEnd, "").trim(),
    unit: normalizedUnit,
  };
}

function tableDocuments(value) {
  if (value == null) return [];
  const documents = Array.isArray(value) ? value : [value];
  if (!documents.every(objectValue)) {
    throw new ParameterEnrichmentError("parameter-tables.json must contain an object or an array of objects");
  }
  return documents;
}

function validateDocument(document, index) {
  if (!text(document.schemaVersion)) {
    throw new ParameterEnrichmentError(`parameter table ${index + 1} is missing schemaVersion`);
  }
  if (!text(document.tableTitle)) {
    throw new ParameterEnrichmentError(`parameter table ${index + 1} is missing tableTitle`);
  }
  if (!text(document.sourceImage)) {
    throw new ParameterEnrichmentError(`parameter table ${index + 1} is missing sourceImage`);
  }
  if (!Array.isArray(document.rows)) {
    throw new ParameterEnrichmentError(`parameter table ${index + 1} rows must be an array`);
  }
}

function candidateKey(candidate) {
  return text(candidate.canonicalKey)
    || `unmapped:${text(candidate.officialRawName || candidate.field).toLowerCase()}`;
}

function candidateValue(candidate) {
  const unit = text(candidate.unit).toLowerCase()
    .replace(/^℃$/i, "°c")
    .replace("cm3", "cm³")
    .replace("m2", "m²")
    .replace(/\s+/g, "");
  let value = text(candidate.normalizedValue || candidate.rawValue)
    .toLowerCase()
    .replace(/[~～—−-]/g, "–")
    .replace(/\s*–\s*/g, "–")
    .replace(/^(?:>=|＞=)/, "≥")
    .replace(/^(?:<=|＜=|<)/, "≤")
    .replace(/^>/, "≥")
    .replace(/\s*(?:mm\/s|g\/10\s*min|g\/cm[³3]|kj\/m[²2]|mpa|℃|°c|mm|kg|g|%|小时|\bh\b)\s*/gi, " ")
    .replace(/(?:及以上|以上)$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/(?:及以上|以上)\s*$/.test(text(candidate.rawValue)) && !/^[≥>]/.test(value)) value = `≥${value}`;
  return `${value}|${unit}`;
}

function candidateSource(candidate) {
  return text(candidate.evidenceId)
    || [
      text(candidate.sourceFile || candidate.sourceRelativePath),
      text(candidate.sourceText || candidate.ocrText),
    ].join("|");
}

function candidateDisplayValue(candidate) {
  return [
    text(candidate.normalizedValue || candidate.rawValue),
    text(candidate.unit),
  ].filter(Boolean).join(" ");
}

function mergeList(left, right) {
  return [...new Set([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].map(text).filter(Boolean))];
}

function preferredCandidate(left, right) {
  const score = (candidate) => (
    (text(candidate.extractionMethod) === "structured_parameter_table" ? 4 : 0)
    + (text(candidate.evidenceId) ? 2 : 0)
    + (text(candidate.normalizedValue) ? 1 : 0)
    + (text(candidate.unit) ? 1 : 0)
  );
  return score(right) > score(left) ? right : left;
}

function mergeEquivalentCandidates(left, right) {
  const preferred = preferredCandidate(left, right);
  const other = preferred === left ? right : left;
  const officialRawNames = mergeList(
    [left.officialRawName, ...(left.officialRawNames || [])],
    [right.officialRawName, ...(right.officialRawNames || [])],
  );
  const sourceFiles = mergeList(
    [left.sourceFile, ...(left.sourceFiles || [])],
    [right.sourceFile, ...(right.sourceFiles || [])],
  );
  const sourceTexts = mergeList(
    [left.sourceText, ...(left.sourceTexts || [])],
    [right.sourceText, ...(right.sourceTexts || [])],
  );
  const evidenceIds = mergeList(
    [left.evidenceId, ...(left.evidenceIds || [])],
    [right.evidenceId, ...(right.evidenceIds || [])],
  );
  return {
    ...other,
    ...preferred,
    officialRawNames,
    sourceFiles,
    sourceTexts,
    evidenceIds,
    ...(text(preferred.evidenceId || evidenceIds[0]) ? { evidenceId: text(preferred.evidenceId || evidenceIds[0]) } : {}),
  };
}

export function enrichParameterTables(parameterTables, { productLineId = "" } = {}) {
  const documents = tableDocuments(parameterTables);
  if (!documents.length) return emptyResult();

  const result = emptyResult();
  for (const [documentIndex, document] of documents.entries()) {
    validateDocument(document, documentIndex);
    const sourceFile = text(document.sourceImage);
    const documentWarnings = Array.isArray(document.warnings)
      ? document.warnings.map(text).filter(Boolean)
      : [];
    const identityMatched = document.productTitleMatch === true;
    if (!identityMatched) {
      result.requiresManualReview = true;
      result.warnings.push(`PARAMETER_TABLE_IDENTITY_REVIEW:${text(document.tableTitle)}`);
    }
    result.warnings.push(...documentWarnings);
    if (documentWarnings.length) result.requiresManualReview = true;

    for (const [rowIndex, rowValue] of document.rows.entries()) {
      const row = objectValue(rowValue);
      if (!row) throw new ParameterEnrichmentError(`parameter table ${documentIndex + 1} contains an invalid row`);
      const officialRawName = text(row.name);
      if (!officialRawName || !Array.isArray(row.cells)) {
        throw new ParameterEnrichmentError(`parameter table ${documentIndex + 1} contains a row without name or cells`);
      }
      const cells = row.cells.map((cellValue) => {
        const cell = objectValue(cellValue);
        if (!cell) return null;
        const value = normalizedCellValue(cell.value);
        return value ? { column: text(cell.column), value } : null;
      }).filter(Boolean);
      if (!cells.length) continue;

      const uniqueValues = [...new Set(cells.map((cell) => cell.value))];
      const canonicalKey = resolveCanonicalParameterKey(officialRawName);
      const hasConflict = uniqueValues.length > 1;
      const trusted = Boolean(identityMatched && canonicalKey && !hasConflict);
      const rawValue = hasConflict
        ? cells.map((cell) => `${cell.column || "值"}:${cell.value}`).join(" | ")
        : uniqueValues[0];
      const parsed = hasConflict
        ? { normalizedValue: rawValue, unit: "" }
        : valueParts(rawValue);
      const sourceText = `${officialRawName}: ${cells.map((cell) => (
        `${cell.column ? `${cell.column}=` : ""}${cell.value}`
      )).join(" | ")}`;
      const binding = canonicalKey || officialRawName;
      const evidenceId = `structured-parameter-table-${documentIndex + 1}-${rowIndex + 1}`;

      const candidateParts = canonicalKey === "dryingTemperature" && !hasConflict
        ? [
          rawValue.match(/([≤≥<>]?\d+(?:\.\d+)?(?:\s*[~～\-–]\s*\d+(?:\.\d+)?)?)\s*(?:℃|°C)/i),
          rawValue.match(/([≤≥<>]?\d+(?:\.\d+)?(?:\s*[~～\-–]\s*\d+(?:\.\d+)?)?)\s*(?:小时|h)(?:\s|$)/i),
        ].flatMap((match, index) => match ? [{
          canonicalKey: index === 0 ? "dryingTemperature" : "dryingTime",
          officialRawName: index === 0 ? officialRawName : "烘干时间",
          normalizedValue: match[1].replace(/[~～—−-]/g, "–").replace(/\s*–\s*/g, "–"),
          unit: index === 0 ? "°C" : "h",
        }] : [])
        : [{ canonicalKey, officialRawName, normalizedValue: parsed.normalizedValue, unit: parsed.unit }];
      for (const part of candidateParts) {
        result.candidates.push({
          field: part.canonicalKey || part.officialRawName,
          canonicalKey: part.canonicalKey,
          rawValue,
          normalizedValue: part.normalizedValue,
          unit: part.unit,
          officialRawName: part.officialRawName,
          originalName: part.officialRawName,
          sourceFile,
          sourceText,
          evidenceId,
          extractionMethod: "structured_parameter_table",
          confidence: trusted ? "high" : "medium",
          reviewStatus: hasConflict ? "conflict" : trusted ? "official" : "candidate",
          trusted,
          publicVisible: trusted,
          productLineId: text(productLineId),
          testCondition: null,
        });
      }
      result.evidence.push({
        evidenceId,
        sourceRelativePath: sourceFile,
        sourceType: "structured_parameter_table",
        extractionMethod: "parameter-tables.json",
        ocrText: sourceText,
        fieldBindings: [...new Set(candidateParts.map((part) => part.canonicalKey || binding))],
        productLineId: text(productLineId),
        tableTitle: text(document.tableTitle),
        currentProductTitle: text(document.currentProductTitle),
        representativeModel: text(document.representativeModel),
        productTitleMatch: identityMatched,
        warnings: documentWarnings,
      });
      if (hasConflict) {
        result.requiresManualReview = true;
        result.warnings.push(`PARAMETER_CONFLICT:${binding}=${uniqueValues.join("|")}`);
      }
      if (!canonicalKey) {
        result.requiresManualReview = true;
        result.warnings.push(`UNMAPPED_PARAMETER:${officialRawName}`);
      }
    }

  }

  result.warnings = [...new Set(result.warnings)];
  return result;
}

export function mergeParameterCandidates(existingCandidates, enrichmentCandidates) {
  const mergedByIdentity = new Map();
  for (const candidate of [...existingCandidates, ...enrichmentCandidates]) {
    const key = candidateKey(candidate);
    const identity = `${key}\u0000${candidateValue(candidate)}`;
    const previous = mergedByIdentity.get(identity);
    mergedByIdentity.set(identity, previous
      ? mergeEquivalentCandidates(previous, candidate)
      : {
        ...candidate,
        officialRawNames: mergeList([], [candidate.officialRawName]),
        sourceFiles: mergeList([], [candidate.sourceFile]),
        sourceTexts: mergeList([], [candidate.sourceText]),
        evidenceIds: mergeList([], [candidate.evidenceId]),
      });
  }
  const merged = [...mergedByIdentity.values()];

  const positions = new Map();
  for (const [index, candidate] of merged.entries()) {
    const key = candidateKey(candidate);
    positions.set(key, [...(positions.get(key) || []), index]);
  }
  const conflicts = [];
  const conflictKeys = new Set();
  for (const [key, indexes] of positions) {
    const values = [...new Set(indexes.map((index) => candidateValue(merged[index])))];
    if (values.length <= 1) continue;
    conflictKeys.add(key);
    conflicts.push({
      field: key,
      values: indexes.map((index) => candidateDisplayValue(merged[index])),
    });
  }
  const candidates = merged.map((candidate) => (
    conflictKeys.has(candidateKey(candidate))
      ? {
        ...candidate,
        reviewStatus: "conflict",
        trusted: false,
        publicVisible: false,
      }
      : candidate
  ));
  const warnings = conflicts.map((conflict) => `PARAMETER_CONFLICT:${conflict.field}`);
  const requiresManualReview = conflicts.length > 0
    || candidates.some((candidate) => text(candidate.reviewStatus).toLowerCase() === "conflict");

  return { candidates, conflicts, warnings, requiresManualReview };
}
