#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { normalizeEvidencePack } from "../lib/filaments/imports/source-normalization.mjs";

function fail(message) { throw new Error(message); }
function text(value) { return typeof value === "string" ? value.trim() : ""; }
function jsonBytes(value) { return strToU8(`${JSON.stringify(value, null, 2)}\n`); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function readJson(files, name) {
  try { return JSON.parse(strFromU8(files[name])); }
  catch { fail(`${name} is not valid JSON`); }
}
function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function arrayValue(value, name) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  return value;
}
function safeFileName(value) {
  const ext = text(value).match(/\.[a-z0-9]+$/i)?.[0] || ".webp";
  return `${String(value).replace(/[^a-zA-Z0-9._-]+/g, "-")}${ext}`;
}
function displayNameForSku(sku) {
  const raw = text(sku.sellerColorEvidence);
  const material = text(sku.material?.value);
  const effect = text(sku.effect?.value);
  return raw
    .replace(new RegExp(`\\b${material}\\b`, "ig"), "")
    .replace(effect, "")
    .replace(/(?:\d+(?:\.\d+)?\s*(?:kg|g)|\d+卷|多卷|补充装|无盘|refill|spool[- ]?free)/ig, "")
    .replace(/[【】\[\]（）()—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}
function sourceRunId(capture, inputBytes) {
  const identity = objectValue(capture.productIdentity);
  return text(identity.sourceRunId) || text(capture.sourceRunId) || `capture-${sha256(inputBytes).slice(0, 24)}`;
}

function build(inputPath, outputPath) {
  const inputBytes = new Uint8Array(readFileSync(inputPath));
  const inputFiles = unzipSync(inputBytes);
  const capture = objectValue(readJson(inputFiles, "capture.json"));
  const pageMeta = objectValue(readJson(inputFiles, "page.meta.json"));
  const pageText = strFromU8(inputFiles["page.txt"]);
  const colors = arrayValue(readJson(inputFiles, "color-mappings.json"), "color-mappings.json");
  const images = arrayValue(readJson(inputFiles, "images.json"), "images.json");
  const parameterEvidence = inputFiles["parameter-evidence.json"]
    ? arrayValue(readJson(inputFiles, "parameter-evidence.json"), "parameter-evidence.json") : [];
  const normalized = normalizeEvidencePack({ capture, pageMeta, pageText, colorMappings: colors, parameterEvidence, imageMetadata: images });
  const confirmed = normalized.productCandidates.filter((candidate) => candidate.canonicalIdentity.status === "CONFIRMED");
  if (!confirmed.length) fail("没有 identity-confirmed product candidate");
  if (normalized.brand.status !== "CONFIRMED") fail("brand is not identity-confirmed");

  const imageByPath = new Map(images.map((image) => [text(image.localPath), image]));
  const packageFiles = {};
  const imageRecords = [];
  const imagePackageBySource = new Map();
  for (const image of normalized.imageEvidence) {
    const sourcePath = text(image.sourcePath);
    if (!sourcePath || !inputFiles[sourcePath] || image.role === "UNKNOWN") continue;
    const packagePath = `assets/images/${safeFileName(basename(sourcePath))}`;
    if (imagePackageBySource.has(sourcePath)) continue;
    packageFiles[packagePath] = inputFiles[sourcePath];
    imagePackageBySource.set(sourcePath, packagePath);
    imageRecords.push({
      id: `image-${image.index + 1}`,
      sourcePath,
      packagePath,
      role: image.role,
      imageStatus: image.imageStatus,
      sourceEvidence: image.provenance,
      originalMetadata: imageByPath.get(sourcePath) || null,
    });
  }

  const products = confirmed.map((candidate, productIndex) => {
    const candidateSkus = candidate.skus;
    const productColors = candidateSkus.map((sku, colorIndex) => {
      const packagePath = imagePackageBySource.get(text(sku.imagePath));
      if (!packagePath) fail(`missing color image for ${sku.skuId || colorIndex}`);
      return {
        colorId: `${candidate.groupId}-${colorIndex + 1}`,
        displayNameZhCN: displayNameForSku(sku),
        displayNameEn: null,
        sellerColorName: displayNameForSku(sku),
        rawSellerOption: sku.sellerOptionLabel,
        officialColorCode: sku.officialColorCode,
        colorCodeType: sku.officialColorCode ? "official" : null,
        sellerSkuId: sku.skuId,
        sellerVariantId: sku.variantId,
        imagePath: text(sku.imagePath),
        packagePath,
        imageStatus: "available",
        sourceEvidence: sku.provenance,
        provenance: sku.provenance,
        requiresManualReview: true,
      };
    });
    return {
      productLineId: candidate.groupId,
      productLine: `${normalized.brand.value} ${candidate.canonicalIdentity.material} ${candidate.canonicalIdentity.effect}`,
      productLineNameZhCN: `${normalized.brand.value} ${candidate.canonicalIdentity.material} ${candidate.canonicalIdentity.effect}`,
      productLineNameEn: null,
      brand: normalized.brand.value,
      materialType: candidate.canonicalIdentity.material,
      variant: candidate.canonicalIdentity.effect,
      colors: productColors,
      parameters: [],
      parameterCompleteness: "none",
      parameterEvidenceStatus: "ABSENT_OR_UNCONFIRMED",
      evidenceRefs: [{ source: "color-mappings.json", groupId: candidate.groupId }],
      sourceIdentity: { sourceRunId: sourceRunId(capture, inputBytes), officialUrl: normalized.listing.officialUrl },
      productIndex,
      requiresManualReview: true,
    };
  });
  const fipImages = imageRecords.filter((image) => products.some((product) => product.colors.some((color) => color.packagePath === image.packagePath)));
  const runId = sourceRunId(capture, inputBytes);
  const manifest = {
    schemaVersion: "fip.v1",
    packageId: `generic-${sha256(inputBytes).slice(0, 24)}`,
    createdAt: new Date().toISOString(),
    importerVersion: "generic-normalized-evidence.v1",
    brand: normalized.brand.value,
    sourceRunId: runId,
    sourceIdentity: { sourceRunId: runId, officialUrl: normalized.listing.officialUrl, captureTime: normalized.listing.captureTime },
    productCount: products.length,
    requiresManualReview: true,
    importStatus: "draft",
    warnings: normalized.warnings,
  };
  const evidence = {
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sha256(inputBytes),
    normalizedSchemaVersion: normalized.schemaVersion,
    brand: normalized.brand,
    listing: normalized.listing,
    rawParameterEvidence: parameterEvidence,
    imageEvidence: normalized.imageEvidence,
    warnings: normalized.warnings,
  };
  const report = {
    productCount: products.length,
    originalSkuCount: normalized.skus.length,
    colorCount: products.reduce((sum, product) => sum + product.colors.length, 0),
    parameterCandidateCount: 0,
    parameterCompleteness: "none",
    originalImageCount: images.length,
    retainedImageCount: fipImages.length,
    discardedImageCount: images.length - fipImages.length,
    unresolvedCount: normalized.productCandidates.filter((candidate) => candidate.canonicalIdentity.status !== "CONFIRMED").length,
    warnings: normalized.warnings,
  };
  const out = {
    "manifest.json": jsonBytes(manifest),
    "products.json": jsonBytes(products),
    "colors.json": jsonBytes(products.flatMap((product) => product.colors)),
    "evidence.json": jsonBytes(evidence),
    "images.json": jsonBytes(fipImages),
    "package-report.json": jsonBytes(report),
    "parameter-candidates.json": jsonBytes([]),
    "parameter-report.json": jsonBytes({ count: 0, status: "absent_or_unconfirmed" }),
    ...packageFiles,
  };
  writeFileSync(outputPath, zipSync(out, { level: 6 }));
  return { runId, productCount: products.length, skuCount: normalized.skus.length, colorCount: report.colorCount, parameterCount: 0, imageCount: fipImages.length, outputPath };
}

const [, , inputPath, outputPathArg] = process.argv;
if (!inputPath) fail("usage: build-generic-fip.mjs <evidence-pack.zip> [output.filament-import.zip]");
const outputPath = resolve(outputPathArg || inputPath.replace(/\.zip$/i, ".filament-import.zip"));
try { console.log(JSON.stringify(build(inputPath, outputPath), null, 2)); }
catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
