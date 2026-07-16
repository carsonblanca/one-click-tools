#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function argsOf(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) fail("Usage: build-fip.mjs --input <zip> --output <fip.zip> [--catalog-root <dir>]");
    result[key.slice(2)] = value;
  }
  return result;
}

function unsafePath(name) {
  return name.startsWith("/") || name.includes("../") || name.includes("..\\") || name.includes("\\") || name.includes("\0");
}

function json(files, name) {
  if (!files[name]) fail(`Missing required evidence file: ${name}`);
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    fail(`Invalid JSON: ${name}`);
  }
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function productLineFrom(capture, meta) {
  const title = text(meta.userProvidedProductName) || text(meta.pageTitle);
  const titleMatch = title.match(/THE\s+K\d+\s*[™®]?\s*([A-Z][A-Z0-9-]*)/i);
  if (titleMatch) return `THE ${titleMatch[0].match(/K\d+/i)?.[0].toUpperCase()} ${titleMatch[1].toUpperCase()}`;
  return text(capture.productIdentity?.productLine).replace(/\s+F$/i, "");
}

function exactCatalogMatches(displayName, catalogRoot) {
  const matches = [];
  for (const name of readdirSync(catalogRoot).filter((item) => item.endsWith(".json")).sort()) {
    const path = join(catalogRoot, name);
    const data = JSON.parse(readFileSync(path, "utf8"));
    for (const item of Array.isArray(data.productLines) ? data.productLines : []) {
      if (item.displayName === displayName) {
        matches.push({
          id: item.id,
          displayName: item.displayName,
          source: `data/filaments/product-lines/${name}`,
        });
      }
    }
  }
  return matches;
}

function candidate(field, rawValue, normalizedValue, unit, confidence, status, sourceText, testCondition = null) {
  return {
    field,
    rawValue,
    normalizedValue,
    unit,
    confidence,
    reviewStatus: status,
    publicVisible: confidence === "high" && status === "confirmed",
    sourceFile: field === "filamentDiameter" || field === "netWeight" ? "color-mappings.json" : "ocr/ocr-raw.txt",
    sourceText,
    testCondition,
  };
}

function numericCandidates(ocr, mappings, identityConflict) {
  const skuText = mappings.map((item) => text(item.sourceText)).join(" | ");
  const result = [];
  const diameter = skuText.match(/-(\d+(?:\.\d+)?)-[A-Z]/i)?.[1];
  const kg = skuText.match(/-(\d+(?:\.\d+)?)KG/i)?.[1];
  if (diameter) result.push(candidate("filamentDiameter", diameter, diameter, "mm", "high", "confirmed", skuText));
  if (kg) result.push(candidate("netWeight", `${kg}KG`, String(Number(kg) * 1000), "g", "high", "confirmed", skuText));

  const status = identityConflict ? "conflict" : "candidate";
  const confidence = identityConflict ? "low" : "medium";
  const specs = [
    ["diameterOptions", /1\.75\/3\s*mm/i, "1.75/3", "mm"],
    ["netWeightOptions", /0\.5\/1\/3\s*kg/i, "0.5/1/3", "kg"],
    ["diameterTolerance", /[+±]\s*0\.03\s*mm/i, "0.03", "mm"],
    ["density", /1\.20\s*g\/cm3/i, "1.20", "g/cm³"],
    ["meltFlowIndex", /30\s*[~～-]\s*40\s*g\/10min/i, "30-40", "g/10min"],
    ["heatDeflectionTemperature", /107\s*°?C/i, "107", "°C"],
    ["vicatSofteningTemperature", /116\s*°?C/i, "116", "°C"],
    ["tensileStrength", /65\s*[~～-]\s*75/i, "65-75", "MPa"],
    ["elongationAtBreak", /11\s*[~～-]\s*16/i, "11-16", "%"],
    ["flexuralStrength", /90\s*[~～-]\s*93/i, "90-93", "MPa"],
    ["flexuralModulus", /2200\s*[~～-]\s*2400/i, "2200-2400", "MPa"],
    ["unnotchedImpactStrength", /35\s*[~～-]\s*40/i, "35-40", "kJ/m²"],
    ["notchedImpactStrength", /2\s*[~～-]\s*4/i, "2-4", "kJ/m²"],
    ["nozzleTemperature", /250\s*[-~～]\s*270\s*[Y°]?C/i, "250-270", "°C"],
  ];
  for (const [field, pattern, normalized, unit] of specs) {
    const match = ocr.match(pattern);
    if (match) result.push(candidate(field, match[0], normalized, unit, confidence, status, match[0], field === "meltFlowIndex" ? "260°C / 1.2 kg" : null));
  }
  return result;
}

const options = argsOf(process.argv.slice(2));
if (!options.input || !options.output) fail("Usage: build-fip.mjs --input <zip> --output <fip.zip> [--catalog-root <dir>]");
const inputPath = resolve(options.input);
const outputPath = resolve(options.output);
const inputBytes = new Uint8Array(readFileSync(inputPath));
let files;
try {
  files = unzipSync(inputBytes);
} catch {
  fail("Input is not a readable ZIP");
}
const badPath = Object.keys(files).find(unsafePath);
if (badPath) fail(`Unsafe archive path: ${badPath}`);

const capture = json(files, "capture.json");
const meta = json(files, "page.meta.json");
const mappings = json(files, "color-mappings.json");
const imageIndex = json(files, "images.json");
json(files, "parameter-evidence.json");
if (!Array.isArray(mappings) || !Array.isArray(imageIndex)) fail("Color or image index is not an array");
const ocr = files["ocr/ocr-raw.txt"] ? strFromU8(files["ocr/ocr-raw.txt"]) : "";
const brand = text(capture.productIdentity?.brand).toUpperCase();
const material = text(capture.productIdentity?.material).toUpperCase();
const productLine = productLineFrom(capture, meta);
if (!brand || !productLine || !material) fail("Product identity is incomplete");
if (brand !== "KEXCELLED") fail(`Unsupported brand: ${brand}`);
const displayName = `Kexcelled ${productLine}`;
const catalogRoot = resolve(options["catalog-root"] || join(process.cwd(), "data/filaments/product-lines"));
const duplicateMatches = exactCatalogMatches(displayName, catalogRoot);
const identityConflict = /\bPC\s+K7\b/i.test(ocr) && !/\bK7\b/i.test(productLine);
const parameters = numericCandidates(ocr, mappings, identityConflict);

const imageByPath = new Map(imageIndex.map((item) => [text(item.localPath), item]));
const missingColorImages = mappings.filter((item) => text(item.imageStatus) !== "available" || !files[text(item.imagePath)]);
const requiredColorPaths = mappings.map((item) => text(item.imagePath)).filter(Boolean);
const candidateProductPaths = [];
for (const image of imageIndex) {
  const sources = Array.isArray(image.discoveredFrom) ? image.discoveredFrom : [];
  if (sources.includes("product_image") && (image.pageSection === "detail_description" || image.pageSection === "unknown")) {
    const path = text(image.localPath);
    if (files[path]) candidateProductPaths.push(path);
  }
}
const retainedPaths = new Set(requiredColorPaths);
const assetBudgetBytes = 3_500_000;
let retainedBytes = requiredColorPaths.reduce((sum, path) => sum + (files[path]?.byteLength || 0), 0);
const prioritizedProductPaths = [
  ...(files["images/0012.jpg"] ? ["images/0012.jpg"] : []),
  ...candidateProductPaths,
];
for (const path of prioritizedProductPaths) {
  if (retainedPaths.has(path)) continue;
  const byteSize = files[path]?.byteLength || 0;
  if (!byteSize || retainedBytes + byteSize > assetBudgetBytes) continue;
  retainedPaths.add(path);
  retainedBytes += byteSize;
}
const images = [...retainedPaths].sort().map((sourcePath) => {
  const image = imageByPath.get(sourcePath) || {};
  return {
    imageId: text(image.id) || `image-${basename(sourcePath)}`,
    sourcePath,
    packagePath: `assets/${sourcePath}`,
    sourceUrl: text(image.originalUrl),
    role: mappings.some((item) => text(item.imagePath) === sourcePath) ? "color" : "product",
    byteSize: files[sourcePath]?.byteLength || 0,
  };
});

const colors = mappings.map((item, index) => ({
  colorId: `k8-pc-${text(item.officialColorCode).toLowerCase() || index + 1}`,
  nameZh: text(item.colorName),
  displayNameZhCN: text(item.colorName),
  displayNameZhTW: text(item.colorName),
  displayNameEn: null,
  officialColorCode: text(item.officialColorCode) || null,
  colorCodeType: "manufacturer_sku_code",
  localImagePath: text(item.imagePath),
  visualAssetId: text(item.imagePath),
  visualAssetType: "manufacturer_sku_image",
  rawSkuText: text(item.sourceText),
  skuId: text(item.skuId),
  variantId: text(item.variantId),
  imageStatus: text(item.imageStatus),
  sourceStatus: "marketplace_official_store",
  evidenceRefs: [`color-${index + 1}`],
  requiresManualReview: true,
  confidence: item.confidence === "high" ? 0.95 : 0.6,
}));

const requiredMissing = [];
if (!displayName) requiredMissing.push("productName");
if (!brand) requiredMissing.push("brand");
if (!material) requiredMissing.push("material");
if (!parameters.some((item) => item.field === "filamentDiameter")) requiredMissing.push("filamentDiameter");
if (!parameters.some((item) => item.field === "netWeight")) requiredMissing.push("netWeight");
if (!colors.length) requiredMissing.push("colors");
if (missingColorImages.length) requiredMissing.push("colorImages");
const reasons = [];
if (duplicateMatches.length) reasons.push(`EXACT_NAME_DUPLICATE:${displayName}`);
if (requiredMissing.length) reasons.push(`MISSING_REQUIRED:${requiredMissing.join(",")}`);
if (identityConflict) reasons.push("PARAMETER_IDENTITY_CONFLICT:OCR table says PC K7 while captured product is THE K8 PC");
const autoPublishEligible = !duplicateMatches.length && !requiredMissing.length;
const sourceHash = hash(inputBytes);
const sourceRunId = `opencode-${text(meta.savedAt).replace(/[^0-9]/g, "").slice(0, 14) || Date.now()}-${sourceHash.slice(0, 8)}`;
const createdAt = new Date().toISOString();

const manifest = {
  schemaVersion: "fip.v1",
  packageId: sourceRunId,
  sourceRunId,
  createdAt,
  importerVersion: "import-filament-evidence-zip/1.0.0",
  brand,
  sourcePackageCount: 1,
  sourcePackageNames: [basename(inputPath)],
  sourcePackageHashes: [sourceHash],
  brandCandidates: [brand],
  productLineCandidates: [productLine],
  materialTypeCandidates: [material],
  languageHints: ["zh-CN", "en"],
  totalAssetCount: images.length,
  totalPackageSizeBytes: inputBytes.byteLength,
  importStatus: autoPublishEligible ? "ready_for_review" : "ready_for_review",
  requiresManualReview: true,
  warnings: reasons,
  importDecision: {
    autoPublishEligible,
    exactNameDuplicate: duplicateMatches.length > 0,
    duplicateMatches,
    requiredMissing,
    reasons,
  },
};

const product = {
  brandId: "kexcelled",
  brandDisplayNameZhCN: "Kexcelled",
  brandDisplayNameZhTW: "Kexcelled",
  brandDisplayNameEn: "Kexcelled",
  productLineId: productLine.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  productLine,
  productLineNameZhCN: productLine,
  productLineNameZhTW: productLine,
  productLineNameEn: productLine,
  displayName,
  materialType: material,
  variant: "Standard",
  diameterMm: Number(parameters.find((item) => item.field === "filamentDiameter")?.normalizedValue) || null,
  netWeightG: Number(parameters.find((item) => item.field === "netWeight")?.normalizedValue) || null,
  sourceStatus: "captured_official_store",
  translationStatus: "source_preserved",
  colors,
  parameters: {
    filamentDiameter: parameters.find((item) => item.field === "filamentDiameter") || null,
    netWeight: parameters.find((item) => item.field === "netWeight") || null,
    nozzleTemperature: parameters.find((item) => item.field === "nozzleTemperature") || null,
    bedTemperature: null,
    printSpeed: null,
    dryingTemperature: null,
    dryingDuration: null,
    amsCompatibility: null,
    nozzleRequirement: null,
    printNotes: null,
    parameterStatus: identityConflict ? "partial" : "official",
    evidenceRefs: ["identity", "ocr-spec-table"],
    requiresManualReview: true,
    rawCandidates: parameters,
  },
  notes: reasons.join("; "),
  evidenceRefs: ["identity", "colors", "ocr-spec-table"],
};

const evidence = [
  {
    evidenceId: "identity",
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: "capture.json",
    sourceType: "structured_capture",
    extractedAssetId: null,
    extractionMethod: "capture.v1",
    cropCoordinates: null,
    ocrText: "",
    ocrConfidence: null,
    fieldBindings: ["brand", "productLine", "material"],
    notes: text(meta.url),
  },
  {
    evidenceId: "ocr-spec-table",
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: "images/0012.jpg",
    sourceType: "ocr_candidate",
    extractedAssetId: "assets/images/0012.jpg",
    extractionMethod: "existing_ocr_summary",
    cropCoordinates: null,
    ocrText: "PC K7 table: diameter/weight/tolerance and mechanical values; identity conflicts with K8 capture",
    ocrConfidence: 0.8,
    fieldBindings: parameters.filter((item) => item.confidence !== "high").map((item) => item.field),
    notes: "Candidate only; full OCR text intentionally omitted.",
  },
  ...colors.map((color, index) => ({
    evidenceId: `color-${index + 1}`,
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: color.localImagePath,
    sourceType: "sku_color_mapping",
    extractedAssetId: `assets/${color.localImagePath}`,
    extractionMethod: "color-mappings.json",
    cropCoordinates: null,
    ocrText: "",
    ocrConfidence: null,
    fieldBindings: [`colors.${index}`],
    notes: color.rawSkuText,
  })),
];

const report = {
  originalImageCount: imageIndex.length,
  retainedImageCount: images.length,
  discardedImageCount: imageIndex.length - images.length,
  originalImageBytes: imageIndex.reduce((sum, item) => sum + (Number(item.sizeBytes) || 0), 0),
  retainedAssetBytes: images.reduce((sum, item) => sum + item.byteSize, 0),
  fipSizeBytes: 0,
  savingRatio: null,
  ocrImageCount: Number(meta.ocrImagesCompleted) || 0,
  colorCandidateCount: colors.length,
  parameterCandidateCount: parameters.length,
  unresolvedCount: parameters.filter((item) => item.reviewStatus !== "confirmed").length + requiredMissing.length,
  warnings: reasons,
  importDecision: manifest.importDecision,
};

const outputFiles = {
  "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  "products.json": strToU8(JSON.stringify([product], null, 2)),
  "colors.json": strToU8(JSON.stringify(colors, null, 2)),
  "parameter-candidates.json": strToU8(JSON.stringify(parameters, null, 2)),
  "images.json": strToU8(JSON.stringify(images, null, 2)),
  "evidence.json": strToU8(JSON.stringify(evidence, null, 2)),
  "package-report.json": strToU8(JSON.stringify(report, null, 2)),
  "ocr/images.json": strToU8(JSON.stringify({ processed: Number(meta.ocrImagesCompleted) || 0, retainedFullText: false }, null, 2)),
};
for (const image of images) outputFiles[image.packagePath] = files[image.sourcePath];
const zipped = zipSync(outputFiles, { level: 6 });
writeFileSync(outputPath, zipped);

process.stdout.write(`${JSON.stringify({
  input: inputPath,
  output: outputPath,
  sourceRunId,
  productName: displayName,
  brand,
  material,
  quantitativeParameterCount: parameters.length,
  confirmedParameterCount: parameters.filter((item) => item.reviewStatus === "confirmed").length,
  candidateOrConflictParameterCount: parameters.filter((item) => item.reviewStatus !== "confirmed").length,
  colorCount: colors.length,
  imageCount: images.length,
  missingFields: requiredMissing,
  exactNameDuplicate: duplicateMatches.length > 0,
  duplicateMatches,
  autoPublishEligible,
  reviewReasons: reasons,
  fipBytes: zipped.byteLength,
  inputSha256: sourceHash,
}, null, 2)}\n`);
