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

function slug(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function scopedProductLineId(brandId, productLine) {
  return `${brandId}-${slug(productLine.replace(/^THE\s+/i, ""))}`;
}

function normalizedIdentity(value) {
  return text(value).toUpperCase().replace(/[™®\s]/g, "").replace(/[^A-Z0-9]/g, "");
}

function officialSpecTable(ocr, productLine) {
  const target = normalizedIdentity(productLine);
  const matches = ocr.split(/(?=^SOURCE:\s)/m).filter((block) => (
    normalizedIdentity(block).includes(target)
    && /密度/.test(block)
    && /测试标准/.test(block)
  ));
  if (matches.length !== 1) {
    fail(`Expected one official specification table for ${productLine}, found ${matches.length}`);
  }
  return {
    sourcePath: text(matches[0].match(/^SOURCE:\s*(.+)$/m)?.[1]),
    text: matches[0],
  };
}

function officialColorKey(productLineId, item, index) {
  const sourceSkuId = text(item.skuId);
  const colorCode = text(item.officialColorCode);
  const normalizedName = slug(item.colorName);
  const suffix = sourceSkuId
    ? `sku:${sourceSkuId}`
    : colorCode
      ? `code:${colorCode.toLowerCase()}`
      : `name:${normalizedName || index + 1}`;
  return `${productLineId}:${suffix}`;
}

function productLineFrom(capture, meta) {
  const capturedProductLine = text(capture.productIdentity?.productLine);
  if (capturedProductLine) return capturedProductLine;
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

function candidate(field, rawValue, normalizedValue, unit, confidence, status, sourceText, testCondition = null, options = {}) {
  return {
    field,
    canonicalKey: field,
    rawValue,
    normalizedValue,
    unit,
    confidence,
    reviewStatus: status,
    publicVisible: confidence === "high" && ["confirmed", "official"].includes(status),
    sourceFile: options.sourceFile || "ocr/ocr-raw.txt",
    sourceText,
    testCondition,
    productLineId: options.productLineId,
    officialRawName: options.officialRawName || field,
    trusted: status === "official",
  };
}

function numericCandidates(ocr, mappings, productLineId, specTable) {
  const lines = specTable.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const findLine = (pattern) => lines.find((line) => pattern.test(line)) || "";
  const range = (line) => line.match(/(\d+(?:\.\d+)?)\s*[~～\-–]\s*(\d+(?:\.\d+)?)/);
  const single = (line) => line.match(/(\d+(?:\.\d+)?)/);
  const options = (officialRawName) => ({
    sourceFile: specTable.sourcePath,
    productLineId,
    officialRawName,
  });
  const skuText = mappings.map((item) => text(item.sourceText)).join(" | ");
  const result = [];
  const header = specTable.text.match(/线径\s+重量\s+公差\s*\n\s*(\d+(?:\.\d+)?)\s*mm\s+(\d+(?:\.\d+)?)\s*kg\s+[+±]\s*(\d+(?:\.\d+)?)\s*mm/i);
  if (!header) fail(`Official specification header is unreadable for ${productLineId}`);
  result.push(candidate("filamentDiameter", `${header[1]} mm`, header[1], "mm", "high", "official", header[0], null, options("线径")));
  result.push(candidate("netWeight", `${header[2]} kg`, header[2], "kg", "high", "official", header[0], null, options("重量")));
  result.push(candidate("diameterTolerance", `±${header[3]} mm`, `±${header[3]}`, "mm", "high", "official", header[0], null, options("公差")));

  const specs = [
    ["density", /^密度/, "g/cm³", "密度", null],
    ["meltFlowIndex", /^熔融指数/, "g/10min", "熔融指数", "230°C / 2.16 kg"],
    ["heatDeflectionTemperature", /^热变形温度/, "°C", "热变形温度", "0.45 MPa / 120°C/h"],
    ["vicatSofteningTemperature", /^维卡软化温度/, "°C", "维卡软化温度", "10 N / 120°C/h"],
    ["tensileStrength", /^拉伸强度/, "MPa", "拉伸强度", null],
    ["elongationAtBreak", /^拉伸断裂伸长率/, "%", "拉伸断裂伸长率", null],
    ["flexuralStrength", /^弯曲强度/, "MPa", "弯曲强度", null],
    ["flexuralModulus", /^弯曲模量/, "MPa", "弯曲模量", null],
    ["unnotchedImpactStrength", /^无缺口冲击强度/, "kJ/m²", "无缺口冲击强度", null],
    ["notchedImpactStrength", /^缺口冲击强度/, "kJ/m²", "缺口冲击强度", null],
  ];
  for (const [field, pattern, unit, rawName, testCondition] of specs) {
    const line = findLine(pattern);
    if (!line) fail(`Missing official parameter row ${rawName} for ${productLineId}`);
    const matchedRange = range(line);
    const matchedTemperature = unit === "°C" ? line.match(/(\d+(?:\.\d+)?)\s*°?C\b/i) : null;
    const matchedSingle = matchedTemperature || single(line.replace(rawName, ""));
    const normalized = matchedRange ? `${matchedRange[1]}–${matchedRange[2]}` : matchedSingle?.[1];
    if (!normalized) fail(`Unreadable official parameter row ${rawName} for ${productLineId}`);
    result.push(candidate(field, line, normalized, unit, "high", "official", line, testCondition, options(rawName)));
  }
  return result;
}

function fieldValue(item) {
  const value = text(item.normalizedValue) || text(item.rawValue);
  const unit = text(item.unit);
  return value ? `${value}${unit ? ` ${unit}` : ""}` : "";
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
const brandId = brand.toLowerCase();
const productLineId = scopedProductLineId(brandId, productLine);
const productKey = productLineId;
const displayName = `Kexcelled ${productLine}`;
const catalogRoot = resolve(options["catalog-root"] || join(process.cwd(), "data/filaments/product-lines"));
const duplicateMatches = exactCatalogMatches(displayName, catalogRoot);
const specTable = officialSpecTable(ocr, productLine);
const parameters = numericCandidates(ocr, mappings, productLineId, specTable);

const imageByPath = new Map(imageIndex.map((item) => [text(item.localPath), item]));
const missingColorImages = mappings.filter((item) => !text(item.imagePath) || !files[text(item.imagePath)]);
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
  ...(files[specTable.sourcePath] ? [specTable.sourcePath] : []),
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
    brandId,
    productLineId,
    productKey,
  };
});

const colors = mappings.map((item, index) => {
  const matchKey = officialColorKey(productLineId, item, index);
  return ({
  colorId: matchKey,
  matchKey,
  brandId,
  productLineId,
  productKey,
  sourceSkuId: text(item.skuId),
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
  });
});

const requiredMissing = [];
if (!displayName) requiredMissing.push("productName");
if (!brand) requiredMissing.push("brand");
if (!material) requiredMissing.push("material");
if (!parameters.some((item) => item.field === "filamentDiameter" && ["confirmed", "official"].includes(item.reviewStatus) && !item.skuVariantSpecific)) {
  requiredMissing.push("filamentDiameter");
}
if (!parameters.some((item) => item.field === "netWeight" && ["confirmed", "official"].includes(item.reviewStatus) && !item.skuVariantSpecific)) {
  requiredMissing.push("netWeight");
}
if (!colors.length) requiredMissing.push("colors");
if (missingColorImages.length) requiredMissing.push("colorImages");
const reasons = [];
if (duplicateMatches.length) reasons.push(`EXACT_NAME_DUPLICATE:${displayName}`);
if (requiredMissing.length) reasons.push(`MISSING_REQUIRED:${requiredMissing.join(",")}`);
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
  brandId,
  productLineId,
  productKey,
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
  brandId,
  brandDisplayNameZhCN: "Kexcelled",
  brandDisplayNameZhTW: "Kexcelled",
  brandDisplayNameEn: "Kexcelled",
  productLineId,
  productKey,
  productLine,
  productLineNameZhCN: productLine,
  productLineNameZhTW: productLine,
  productLineNameEn: productLine,
  displayName,
  materialType: material,
  variant: "Standard",
  diameterMm: Number(parameters.find((item) => item.field === "filamentDiameter" && item.reviewStatus === "official")?.normalizedValue) || null,
  netWeightG: Number(parameters.find((item) => item.field === "netWeight" && item.reviewStatus === "official")?.normalizedValue) * 1000 || null,
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
    parameterStatus: parameters.length ? "partial" : "missing",
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
    brandId,
    productLineId,
    productKey,
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
    brandId,
    productLineId,
    productKey,
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: specTable.sourcePath,
    sourceType: "ocr_candidate",
    extractedAssetId: `assets/${specTable.sourcePath}`,
    extractionMethod: "existing_ocr_summary",
    cropCoordinates: null,
    ocrText: `${productLine} official specification table: ${parameters.length} quantitative parameters.`,
    ocrConfidence: 0.82,
    fieldBindings: parameters.map((item) => item.field),
    notes: "Scoped to the matching productLineId; full OCR text intentionally omitted.",
  },
  ...colors.map((color, index) => ({
    evidenceId: `color-${index + 1}`,
    brandId,
    productLineId,
    productKey,
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
  unresolvedCount: parameters.filter((item) => !["confirmed", "official"].includes(item.reviewStatus)).length + requiredMissing.length,
  warnings: reasons,
  importDecision: manifest.importDecision,
  expectedDraft: {
    parameterFieldCount: parameters.length,
    parameterCandidateCount: parameters.length,
    parameterEvidenceCount: parameters.length,
    colorCount: colors.length,
    colorImageRelationCount: colors.filter((color) => color.imageStatus === "available" && color.localImagePath).length,
    missingProductDefaults: requiredMissing.filter((field) => field === "filamentDiameter" || field === "netWeight"),
  },
};

const draftPatch = {
  identityScope: {
    brandId,
    productLineId,
    productKey,
  },
  productDefaults: {
    diameterMm: product.diameterMm,
    netWeightG: product.netWeightG,
  },
  parameters: {
    fields: Object.fromEntries(parameters.filter((item) => item.reviewStatus === "official").map((item) => [item.field, fieldValue(item)]).filter(([, value]) => value)),
    unmappedFields: {},
    candidates: parameters,
    sourceEvidence: parameters.map((item) => ({
      field: item.field,
      sourceFile: item.sourceFile,
      sourceText: item.sourceText,
      confidence: item.confidence,
      reviewStatus: item.reviewStatus,
      testCondition: item.testCondition,
      productLineId,
      officialRawName: item.officialRawName,
    })),
    status: requiredMissing.length ? "official_partial" : "official",
    reviewNote: "Imported from the official specification table scoped to this productLineId.",
  },
};

const outputFiles = {
  "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  "products.json": strToU8(JSON.stringify([product], null, 2)),
  "colors.json": strToU8(JSON.stringify(colors, null, 2)),
  "parameter-candidates.json": strToU8(JSON.stringify(parameters, null, 2)),
  "images.json": strToU8(JSON.stringify(images, null, 2)),
  "evidence.json": strToU8(JSON.stringify(evidence, null, 2)),
  "package-report.json": strToU8(JSON.stringify(report, null, 2)),
  "draft-patch.json": strToU8(JSON.stringify(draftPatch, null, 2)),
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
  productLineId,
  productKey,
  brand,
  material,
  quantitativeParameterCount: parameters.length,
  confirmedParameterCount: parameters.filter((item) => ["confirmed", "official"].includes(item.reviewStatus)).length,
  candidateOrConflictParameterCount: parameters.filter((item) => !["confirmed", "official"].includes(item.reviewStatus)).length,
  colorCount: colors.length,
  imageCount: images.length,
  missingFields: requiredMissing,
  exactNameDuplicate: duplicateMatches.length > 0,
  duplicateMatches,
  autoPublishEligible,
  expectedDraft: report.expectedDraft,
  reviewReasons: reasons,
  fipBytes: zipped.byteLength,
  inputSha256: sourceHash,
}, null, 2)}\n`);
