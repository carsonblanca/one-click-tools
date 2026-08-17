#!/usr/bin/env node

// Dry-run for the OCR -> canonical parameter stage of build-fip.mjs.
//
// It calls the SAME buildOcrParameterCandidates() that build-fip.mjs runs before it
// writes parameter-candidates.json, so the output shown here is exactly what the
// builder would persist. Nothing is written to disk.
//
// Usage: node dry-run-ocr-parameters.mjs <package.zip> [more.zip ...]
// Accepts any package that carries ocr/index.json + ocr/*.txt (Evidence Pack or FIP).

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { buildOcrParameterCandidates } from "./parameter-enrichment.mjs";

function readJson(files, name) {
  if (!files[name]) return null;
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    return null;
  }
}

function resolveIdentity(files) {
  const capture = readJson(files, "capture.json");
  if (capture && capture.productIdentity) {
    const identity = capture.productIdentity;
    return {
      brand: identity.brand || "",
      productLine: identity.productLine || "",
      material: identity.material || "",
    };
  }
  const products = readJson(files, "products.json");
  const product = Array.isArray(products) ? products[0] : null;
  if (product) {
    return {
      brand: product.brand || "",
      productLine: product.productLine || "",
      material: product.materialType || "",
    };
  }
  return { brand: "", productLine: "", material: "" };
}

function tally(rejections) {
  return rejections.reduce((counts, item) => {
    counts[item.reason] = (counts[item.reason] || 0) + 1;
    return counts;
  }, {});
}

function run(zipPath) {
  const files = unzipSync(new Uint8Array(readFileSync(zipPath)));
  const identity = resolveIdentity(files);
  const sourceRunId = basename(zipPath).replace(/\.(filament-import|evidence-pack)\.zip$/i, "").replace(/\.zip$/i, "");
  const result = buildOcrParameterCandidates(files, identity, sourceRunId);
  const withSourceImage = result.candidates.filter((candidate) => candidate.sourceImage).length;
  const bundledSourceImage = result.candidates.filter((candidate) => candidate.sourceImageAvailable).length;

  console.log("=".repeat(88));
  console.log(`包: ${basename(zipPath)}`);
  console.log(`产品身份: brand=${identity.brand} | productLine=${identity.productLine} | material=${identity.material}`);
  console.log(`OCR 源图片数: ${result.sourceImageCount} | 参与解析的 OCR 文本数: ${result.ocrTextCount}`);
  console.log(`新增 VALID 厂家参数: ${result.candidates.length}`);
  console.log("-".repeat(88));
  for (const candidate of result.candidates) {
    const value = candidate.unit ? `${candidate.normalizedValue} ${candidate.unit}` : candidate.normalizedValue;
    console.log(`  ${candidate.canonicalKey.padEnd(20)} = ${value}`);
    console.log(`    sourceImage : ${candidate.sourceImage}${candidate.sourceImageAvailable ? "" : "  (未随包)"}`);
    console.log(`    ocrText     : ${candidate.ocrTextPath}`);
    console.log(`    ocrSnippet  : ${candidate.ocrSnippet.slice(0, 70)}`);
    console.log(`    notes       : ${candidate.notes}${candidate.conflict ? " | conflict" : ""}`);
  }
  console.log("-".repeat(88));
  console.log(`污染/拒收检测: 共 ${result.rejections.length} 条`);
  for (const [reason, count] of Object.entries(tally(result.rejections))) {
    console.log(`  ${reason.padEnd(26)} ${count}`);
  }
  const samples = result.rejections.slice(0, 5);
  for (const sample of samples) {
    console.log(`  例: [${sample.reason}] ${String(sample.snippet).slice(0, 60)} @ ${sample.ocrTextPath}`);
  }
  console.log("-".repeat(88));
  console.log(`sourceEvidence 完整性: 带 sourceImage ${withSourceImage}/${result.candidates.length} | 源图随包 ${bundledSourceImage}/${result.candidates.length}`);
  console.log("");

  return {
    package: basename(zipPath),
    ocrSourceImageCount: result.sourceImageCount,
    ocrTextCount: result.ocrTextCount,
    validParameterCount: result.candidates.length,
    fields: result.candidates.map((candidate) => candidate.canonicalKey),
    rejectionCounts: tally(result.rejections),
    sourceEvidenceComplete: withSourceImage === result.candidates.length,
  };
}

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--json");
  if (!args.length) {
    console.log("Usage: node dry-run-ocr-parameters.mjs <package.zip> [more.zip ...]");
    process.exit(1);
  }
  const summary = args.map((arg) => run(resolve(arg)));
  console.log("汇总:");
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`[dry-run-ocr-parameters] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
