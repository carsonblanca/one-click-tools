/**
 * validate-filament-product-lines.mjs
 *
 * Dynamically scans data/filaments/product-lines/*.json,
 * validates every product line entry, and reports errors.
 *
 * Usage: node scripts/validate-filament-product-lines.mjs
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dataDir = resolve(root, "data", "filaments", "product-lines");

const ALLOWED_MATERIAL_TYPES = [
  "PLA", "PETG", "TPU", "ABS", "ASA", "PA", "PC",
  "PP", "PE", "POM", "PVA", "HIPS", "TPE",
  "Support", "Composite", "Other",
];

const ALLOWED_VERIFICATION_STATUSES = ["verified", "partial", "pending"];
const ALLOWED_PRESET_SOURCES = ["official", "community", "generated", null];

// Paths that indicate a category/collection/generic page (not a specific product page)
const NON_SPECIFIC_PATH_PATTERNS = [
  /^\/+$/,
  /^\/en\/+$/,
  /^\/collections?$/,
  /^\/collections?\/$/,
  /^\/collections?\/(filaments?|all|all-filaments|shop-all|all-products)/,
  /^\/category$/,
  /^\/categories?$/,
  /^\/categories?\//,
  /^\/en\/collections?/,
  /^\/en\/products?$/,
  /^\/products?$/,
  /^\/en\/products?\/?$/,
  /^\/products?\/filaments?$/,
  /^\/filaments?$/,
  /^\/filaments?\/$/,
];

function isNonSpecificUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return NON_SPECIFIC_PATH_PATTERNS.some((p) => p.test(path));
  } catch {
    return false;
  }
}

function isValidDate(str) {
  if (!str || typeof str !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

const errors = [];
const warnings = [];
let totalFiles = 0;
let totalLines = 0;
let stats = { verified: 0, partial: 0, pending: 0 };
let materialCounts = {};
let brandCounts = {};

if (!existsSync(dataDir)) {
  console.error(`ERROR: Directory not found: ${dataDir}`);
  process.exit(1);
}

const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
totalFiles = files.length;

if (totalFiles === 0) {
  console.error("ERROR: No JSON files found in", dataDir);
  process.exit(1);
}

const allIds = new Set();
const brandData = [];

for (const file of files) {
  const filePath = resolve(dataDir, file);
  let raw;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (e) {
    errors.push(`${file}: Cannot read file: ${e.message}`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    errors.push(`${file}: Invalid JSON: ${e.message}`);
    continue;
  }

  const brandId = data.brandId;
  if (!brandId || typeof brandId !== "string") {
    errors.push(`${file}: Missing or invalid brandId`);
    continue;
  }

  if (!data.brandName || typeof data.brandName !== "string" || data.brandName.trim() === "") {
    errors.push(`${file}: Empty or missing brandName`);
  }

  if (!Array.isArray(data.productLines)) {
    errors.push(`${file}: productLines must be an array`);
    continue;
  }

  brandData.push({ file, brandId, brandName: data.brandName, count: data.productLines.length });
  totalLines += data.productLines.length;

  for (const line of data.productLines) {
    const prefix = `${file}/${line.id || "MISSING_ID"}:`;

    // ── Required string fields ──
    for (const field of ["id", "brandId", "brandName", "materialType", "variant", "productLine", "displayName"]) {
      const val = line[field];
      if (!val || typeof val !== "string" || val.trim() === "") {
        errors.push(`${prefix} Empty or missing field: ${field}`);
      }
    }

    // brandId must match parent
    if (line.brandId !== brandId) {
      errors.push(`${prefix} brandId "${line.brandId}" does not match file brandId "${brandId}"`);
    }

    // Duplicate ID check
    if (line.id) {
      if (allIds.has(line.id)) {
        errors.push(`${prefix} Duplicate product line ID: ${line.id}`);
      }
      allIds.add(line.id);
    }

    // materialType check
    if (line.materialType && !ALLOWED_MATERIAL_TYPES.includes(line.materialType)) {
      errors.push(`${prefix} Invalid materialType: "${line.materialType}"`);
    }

    if (line.materialType) {
      materialCounts[line.materialType] = (materialCounts[line.materialType] || 0) + 1;
    }

    // ── verificationStatus ──
    if (!ALLOWED_VERIFICATION_STATUSES.includes(line.verificationStatus)) {
      errors.push(`${prefix} Invalid verificationStatus: "${line.verificationStatus}"`);
    }

    if (line.verificationStatus) {
      stats[line.verificationStatus] = (stats[line.verificationStatus] || 0) + 1;
    }

    // verified: must have specific product page URL (not category/collection/generic)
    if (line.verificationStatus === "verified") {
      if (!line.officialProductUrl || typeof line.officialProductUrl !== "string" || line.officialProductUrl.trim() === "") {
        errors.push(`${prefix} Verified entry must have officialProductUrl`);
      } else if (isNonSpecificUrl(line.officialProductUrl)) {
        errors.push(`${prefix} Verified entry uses non-specific URL (collection/category/generic page): "${line.officialProductUrl}". Use a specific product page URL or downgrade to partial.`);
      }
    }

    // ── URL format validation ──
    for (const urlField of ["officialProductUrl", "technicalDataUrl", "officialStoreUrl"]) {
      const url = line[urlField];
      if (url && typeof url === "string" && url.trim() !== "") {
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
          errors.push(`${prefix} ${urlField} does not start with http(s): "${url}"`);
        }
      }
    }

    // ── Evidence URLs ──
    if (line.evidence) {
      for (const evField of ["officialColorChartUrl", "technicalDataUrl", "spoolSpecsUrl", "presetDataUrl"]) {
        const evUrl = line.evidence[evField];
        if (evUrl && typeof evUrl === "string" && evUrl.trim() !== "") {
          if (!evUrl.startsWith("https://") && !evUrl.startsWith("http://")) {
            errors.push(`${prefix} evidence.${evField} does not start with http(s): "${evUrl}"`);
          }
        }
      }
    }

    // hasOfficialColorChart requires evidence.officialColorChartUrl
    if (line.hasOfficialColorChart === true && (!line.evidence?.officialColorChartUrl || typeof line.evidence.officialColorChartUrl !== "string" || line.evidence.officialColorChartUrl.trim() === "")) {
      errors.push(`${prefix} hasOfficialColorChart=true but evidence.officialColorChartUrl is missing or empty`);
    }

    // hasTechnicalDataSheet requires evidence.technicalDataUrl
    if (line.hasTechnicalDataSheet === true && (!line.evidence?.technicalDataUrl || typeof line.evidence.technicalDataUrl !== "string" || line.evidence.technicalDataUrl.trim() === "")) {
      errors.push(`${prefix} hasTechnicalDataSheet=true but evidence.technicalDataUrl is missing or empty`);
    }

    // hasSpoolSpecs requires evidence.spoolSpecsUrl
    if (line.hasSpoolSpecs === true && (!line.evidence?.spoolSpecsUrl || typeof line.evidence.spoolSpecsUrl !== "string" || line.evidence.spoolSpecsUrl.trim() === "")) {
      errors.push(`${prefix} hasSpoolSpecs=true but evidence.spoolSpecsUrl is missing or empty`);
    }

    // hasPresetData requires evidence.presetDataUrl
    if (line.hasPresetData === true && (!line.evidence?.presetDataUrl || typeof line.evidence.presetDataUrl !== "string" || line.evidence.presetDataUrl.trim() === "")) {
      errors.push(`${prefix} hasPresetData=true but evidence.presetDataUrl is missing or empty`);
    }

    // ── presetDataSource ──
    if (line.presetDataSource !== undefined && !ALLOWED_PRESET_SOURCES.includes(line.presetDataSource)) {
      errors.push(`${prefix} Invalid presetDataSource: "${line.presetDataSource}"`);
    }

    if (line.presetDataSource === "official" && (!line.evidence?.presetDataUrl || typeof line.evidence.presetDataUrl !== "string" || line.evidence.presetDataUrl.trim() === "")) {
      errors.push(`${prefix} presetDataSource="official" but evidence.presetDataUrl is missing or empty`);
    }

    if (line.hasPresetData === true && !line.presetDataSource) {
      warnings.push(`${prefix} hasPresetData=true but presetDataSource is null/undefined`);
    }

    // ── aliases ──
    if (!Array.isArray(line.aliases)) {
      errors.push(`${prefix} aliases must be an array`);
    }

    // ── boolean fields check ──
    for (const boolField of ["hasOfficialColorChart", "hasTechnicalDataSheet", "hasSpoolSpecs", "hasPresetData"]) {
      if (typeof line[boolField] !== "boolean") {
        errors.push(`${prefix} ${boolField} must be a boolean, got ${typeof line[boolField]}`);
      }
    }

    // ── date format ──
    if (line.lastVerifiedAt !== null && line.lastVerifiedAt !== undefined) {
      if (!isValidDate(line.lastVerifiedAt)) {
        errors.push(`${prefix} Invalid lastVerifiedAt date format: "${line.lastVerifiedAt}". Expected YYYY-MM-DD.`);
      }
    }

    // ── sourceNotes ──
    if (!line.sourceNotes || typeof line.sourceNotes !== "string" || line.sourceNotes.trim() === "") {
      warnings.push(`${prefix} sourceNotes is empty`);
    }

    // ── Series/variant semantic checks ──
    // series must never duplicate materialType
    if (line.series && line.materialType && line.series.toLowerCase() === line.materialType.toLowerCase()) {
      errors.push(`${prefix} series "${line.series}" is identical to materialType "${line.materialType}". Set series to null.`);
    }

    // variant must not be empty
    if (line.variant === null || line.variant === undefined || (typeof line.variant === "string" && line.variant.trim() === "")) {
      errors.push(`${prefix} variant is empty. Use "Standard" if no specific variant exists.`);
    }

    // productLine should not be identical to materialType unless it's truly a bare material
    if (line.productLine && line.materialType && line.productLine.replace(/\s+/g, "") === line.materialType) {
      if (!line.series && line.variant === "Standard") {
        warnings.push(`${prefix} productLine equals materialType ("${line.materialType}") with no series or specific variant. Verify this is intentionally a bare material.`);
      }
    }

    // materialType vs productLine contradiction: materialType should appear in productLine for most cases
    if (line.materialType && line.productLine) {
      const plLower = line.productLine.toLowerCase();
      const mtLower = line.materialType.toLowerCase();
      // Skip for special series-based naming (like "PolyTerra PLA" has "PLA" which is fine)
      // Only flag if the productLine seems to imply a completely different material
      // This is a light check, not exhaustive
    }
  }

  // ── Duplicate normalized names within brand ──
  // Uses materialType|series|variant|productLine to allow distinct products with same base material/variant
  const seenNorm = new Map();
  for (const line of data.productLines) {
    const norm = `${line.materialType}|${line.series}|${line.variant}|${line.productLine}`.toLowerCase();
    if (seenNorm.has(norm)) {
      errors.push(`${file}: Duplicate product line (same materialType+series+variant+productLine): "${norm}" — ids: ${seenNorm.get(norm)} and ${line.id}`);
    }
    seenNorm.set(norm, line.id);
  }

  brandCounts[data.brandName || brandId] = data.productLines.length;
}

// ── Summary ──
console.log(`\n=== Filament Product Lines Validation ===`);
console.log(`Files scanned: ${totalFiles}`);
console.log(`Total product lines: ${totalLines}`);
console.log(`\n--- Verification Status ---`);
console.log(`  verified: ${stats.verified}`);
console.log(`  partial:  ${stats.partial}`);
console.log(`  pending:  ${stats.pending}`);
console.log(`\n--- Material Types ---`);
for (const [mat, count] of Object.entries(materialCounts).sort()) {
  console.log(`  ${mat}: ${count}`);
}
console.log(`\n--- Brands ---`);
for (const [brand, count] of Object.entries(brandCounts).sort()) {
  console.log(`  ${brand}: ${count} product lines`);
}

if (warnings.length > 0) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w}`);
  }
}

if (errors.length > 0) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  for (const e of errors) {
    console.log(`  ✗  ${e}`);
  }
  console.log(`\n❌ Validation FAILED with ${errors.length} error(s).`);
  process.exit(1);
} else {
  console.log(`\n✅ Validation PASSED. All ${totalLines} product lines are valid.`);
}
