/**
 * Validates filament parameter records in data/filaments/parameters/.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const paramsDir = resolve(root, "data", "filaments", "parameters");
const plDir = resolve(root, "data", "filaments", "product-lines");

const SOURCE_STATUSES = [
  "official_product_page",
  "official_collection_page",
  "official_tds",
  "official_preset",
  "not_found",
];
const PARAMETER_STATUSES = ["complete", "partial", "missing"];
const NUMERIC_OPERATORS = ["range", "lt", "lte", "eq"];
const AMS_FIT = ["yes", "conditional", "no", null];

const errors = [];
const warnings = [];
let total = 0;
let sourceStats = Object.fromEntries(SOURCE_STATUSES.map((status) => [status, 0]));
let parameterStats = { complete: 0, partial: 0, missing: 0 };
let completeness = {
  withNozzleTemp: 0,
  withBedTemp: 0,
  withSpeed: 0,
  withDrying: 0,
  withSpoolSpecs: 0,
  withAmsInfo: 0,
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function loadProductLines() {
  const byBrand = new Map();
  const allIds = new Set();
  const files = readdirSync(plDir).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const data = readJson(resolve(plDir, file));
    const ids = new Set();

    for (const line of data.productLines || []) {
      ids.add(line.id);
      allIds.add(line.id);
    }

    byBrand.set(data.brandId, ids);
  }

  return { byBrand, allIds };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateNumericParameter(value, prefix, field) {
  if (value === null) {
    return false;
  }

  if (!isPlainObject(value)) {
    errors.push(`${prefix} ${field} must be null or an object`);
    return false;
  }

  if (!NUMERIC_OPERATORS.includes(value.operator)) {
    errors.push(`${prefix} ${field}.operator must be one of ${NUMERIC_OPERATORS.join(", ")}`);
  }

  if (!value.unit || typeof value.unit !== "string") {
    errors.push(`${prefix} ${field}.unit must be a non-empty string`);
  }

  const hasValue = typeof value.value === "number";
  const hasMin = typeof value.min === "number";
  const hasMax = typeof value.max === "number";

  if (value.operator === "range") {
    if (!hasMin || !hasMax) {
      errors.push(`${prefix} ${field} range must include numeric min and max`);
    }
    if (hasValue) {
      errors.push(`${prefix} ${field} range must not include value`);
    }
    if (hasMin && hasMax && value.min > value.max) {
      errors.push(`${prefix} ${field} range min must be <= max`);
    }
  }

  if (value.operator === "lt" || value.operator === "lte" || value.operator === "eq") {
    if (!hasValue) {
      errors.push(`${prefix} ${field} ${value.operator} must include numeric value`);
    }
    if (hasMin || hasMax) {
      errors.push(`${prefix} ${field} ${value.operator} must not include min or max`);
    }
  }

  return true;
}

function validateTemperature(value, prefix, field) {
  if (!isPlainObject(value)) {
    errors.push(`${prefix} ${field} must be an object`);
    return false;
  }

  let hasAny = false;
  for (const key of ["initialLayer", "otherLayers", "recommended"]) {
    if (Object.prototype.hasOwnProperty.call(value, "rangeLow") || Object.prototype.hasOwnProperty.call(value, "rangeHigh")) {
      errors.push(`${prefix} ${field} must not use legacy rangeLow/rangeHigh fields`);
      break;
    }
    hasAny = validateNumericParameter(value[key] ?? null, prefix, `${field}.${key}`) || hasAny;
  }

  return hasAny;
}

function hasDryingValue(drying) {
  return Boolean(drying?.temperatureC || drying?.durationHours || drying?.notes);
}

function hasSpoolValue(spool) {
  return Boolean(
    spool?.outerDiameterMm !== null ||
      spool?.widthMm !== null ||
      spool?.hubHoleDiameterMm !== null ||
      spool?.emptySpoolWeightG !== null ||
      spool?.spoolMaterial !== null ||
      spool?.refillable !== null ||
      spool?.cardboardSpool !== null,
  );
}

function hasAmsValue(ams) {
  return Boolean(ams?.amsFit !== null || ams?.adapterRequired !== null || ams?.notes);
}

function hasConditionSetValue(record) {
  return Array.isArray(record.conditionSets) && record.conditionSets.length > 0;
}

function validateConditionSets(record, prefix) {
  const cs = record.conditionSets;
  if (cs === null || cs === undefined) return;
  if (!Array.isArray(cs) || cs.length === 0) {
    errors.push(`${prefix} conditionSets must be null or a non-empty array`);
    return;
  }

  let hasNozzle = false;
  let hasSpeed = false;

  for (let i = 0; i < cs.length; i++) {
    const set = cs[i];
    const setPrefix = `${prefix} conditionSets[${i}]`;

    if (!set.raw || typeof set.raw !== "string" || set.raw.trim() === "") {
      errors.push(`${setPrefix} must have non-empty raw string`);
    }

    const presentFields = [];
    if (set.nozzleTemperature) {
      presentFields.push("nozzleTemperature");
      validateNumericParameter(set.nozzleTemperature, setPrefix, "nozzleTemperature");
    }
    if (set.bedTemperature) {
      presentFields.push("bedTemperature");
      validateNumericParameter(set.bedTemperature, setPrefix, "bedTemperature");
    }
    if (set.printSpeed) {
      presentFields.push("printSpeed");
      validateNumericParameter(set.printSpeed, setPrefix, "printSpeed");
    }

    if (presentFields.length < 2) {
      errors.push(`${setPrefix} must contain at least 2 correlated parameter fields, found ${presentFields.length}: [${presentFields.join(", ")}]`);
    }

    if (set.nozzleTemperature) hasNozzle = true;
    if (set.printSpeed) hasSpeed = true;
  }

  if (hasNozzle && record.nozzleTemperature?.recommended !== null && record.nozzleTemperature?.recommended !== undefined) {
    errors.push(`${prefix} conditionSets contains nozzleTemperature, but top-level nozzleTemperature.recommended must be null (merged values conflict)`);
  }

  if (hasSpeed && record.recommendedPrintSpeed !== null) {
    errors.push(`${prefix} conditionSets contains printSpeed, but top-level recommendedPrintSpeed must be null (merged values conflict)`);
  }
}

function hasParameterValue(record) {
  return Boolean(
    validateTemperature(record.nozzleTemperature, "", "nozzleTemperature") ||
      validateTemperature(record.bedTemperature, "", "bedTemperature") ||
      validateNumericParameter(record.recommendedPrintSpeed, "", "recommendedPrintSpeed") ||
      record.maxVolumetricSpeedMm3s !== null ||
      hasDryingValue(record.dryingRecommendation) ||
      record.hardenedNozzleRequired !== null ||
      record.enclosureRecommended !== null ||
      hasSpoolValue(record.spoolSpecs) ||
      hasAmsValue(record.amsCompatibility) ||
      hasConditionSetValue(record),
  );
}

if (!existsSync(paramsDir)) {
  console.error("ERROR: Directory not found:", paramsDir);
  process.exit(1);
}

let productLines;
try {
  productLines = loadProductLines();
} catch {
  console.error("ERROR: Cannot load product line IDs");
  process.exit(1);
}

const files = readdirSync(paramsDir).filter((file) => file.endsWith(".json"));
const allRecordIds = new Set();
const allProductLineRecordCounts = new Map();

for (const file of files) {
  const raw = readJson(resolve(paramsDir, file));
  const brandProductLineIds = productLines.byBrand.get(raw.brandId);

  if (!raw.brandId) errors.push(`${file}: Missing brandId`);
  if (!Array.isArray(raw.records)) {
    errors.push(`${file}: records must be array`);
    continue;
  }
  if (!brandProductLineIds) {
    errors.push(`${file}: no matching product line file for brandId ${raw.brandId}`);
    continue;
  }

  const brandRecordCounts = new Map();

  for (const record of raw.records) {
    total++;
    const prefix = `${file}/${record.id || "MISSING"}:`;

    for (const field of ["id", "productLineId", "brandId"]) {
      if (!record[field] || typeof record[field] !== "string" || record[field].trim() === "") {
        errors.push(`${prefix} Missing: ${field}`);
      }
    }

    if (record.brandId !== raw.brandId) errors.push(`${prefix} brandId mismatch`);
    if (record.id && allRecordIds.has(record.id)) errors.push(`${prefix} Duplicate parameter record ID`);
    if (record.id) allRecordIds.add(record.id);

    if (!brandProductLineIds.has(record.productLineId)) {
      errors.push(`${prefix} orphan parameter record: productLineId not found for brand ${raw.brandId}: ${record.productLineId}`);
    }

    brandRecordCounts.set(record.productLineId, (brandRecordCounts.get(record.productLineId) || 0) + 1);
    allProductLineRecordCounts.set(record.productLineId, (allProductLineRecordCounts.get(record.productLineId) || 0) + 1);

    if (!SOURCE_STATUSES.includes(record.sourceStatus)) {
      errors.push(`${prefix} Invalid sourceStatus: ${record.sourceStatus}`);
    } else {
      sourceStats[record.sourceStatus]++;
    }

    if (!PARAMETER_STATUSES.includes(record.parameterStatus)) {
      errors.push(`${prefix} Invalid parameterStatus: ${record.parameterStatus}`);
    } else {
      parameterStats[record.parameterStatus]++;
    }

    if (record.verificationStatus !== undefined) {
      errors.push(`${prefix} verificationStatus is deprecated; use sourceStatus and parameterStatus`);
    }

    // conditionSets validation
    validateConditionSets(record, prefix);

    if (validateTemperature(record.nozzleTemperature, prefix, "nozzleTemperature")) completeness.withNozzleTemp++;
    else if (hasConditionSetValue(record) && record.conditionSets.some((s) => s.nozzleTemperature)) completeness.withNozzleTemp++;

    if (validateTemperature(record.bedTemperature, prefix, "bedTemperature")) completeness.withBedTemp++;

    if (validateNumericParameter(record.recommendedPrintSpeed, prefix, "recommendedPrintSpeed")) completeness.withSpeed++;
    else if (hasConditionSetValue(record) && record.conditionSets.some((s) => s.printSpeed)) completeness.withSpeed++;

    if (record.maxVolumetricSpeedMm3s !== null && typeof record.maxVolumetricSpeedMm3s !== "number") {
      errors.push(`${prefix} maxVolumetricSpeedMm3s must be null or number`);
    }

    if (hasDryingValue(record.dryingRecommendation)) completeness.withDrying++;
    if (hasSpoolValue(record.spoolSpecs)) completeness.withSpoolSpecs++;
    if (hasAmsValue(record.amsCompatibility)) completeness.withAmsInfo++;

    if (!AMS_FIT.includes(record.amsCompatibility?.amsFit)) {
      errors.push(`${prefix} Invalid AMS fit: ${record.amsCompatibility?.amsFit}`);
    }

    for (const boolField of ["hardenedNozzleRequired", "enclosureRecommended"]) {
      if (record[boolField] !== null && typeof record[boolField] !== "boolean") {
        errors.push(`${prefix} ${boolField} must be null or boolean`);
      }
    }

    for (const boolField of ["refillable", "cardboardSpool"]) {
      if (record.spoolSpecs?.[boolField] !== null && typeof record.spoolSpecs?.[boolField] !== "boolean") {
        errors.push(`${prefix} spoolSpecs.${boolField} must be null or boolean`);
      }
    }

    if (record.amsCompatibility?.adapterRequired !== null && typeof record.amsCompatibility?.adapterRequired !== "boolean") {
      errors.push(`${prefix} amsCompatibility.adapterRequired must be null or boolean`);
    }

    if (!record.sources || !Array.isArray(record.sources)) {
      errors.push(`${prefix} sources must be an array`);
    } else {
      for (const source of record.sources) {
        if (!SOURCE_STATUSES.includes(source.sourceStatus)) {
          errors.push(`${prefix} Invalid source.sourceStatus: ${source.sourceStatus}`);
        }
      }
    }

    const hasAnyValue = hasParameterValue(record);
    if (record.parameterStatus === "missing" && hasAnyValue) {
      errors.push(`${prefix} parameterStatus=missing but parameter values are present`);
    }
    if ((record.parameterStatus === "partial" || record.parameterStatus === "complete") && !hasAnyValue) {
      errors.push(`${prefix} parameterStatus=${record.parameterStatus} but no parameter values are present`);
    }

    if (!record.sourceNotes || record.sourceNotes.trim() === "") {
      warnings.push(`${prefix} Empty sourceNotes`);
    }
  }

  for (const id of brandProductLineIds) {
    const count = brandRecordCounts.get(id) || 0;
    if (count === 0) {
      errors.push(`${file}: missing parameter record for productLineId ${id}`);
    }
    if (count > 1) {
      errors.push(`${file}: duplicate parameter records for productLineId ${id}: ${count}`);
    }
  }
}

for (const [productLineId, count] of allProductLineRecordCounts) {
  if (count > 1) {
    errors.push(`duplicate parameter records across files for productLineId ${productLineId}: ${count}`);
  }
  if (!productLines.allIds.has(productLineId)) {
    errors.push(`orphan parameter record across files: ${productLineId}`);
  }
}

console.log(`\n=== Filament Parameters Validation ===`);
console.log(`Brand files: ${files.length}`);
console.log(`Total records: ${total}`);
console.log(`\n--- Source Status ---`);
for (const status of SOURCE_STATUSES) {
  console.log(`  ${status}: ${sourceStats[status]}`);
}
console.log(`\n--- Parameter Status ---`);
for (const status of PARAMETER_STATUSES) {
  console.log(`  ${status}: ${parameterStats[status]}`);
}
console.log(`\n--- Completeness (${total} total) ---`);
console.log(`  Nozzle temp:     ${completeness.withNozzleTemp}`);
console.log(`  Bed temp:        ${completeness.withBedTemp}`);
console.log(`  Print speed:     ${completeness.withSpeed}`);
console.log(`  Drying:          ${completeness.withDrying}`);
console.log(`  Spool specs:     ${completeness.withSpoolSpecs}`);
console.log(`  AMS info:        ${completeness.withAmsInfo}`);

if (warnings.length) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  for (const warning of warnings) console.log(`  ⚠  ${warning}`);
}

if (errors.length) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  for (const error of errors) console.log(`  ✗  ${error}`);
  console.log(`\n❌ Validation FAILED`);
  process.exit(1);
}

console.log(`\n✅ Validation PASSED`);
