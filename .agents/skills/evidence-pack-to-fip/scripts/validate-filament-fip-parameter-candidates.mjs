#!/usr/bin/env node
// Validate filament FIP parameter candidates against the v3-lite contract.
//
// This is a READ-ONLY audit tool. It does NOT modify the FIP, the database, or
// any production parameter type system. It checks the contract produced by
// build-fip.mjs:
//   - candidateId is a stable 16-char hex hash (recomputed and compared)
//   - canonicalKey is in the allowlist
//   - unit is in the allowlist (or empty for text fields such as materialType)
//   - provenance: OCR candidates carry source.sourceImage + source.ocrTextPath
//     (files must exist in the FIP); evidence-backed candidates carry
//     source.sourceFile + a non-empty source.snippet
//   - contamination count is 0 (no foreignIntrusions, identityVerified === true)
//
// Usage:
//   node validate-filament-fip-parameter-candidates.mjs <fip.zip> [fip.zip ...]
//   node validate-filament-fip-parameter-candidates.mjs --candidates candidates.json --report report.json

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";

const CANONICAL_KEYS = new Set([
  "nozzleTemperature",
  "bedTemperature",
  "recommendedPrintSpeed",
  "dryingRecommendation",
  "density",
  "diameterTolerance",
  "materialType",
  "filamentDiameter",
  "netWeight",
  // physical-property table keys (historical parser output; match production
  // lib/filaments/parameters/normalized-parameters.ts)
  "meltFlowIndex",
  "heatDeflectionTemperature",
  "vicatSofteningTemperature",
  "tensileStrength",
  "elongationAtBreak",
  "flexuralStrength",
  "flexuralModulus",
  "unnotchedImpactStrength",
  "notchedImpactStrength",
]);

const ALLOWED_UNITS = new Set(["°C", "mm", "mm/s", "g/cm³", "g", "kg", "g/10min", "MPa", "%", "kJ/m²", ""]);

function stableHash(parts) {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 16);
}

function stringValue(v) {
  return typeof v === "string" ? v.trim() : "";
}

function readJsonFromZip(files, name) {
  const bytes = files[name];
  if (!bytes) return null;
  return JSON.parse(strFromU8(bytes));
}

function loadCandidatesAndReport(fipPath) {
  const files = unzipSync(readFileSync(fipPath));
  const candidates = readJsonFromZip(files, "parameter-candidates.json");
  const report = readJsonFromZip(files, "parameter-report.json");
  const suspects = (report && Array.isArray(report.suspectCandidates)) ? report.suspectCandidates : [];
  const capture = readJsonFromZip(files, "capture.json") || {};
  const manifest = readJsonFromZip(files, "manifest.json") || {};
  const products = readJsonFromZip(files, "products.json") || [];
  const productLine =
    stringValue(capture.productIdentity && capture.productIdentity.productLine) ||
    stringValue(manifest.productLine) ||
    stringValue(products[0] && products[0].productLine);
  return { files, candidates, suspects, report, productLine };
}

function validateCandidates(candidates, files, productLine, imagesJson) {
  const issues = [];
  let contamination = 0;
  const canonicalKeys = [];
  // FIP stores assets under a hashed path; sourceImage is the stable, ZIP-bound
  // evidence path resolved via images.json (sourcePath -> packagePath).
  const sourcePaths = new Set((imagesJson || []).map((img) => stringValue(img.sourcePath)));
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    const key = stringValue(c.canonicalKey);
    canonicalKeys.push(key);
    if (!CANONICAL_KEYS.has(key)) issues.push(`candidate[${i}] canonicalKey not allowed: ${key}`);
    const unit = typeof c.unit === "string" ? c.unit : "";
    if (!ALLOWED_UNITS.has(unit)) issues.push(`candidate[${i}] unit not allowed: ${unit}`);
    // stable id check
    const expectedId = stableHash([productLine || "", key, stringValue(c.normalizedValue), stringValue(c.source && c.source.sourceImage)]);
    if (stringValue(c.candidateId) !== expectedId) {
      issues.push(`candidate[${i}] unstable candidateId (expected ${expectedId}, got ${stringValue(c.candidateId)})`);
    }
    if (stringValue(c.reviewStatus) !== "pending_review") {
      issues.push(`candidate[${i}] reviewStatus not pending_review: ${stringValue(c.reviewStatus)}`);
    }
    const src = c.source || {};
    const sourceImage = stringValue(src.sourceImage);
    const ocrTextPath = stringValue(src.ocrTextPath);
    const sourceFile = stringValue(src.sourceFile);
    const hasSnippet = stringValue(src.snippet) !== "";
    if (sourceImage || ocrTextPath) {
      if (!sourceImage) issues.push(`candidate[${i}] missing sourceImage`);
      else if (sourcePaths.size && !sourcePaths.has(sourceImage)) {
        issues.push(`candidate[${i}] sourceImage not in images.json: ${sourceImage}`);
      }
      if (!ocrTextPath) issues.push(`candidate[${i}] missing ocrTextPath`);
      else if (!files[ocrTextPath]) issues.push(`candidate[${i}] ocrTextPath not bundled: ${ocrTextPath}`);
      if (!hasSnippet) issues.push(`candidate[${i}] missing source snippet`);
    } else {
      // evidence-backed: requires explicit sourceFile + snippet provenance
      if (!sourceFile) issues.push(`candidate[${i}] missing sourceFile`);
      if (!hasSnippet) issues.push(`candidate[${i}] missing source snippet`);
    }
    // contamination
    if (Array.isArray(c.foreignIntrusions) && c.foreignIntrusions.length) contamination += 1;
    if (c.identityVerified === false) contamination += 1;
  }
  return { issues, contamination, canonicalKeys };
}

// Suspects are plausible=false candidates that were quarantined into
// parameter-report.json. They MUST NOT leak into the formal candidate list.
function validateSuspects(suspects, candidates, files, productLine, sourcePaths) {
  const issues = [];
  const suspectIds = new Set();
  const formalIds = new Set(candidates.map((c) => stringValue(c.candidateId)));
  for (let i = 0; i < suspects.length; i += 1) {
    const s = suspects[i];
    const key = stringValue(s.canonicalKey);
    const id = stringValue(s.candidateId);
    if (!CANONICAL_KEYS.has(key)) issues.push(`suspect[${i}] canonicalKey not allowed: ${key}`);
    if (!id) issues.push(`suspect[${i}] missing candidateId`);
    if (formalIds.has(id)) issues.push(`suspect[${i}] (${id}) leaked into formal candidates — must only appear in report`);
    suspectIds.add(id);
    const src = s.source || {};
    const sourceImage = stringValue(src.sourceImage);
    const ocrTextPath = stringValue(src.ocrTextPath);
    if (!sourceImage) issues.push(`suspect[${i}] missing sourceImage`);
    else if (sourcePaths.size && !sourcePaths.has(sourceImage)) {
      issues.push(`suspect[${i}] sourceImage not in images.json: ${sourceImage}`);
    }
    if (!ocrTextPath) issues.push(`suspect[${i}] missing ocrTextPath`);
    else if (!files[ocrTextPath]) issues.push(`suspect[${i}] ocrTextPath not bundled: ${ocrTextPath}`);
  }
  return { issues, suspectIds };
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("usage: node validate-filament-fip-parameter-candidates.mjs <fip.zip> [...]");
    process.exit(2);
  }
  let hasFailure = false;
  for (const arg of args) {
    if (arg === "--candidates") continue;
    const { files, candidates, suspects, report, productLine } = loadCandidatesAndReport(arg);
    if (!Array.isArray(candidates)) {
      console.log(`\n=== ${arg} ===`);
      console.log("  BUILD: FAIL (no parameter-candidates.json)");
      hasFailure = true;
      continue;
    }
    const imagesJson = readJsonFromZip(files, "images.json") || [];
    const sourcePaths = new Set(imagesJson.map((img) => stringValue(img.sourcePath)));
    const { issues, contamination, canonicalKeys } = validateCandidates(candidates, files, productLine, imagesJson);
    const suspectRes = validateSuspects(suspects, candidates, files, productLine, sourcePaths);
    const rejected = (report && Array.isArray(report.rejectedCandidates)) ? report.rejectedCandidates.length : 0;
    const uniqueKeys = [...new Set(canonicalKeys)];
    const sourceOk = candidates.every((c) => {
      const s = stringValue(c.source && c.source.sourceImage);
      return s && (sourcePaths.size ? sourcePaths.has(s) : true);
    });
    const ocrOk = candidates.every((c) => {
      const o = stringValue(c.source && c.source.ocrTextPath);
      return o && Boolean(files[o]);
    });
    const suspectSourceOk = suspects.every((s) => {
      const im = stringValue(s.source && s.source.sourceImage);
      const o = stringValue(s.source && s.source.ocrTextPath);
      return (!sourcePaths.size || !im || sourcePaths.has(im)) && (!o || Boolean(files[o]));
    });
    const ok = issues.length === 0 && contamination === 0 && suspectRes.issues.length === 0;
    console.log(`\n=== ${arg} ===`);
    console.log(`  product line        : ${productLine || "(unknown)"}`);
    console.log(`  VALID candidates    : ${candidates.length}`);
    console.log(`  SUSPECT candidates  : ${suspects.length}`);
    console.log(`  REJECTED candidates : ${rejected}`);
    console.log(`  contamination count : ${contamination}`);
    console.log(`  canonicalKey list   : ${uniqueKeys.join(", ") || "(none)"}`);
    console.log(`  sourceImage present : ${sourceOk ? "yes" : "NO"}`);
    console.log(`  ocrTextPath present : ${ocrOk ? "yes" : "NO"}`);
    console.log(`  suspect src/ocr ok  : ${suspectSourceOk ? "yes" : "NO"}`);
    console.log(`  build pass          : ${ok ? "YES" : "NO"}`);
    if (issues.length) {
      console.log("  VALID ISSUES:");
      for (const issue of issues) console.log(`    - ${issue}`);
    }
    if (suspectRes.issues.length) {
      console.log("  SUSPECT ISSUES:");
      for (const issue of suspectRes.issues) console.log(`    - ${issue}`);
    }
    if (!ok) hasFailure = true;
  }
  process.exit(hasFailure ? 1 : 0);
}

main();
