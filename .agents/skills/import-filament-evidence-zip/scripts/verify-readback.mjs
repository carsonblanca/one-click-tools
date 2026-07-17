#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";

function fail(message, details = {}) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message, ...details }, null, 2)}\n`);
  process.exit(1);
}

function argsOf(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) fail("Usage: verify-readback.mjs --fip <fip.zip> --readback <json> [--source-run-id <id>]");
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

function jsonFromZip(files, name) {
  if (!files[name]) fail(`FIP missing ${name}`);
  return JSON.parse(strFromU8(files[name]));
}

const options = argsOf(process.argv.slice(2));
if (!options.fip || !options.readback) fail("Usage: verify-readback.mjs --fip <fip.zip> --readback <json> [--source-run-id <id>]");

const files = unzipSync(new Uint8Array(readFileSync(options.fip)));
const report = objectValue(jsonFromZip(files, "package-report.json"));
const patch = objectValue(jsonFromZip(files, "draft-patch.json"));
const expected = objectValue(report.expectedDraft);
const response = JSON.parse(readFileSync(options.readback, "utf8"));
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
const colorImageRelations = canonicalColors.filter((color) => {
  const item = objectValue(color);
  return Boolean(String(item.imageCandidateUrl || item.localImagePath || "").trim());
}).length;

const checks = {
  sourceRunId: !options["source-run-id"] || draft.source_run_id === options["source-run-id"],
  parameterFields: JSON.stringify(fields) === JSON.stringify(expectedFields),
  parameterFieldCount: Object.keys(fields).length === Number(expected.parameterFieldCount),
  parameterCandidateCount: candidates.length === Number(expected.parameterCandidateCount),
  parameterEvidenceCount: sourceEvidence.length === Number(expected.parameterEvidenceCount),
  colorCount: colors.length === Number(expected.colorCount),
  canonicalColorCount: canonicalColors.length === Number(expected.colorCount),
  colorImageRelationCount: colorImageRelations === Number(expected.colorImageRelationCount),
  filamentDiameterMissing: productLine.diameterMm == null,
  netWeightMissing: productLine.netWeightG == null,
  statusUnpublished: draft.status === "draft" && draft.publication_status === "draft",
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
const summary = {
  ok: failed.length === 0,
  sourceRunId: draft.source_run_id,
  draftId: draft.id,
  parameterFieldCount: Object.keys(fields).length,
  parameterCandidateCount: candidates.length,
  parameterEvidenceCount: sourceEvidence.length,
  colorCount: colors.length,
  canonicalColorCount: canonicalColors.length,
  imageCount: images.length,
  colorImageRelationCount: colorImageRelations,
  filamentDiameterMissing: productLine.diameterMm == null,
  netWeightMissing: productLine.netWeightG == null,
  status: draft.status,
  publicationStatus: draft.publication_status,
  failedChecks: failed,
};

if (failed.length) fail("Production readback does not match FIP", summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
