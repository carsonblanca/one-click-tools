#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { strFromU8, unzipSync } from "fflate";
import { ReadbackVerificationError, verifyReadback } from "./verify-readback.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BUILD_SCRIPT = join(SCRIPT_DIR, "build-fip.mjs");
const UPLOAD_PATH = "/api/admin/filament-import/kexcelled-evidence";
const READBACK_PATH = "/api/admin/filament-drafts";

export class ImportRunnerError extends Error {
  constructor(stage, message, details = {}) {
    super(message);
    this.name = "ImportRunnerError";
    this.stage = stage;
    this.details = details;
  }
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

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonFromZip(files, name) {
  if (!files[name]) throw new ImportRunnerError("fip_preflight", `FIP missing ${name}`);
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    throw new ImportRunnerError("fip_preflight", `FIP contains invalid JSON: ${name}`);
  }
}

export function parseArgs(argv) {
  const options = { executeUpload: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--execute-upload") {
      options.executeUpload = true;
      continue;
    }
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new ImportRunnerError("arguments", `Invalid argument: ${key || "(empty)"}`);
    }
    options[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  return options;
}

function validateBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ImportRunnerError("environment_preflight", "--base-url must be an explicit absolute URL");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new ImportRunnerError("environment_preflight", "--base-url must contain only scheme and host");
  }
  return url.origin;
}

function readCookieFile(cookieFile, baseUrl) {
  const raw = readFileSync(cookieFile, "utf8").trim();
  if (!raw) throw new ImportRunnerError("environment_preflight", "Administrator cookie file is empty");
  const host = new URL(baseUrl).hostname;
  const jarCookies = raw.split(/\r?\n/).flatMap((line) => {
    const normalized = line.startsWith("#HttpOnly_") ? line.slice("#HttpOnly_".length) : line;
    if (!normalized || normalized.startsWith("#") || !normalized.includes("\t")) return [];
    const parts = normalized.split("\t");
    if (parts.length < 7) return [];
    const [domain, , , secure, , name, value] = parts;
    const normalizedDomain = domain.replace(/^\./, "");
    if (!(host === normalizedDomain || host.endsWith(`.${normalizedDomain}`))) return [];
    if (secure.toUpperCase() === "TRUE" && !baseUrl.startsWith("https://")) return [];
    return [`${name}=${value}`];
  });
  if (jarCookies.length) return jarCookies.join("; ");
  const plain = raw.replace(/^Cookie:\s*/i, "").replace(/[\r\n]+/g, "").trim();
  if (!plain.includes("=")) throw new ImportRunnerError("environment_preflight", "Cookie file is neither a Cookie header nor a Netscape cookie jar");
  return plain;
}

export function readKeychainToken(service) {
  const accountArgs = process.env.USER ? ["-a", process.env.USER] : [];
  const result = spawnSync("security", [
    "find-generic-password",
    ...accountArgs,
    "-s",
    service,
    "-w",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const token = stringValue(result.stdout);
  if (result.status !== 0 || !token) {
    throw new ImportRunnerError(
      "environment_preflight",
      "OpenCode token was not found in macOS Keychain",
    );
  }
  return token;
}

export function inspectFip(fipPath) {
  let files;
  try {
    files = unzipSync(new Uint8Array(readFileSync(fipPath)));
  } catch {
    throw new ImportRunnerError("fip_preflight", "Generated FIP is not a readable ZIP");
  }
  const manifest = objectValue(jsonFromZip(files, "manifest.json"));
  const products = arrayValue(jsonFromZip(files, "products.json"));
  const colors = arrayValue(jsonFromZip(files, "colors.json"));
  const images = arrayValue(jsonFromZip(files, "images.json"));
  const candidates = arrayValue(jsonFromZip(files, "parameter-candidates.json"));
  const evidence = arrayValue(jsonFromZip(files, "evidence.json"));
  const report = objectValue(jsonFromZip(files, "package-report.json"));
  jsonFromZip(files, "draft-patch.json");
  if (products.length !== 1) throw new ImportRunnerError("fip_preflight", `Expected exactly one product, found ${products.length}`);
  const product = objectValue(products[0]);
  const identity = {
    productName: stringValue(product.productLine || product.displayName),
    displayName: stringValue(product.displayName || product.productLine),
    brand: stringValue(manifest.brand || product.brandDisplayNameEn || product.brandId),
    brandId: stringValue(manifest.brandId || product.brandId).toLowerCase(),
    material: stringValue(product.materialType),
    productLineId: stringValue(product.productLineId || manifest.productLineId),
    productKey: stringValue(product.productKey || manifest.productKey),
  };
  if (!identity.productName || !identity.brand || !identity.material || !identity.productLineId || !identity.productKey) {
    throw new ImportRunnerError("fip_preflight", "FIP product identity is incomplete", identity);
  }
  if (identity.brandId !== "kexcelled") {
    throw new ImportRunnerError("fip_preflight", `Unsupported brand: ${identity.brand || identity.brandId}`);
  }
  if (!stringValue(manifest.sourceRunId)) throw new ImportRunnerError("fip_preflight", "FIP sourceRunId is missing");
  if (!colors.length) throw new ImportRunnerError("fip_preflight", "FIP contains no colors");
  const colorImageRelationCount = colors.filter((color) => Boolean(stringValue(objectValue(color).localImagePath))).length;
  if (colorImageRelationCount !== colors.length) {
    throw new ImportRunnerError("fip_preflight", "Every color must reference an included image", {
      colorCount: colors.length,
      colorImageRelationCount,
    });
  }
  for (const image of images) {
    const packagePath = stringValue(objectValue(image).packagePath);
    if (!packagePath || !files[packagePath]) {
      throw new ImportRunnerError("fip_preflight", `FIP image asset is missing: ${packagePath || "(empty packagePath)"}`);
    }
  }
  return {
    manifest,
    report,
    identity,
    sourceRunId: stringValue(manifest.sourceRunId),
    counts: {
      products: products.length,
      colors: colors.length,
      images: images.length,
      colorImageRelations: colorImageRelationCount,
      parameters: candidates.length,
      evidence: evidence.length,
    },
    publicationEligibility: objectValue(report.importDecision || manifest.importDecision),
  };
}

function buildWithExistingScript(inputPath, fipPath) {
  const result = spawnSync(process.execPath, [BUILD_SCRIPT, "--input", inputPath, "--output", fipPath], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new ImportRunnerError("build_fip", "FIP build failed", { cause: stringValue(result.stderr || result.stdout) });
  }
}

async function jsonResponse(response, stage) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ImportRunnerError(stage, `HTTP ${response.status} returned non-JSON data`);
  }
  if (!response.ok) throw new ImportRunnerError(stage, `HTTP ${response.status}`, { response: body });
  return body;
}

function saveJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export async function runImport(options, dependencies = {}) {
  const inputPath = resolve(stringValue(options.input));
  const outputDir = resolve(stringValue(options.outputDir));
  if (!options.input || !options.outputDir || !options.baseUrl) {
    throw new ImportRunnerError("arguments", "Required: --input, --base-url, and --output-dir");
  }
  const authMethodCount = [options.cookieFile, options.keychainService].filter(Boolean).length;
  if (options.executeUpload && authMethodCount !== 1) {
    throw new ImportRunnerError(
      "arguments",
      "--execute-upload requires exactly one of --cookie-file or --keychain-service",
    );
  }
  const baseUrl = validateBaseUrl(options.baseUrl);
  try {
    accessSync(inputPath, constants.R_OK);
  } catch {
    throw new ImportRunnerError("environment_preflight", "Input Evidence ZIP does not exist or is not readable");
  }
  mkdirSync(outputDir, { recursive: true });
  try {
    accessSync(outputDir, constants.W_OK);
  } catch {
    throw new ImportRunnerError("environment_preflight", "Output directory is not writable");
  }
  let authHeaders = {};
  if (options.executeUpload) {
    if (options.cookieFile) {
      try {
        authHeaders = { Cookie: readCookieFile(resolve(options.cookieFile), baseUrl) };
      } catch (error) {
        if (error instanceof ImportRunnerError) throw error;
        throw new ImportRunnerError("environment_preflight", "Administrator cookie file does not exist or is not readable");
      }
    } else {
      const tokenReader = dependencies.readKeychainToken || readKeychainToken;
      const token = tokenReader(stringValue(options.keychainService));
      if (!token) {
        throw new ImportRunnerError("environment_preflight", "OpenCode token was not found in macOS Keychain");
      }
      authHeaders = { Authorization: `Bearer ${token}` };
    }
  }
  const inputBytes = readFileSync(inputPath);
  const stem = basename(inputPath).replace(/\.zip$/i, "") || "filament";
  const fipPath = join(outputDir, `${stem}.filament-import.zip`);
  const buildFip = dependencies.buildFip || buildWithExistingScript;
  await buildFip(inputPath, fipPath);
  const preflight = inspectFip(fipPath);
  const fipBytes = readFileSync(fipPath);
  const baseReport = {
    ok: true,
    mode: options.executeUpload ? "upload" : "dry-run",
    inputZip: inputPath,
    inputSha256: hash(inputBytes),
    generatedFip: fipPath,
    fipSha256: hash(fipBytes),
    product: preflight.identity,
    counts: preflight.counts,
    localSourceRunId: preflight.sourceRunId,
    publicationEligibility: preflight.publicationEligibility,
    officialSpecificationTable: stringValue(preflight.report.officialSpecificationTable) || "unknown",
    parameterEvidenceComplete: preflight.report.parameterEvidenceComplete === true,
    requiresManualReview: preflight.manifest.requiresManualReview !== false,
    automaticallyPublished: false,
    publicationNotice: "未自动发布",
  };
  process.stderr.write(`${JSON.stringify({ event: "preflight", ...baseReport }, null, 2)}\n`);

  if (!options.executeUpload) {
    const report = { ...baseReport, validation: "preflight_passed", uploadRequestCount: 0 };
    saveJson(join(outputDir, "import-report.json"), report);
    return report;
  }

  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new ImportRunnerError("upload", "Fetch API is unavailable");
  const form = new FormData();
  form.append("brandId", preflight.identity.brandId);
  form.append("files", new Blob([fipBytes], { type: "application/zip" }), basename(fipPath));
  const uploadResponse = await fetchImpl(`${baseUrl}${UPLOAD_PATH}`, {
    method: "POST",
    headers: authHeaders,
    credentials: "include",
    body: form,
  });
  const uploadBody = await jsonResponse(uploadResponse, "upload");
  saveJson(join(outputDir, "upload-response.json"), { status: uploadResponse.status, body: uploadBody });
  const sourceRunId = stringValue(uploadBody.sourceRunId);
  const draftIds = arrayValue(uploadBody.draftIds).map(stringValue).filter(Boolean);
  if (!sourceRunId || draftIds.length !== 1) {
    throw new ImportRunnerError("upload_response", "Upload response must contain one sourceRunId and one draftId", {
      sourceRunIdPresent: Boolean(sourceRunId),
      draftIdCount: draftIds.length,
    });
  }
  const draftId = draftIds[0];
  const readbackResponse = await fetchImpl(`${baseUrl}${READBACK_PATH}/${encodeURIComponent(sourceRunId)}`, {
    method: "GET",
    headers: authHeaders,
    credentials: "include",
  });
  const readbackBody = await jsonResponse(readbackResponse, "readback");
  const readbackPath = join(outputDir, "draft-readback.json");
  saveJson(readbackPath, readbackBody);
  let verification;
  try {
    verification = verifyReadback({ fipPath, readbackPath, sourceRunId, draftId });
  } catch (error) {
    if (error instanceof ReadbackVerificationError) {
      throw new ImportRunnerError("verify_readback", error.message, error.summary);
    }
    throw error;
  }
  const report = {
    ...baseReport,
    validation: "readback_passed",
    uploadRequestCount: 1,
    sourceRunId,
    draftId,
    readback: verification,
  };
  saveJson(join(outputDir, "import-report.json"), report);
  return report;
}

async function main() {
  let options = {};
  try {
    options = parseArgs(process.argv.slice(2));
    const report = await runImport(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const failure = error instanceof ImportRunnerError
      ? { ok: false, stoppedAt: error.stage, firstRootCause: error.message, details: error.details }
      : { ok: false, stoppedAt: "unexpected", firstRootCause: error instanceof Error ? error.message : "unknown_error" };
    if (options.outputDir) {
      try {
        mkdirSync(resolve(options.outputDir), { recursive: true });
        saveJson(join(resolve(options.outputDir), "import-report.json"), failure);
      } catch {
        // Preserve the original failure when a report cannot be written.
      }
    }
    process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
