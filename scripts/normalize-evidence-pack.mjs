#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { normalizeEvidencePack } from "../lib/filaments/imports/source-normalization.mjs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("usage: node normalize-evidence-pack.mjs <evidence-pack.zip> <normalized.json>");
  process.exit(2);
}

const files = unzipSync(new Uint8Array(readFileSync(inputPath)));
const json = (name, fallback) => files[name] ? JSON.parse(strFromU8(files[name])) : fallback;
const normalized = normalizeEvidencePack({
  capture: json("capture.json", {}),
  pageMeta: json("page.meta.json", {}),
  pageText: files["page.txt"] ? strFromU8(files["page.txt"]) : "",
  colorMappings: json("color-mappings.json", []),
  parameterEvidence: json("parameter-evidence.json", []),
  imageMetadata: json("images.json", []),
});
writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`);
console.log(JSON.stringify({
  outputPath,
  brand: normalized.brand,
  rawSkuCount: normalized.skus.length,
  productCandidateCount: normalized.productCandidates.length,
  confirmedProductCount: normalized.productCandidates.filter((candidate) => candidate.canonicalIdentity.status === "CONFIRMED").length,
  unknownProductCount: normalized.productCandidates.filter((candidate) => candidate.canonicalIdentity.status !== "CONFIRMED").length,
  colorIdentityConfirmedCount: normalized.skus.filter((sku) => sku.colorIdentityStatus === "CONFIRMED").length,
  parameterConfirmedCount: normalized.parameters.filter((parameter) => parameter.status !== "UNKNOWN").length,
}, null, 2));
