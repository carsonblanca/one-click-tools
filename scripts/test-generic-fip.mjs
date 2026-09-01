#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";

const [, , fipPath, expectedBrand] = process.argv;
if (!fipPath) throw new Error("usage: test-generic-fip.mjs <fip.zip> [brand]");
const files = unzipSync(new Uint8Array(readFileSync(fipPath)));
const manifest = JSON.parse(strFromU8(files["manifest.json"]));
const products = JSON.parse(strFromU8(files["products.json"]));
const colors = JSON.parse(strFromU8(files["colors.json"]));
const parameters = JSON.parse(strFromU8(files["parameter-candidates.json"]));
const images = JSON.parse(strFromU8(files["images.json"]));
if (expectedBrand && manifest.brand !== expectedBrand) throw new Error(`brand mismatch: ${manifest.brand}`);
if (!manifest.brand || !manifest.sourceRunId) throw new Error("generic manifest identity missing");
if (!products.length || !colors.length) throw new Error("generic FIP has no products/colors");
if (colors.some((color) => !color.sellerSkuId || !color.sourceEvidence)) throw new Error("seller color provenance missing");
if (colors.some((color) => color.officialColorCode !== null && typeof color.officialColorCode !== "string")) throw new Error("invalid nullable color code");
if (parameters.length !== 0) throw new Error("fixture expected zero confirmed parameters");
const imagePaths = new Set(images.flatMap((image) => [image.sourcePath, image.packagePath].filter(Boolean)));
if (colors.some((color) => color.imageStatus === "available" && !imagePaths.has(color.imagePath) && !imagePaths.has(color.packagePath))) throw new Error("color images missing");
console.log(JSON.stringify({ brand: manifest.brand, productCount: products.length, colorCount: colors.length, parameterCount: parameters.length, imageCount: images.length, passed: true }, null, 2));
