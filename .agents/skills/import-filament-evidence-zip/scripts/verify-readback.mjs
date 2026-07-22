#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { strFromU8, unzipSync } from "fflate";

export class ReadbackVerificationError extends Error {
  constructor(message, summary = {}) {
    super(message);
    this.name = "ReadbackVerificationError";
    this.summary = summary;
  }
}

function fail(message, details = {}) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message, ...details }, null, 2)}\n`);
  process.exit(1);
}

function argsOf(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      fail("Usage: verify-readback.mjs --fip <fip.zip> --readback <json> [--source-run-id <id>] [--draft-id <id>]");
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonFromZip(files, name) {
  if (!files[name]) throw new ReadbackVerificationError(`FIP missing ${name}`);
  return JSON.parse(strFromU8(files[name]));
}

export function verifyReadback({ fipPath, readbackPath, sourceRunId = "", draftId = "" }) {
  const files = unzipSync(new Uint8Array(readFileSync(fipPath)));
  const report = objectValue(jsonFromZip(files, "package-report.json"));
  const patch = objectValue(jsonFromZip(files, "draft-patch.json"));
  const products = arrayValue(jsonFromZip(files, "products.json"));
  const expectedColors = arrayValue(jsonFromZip(files, "colors.json"));
  const expectedImages = arrayValue(jsonFromZip(files, "images.json"));
  const manifest = objectValue(jsonFromZip(files, "manifest.json"));
  if (products.length !== 1) throw new ReadbackVerificationError("FIP must contain exactly one product");

  const product = objectValue(products[0]);
  const expected = objectValue(report.expectedDraft);
  const response = JSON.parse(readFileSync(readbackPath, "utf8"));
  const draft = objectValue(response.draft || response);
  const data = objectValue(draft.draft_data);
  const productLine = objectValue(data.productLine);
  const parameters = objectValue(data.parameters);
  const fields = objectValue(parameters.fields);
  const patchParameters = objectValue(patch.parameters);
  const expectedFields = objectValue(patchParameters.fields);
  const colors = arrayValue(data.colors);
  const canonicalColors = arrayValue(data.canonicalColors);
  const images = arrayValue(data.images);
  const candidates = arrayValue(parameters.candidates);
  const sourceEvidence = arrayValue(parameters.sourceEvidence);
  const candidateEvidence = candidates.filter((candidate) => {
    const item = objectValue(candidate);
    return Boolean(stringValue(item.sourceFile) || stringValue(item.sourceText));
  });
  const parameterEvidence = sourceEvidence.length ? sourceEvidence : candidateEvidence;
  const colorImageRelations = canonicalColors.filter((color) => {
    const item = objectValue(color);
    return Boolean(stringValue(item.imageCandidateUrl || item.localImagePath));
  }).length;
  const expectedColorImageRelations = expectedColors.filter((color) => (
    Boolean(stringValue(objectValue(color).localImagePath))
  )).length;
  const identityScope = objectValue(patch.identityScope);
  const expectedMissing = arrayValue(expected.missingProductDefaults);
  const scopedCollections = [colors, canonicalColors, images, arrayValue(data.evidence), candidates, parameterEvidence];
  const serializedDraft = JSON.stringify(draft);
  const pollutionStrings = ["PC K7", "英文名待补充"].filter((value) => serializedDraft.includes(value));
  const expectedProductName = stringValue(product.productLine || product.displayName);
  const expectedBrandId = stringValue(product.brandId || manifest.brandId).toLowerCase();
  const expectedMaterial = stringValue(product.materialType).toUpperCase();

  const checks = {
    sourceRunId: !sourceRunId || draft.source_run_id === sourceRunId,
    draftId: !draftId || draft.id === draftId,
    productName: stringValue(draft.product_line_name || productLine.name) === expectedProductName,
    brand: stringValue(draft.brand_id || objectValue(data.brand).brandId).toLowerCase() === expectedBrandId,
    material: stringValue(draft.material_type || productLine.materialType).toUpperCase() === expectedMaterial,
    parameterFields: JSON.stringify(fields) === JSON.stringify(expectedFields),
    parameterFieldCount: Object.keys(fields).length === Number(expected.parameterFieldCount),
    parameterCandidateCount: candidates.length === Number(expected.parameterCandidateCount),
    parameterEvidenceCount: parameterEvidence.length === Number(expected.parameterEvidenceCount),
    colorCount: colors.length === expectedColors.length,
    canonicalColorCount: canonicalColors.length === expectedColors.length,
    imageCount: images.length === expectedImages.length,
    colorImageRelationCount: colorImageRelations === expectedColorImageRelations,
    filamentDiameterMissing: expectedMissing.includes("filamentDiameter")
      ? productLine.diameterMm == null
      : productLine.diameterMm != null,
    netWeightMissing: expectedMissing.includes("netWeight")
      ? productLine.netWeightG == null
      : productLine.netWeightG != null,
    productLineId: !identityScope.productLineId || productLine.productLineId === identityScope.productLineId,
    productKey: !identityScope.productKey || data.productKey === identityScope.productKey,
    identityScoped: !identityScope.productLineId || scopedCollections.every((items) => items.every((item) => (
      objectValue(item).productLineId === identityScope.productLineId
    ))),
    noPollutionStrings: pollutionStrings.length === 0,
    statusUnpublished: draft.status === "draft" && draft.publication_status === "draft",
  };

  const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  const summary = {
    ok: failed.length === 0,
    sourceRunId: draft.source_run_id,
    draftId: draft.id,
    productName: stringValue(draft.product_line_name || productLine.name),
    brandId: stringValue(draft.brand_id || objectValue(data.brand).brandId),
    materialType: stringValue(draft.material_type || productLine.materialType),
    parameterFieldCount: Object.keys(fields).length,
    parameterCandidateCount: candidates.length,
    parameterEvidenceCount: parameterEvidence.length,
    colorCount: colors.length,
    canonicalColorCount: canonicalColors.length,
    imageCount: images.length,
    colorImageRelationCount: colorImageRelations,
    filamentDiameterMissing: productLine.diameterMm == null,
    netWeightMissing: productLine.netWeightG == null,
    productLineId: productLine.productLineId,
    productKey: data.productKey,
    status: draft.status,
    publicationStatus: draft.publication_status,
    pollutionStrings,
    failedChecks: failed,
  };

  if (failed.length) throw new ReadbackVerificationError("Stored readback does not match FIP", summary);
  return summary;
}

function main() {
  const options = argsOf(process.argv.slice(2));
  if (!options.fip || !options.readback) {
    fail("Usage: verify-readback.mjs --fip <fip.zip> --readback <json> [--source-run-id <id>] [--draft-id <id>]");
  }
  try {
    const summary = verifyReadback({
      fipPath: options.fip,
      readbackPath: options.readback,
      sourceRunId: options["source-run-id"],
      draftId: options["draft-id"],
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    if (error instanceof ReadbackVerificationError) fail(error.message, error.summary);
    fail(error instanceof Error ? error.message : "readback_verification_failed");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
