#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { CANONICAL_PARAMETER_FIELDS, buildOcrParameterCandidates, stableHash } from "./parameter-enrichment.mjs";
import { resolveKexcelledProductLine } from "./product-identity-resolver.mjs";
import { isOfficialPhysicalPropertyTable, parseOfficialPhysicalProperties } from "./physical-property-table.mjs";

const BUILDER_VERSION = "evidence-pack-to-fip.v4";
const REQUIRED_EVIDENCE_FILES = [
  "capture.json",
  "color-mappings.json",
  "images.json",
  "page.meta.json",
  "page.txt",
  "README.md",
];
const REQUIRED_FIP_FILES = [
  "manifest.json",
  "products.json",
  "colors.json",
  "evidence.json",
  "package-report.json",
  "images.json",
  "parameter-candidates.json",
  "parameter-report.json",
];
const SAFE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
// deterministic abbreviation->English map; no AI translation or Chinese guessing
const OFFICIAL_ABBREVIATION_MAP = {
  BLK: "Black",
  WHT: "White",
  NAT: "Natural",
  RED: "Red",
  PUR: "Purple",
  BLU: "Blue",
  GRN: "Green",
  PNK: "Pink",
  ORN: "Orange",
  YLW: "Yellow",
  GRY: "Gray",
  BRN: "Brown",
  COP: "Copper",
  GLD: "Gold",
  SLV: "Silver",
};

function deriveColorNameEn(mappings, officialColorCode) {
  for (const mapping of mappings) {
    const raw = mapping && typeof mapping === "object" && !Array.isArray(mapping) ? mapping : {};
    const explicitEn = stringValue(raw.colorNameEn);
    if (explicitEn) return explicitEn;
  }
  const code = stringValue(officialColorCode).toUpperCase();
  if (code && OFFICIAL_ABBREVIATION_MAP[code]) return OFFICIAL_ABBREVIATION_MAP[code];
  return "";
}


function fail(message) {
  throw new Error(message);
}

function unsafePath(name) {
  return name.startsWith("/")
    || name.includes("../")
    || name.includes("..\\")
    || name.includes("\\")
    || name.includes("\0");
}

function readJson(files, name) {
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    fail(`${name} is not valid JSON`);
  }
}

function objectValue(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be a JSON object`);
  return value;
}

function arrayValue(value, name) {
  if (!Array.isArray(value)) fail(`${name} must be a JSON array`);
  return value;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function rawStringValue(value) {
  return typeof value === "string" ? value : "";
}

// Official physical-property table selection. The same table is often OCRed in
// both a page screenshot block (screenshots/*) and a standalone product image
// block (images/*); prefer the standalone image block so duplicate tables are
// not treated as a genuine ambiguity. Reuses the historical parser unchanged.
function selectOfficialPhysicalPropertyTableCompat(tables, productLine) {
  const matches = tables.filter((table) => (
    isOfficialPhysicalPropertyTable(stringValue(table?.text), productLine)
  ));
  if (matches.length <= 1) return matches[0] || null;
  const standalone = matches.filter((table) => /^images\//.test(stringValue(table?.sourcePath)));
  if (standalone.length === 1) return standalone[0];
  fail(`Ambiguous official specification tables for ${productLine}: found ${matches.length}`);
}

function parsedFromPhysicalValue(value) {
  const normalized = String(value).trim().replace(/[~～—−-]/g, "–").replace(/\s*–\s*/g, "–");
  const range = normalized.match(/^(-?\d+(?:\.\d+)?)[–](-?\d+(?:\.\d+)?)$/);
  if (range) return { operator: "range", value: null, min: parseFloat(range[1]), max: parseFloat(range[2]) };
  const eq = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
  if (eq) return { operator: "eq", value: parseFloat(eq[1]), min: null, max: null };
  return { operator: "eq", value: null, min: null, max: null };
}

function jsonBytes(value) {
  return strToU8(`${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlaceholderImageUrl(value) {
  const url = stringValue(value).toLowerCase();
  if (!url) return false;
  const fileName = url.split(/[?#]/)[0].split("/").pop() || "";
  const explicit = /(?:placeholder|(?:^|[-_])tps[-_]2[-_]2(?:[-_.]|$))/;
  const filenamePattern = /(?:^|[-_])(?:no[-_]?image|image[-_]?not[-_]?found|missing[-_]?image|default[-_]?image|dummy|spacer|blank|transparent|loading|lazyload|pixel|1x1)(?:[-_.]|$)/;
  return explicit.test(fileName) || filenamePattern.test(fileName);
}

function normalizedImageStatus(mapping, evidenceFiles) {
  const imageUrl = stringValue(mapping.imageUrl);
  const imagePath = stringValue(mapping.imagePath);
  const inputStatus = stringValue(mapping.imageStatus).toLowerCase();
  if (isPlaceholderImageUrl(imageUrl) || inputStatus === "placeholder") return "placeholder";
  if (inputStatus === "missing" || (!imageUrl && !imagePath)) return "missing";
  if (imagePath && evidenceFiles[imagePath]) return "available";
  if (inputStatus === "available") fail(`Available image is missing from Evidence Pack: ${imagePath || imageUrl || "unknown"}`);
  return "missing";
}

function officialColorCodeFromMapping(mapping) {
  const explicitCode = stringValue(mapping.officialColorCode).toUpperCase();
  if (explicitCode) return { code: explicitCode, recovered: false };
  const sourceText = stringValue(mapping.sourceText);
  const skuCodeMatch = sourceText.match(/(?:^|[-\s])\d+(?:\.\d+)?-([A-Z][A-Z0-9]{1,15})-\d+(?:\.\d+)?(?:KG|G)(?:\b|(?=[^A-Z]))/i);
  return { code: skuCodeMatch ? skuCodeMatch[1].toUpperCase() : "", recovered: Boolean(skuCodeMatch) };
}

function spoolTypeFromMapping(mapping) {
  const source = `${stringValue(mapping.sourceText)} ${stringValue(mapping.colorName)}`;
  return /(?:无盘|补充装|refill|spool[-\s]?free|spoolless|no\s+spool)/i.test(source) ? "refill" : "spool";
}

function baseColorNameZh(value) {
  return stringValue(value).replace(/[-\s]*(?:无盘|补充装|refill)\s*$/i, "").trim();
}

function primarySkuPriority(variant) {
  if (variant.spoolType === "spool" && variant.imageStatus === "available") return 1;
  if (variant.spoolType === "spool" && variant.imageStatus === "placeholder") return 2;
  if (variant.spoolType === "refill" && variant.imageStatus === "available") return 3;
  return 4;
}

function canonicalColorKey(brand, productLine, officialColorCode) {
  return `${stringValue(brand).toUpperCase()}|${stringValue(productLine).toUpperCase()}|${stringValue(officialColorCode).toUpperCase()}`;
}

function buildDefaultOutputPath(inputPath) {
  const inputName = basename(inputPath);
  const stem = inputName.toLowerCase().endsWith(".evidence-pack.zip")
    ? inputName.slice(0, -".evidence-pack.zip".length)
    : inputName.replace(/\.zip$/i, "");
  return resolve(dirname(inputPath), `${stem}.filament-import.zip`);
}

function buildFip(inputPath, outputPath) {
  const inputBytes = new Uint8Array(readFileSync(inputPath));
  let evidenceFiles;
  try {
    evidenceFiles = unzipSync(inputBytes);
  } catch {
    fail("Input is not a readable Evidence Pack ZIP");
  }
  const unsafeInputPath = Object.keys(evidenceFiles).find(unsafePath);
  if (unsafeInputPath) fail(`Evidence Pack contains unsafe path: ${unsafeInputPath}`);
  const missing = REQUIRED_EVIDENCE_FILES.filter((name) => !evidenceFiles[name]);
  if (missing.length) fail(`Evidence Pack is missing: ${missing.join(", ")}`);

  const capture = objectValue(readJson(evidenceFiles, "capture.json"), "capture.json");
  const rawColors = arrayValue(readJson(evidenceFiles, "color-mappings.json"), "color-mappings.json");
  const evidenceImageMetadata = arrayValue(readJson(evidenceFiles, "images.json"), "images.json");
  const rawParameterEvidence = evidenceFiles["parameter-evidence.json"]
    ? arrayValue(readJson(evidenceFiles, "parameter-evidence.json"), "parameter-evidence.json")
    : [];
  const pageMeta = objectValue(readJson(evidenceFiles, "page.meta.json"), "page.meta.json");
  const identity = objectValue(capture.productIdentity || {}, "capture.json.productIdentity");
  const brand = stringValue(identity.brand).toUpperCase();
  if (brand !== "KEXCELLED") fail(`Current production FIP importer only supports KEXCELLED; received ${brand || "empty brand"}`);

  const inputHash = sha256(inputBytes);
  const captureDigits = stringValue(identity.captureTime).replace(/\D/g, "").slice(0, 14) || "unknown";
  const sourceRunId = `capture-${captureDigits}-${inputHash.slice(0, 12)}`;
  const sourceZipName = basename(inputPath);
  const warnings = [];
  const productLine = resolveKexcelledProductLine(evidenceFiles, identity);
  const seenVariantIds = new Set();
  const sourceImages = new Map(evidenceImageMetadata.map((image) => [
    stringValue(image.localPath),
    image && typeof image === "object" && !Array.isArray(image) ? image : {},
  ]));
  const assetsBySourcePath = new Map();
  const fipImageMetadata = [];
  const colorGroups = new Map();
  const rawSkus = [];

  for (let index = 0; index < rawColors.length; index += 1) {
    const mapping = objectValue(rawColors[index], `color-mappings.json[${index}]`);
    const variantId = stringValue(mapping.variantId);
    if (variantId && seenVariantIds.has(variantId)) {
      warnings.push(`Duplicate SKU variant skipped: ${variantId}`);
      continue;
    }
    if (variantId) seenVariantIds.add(variantId);

    const imageStatus = normalizedImageStatus(mapping, evidenceFiles);
    const sourceImagePath = imageStatus === "available" ? stringValue(mapping.imagePath) : "";
    const imageUrl = stringValue(mapping.imageUrl);
    let packagePath = "";
    if (sourceImagePath) {
      if (unsafePath(sourceImagePath)) fail(`Unsafe color image path: ${sourceImagePath}`);
      const extension = extname(sourceImagePath).toLowerCase();
      if (!SAFE_IMAGE_EXTENSIONS.has(extension)) fail(`Unsupported color image extension: ${sourceImagePath}`);
      if (!assetsBySourcePath.has(sourceImagePath)) {
        const assetBytes = evidenceFiles[sourceImagePath];
        const assetHash = sha256(assetBytes);
        packagePath = `assets/${assetHash.slice(0, 16)}${extension}`;
        assetsBySourcePath.set(sourceImagePath, { packagePath, assetBytes });
        const sourceMetadata = sourceImages.get(sourceImagePath) || {};
        fipImageMetadata.push({
          sourcePath: sourceImagePath,
          packagePath,
          sourceUrl: imageUrl || stringValue(sourceMetadata.originalUrl),
          imageRole: "sku_thumbnail",
          imageSource: stringValue(mapping.imageSource),
          imageStatus,
          sharedImage: false,
          requiresManualReview: true,
        });
      } else {
        packagePath = assetsBySourcePath.get(sourceImagePath).packagePath;
      }
    }

    const colorName = stringValue(mapping.colorName);
    const codeResult = officialColorCodeFromMapping(mapping);
    const officialColorCode = codeResult.code;
    if (!officialColorCode) fail(`SKU has no official color code: ${stringValue(mapping.sourceText) || variantId || `index ${index}`}`);
    if (codeResult.recovered) warnings.push(`Official color code recovered from SKU source text: ${officialColorCode}`);
    const skuId = stringValue(mapping.skuId);
    const sourceText = stringValue(mapping.sourceText);
    const imageSource = stringValue(mapping.imageSource);
    const spoolType = spoolTypeFromMapping(mapping);
    const skuVariant = {
      rawSkuText: sourceText,
      sourceText,
      availability: "unknown",
      canonicalColorKey: canonicalColorKey(brand, productLine, officialColorCode),
      variantId,
      skuId,
      spoolType,
      imagePath: stringValue(mapping.imagePath),
      imageStatus,
      imageSource,
      imagePackagePath: packagePath,
      sourceEvidence: [{ file: "color-mappings.json", domIndex: index, skuText: sourceText }],
    };
    rawSkus.push(skuVariant);
    const groupKey = canonicalColorKey(brand, productLine, officialColorCode);
    if (!colorGroups.has(groupKey)) {
      colorGroups.set(groupKey, { officialColorCode, variants: [], namesZh: [], rawMappings: [] });
    }
    const group = colorGroups.get(groupKey);
    group.variants.push(skuVariant);
    group.namesZh.push(baseColorNameZh(colorName)); group.rawMappings.push(mapping);
  }

  const colors = [...colorGroups.values()].map((group) => {
    const primarySkuVariant = group.variants.reduce((primary, candidate) => (
      primarySkuPriority(candidate) < primarySkuPriority(primary) ? candidate : primary
    ));
    const colorNameZh = baseColorNameZh(
      group.namesZh.find(Boolean)
      || primarySkuVariant.sourceText.match(/[（(]([^）)]+)[）)]/)?.[1]
      || "",
    );
    const primaryImagePath = primarySkuVariant.imageStatus === "available" ? primarySkuVariant.imagePath : "";
    return {
      officialColorCode: group.officialColorCode,
      colorNameZh,
      colorNameEn: deriveColorNameEn(group.rawMappings, group.officialColorCode),
      sourceText: primarySkuVariant.sourceText,
      colorName: colorNameZh,
      variantId: primarySkuVariant.variantId,
      skuId: primarySkuVariant.skuId,
      imagePath: primaryImagePath,
      imageSource: primarySkuVariant.imageSource,
      imageStatus: primarySkuVariant.imageStatus,
      nameZh: colorNameZh,
      nameEn: deriveColorNameEn(group.rawMappings, group.officialColorCode),
      availability: "unknown",
      imageCandidateUrl: "",
      localImagePath: primaryImagePath,
      imageSourceMethod: primarySkuVariant.imageSource,
      imagePackagePath: primarySkuVariant.imagePackagePath,
      requiresManualReview: true,
      reviewStatus: "pending_review",
      skuVariants: group.variants,
      primarySkuVariant,
      sourceEvidence: group.variants.flatMap((variant) => variant.sourceEvidence),
    };
  });
  const imageUseCounts = rawSkus.reduce((counts, variant) => {
    if (variant.imagePath && variant.imageStatus === "available") {
      counts.set(variant.imagePath, (counts.get(variant.imagePath) || 0) + 1);
    }
    return counts;
  }, new Map());
  for (const image of fipImageMetadata) image.sharedImage = (imageUseCounts.get(image.sourcePath) || 0) > 1;
  const parameterCandidates = rawParameterEvidence.map((entry, index) => {
    const evidence = objectValue(entry, `parameter-evidence.json[${index}]`);
    return {
      fieldCandidate: stringValue(evidence.candidateField),
      value: "",
      sourceText: rawStringValue(evidence.sourceText),
      sourceMethod: stringValue(evidence.sourceMethod),
      confidence: stringValue(evidence.confidence),
      reviewStatus: "pending",
    };
  });
  const materialType = stringValue(identity.material);
  const diameter = stringValue(identity.diameter || identity.diameterMm);
  // OCR text that already exists in the Evidence Pack becomes canonical manufacturer
  // parameters here, before parameter-candidates.json is written. No consumer of the
  // FIP has to re-derive parameters at upload time.
  const ocrResult = buildOcrParameterCandidates(evidenceFiles, {
    brand,
    productLine,
    material: stringValue(identity.material),
  }, sourceRunId);
  const ocrCandidates = ocrResult.candidates;
  const ocrSuspectCandidates = ocrResult.suspectCandidates || [];
  for (const candidate of ocrCandidates) {
    if (!stringValue(candidate.source && candidate.source.sourceImage)) {
      warnings.push(`OCR parameter ${candidate.canonicalKey} references a source image that is not bundled: ${candidate.source && candidate.source.sourceImage}`);
    }
  }
  if (ocrSuspectCandidates.length) {
    warnings.push(`${ocrSuspectCandidates.length} suspect OCR parameter candidate(s) (plausible=false) were quarantined and excluded from the formal candidate list`);
  }
  // Bridge parameter-evidence.json rows to canonical parameter candidates.
  // The authoritative mapping lives in the production canonical schema
  // (lib/filaments/parameters/normalized-parameters.ts: FILAMENT_PARAMETER_DEFINITIONS
  // / resolveCanonicalParameterKey): materialType is canonical, "diameter" is an
  // alias of filamentDiameter, and manufacturer has NO canonical key. This script
  // runs as plain `node` with no TS loader, so it cannot import that resolver;
  // keep this minimal compat map in sync with the canonical schema and do not
  // extend it with custom fields. Rows without a derivable value (e.g.
  // manufacturer, which is not a canonical parameter) stay evidence-only.
  const EVIDENCE_FIELD_TO_CANONICAL_KEY = {
    materialType: "materialType",
    diameter: "filamentDiameter",
  };
  const deriveEvidenceValue = (evidence) => {
    const canonicalKey = EVIDENCE_FIELD_TO_CANONICAL_KEY[stringValue(evidence.fieldCandidate)];
    if (!canonicalKey) return null;
    const snippet = rawStringValue(evidence.sourceText);
    if (canonicalKey === "materialType") {
      if (!materialType) return null;
      return {
        canonicalKey,
        value: materialType,
        unit: "",
        parsed: { operator: "eq", value: null, min: null, max: null },
        snippet,
      };
    }
    if (canonicalKey === "filamentDiameter") {
      if (diameter) {
        return {
          canonicalKey,
          value: diameter,
          unit: "mm",
          parsed: { operator: "eq", value: parseFloat(diameter) || null, min: null, max: null },
          snippet,
        };
      }
      // Prefer a value with an explicit mm unit; fall back to a decimal value
      // in the filament-diameter range (0.5-4) so product-name numbers such as
      // "THE K5" or "3D" are never mistaken for the diameter.
      const unitMatch = snippet.match(/(\d+(?:\.\d+)?)\s*mm/i);
      let derivedDiameter = unitMatch ? unitMatch[1] : "";
      if (!derivedDiameter) {
        const decimalMatch = snippet.match(/(\d+\.\d+)/);
        const candidate = decimalMatch ? parseFloat(decimalMatch[1]) : NaN;
        if (!Number.isNaN(candidate) && candidate >= 0.5 && candidate <= 4) derivedDiameter = String(candidate);
      }
      if (!derivedDiameter) return null;
      return {
        canonicalKey,
        value: derivedDiameter,
        unit: "mm",
        parsed: { operator: "eq", value: parseFloat(derivedDiameter) || null, min: null, max: null },
        snippet,
      };
    }
    return null;
  };
  const evidenceCandidates = [];
  const seenEvidenceCandidates = new Set();
  for (const candidate of parameterCandidates) {
    const derived = deriveEvidenceValue(candidate);
    if (!derived) continue;
    // De-duplicate like the OCR path: one candidate per (canonicalKey, value).
    const dedupKey = `${derived.canonicalKey}|${derived.value}`;
    if (seenEvidenceCandidates.has(dedupKey)) continue;
    seenEvidenceCandidates.add(dedupKey);
    const normalizedValue = derived.value + derived.unit;
    evidenceCandidates.push({
      candidateId: stableHash([
        productLine || "",
        derived.canonicalKey,
        normalizedValue,
        "",
      ]),
      canonicalKey: derived.canonicalKey,
      rawValue: derived.value,
      normalizedValue,
      unit: derived.unit,
      parsed: derived.parsed,
      confidence: "single_line",
      source: {
        ocrTextPath: "",
        sourceImage: "",
        sourceFile: "parameter-evidence.json",
        snippet: derived.snippet,
      },
      identityVerified: true,
      foreignIntrusions: [],
      plausible: true,
      reviewStatus: "pending_review",
    });
  }
  // Physical properties from the official specification table in ocr/ocr-raw.txt.
  // The table parsing logic is the historical parser ported verbatim; only the
  // table selection (standalone image block preferred) and the candidate shape
  // are adapted to the current skill contract.
  const ocrRawText = evidenceFiles["ocr/ocr-raw.txt"]
    ? strFromU8(evidenceFiles["ocr/ocr-raw.txt"])
    : "";
  const physicalCandidates = [];
  let officialPhysicalTableSource = null;
  if (ocrRawText) {
    const tables = ocrRawText.split(/(?=^SOURCE:\s)/m).map((block) => ({
      sourcePath: stringValue(block.match(/^SOURCE:\s*(.+)$/m)?.[1]),
      text: block,
    }));
    const specTable = selectOfficialPhysicalPropertyTableCompat(tables, productLine);
    if (specTable) {
      officialPhysicalTableSource = specTable.sourcePath;
      for (const property of parseOfficialPhysicalProperties(specTable.text)) {
        const parsed = parsedFromPhysicalValue(property.normalizedValue);
        const normalizedValue = `${property.normalizedValue}${property.unit}`;
        physicalCandidates.push({
          candidateId: stableHash([productLine || "", property.canonicalKey, normalizedValue, ""]),
          canonicalKey: property.canonicalKey,
          rawValue: property.sourceText,
          normalizedValue,
          unit: property.unit,
          parsed,
          confidence: "official_table",
          source: {
            ocrTextPath: "",
            sourceImage: "",
            sourceFile: "ocr/ocr-raw.txt",
            snippet: property.sourceText,
          },
          identityVerified: true,
          foreignIntrusions: [],
          plausible: true,
          reviewStatus: "pending_review",
        });
      }
    }
  }
  const allCandidates = [...evidenceCandidates, ...physicalCandidates, ...ocrCandidates];
  const product = {
    brand,
    productLine,
    materialType: stringValue(identity.material),
    variant: stringValue(identity.variant),
    diameterMm: diameter ? parseFloat(diameter) || null : null,
    netWeightG: null,
    parameters: {},
    rawSkus,
  };
  const statusCounts = colors.reduce((counts, color) => {
    counts[color.imageStatus] = (counts[color.imageStatus] || 0) + 1;
    return counts;
  }, { available: 0, placeholder: 0, missing: 0 });
  const ocrSourceNames = ocrResult.ocrTextCount
    ? ["ocr/index.json", ...ocrResult.usedOcrPaths]
    : [];
  const evidenceSourceNames = [
    ...REQUIRED_EVIDENCE_FILES,
    ...(evidenceFiles["parameter-evidence.json"] ? ["parameter-evidence.json"] : []),
    ...(evidenceFiles["ocr/ocr-raw.txt"] ? ["ocr/ocr-raw.txt"] : []),
    ...ocrSourceNames,
  ];
  const sourceFiles = evidenceSourceNames.map((name) => `evidence/source/${name}`);
  const retainedAssetBytes = [...assetsBySourcePath.values()].reduce((total, asset) => total + asset.assetBytes.length, 0);
  if (statusCounts.placeholder) warnings.push(`${statusCounts.placeholder} color mappings use explicit placeholder images`);
  if (statusCounts.missing) warnings.push(`${statusCounts.missing} color mappings have no downloadable image asset`);

  const manifest = {
    schemaVersion: "fip.kexcelled.v1",
    packageType: "filament_import_draft",
    sourceRunId,
    brand,
    sourceZipName,
    sourceZipHash: inputHash,
    generatedAt: new Date().toISOString(),
    builderVersion: BUILDER_VERSION,
    sourceEvidenceStatus: "available",
    ocrIncluded: ocrSourceNames.length > 0,
    parameterCandidatesIncluded: allCandidates.length > 0,
    requiresManualReview: true,
    importStatus: "draft",
    totalAssetCount: assetsBySourcePath.size,
  };
  const evidence = {
    sourceRunId,
    sourceZipName,
    sourceZipHash: inputHash,
    sourceFiles,
    capture,
    pageMeta,
    parameterCandidateEvidence: rawParameterEvidence,
    physicalPropertyEvidence: {
      sourceFile: officialPhysicalTableSource ? "ocr/ocr-raw.txt" : null,
      tableSource: officialPhysicalTableSource,
      acceptedCount: physicalCandidates.length,
    },
    ocrParameterEvidence: {
      sourceImageCount: ocrResult.sourceImageCount,
      ocrTextCount: ocrResult.ocrTextCount,
      acceptedCount: ocrCandidates.length,
      suspectCount: ocrSuspectCandidates.length,
      rejections: ocrResult.rejections,
      suspectCandidates: ocrSuspectCandidates.map((c) => ({
        candidateId: c.candidateId,
        canonicalKey: c.canonicalKey,
        normalizedValue: c.normalizedValue,
        unit: c.unit,
        confidence: c.confidence,
        source: {
          sourceImage: c.source && c.source.sourceImage,
          ocrTextPath: c.source && c.source.ocrTextPath,
          snippet: c.source && c.source.snippet,
        },
      })),
    },
  };
  const report = {
    sourceRunId,
    builderVersion: BUILDER_VERSION,
    sourceColorCount: rawColors.length,
    colorCount: colors.length,
    canonicalColorCount: colors.length,
    rawSkuCount: rawSkus.length,
    originalSkuCount: rawColors.length,
    finalColorCount: colors.length,
    mergedSkuVariantCount: rawColors.length - colors.length,
    spoolPrimaryCount: colors.filter((color) => color.primarySkuVariant.spoolType === "spool").length,
    refillVariantCount: rawSkus.filter((variant) => variant.spoolType === "refill").length,
    availableImageCount: statusCounts.available,
    placeholderImageCount: statusCounts.placeholder,
    missingImageCount: statusCounts.missing,
    retainedImageCount: assetsBySourcePath.size,
    retainedAssetBytes,
    parameterCandidateCount: allCandidates.length,
    coreParameterCandidateCount: allCandidates.length,
    ocrSourceImageCount: ocrResult.sourceImageCount,
    ocrTextCount: ocrResult.ocrTextCount,
    physicalParameterCandidateCount: physicalCandidates.length,
    physicalTableSource: officialPhysicalTableSource,
    ocrParameterCandidateCount: ocrCandidates.length,
    ocrSuspectCandidateCount: ocrSuspectCandidates.length,
    ocrRejectedCount: ocrResult.rejections.length,
    unresolvedCount: statusCounts.placeholder + statusCounts.missing,
    conflictCount: 0,
    warnings,
  };

  // v3-lite parameter report. No sync rate, no fixed denominator: every
  // detected/accepted/rejected item is enumerated explicitly.
  const sourceImagesWithCandidates = new Set(
    ocrCandidates.map((c) => stringValue(c.source && c.source.sourceImage)),
  );
  const missingReasons = [];
  if (!ocrResult.ocrTextCount) {
    missingReasons.push("no ocr/index.json or no OCR text entries found");
  }
  for (const entry of ocrResult.rejections) {
    missingReasons.push(
      `${entry.reason}${entry.intrusions && entry.intrusions.length ? ` (${entry.intrusions.join(",")})` : ""} @ ${entry.sourceImage || entry.ocrTextPath || "?"}`,
    );
  }
  const paramReport = {
    builderVersion: BUILDER_VERSION,
    sourceRunId,
    productLine,
    detectedParameters: [...ocrCandidates, ...physicalCandidates].map((c) => c.canonicalKey),
    generatedCandidates: [...ocrCandidates, ...physicalCandidates].map((c) => ({
      candidateId: c.candidateId,
      canonicalKey: c.canonicalKey,
      normalizedValue: c.normalizedValue,
      unit: c.unit,
      confidence: c.confidence,
      sourceImage: c.source && c.source.sourceImage,
      ocrTextPath: c.source && c.source.ocrTextPath,
    })),
    suspectCandidates: ocrSuspectCandidates.map((c) => ({
      candidateId: c.candidateId,
      canonicalKey: c.canonicalKey,
      normalizedValue: c.normalizedValue,
      unit: c.unit,
      confidence: c.confidence,
      plausibleReason: "unit_mismatch_or_out_of_range",
      source: {
        ocrTextPath: c.source && c.source.ocrTextPath,
        sourceImage: c.source && c.source.sourceImage,
        snippet: c.source && c.source.snippet,
      },
    })),
    rejectedCandidates: ocrResult.rejections,
    missingReasons,
  };

  const outputFiles = {
    "assets/": new Uint8Array(),
    "manifest.json": jsonBytes(manifest),
    "products.json": jsonBytes([product]),
    "colors.json": jsonBytes(colors),
    "evidence.json": jsonBytes(evidence),
    "package-report.json": jsonBytes(report),
    "images.json": jsonBytes(fipImageMetadata),
    "parameter-candidates.json": jsonBytes(allCandidates),
    "parameter-report.json": jsonBytes(paramReport),
  };
  for (const name of evidenceSourceNames) outputFiles[`evidence/source/${name}`] = evidenceFiles[name];
  for (const asset of assetsBySourcePath.values()) outputFiles[asset.packagePath] = asset.assetBytes;
  // Preserve OCR text files so every candidate's source.ocrTextPath resolves
  // inside the FIP (auditable provenance; no re-OCR at upload time).
  for (const name of evidenceSourceNames) {
    if (name.startsWith("ocr/") && name.endsWith(".txt")) {
      outputFiles[name] = evidenceFiles[name];
    }
  }

  const outputBytes = zipSync(outputFiles, { level: 6 });
  const verification = verifyFip(outputBytes, {
    expectedColorCount: colors.length,
    expectedOriginalSkuCount: rawColors.length,
    expectedSourcePaths: assetsBySourcePath,
    expectedParameterCandidates: allCandidates,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, outputBytes);
  return { outputPath, outputSizeBytes: outputBytes.length, ...verification };
}

function verifyFip(bytes, expectations) {
  const files = unzipSync(bytes);
  const missing = REQUIRED_FIP_FILES.filter((name) => !files[name]);
  if (missing.length) fail(`Generated FIP is missing: ${missing.join(", ")}`);
  if (!files["assets/"] && !Object.keys(files).some((name) => name.startsWith("assets/"))) fail("Generated FIP has no assets/ directory");
  const manifest = objectValue(readJson(files, "manifest.json"), "generated manifest.json");
  const products = arrayValue(readJson(files, "products.json"), "generated products.json");
  const colors = arrayValue(readJson(files, "colors.json"), "generated colors.json");
  const images = arrayValue(readJson(files, "images.json"), "generated images.json");
  const parameters = arrayValue(readJson(files, "parameter-candidates.json"), "generated parameter-candidates.json");
  const report = objectValue(readJson(files, "package-report.json"), "generated package-report.json");
  if (manifest.brand !== "KEXCELLED" || !stringValue(manifest.sourceRunId)) fail("Generated manifest is not accepted by the current KEXCELLED FIP parser");
  if (products.length !== 1) fail(`Generated FIP must contain one product; found ${products.length}`);
  if (colors.length !== expectations.expectedColorCount) fail(`Generated color count mismatch: ${colors.length}`);
  if (parameters.length !== expectations.expectedParameterCandidates.length) {
    fail(`Generated parameter candidate count mismatch: ${parameters.length}`);
  }
  for (let index = 0; index < parameters.length; index += 1) {
    const actual = parameters[index];
    const expected = expectations.expectedParameterCandidates[index];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`Parameter evidence changed at index ${index}`);
    // All candidates are v3-lite canonical candidates generated at build time.
    if (!CANONICAL_PARAMETER_FIELDS.includes(stringValue(actual.canonicalKey))) {
      fail(`Parameter candidate ${index} is not a canonical field: ${actual.canonicalKey}`);
    }
    if (!actual.candidateId || !/^[0-9a-f]{16}$/.test(stringValue(actual.candidateId))) {
      fail(`Parameter candidate ${index} has an unstable or missing candidateId`);
    }
    if (!stringValue(actual.normalizedValue)) fail(`Parameter candidate ${index} has no normalized value`);
    if (typeof actual.unit !== "string") fail(`Parameter candidate ${index} has no unit field`);
    // HARDENING: a suspect (plausible=false) candidate MUST NOT be in the formal
    // parameter-candidates.json. Those belong only in parameter-report.json's
    // suspectCandidates list.
    if (actual.plausible === false) fail(`Parameter candidate ${index} is a suspect (plausible=false) and must not be a formal candidate`);
    const src = actual.source || {};
    // Provenance, narrow: OCR candidates must carry both a source image and its
    // OCR text path. Evidence-backed candidates (page-text rows) may omit
    // image/OCR provenance ONLY when they carry an explicit sourceFile plus a
    // non-empty evidence snippet; a candidate with no provenance never passes.
    const hasImage = stringValue(src.sourceImage) !== "";
    const hasOcr = stringValue(src.ocrTextPath) !== "";
    const hasSourceFile = stringValue(src.sourceFile) !== "";
    const hasSnippet = stringValue(src.snippet) !== "";
    if (hasImage || hasOcr) {
      if (hasImage !== hasOcr) fail(`Parameter candidate ${index} has mismatched source image/OCR text path provenance`);
      if (!hasSnippet) fail(`Parameter candidate ${index} has OCR provenance but no source snippet`);
    } else {
      if (!hasSourceFile) fail(`Parameter candidate ${index} has no source provenance`);
      if (!hasSnippet) fail(`Parameter candidate ${index} has no evidence snippet`);
    }
    if (typeof actual.parsed !== "object" || actual.parsed === null) fail(`Parameter candidate ${index} has no parsed block`);
    if (actual.reviewStatus !== "pending_review") fail(`Parameter candidate ${index} is not review-gated`);
  }
  const productLine = stringValue(products[0].productLine);
  const uniqueKeys = new Set(colors.map((color) => canonicalColorKey(manifest.brand, productLine, color.officialColorCode)));
  if (uniqueKeys.size !== colors.length) fail("Generated FIP contains duplicate colors");
  let spoolPrimaryCount = 0;
  let refillVariantCount = 0;
  let outputSkuCount = 0;
  for (let index = 0; index < colors.length; index += 1) {
    const color = colors[index];
    if (!stringValue(color.officialColorCode)) fail(`Generated color ${index} has no officialColorCode`);
    if (typeof color.colorNameZh !== "string" || typeof color.colorNameEn !== "string") fail(`Generated color ${index} has invalid localized names`);
    const variants = arrayValue(color.skuVariants, `generated colors.json[${index}].skuVariants`);
    const primary = objectValue(color.primarySkuVariant, `generated colors.json[${index}].primarySkuVariant`);
    if (!variants.length) fail(`Generated color ${index} has no skuVariants`);
    outputSkuCount += variants.length;
    refillVariantCount += variants.filter((variant) => variant.spoolType === "refill").length;
    if (primary.spoolType === "spool") spoolPrimaryCount += 1;
    const expectedPrimary = variants.reduce((best, candidate) => (
      primarySkuPriority(candidate) < primarySkuPriority(best) ? candidate : best
    ));
    if (stringValue(primary.variantId) !== stringValue(expectedPrimary.variantId)) fail(`Generated color ${index} selected the wrong primarySkuVariant`);
    const expectedImagePath = primary.imageStatus === "available" ? stringValue(primary.imagePath) : "";
    if (stringValue(color.imagePath) !== expectedImagePath) fail(`Generated color ${index} does not use primarySkuVariant imagePath`);
  }
  if (outputSkuCount !== expectations.expectedOriginalSkuCount) fail(`Generated SKU variant count mismatch: ${outputSkuCount}`);
  const expectedReport = {
    originalSkuCount: expectations.expectedOriginalSkuCount,
    finalColorCount: colors.length,
    mergedSkuVariantCount: expectations.expectedOriginalSkuCount - colors.length,
    spoolPrimaryCount,
    refillVariantCount,
  };
  for (const [key, value] of Object.entries(expectedReport)) {
    if (report[key] !== value) fail(`Generated package report has invalid ${key}`);
  }
  const sourceToPackage = new Map(images.map((image) => [stringValue(image.sourcePath), stringValue(image.packagePath)]));
  for (const color of colors) {
    const status = stringValue(color.imageStatus);
    const imagePath = stringValue(color.imagePath);
    if (status === "available") {
      const packagePath = sourceToPackage.get(imagePath);
      if (!packagePath || !files[packagePath]) fail(`Available color references missing asset: ${imagePath}`);
    } else if (imagePath) {
      fail(`${status || "non-available"} color must not reference imagePath: ${imagePath}`);
    }
  }
  for (const [sourcePath, sourceAsset] of expectations.expectedSourcePaths) {
    const packagePath = sourceToPackage.get(sourcePath);
    if (!packagePath || !files[packagePath]) fail(`Asset mapping is missing for ${sourcePath}`);
    if (Buffer.compare(Buffer.from(files[packagePath]), Buffer.from(sourceAsset.assetBytes)) !== 0) fail(`Asset bytes changed for ${sourcePath}`);
  }
  const counts = colors.reduce((summary, color) => {
    const status = stringValue(color.imageStatus) || "missing";
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, { available: 0, placeholder: 0, missing: 0 });
  return {
    productCount: products.length,
    colorCount: colors.length,
    originalSkuCount: expectations.expectedOriginalSkuCount,
    mergedSkuVariantCount: expectations.expectedOriginalSkuCount - colors.length,
    spoolPrimaryCount,
    refillVariantCount,
    assetCount: expectations.expectedSourcePaths.size,
    parameterCandidateCount: parameters.length,
    imageStatusCounts: counts,
  };
}

function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];
  if (!inputArg || inputArg === "--help" || inputArg === "-h") {
    console.log("Usage: node build-fip.mjs <input.evidence-pack.zip> [output.filament-import.zip]");
    process.exit(inputArg ? 0 : 1);
  }
  const inputPath = resolve(inputArg);
  if (!inputPath.toLowerCase().endsWith(".zip")) fail("Input filename must end with .zip");
  const outputPath = outputArg ? resolve(outputArg) : buildDefaultOutputPath(inputPath);
  if (!outputPath.toLowerCase().endsWith(".filament-import.zip")) fail("Output filename must end with .filament-import.zip");
  if (inputPath === outputPath) fail("Input and output paths must differ");
  const summary = buildFip(inputPath, outputPath);
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`[evidence-pack-to-fip] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
