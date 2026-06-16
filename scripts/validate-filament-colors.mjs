/**
 * Validates filament color SKU data in data/filaments/colors/
 * Checks: ID uniqueness, productLineId existence, hex/rgb format,
 * completenessStatus, duplicate names, colorValueSource evidence,
 * and per-file stats.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const colorsDir = resolve(root, "data", "filaments", "colors");
const productLinesDir = resolve(root, "data", "filaments", "product-lines");

const ALLOWED_STATUSES = ["verified", "partial", "pending"];
const ALLOWED_SOURCES = ["official", "official-image-estimate", "community", "unknown"];
const ALLOWED_OPACITIES = ["opaque", "translucent", "transparent"];
const ALLOWED_COMPLETENESS = ["complete", "partial", "unknown"];

const errors = [];
const warnings = [];
let totalColors = 0;
let stats = { verified: 0, partial: 0, pending: 0 };
let complStats = { complete: 0, partial: 0, unknown: 0 };
let sourceStats = { official: 0, "official-image-estimate": 0, community: 0, unknown: 0 };
let productLineIds;

// Load product line IDs for cross-reference
try {
  productLineIds = new Set();
  const plFiles = readdirSync(productLinesDir).filter((f) => f.endsWith(".json"));
  for (const f of plFiles) {
    const d = JSON.parse(readFileSync(resolve(productLinesDir, f), "utf-8"));
    for (const l of d.productLines) productLineIds.add(l.id);
  }
} catch {
  console.error("ERROR: Cannot load product line IDs from", productLinesDir);
  process.exit(1);
}

function isValidHex(h) {
  return typeof h === "string" && /^#[0-9A-Fa-f]{6}$/.test(h);
}

function isValidDate(s) {
  if (!s || typeof s !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

if (!existsSync(colorsDir)) {
  console.error(`ERROR: Directory not found: ${colorsDir}`);
  process.exit(1);
}

function scanDir(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) {
      results.push(...scanDir(full));
    } else if (e.name.endsWith(".json")) {
      results.push(full);
    }
  }
  return results;
}

const colorFiles = scanDir(colorsDir);
if (colorFiles.length === 0) {
  console.error("ERROR: No color JSON files found");
  process.exit(1);
}

const allIds = new Set();
const coveredProductLineIds = new Set();
const fileProductLineIdMap = new Map();

for (const filePath of colorFiles) {
  const rel = filePath.replace(colorsDir + "/", "");
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    errors.push(`${rel}: Invalid JSON: ${e.message}`);
    continue;
  }

  if (!data.brandId || typeof data.brandId !== "string") {
    errors.push(`${rel}: Missing brandId`);
    continue;
  }

  if (!Array.isArray(data.colors)) {
    errors.push(`${rel}: colors must be an array`);
    continue;
  }

  // Check that all colors in one file share the same productLineId
  const plIdsInFile = new Set(data.colors.map((c) => c.productLineId));
  if (plIdsInFile.size > 1) {
    errors.push(`${rel}: File contains multiple productLineIds: ${[...plIdsInFile].join(", ")}`);
  }
  const mainPlId = [...plIdsInFile][0];
  if (mainPlId) {
    coveredProductLineIds.add(mainPlId);
    if (fileProductLineIdMap.has(mainPlId)) {
      errors.push(`${rel}: productLineId "${mainPlId}" also used in ${fileProductLineIdMap.get(mainPlId)}`);
    }
    fileProductLineIdMap.set(mainPlId, rel);
  }

  // Check for duplicate official names within same productLineId
  const nameSet = new Map();
  for (const c of data.colors) {
    const key = c.officialName.toLowerCase().trim();
    if (nameSet.has(key)) {
      errors.push(`${rel}: Duplicate officialName "${c.officialName}" (IDs: ${nameSet.get(key)} vs ${c.id})`);
    }
    nameSet.set(key, c.id);
  }

  for (const c of data.colors) {
    totalColors++;
    const prefix = `${rel}/${c.id || "MISSING_ID"}:`;

    // Required fields
    for (const f of ["id", "productLineId", "brandId", "officialName"]) {
      if (!c[f] || typeof c[f] !== "string" || c[f].trim() === "") {
        errors.push(`${prefix} Missing or empty field: ${f}`);
      }
    }

    // brandId must match parent
    if (c.brandId !== data.brandId) {
      errors.push(`${prefix} brandId "${c.brandId}" != parent "${data.brandId}"`);
    }

    // ID uniqueness
    if (c.id) {
      if (allIds.has(c.id)) {
        errors.push(`${prefix} Duplicate global ID: ${c.id}`);
      }
      allIds.add(c.id);
    }

    // productLineId must exist
    if (c.productLineId && !productLineIds.has(c.productLineId)) {
      errors.push(`${prefix} productLineId "${c.productLineId}" not found in product-lines catalog`);
    }

    // verificationStatus
    if (!ALLOWED_STATUSES.includes(c.verificationStatus)) {
      errors.push(`${prefix} Invalid verificationStatus: "${c.verificationStatus}"`);
    }
    if (c.verificationStatus) stats[c.verificationStatus]++;

    // completenessStatus
    if (!ALLOWED_COMPLETENESS.includes(c.completenessStatus)) {
      errors.push(`${prefix} Invalid completenessStatus: "${c.completenessStatus}"`);
    }
    if (c.completenessStatus) complStats[c.completenessStatus]++;

    // complete must have sourceNotes explaining the evidence
    if (c.completenessStatus === "complete" && (!c.sourceNotes || c.sourceNotes.trim().length < 20)) {
      warnings.push(`${prefix} completenessStatus=complete but sourceNotes is insufficient to confirm completeness`);
    }

    // verified requires official source evidence
    if (c.verificationStatus === "verified" && !c.officialProductUrl) {
      errors.push(`${prefix} verified but no officialProductUrl`);
    }

    // colorValueSource
    if (!ALLOWED_SOURCES.includes(c.colorValueSource)) {
      errors.push(`${prefix} Invalid colorValueSource: "${c.colorValueSource}"`);
    }
    if (c.colorValueSource) sourceStats[c.colorValueSource]++;

    // official colorValueSource must have hex AND evidence
    if (c.colorValueSource === "official") {
      if (!c.hex) {
        errors.push(`${prefix} colorValueSource=official but hex is null`);
      }
      if (!c.officialColorSourceUrl) {
        warnings.push(`${prefix} colorValueSource=official but officialColorSourceUrl is missing. Add evidence URL.`);
      }
    }

    // HEX format
    if (c.hex !== null) {
      if (!isValidHex(c.hex)) {
        errors.push(`${prefix} Invalid hex format: "${c.hex}". Expected #RRGGBB.`);
      }
    }

    // RGB range
    if (c.rgb !== null) {
      if (!Array.isArray(c.rgb) || c.rgb.length !== 3) {
        errors.push(`${prefix} rgb must be [r,g,b] array of 3 numbers`);
      } else {
        for (let i = 0; i < 3; i++) {
          if (typeof c.rgb[i] !== "number" || c.rgb[i] < 0 || c.rgb[i] > 255 || !Number.isInteger(c.rgb[i])) {
            errors.push(`${prefix} rgb[${i}] invalid: ${c.rgb[i]}`);
          }
        }
      }
    }

    // hex/rgb consistency: if both present, rgb should match hex
    if (c.hex && c.rgb) {
      const r = parseInt(c.hex.slice(1, 3), 16);
      const g = parseInt(c.hex.slice(3, 5), 16);
      const b = parseInt(c.hex.slice(5, 7), 16);
      if (c.rgb[0] !== r || c.rgb[1] !== g || c.rgb[2] !== b) {
        errors.push(`${prefix} hex ${c.hex} does not match rgb [${c.rgb}]`);
      }
    }

    // hex null warning: generates no color swatch data
    if (c.hex === null && c.completenessStatus !== "unknown") {
      warnings.push(`${prefix} hex=null but completenessStatus is "${c.completenessStatus}". No color swatch data available.`);
    }

    // opacity
    if (c.opacity !== null && !ALLOWED_OPACITIES.includes(c.opacity)) {
      errors.push(`${prefix} Invalid opacity: "${c.opacity}"`);
    }

    // hasPhysicalSwatch must have evidence
    if (c.hasPhysicalSwatch === true) {
      warnings.push(`${prefix} hasPhysicalSwatch=true. Verify this is based on real swatch evidence, not product images.`);
    }

    // dates
    if (c.lastVerifiedAt !== null && c.lastVerifiedAt !== undefined) {
      if (!isValidDate(c.lastVerifiedAt)) {
        errors.push(`${prefix} Invalid lastVerifiedAt: "${c.lastVerifiedAt}"`);
      }
    }

    // booleans
    for (const bf of ["hasOfficialColorChart", "hasPhysicalSwatch"]) {
      if (typeof c[bf] !== "boolean") {
        errors.push(`${prefix} ${bf} must be boolean`);
      }
    }

    // aliases
    if (!Array.isArray(c.aliases)) {
      errors.push(`${prefix} aliases must be an array`);
    }

    // sourceNotes
    if (!c.sourceNotes || typeof c.sourceNotes !== "string" || c.sourceNotes.trim() === "") {
      warnings.push(`${prefix} sourceNotes is empty`);
    }
  }
}

// Coverage report
const uncovered = [...productLineIds].filter((id) => !coveredProductLineIds.has(id));

console.log(`\n=== Filament Colors Validation ===`);
console.log(`Color files: ${colorFiles.length}`);
console.log(`Total colors: ${totalColors}`);
console.log(`\n--- Verification Status ---`);
console.log(`  verified: ${stats.verified}`);
console.log(`  partial:  ${stats.partial}`);
console.log(`  pending:  ${stats.pending}`);
console.log(`\n--- Completeness Status ---`);
console.log(`  complete: ${complStats.complete}`);
console.log(`  partial:  ${complStats.partial}`);
console.log(`  unknown:  ${complStats.unknown}`);
console.log(`\n--- Color Value Source ---`);
for (const [k, v] of Object.entries(sourceStats)) {
  console.log(`  ${k}: ${v}`);
}
console.log(`\n--- Product Line Coverage ---`);
console.log(`  Covered: ${coveredProductLineIds.size}/${productLineIds.size}`);
if (uncovered.length > 0) {
  console.log(`  Uncovered: ${uncovered.join(", ")}`);
}

// Per-file stats
console.log(`\n--- Colors Per Product Line ---`);
for (const [plId, file] of [...fileProductLineIdMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const d = JSON.parse(readFileSync(resolve(colorsDir, file), "utf-8"));
  console.log(`  ${plId}: ${d.colors.length} colors (${file})`);
}

if (warnings.length > 0) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  for (const w of warnings) console.log(`  ⚠  ${w}`);
}

if (errors.length > 0) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  for (const e of errors) console.log(`  ✗  ${e}`);
  console.log(`\n❌ Validation FAILED`);
  process.exit(1);
}

console.log(`\n✅ Validation PASSED. All ${totalColors} colors valid.`);
