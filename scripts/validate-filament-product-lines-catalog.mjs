/**
 * Test script for lib/filaments/product-lines/catalog.ts
 * Loads JSON data independently and verifies catalog functions.
 * Usage: node scripts/validate-filament-product-lines-catalog.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dataDir = resolve(root, "data", "filaments", "product-lines");

let errors = 0;
let passed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    errors++;
    console.error(`  ✗ ${msg}`);
  }
}

// Load all product lines (mimics catalog.ts loadAll logic)
function loadAll() {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const all = [];
  for (const file of files) {
    const raw = readFileSync(resolve(dataDir, file), "utf-8");
    const data = JSON.parse(raw);
    for (const line of data.productLines) {
      all.push(line);
    }
  }
  return Object.freeze(all.map((l) => ({ ...l })));
}

const catalog = loadAll();
console.log(`\n=== Product Lines Catalog Test ===`);
console.log(`Loaded ${catalog.length} product lines from ${dataDir}\n`);

// ── Stats ──
const stats = {
  totalProductLines: catalog.length,
  brandIds: new Set(catalog.map((l) => l.brandId)),
  ids: new Set(catalog.map((l) => l.id)),
  byMaterial: {},
  byVerificationStatus: {},
};
for (const l of catalog) {
  stats.byMaterial[l.materialType] = (stats.byMaterial[l.materialType] || 0) + 1;
  stats.byVerificationStatus[l.verificationStatus] = (stats.byVerificationStatus[l.verificationStatus] || 0) + 1;
}

// ── Test 1: Total count ──
console.log("--- Basic Counts ---");
assert(stats.totalProductLines === 145, `Total product lines: ${stats.totalProductLines} (expected 145)`);
assert(stats.brandIds.size === 10, `Total brands: ${stats.brandIds.size} (expected 10)`);
assert(stats.ids.size === stats.totalProductLines, `Unique IDs: ${stats.ids.size} (all unique)`);

// ── Test 2: ID uniqueness ──
const dupes = [];
const seen = new Set();
for (const l of catalog) {
  if (seen.has(l.id)) dupes.push(l.id);
  seen.add(l.id);
}
assert(dupes.length === 0, `Duplicate IDs: ${dupes.length} (expected 0)`);

// ── Test 3: getProductLinesByBrand ──
console.log("\n--- getProductLinesByBrand ---");
const bambuLines = catalog.filter((l) => l.brandId === "bambu-lab");
assert(bambuLines.length === 23, `Bambu Lab: ${bambuLines.length} lines (expected 23)`);
assert(bambuLines.every((l) => l.brandId === "bambu-lab"), "All Bambu lines have correct brandId");

const sunluLines = catalog.filter((l) => l.brandId === "sunlu");
assert(sunluLines.length === 14, `SUNLU: ${sunluLines.length} lines (expected 14)`);

const prusaLines = catalog.filter((l) => l.brandId === "prusament");
assert(prusaLines.length === 12, `Prusament: ${prusaLines.length} lines (expected 12)`);

const fakeLines = catalog.filter((l) => l.brandId === "fake-brand");
assert(fakeLines.length === 0, `Fake brand: ${fakeLines.length} lines (expected 0)`);

// ── Test 4: getProductLinesByMaterial ──
console.log("\n--- getProductLinesByMaterial ---");
const plaLines = catalog.filter((l) => l.materialType === "PLA");
assert(plaLines.length === 54, `PLA: ${plaLines.length} lines (expected 54)`);

const petgLines = catalog.filter((l) => l.materialType === "PETG");
assert(petgLines.length === 22, `PETG: ${petgLines.length} lines (expected 22)`);

const compositeLines = catalog.filter((l) => l.materialType === "Composite");
assert(compositeLines.length === 8, `Composite: ${compositeLines.length} lines (expected 8)`);

const noSuchLines = catalog.filter((l) => l.materialType === "UNOBTAINIUM");
assert(noSuchLines.length === 0, `Unknown material: ${noSuchLines.length} lines (expected 0)`);

// ── Test 5: getProductLinesBySeries ──
console.log("\n--- getProductLinesBySeries ---");
const polyLiteLines = catalog.filter((l) => l.series?.toLowerCase() === "polylite");
assert(polyLiteLines.length === 5, `PolyLite series: ${polyLiteLines.length} lines (expected 5)`);

const easyLines = catalog.filter((l) => l.series?.toLowerCase() === "easy");
assert(easyLines.length === 2, `Easy series: ${easyLines.length} lines (expected 2: Fiberlogy Easy PLA + Easy PETG)`);

const nullSeriesLines = catalog.filter((l) => l.series === null);
assert(nullSeriesLines.length > 0, `null series: ${nullSeriesLines.length} lines (should be > 0)`);

// ── Test 6: getProductLineById ──
console.log("\n--- getProductLineById ---");
const byId = catalog.find((l) => l.id === "bambu-lab-pla-basic");
assert(Boolean(byId), "Found bamboo-lab-pla-basic");
assert(byId?.productLine === "PLA Basic", `ID lookup productLine: "${byId?.productLine}" (expected "PLA Basic")`);
assert(byId?.materialType === "PLA", `ID lookup materialType: "${byId?.materialType}" (expected "PLA")`);

const notFound = catalog.find((l) => l.id === "nonexistent");
assert(!notFound, "Nonexistent ID returns undefined");

// ── Test 7: Immutability ──
console.log("\n--- Immutability ---");
const originalPLACount = catalog.filter((l) => l.materialType === "PLA").length;
const copyForSplice = catalog.filter((l) => l.materialType === "PLA");
copyForSplice.splice(0, 1);
const afterSpliceCount = catalog.filter((l) => l.materialType === "PLA").length;
assert(afterSpliceCount === originalPLACount, `PLA count unchanged after splice on copy: ${afterSpliceCount} (expected ${originalPLACount})`);
assert(copyForSplice.length === originalPLACount - 1, `Splice modified only the copy: ${copyForSplice.length} (expected ${originalPLACount - 1})`);

// ── Test 8: Stats function ──
console.log("\n--- getProductLineStats ---");
assert(stats.totalProductLines === 145, "Stats total: 145");
assert(stats.brandIds.size === 10, "Stats brands: 10");
assert(stats.ids.size === 145, "Stats unique IDs: 145");

// ── Test 9: Verified count ──
const verified = catalog.filter((l) => l.verificationStatus === "verified");
const partial = catalog.filter((l) => l.verificationStatus === "partial");
const pending = catalog.filter((l) => l.verificationStatus === "pending");
console.log(`\n--- Verification Distribution ---`);
console.log(`  verified: ${verified.length}, partial: ${partial.length}, pending: ${pending.length}`);
assert(verified.length > 0, "Has verified entries");
assert(partial.length > 0, "Has partial entries");
assert(pending.length === 0, "Has zero pending entries");

// ── Test 10: Version list ──
console.log("\n--- Brands List ---");
const brands = [...stats.brandIds].sort();
console.log(`  ${brands.join(", ")}`);
assert(brands.length === 10, "10 unique brands");

console.log("\n--- Materials List ---");
const materials = [...new Set(catalog.map((l) => l.materialType))].sort();
console.log(`  ${materials.join(", ")}`);

// ── Summary ──
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${errors} failed`);
if (errors > 0) {
  console.error("❌ Catalog validation FAILED");
  process.exit(1);
} else {
  console.log("✅ Catalog validation PASSED");
}
