#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  FILAMENT_PARAMETER_DEFINITIONS,
  getParameterDefinition,
  resolveCanonicalParameterKey,
} from "../../../../lib/filaments/parameters/normalized-parameters.ts";
import {
  isOfficialPhysicalPropertyTable,
  parseOfficialPhysicalProperties,
  selectOfficialPhysicalPropertyTable,
} from "./physical-property-table.mjs";
import { parseStructuredParameterTable } from "./structured-parameter-table.mjs";

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

function optionalJson(files, name) {
  if (!files[name]) return null;
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
  const tables = ocr.split(/(?=^SOURCE:\s)/m).map((block) => ({
    sourcePath: text(block.match(/^SOURCE:\s*(.+)$/m)?.[1]),
    text: block,
    extractionMethod: "existing_ocr",
  }));
  try {
    return selectOfficialPhysicalPropertyTable(tables, productLine);
  } catch (error) {
    fail(error instanceof Error ? error.message : `Ambiguous official specification tables for ${productLine}`);
  }
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
  const canonicalKey = options.canonicalKey || resolveCanonicalParameterKey(field);
  return {
    field,
    canonicalKey,
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
    originalName: options.officialRawName || field,
    trusted: status === "official",
  };
}

function explicitDiameterAndWeight(files, meta, mappings, productLineId, productLine) {
  const target = normalizedIdentity(productLine);
  const sources = [];
  const addSource = (sourceFile, value) => {
    for (const line of text(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      if (normalizedIdentity(line).includes(target)) sources.push({ sourceFile, sourceText: line });
    }
  };
  for (const mapping of mappings) addSource("color-mappings.json", mapping.sourceText);
  if (files["page.txt"]) addSource("page.txt", strFromU8(files["page.txt"]));
  addSource("page.meta.json", text(meta.userProvidedProductName) || text(meta.pageTitle));

  const patterns = [
    /(?<![\d.])(\d+(?:\.\d+)?)\s*(mm|毫米)?\s*[\/／]\s*(\d+(?:\.\d+)?)\s*(kg|g|公斤|千克|克)(?![A-Za-z\u4e00-\u9fff])/giu,
    /(?<![\d.])(\d+(?:\.\d+)?)\s*(mm|毫米)?\s*[-–—]\s*[A-Z0-9]{2,12}\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(kg|g|公斤|千克|克)(?![A-Za-z\u4e00-\u9fff])/giu,
  ];
  const matches = [];
  const seen = new Set();
  for (const source of sources) {
    for (const pattern of patterns) {
      for (const match of source.sourceText.matchAll(pattern)) {
        const diameter = Number(match[1]);
        const weight = Number(match[3]);
        const unit = match[4].toLowerCase();
        const weightGrams = ["kg", "公斤", "千克"].includes(unit) ? weight * 1000 : weight;
        if (!Number.isFinite(diameter) || !Number.isFinite(weightGrams)) continue;
        const key = `${diameter}|${weightGrams}|${source.sourceFile}|${source.sourceText}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ ...source, diameter, weightGrams, rawValue: match[0] });
      }
    }
  }

  const diameterValues = [...new Set(matches.map((item) => item.diameter))];
  const weightValues = [...new Set(matches.map((item) => item.weightGrams))];
  const conflicts = [];
  if (diameterValues.length > 1) conflicts.push({ field: "filamentDiameter", values: diameterValues.map((value) => `${value} mm`) });
  if (weightValues.length > 1) conflicts.push({ field: "netWeight", values: weightValues.map((value) => `${value} g`) });
  const candidates = [];
  if (diameterValues.length === 1) {
    const evidence = matches.find((item) => item.diameter === diameterValues[0]);
    candidates.push(candidate(
      "filamentDiameter",
      `${diameterValues[0]} mm`,
      String(diameterValues[0]),
      "mm",
      "high",
      "official",
      evidence.sourceText,
      null,
      { sourceFile: evidence.sourceFile, productLineId, officialRawName: "线径" },
    ));
  }
  if (weightValues.length === 1) {
    const evidence = matches.find((item) => item.weightGrams === weightValues[0]);
    candidates.push(candidate(
      "netWeight",
      `${weightValues[0]} g`,
      String(weightValues[0]),
      "g",
      "high",
      "official",
      evidence.sourceText,
      null,
      { sourceFile: evidence.sourceFile, productLineId, officialRawName: "净重" },
    ));
  }
  return { candidates, conflicts };
}

function netWeightGrams(item) {
  const value = Number(item?.normalizedValue);
  if (!Number.isFinite(value)) return null;
  return String(item?.unit).toLowerCase() === "kg" ? value * 1000 : value;
}

function normalizeRange(value) {
  return text(value)
    .replace(/[~～—−-]/g, "–")
    .replace(/\s*–\s*/g, "–")
    .replace(/\b(?:及以上|以上)\b/g, "")
    .replace(/^(?:>=|＞=)/, "≥")
    .replace(/^(?:<=|＜=|<)/, "≤")
    .replace(/^>/, "≥")
    .trim();
}

function valueParts(rawValue, defaultUnit = null) {
  const raw = text(rawValue).replace(/[，,]\s*$/, "");
  const normalizedUnit = raw.match(/mm\/s|g\/10\s*min|g\/cm[³3]|kJ\/m[²2]|MPa|°?C|mm|kg|%|小时|\bh\b/i)?.[0] || defaultUnit || "";
  const unit = normalizedUnit === "小时" ? "h"
    : /^°?c$/i.test(normalizedUnit) ? "°C"
      : normalizedUnit.replace("cm3", "cm³").replace("m2", "m²").replace(/\s+/g, "");
  let value = normalizeRange(normalizeRange(raw)
    .replace(/\s*(?:mm\/s|g\/10\s*min|g\/cm[³3]|kJ\/m[²2]|MPa|°?C|mm|kg|%|小时|\bh\b)\s*/ig, " ")
    .replace(/\s*(?:及以上|以上)\s*$/g, "")
    .trim());
  if (/(?:及以上|以上)\s*$/.test(raw) && !/^[≥>]/.test(value)) value = `≥${value}`;
  return { value, unit };
}

function visionRows(observations) {
  const sorted = [...observations].sort((a, b) => ((b.y + b.height / 2) - (a.y + a.height / 2)) || (a.x - b.x));
  const rows = [];
  for (const item of sorted) {
    const centerY = item.y + item.height / 2;
    const row = rows.find((entry) => Math.abs(entry.centerY - centerY) <= Math.max(0.014, item.height * 0.45));
    if (row) {
      row.items.push(item);
      row.centerY = (row.centerY + centerY) / 2;
    } else {
      rows.push({ centerY, items: [item] });
    }
  }
  return rows.sort((a, b) => b.centerY - a.centerY).map((row) => {
    const items = row.items.sort((a, b) => a.x - b.x);
    return { text: items.map((item) => text(item.text)).filter(Boolean).join(" "), items };
  });
}

function supplementalVisionTables(files, imageIndex, ocr, productLine) {
  if (process.platform !== "darwin") return [];
  const processed = new Set([...ocr.matchAll(/^SOURCE:\s*(.+)$/gm)].map((match) => text(match[1])));
  const indexedCandidates = imageIndex.filter((image) => (
    image.pageSection === "detail_description"
    && !processed.has(text(image.localPath))
    && files[text(image.localPath)]
  )).map((image) => ({
    sourcePath: text(image.localPath),
    sourceKind: "indexed_detail_image",
  }));
  const detailSegments = Object.keys(files)
    .filter((path) => /^screenshots\/segments\/\d+\.(?:jpe?g|png|webp)$/i.test(path))
    .sort()
    .map((sourcePath) => ({ sourcePath, sourceKind: "detail_segment" }));
  const detailSectionPath = "screenshots/detail-section.webp";
  const screenshotCandidates = detailSegments.length
    ? detailSegments
    : files[detailSectionPath]
      ? [{ sourcePath: detailSectionPath, sourceKind: "detail_section" }]
      : [];
  const candidates = [...indexedCandidates, ...screenshotCandidates];
  if (!candidates.length) return [];

  const tempRoot = mkdtempSync(join(tmpdir(), "filament-vision-"));
  try {
    const sourceByTempPath = new Map();
    for (const [index, candidate] of candidates.entries()) {
      const sourcePath = candidate.sourcePath;
      const tempPath = join(tempRoot, `${String(index + 1).padStart(3, "0")}-${basename(sourcePath)}`);
      mkdirSync(dirname(tempPath), { recursive: true });
      writeFileSync(tempPath, files[sourcePath]);
      sourceByTempPath.set(tempPath, candidate);
    }
    const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "vision-ocr.swift");
    const moduleCachePath = join(tempRoot, "swift-module-cache");
    mkdirSync(moduleCachePath, { recursive: true });
    const run = spawnSync("swift", [scriptPath, ...sourceByTempPath.keys()], {
      encoding: "utf8",
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: moduleCachePath,
        SWIFT_MODULECACHE_PATH: moduleCachePath,
      },
      maxBuffer: 16 * 1024 * 1024,
      timeout: 240_000,
    });
    if (run.error) {
      throw new Error(`macOS Vision OCR process failed: ${JSON.stringify({
        ok: false,
        stage: "process_spawn",
        errorDomain: run.error.name,
        errorCode: run.error.code ?? null,
        errorMessage: run.error.message,
        signal: run.signal ?? null,
      })}`);
    }
    if (run.signal) {
      throw new Error(`macOS Vision OCR process failed: ${JSON.stringify({
        ok: false,
        stage: "process_exit",
        errorDomain: "Process",
        errorCode: run.status,
        errorMessage: "Swift Vision OCR exited because of a signal",
        signal: run.signal,
      })}`);
    }
    if (run.status !== 0 || !text(run.stdout)) {
      throw new Error(`macOS Vision OCR failed: ${text(run.stderr) || `exit ${run.status}`}`);
    }
    const visionResults = JSON.parse(run.stdout);
    const failedResult = visionResults.find((result) => result?.ok === false);
    if (failedResult) {
      throw new Error(`macOS Vision OCR failed: ${JSON.stringify(failedResult)}`);
    }
    return visionResults.map((result) => {
      const rows = visionRows(Array.isArray(result.observations) ? result.observations : []);
      const allText = rows.map((row) => row.text).join("\n");
      const candidate = sourceByTempPath.get(result.path);
      return {
        sourcePath: candidate?.sourcePath,
        sourceKind: candidate?.sourceKind,
        rows,
        text: allText,
        extractionMethod: "macos_vision_supplemental_ocr",
      };
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : "macOS Vision OCR failed");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function physicalVisionTables(tables, files, productLine) {
  const regularTables = tables.filter((table) => table.sourceKind !== "detail_segment");
  const segments = tables
    .filter((table) => table.sourceKind === "detail_segment")
    .sort((a, b) => text(a.sourcePath).localeCompare(text(b.sourcePath)));
  const groups = [];
  const physicalContinuation = /基本物性指标|密度|熔融指数|热变形温度|维卡软化温度|拉伸强度|拉伸断裂伸长率|弯曲强度|弯曲模量|冲击强度|测试标准/;
  for (const segment of segments) {
    const relevant = isOfficialPhysicalPropertyTable(segment.text, productLine)
      || physicalContinuation.test(segment.text);
    if (!relevant) continue;
    const segmentNumber = Number(text(segment.sourcePath).match(/(\d+)\.[^.]+$/)?.[1]);
    const previous = groups.at(-1);
    if (previous && Number.isFinite(segmentNumber) && segmentNumber === previous.lastSegmentNumber + 1) {
      previous.tables.push(segment);
      previous.lastSegmentNumber = segmentNumber;
    } else {
      groups.push({
        tables: [segment],
        lastSegmentNumber: segmentNumber,
      });
    }
  }
  const detailSectionPath = "screenshots/detail-section.webp";
  return [
    ...regularTables,
    ...groups.map((group) => {
      const mergedText = group.tables.map((table) => table.text).join("\n")
        .replace(/简支梁无缺口冲击\s*\n\s*强度/gu, "无缺口冲击强度")
        .replace(/简支梁缺口冲击\s*\n\s*强度/gu, "缺口冲击强度");
      return {
        sourcePath: files[detailSectionPath] ? detailSectionPath : group.tables[0].sourcePath,
        sourceKind: "detail_segment_group",
        rows: group.tables.flatMap((table) => table.rows),
        text: mergedText,
        extractionMethod: "macos_vision_supplemental_ocr",
      };
    }),
  ];
}

function knownAliasAtStart(value) {
  const compact = text(value).replace(/[：:]/g, " ").replace(/\s+/g, " ").trim();
  const aliases = FILAMENT_PARAMETER_DEFINITIONS.flatMap((definition) => (
    [definition.canonicalKey, ...definition.aliases].map((alias) => ({ definition, alias }))
  )).sort((a, b) => b.alias.length - a.alias.length);
  return aliases.find(({ alias }) => compact.toLowerCase().startsWith(alias.toLowerCase())) || null;
}

function recommendedPrintCandidates(table, productLineId) {
  const result = [];
  const options = (officialRawName) => ({
    sourceFile: table.sourcePath,
    productLineId,
    officialRawName,
  });
  const gridDefinitions = [
    [/^线径$/, "filamentDiameter"],
    [/^重量$/, "netWeight"],
    [/^[±士]?\s*公差$/, "diameterTolerance"],
    [/^打印温度$/, "nozzleTemperature"],
    [/^平台温度$/, "bedTemperature"],
    [/^打印速度$/, "printingSpeed"],
  ];
  const gridItems = table.rows.flatMap((row) => row.items);
  for (const [labelPattern, canonicalKey] of gridDefinitions) {
    const label = gridItems.find((item) => labelPattern.test(text(item.text)));
    if (!label) continue;
    const labelCenter = label.x + label.width / 2;
    const valueItem = gridItems
      .filter((item) => item.y < label.y && label.y - item.y < 0.06)
      .sort((a, b) => (
        Math.abs((a.x + a.width / 2) - labelCenter)
        - Math.abs((b.x + b.width / 2) - labelCenter)
      ))[0];
    if (!valueItem || Math.abs((valueItem.x + valueItem.width / 2) - labelCenter) > 0.06) continue;
    const rawName = text(label.text).replace(/^士\s*/, "±");
    let rawValue = text(valueItem.text);
    if (canonicalKey === "filamentDiameter" && /[/／]/.test(rawValue)) continue;
    if (canonicalKey === "diameterTolerance" && /^[±士]/.test(rawName) && !/^[±士]/.test(rawValue)) {
      rawValue = `±${rawValue}`;
    }
    const definition = getParameterDefinition(canonicalKey);
    const parsed = valueParts(rawValue, definition?.defaultUnit || null);
    if (!parsed.value) continue;
    result.push(candidate(
      canonicalKey,
      rawValue,
      parsed.value.replace(/^士/, "±"),
      parsed.unit,
      "high",
      "official",
      `${rawName} ${text(valueItem.text)}`,
      null,
      options(rawName),
    ));
  }
  if (result.length >= 2) return result;

  for (const row of table.rows) {
    if (/(?:建议|推荐)?打印参数/.test(row.text)) continue;
    if (/^(?:Ps\.?|注[：:]?|所有材料|长时间|间隔时间|PETG\s)/i.test(row.text)) break;
    const left = row.items.filter((item) => item.x < 0.45).map((item) => text(item.text)).join(" ");
    const right = row.items.filter((item) => item.x >= 0.45).map((item) => text(item.text)).join(" ");
    const aliasMatch = knownAliasAtStart(left || row.text);
    const rawName = aliasMatch?.alias || text(left).replace(/\s*(?:mm\/s|°?C|mm|%)\s*$/i, "");
    const rawValue = right || text(row.text).slice(rawName.length).trim();
    if (!rawName || !rawValue) continue;

    const canonicalKey = aliasMatch?.definition.canonicalKey || null;
    if (!canonicalKey && !/[\d≤≥<>]|PEI|PVP/i.test(rawValue)) continue;
    if (canonicalKey === "dryingTemperature") {
      const temperature = rawValue.match(/([≤≥<>]?\d+(?:\.\d+)?\s*[~～\-–]\s*\d+(?:\.\d+)?)\s*°?C/i);
      const duration = rawValue.match(/([≤≥<>]?\d+(?:\.\d+)?\s*[~～\-–]\s*\d+(?:\.\d+)?)\s*(?:小时|h)(?:\s|$)/i);
      if (temperature) {
        result.push(candidate("dryingTemperature", rawValue, normalizeRange(temperature[1]), "°C", "high", "official", row.text, null, options(rawName)));
      }
      if (duration) {
        result.push(candidate("dryingTime", rawValue, normalizeRange(duration[1]), "h", "high", "official", row.text, null, options("烘干时间")));
      }
      continue;
    }

    const definition = canonicalKey ? getParameterDefinition(canonicalKey) : null;
    const parsed = valueParts(rawValue, definition?.defaultUnit || null);
    if (!parsed.value) continue;
    result.push(candidate(canonicalKey || rawName, rawValue, parsed.value, parsed.unit, "high", "official", row.text, null, options(rawName)));
  }
  return result;
}

function numericCandidates(productLineId, specTable) {
  const options = (officialRawName) => ({
    sourceFile: specTable.sourcePath,
    productLineId,
    officialRawName,
  });
  const result = [];
  const header = specTable.text.match(/线径\s+重量\s+公差\s*\n\s*(\d+(?:\.\d+)?)\s*mm\s+(\d+(?:\.\d+)?)\s*kg\s+[+±]\s*(\d+(?:\.\d+)?)\s*mm/i);
  if (header) {
    result.push(candidate("filamentDiameter", `${header[1]} mm`, header[1], "mm", "high", "official", header[0], null, options("线径")));
    result.push(candidate("netWeight", `${header[2]} kg`, header[2], "kg", "high", "official", header[0], null, options("重量")));
    result.push(candidate("diameterTolerance", `±${header[3]} mm`, `±${header[3]}`, "mm", "high", "official", header[0], null, options("公差")));
  }
  for (const property of parseOfficialPhysicalProperties(specTable.text)) {
    result.push(candidate(
      property.canonicalKey,
      property.sourceText,
      property.normalizedValue,
      property.unit,
      "high",
      "official",
      property.sourceText,
      property.testCondition,
      options(property.officialRawName),
    ));
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
const structuredTableInput = optionalJson(files, "parameter-tables.json");
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
let structuredTable;
try {
  structuredTable = parseStructuredParameterTable(structuredTableInput, {
    expectedProductTitle: productLine,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : "Invalid parameter-tables.json");
}
const existingSpecTable = officialSpecTable(ocr, productLine);
const supplementalVisionResults = structuredTable
  ? []
  : supplementalVisionTables(files, imageIndex, ocr, productLine);
const supplementalPhysicalTables = physicalVisionTables(supplementalVisionResults, files, productLine);
let supplementalSpecTable;
try {
  supplementalSpecTable = selectOfficialPhysicalPropertyTable(supplementalPhysicalTables, productLine);
} catch (error) {
  fail(error instanceof Error ? error.message : `Ambiguous official specification tables for ${productLine}`);
}
if (existingSpecTable && supplementalSpecTable) {
  fail(`Ambiguous official specification tables for ${productLine}: found 2`);
}
const specTable = existingSpecTable || supplementalSpecTable;
const targetIdentity = normalizedIdentity(productLine);
const visionTables = supplementalVisionResults.filter((table) => (
  !structuredTable
  &&
  normalizedIdentity(table.text).includes(targetIdentity)
  && /(?:建议|推荐)?打印参数/.test(table.text)
));
const explicitBasics = explicitDiameterAndWeight(files, meta, mappings, productLineId, productLine);
const materialParameter = candidate(
  "materialType",
  material,
  material,
  "",
  "high",
  "official",
  `${productLine} / ${material}`,
  null,
  { sourceFile: "capture.json", productLineId, officialRawName: "材料类型" },
);
const structuredParameters = structuredTable?.parameters.map((item) => candidate(
  item.canonicalKey,
  item.rawValue,
  item.normalizedValue,
  item.unit,
  structuredTable.productTitleMatch ? "high" : "low",
  structuredTable.productTitleMatch ? "official" : "conflict",
  item.sourceText,
  null,
  {
    sourceFile: item.sourceFile,
    productLineId,
    officialRawName: item.officialRawName,
    canonicalKey: item.canonicalKey,
  },
)) || [];
const collectedParameters = [
  ...structuredParameters,
  ...(specTable ? numericCandidates(productLineId, specTable) : []),
  materialParameter,
  ...explicitBasics.candidates,
  ...visionTables.flatMap((table) => recommendedPrintCandidates(table, productLineId)),
];
const parameters = [...new Map(collectedParameters.map((item) => [
  item.canonicalKey || `unmapped:${item.officialRawName}`,
  item,
])).values()];

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
  ...(structuredTable?.table.sourceImage && files[structuredTable.table.sourceImage]
    ? [structuredTable.table.sourceImage]
    : []),
  ...(specTable?.sourcePath && files[specTable.sourcePath] ? [specTable.sourcePath] : []),
  ...visionTables.map((table) => table.sourcePath).filter((path) => files[path]),
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
if (!specTable) requiredMissing.push("officialSpecificationTable");
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
for (const conflict of explicitBasics.conflicts) reasons.push(`PARAMETER_CONFLICT:${conflict.field}=${conflict.values.join("|")}`);
if (structuredTable && !structuredTable.productTitleMatch) {
  reasons.push(`PARAMETER_TABLE_IDENTITY_MISMATCH:${structuredTable.warnings.join("|") || structuredTable.table.tableTitle}`);
}
const autoPublishEligible = !duplicateMatches.length
  && !requiredMissing.length
  && (!structuredTable || structuredTable.productTitleMatch);
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
  officialSpecificationTable: specTable ? "present" : "missing",
  parameterEvidenceComplete: Boolean(specTable),
  warnings: reasons,
  importDecision: {
    autoPublishEligible,
    exactNameDuplicate: duplicateMatches.length > 0,
    duplicateMatches,
    requiredMissing,
    reasons,
    parameterConflicts: explicitBasics.conflicts,
    officialSpecificationTable: specTable ? "present" : "missing",
    parameterEvidenceComplete: Boolean(specTable),
    requiresManualReview: true,
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
  diameterMm: Number(parameters.find((item) => item.canonicalKey === "filamentDiameter" && item.reviewStatus === "official")?.normalizedValue) || null,
  netWeightG: netWeightGrams(parameters.find((item) => item.canonicalKey === "netWeight" && item.reviewStatus === "official")) || null,
  sourceStatus: "captured_official_store",
  translationStatus: "source_preserved",
  colors,
  parameters: {
    filamentDiameter: parameters.find((item) => item.canonicalKey === "filamentDiameter") || null,
    netWeight: parameters.find((item) => item.canonicalKey === "netWeight") || null,
    nozzleTemperature: parameters.find((item) => item.canonicalKey === "nozzleTemperature") || null,
    bedTemperature: parameters.find((item) => item.canonicalKey === "bedTemperature") || null,
    printSpeed: parameters.find((item) => item.canonicalKey === "printingSpeed") || null,
    dryingTemperature: parameters.find((item) => item.canonicalKey === "dryingTemperature") || null,
  dryingDuration: parameters.find((item) => ["dryingDuration", "dryingTime"].includes(item.canonicalKey)) || null,
    amsCompatibility: null,
    nozzleRequirement: null,
    printNotes: null,
    parameterStatus: parameters.length ? "partial" : "missing",
    evidenceRefs: ["identity", ...(structuredTable ? ["structured-parameter-table"] : []), ...(specTable ? ["ocr-spec-table"] : []), ...visionTables.map((_, index) => `ocr-print-table-${index + 1}`)],
    requiresManualReview: true,
    rawCandidates: parameters,
  },
  notes: reasons.join("; "),
  evidenceRefs: ["identity", "colors", ...(structuredTable ? ["structured-parameter-table"] : []), ...(specTable ? ["ocr-spec-table"] : []), ...visionTables.map((_, index) => `ocr-print-table-${index + 1}`)],
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
    fieldBindings: ["brand", "productLine", "material", "materialType"],
    notes: text(meta.url),
  },
  ...(structuredTable ? [{
    evidenceId: "structured-parameter-table",
    brandId,
    productLineId,
    productKey,
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: "parameter-tables.json",
    sourceType: "structured_parameter_table",
    extractedAssetId: files[structuredTable.table.sourceImage]
      ? `assets/${structuredTable.table.sourceImage}`
      : null,
    extractionMethod: "parameter-tables.v1",
    cropCoordinates: null,
    ocrText: JSON.stringify(structuredTable.table.rows),
    ocrConfidence: structuredTable.productTitleMatch ? 0.95 : 0.5,
    fieldBindings: structuredParameters.map((item) => item.canonicalKey),
    notes: [
      `Source image: ${structuredTable.table.sourceImage}`,
      `Table title: ${structuredTable.table.tableTitle}`,
      ...structuredTable.warnings,
    ].join("; "),
  }] : []),
  ...(specTable ? [{
    evidenceId: "ocr-spec-table",
    brandId,
    productLineId,
    productKey,
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: specTable.sourcePath,
    sourceType: "ocr_candidate",
    extractedAssetId: `assets/${specTable.sourcePath}`,
    extractionMethod: specTable.extractionMethod,
    cropCoordinates: null,
    ocrText: specTable.text,
    ocrConfidence: 0.82,
    fieldBindings: parameters.filter((item) => item.sourceFile === specTable.sourcePath).map((item) => item.canonicalKey || item.field),
    notes: "Scoped to the matching productLineId; the source OCR text is retained for parameter evidence.",
  }] : []),
  ...visionTables.map((table, index) => ({
    evidenceId: `ocr-print-table-${index + 1}`,
    brandId,
    productLineId,
    productKey,
    sourceZipFilename: basename(inputPath),
    sourceZipHash: sourceHash,
    sourceRelativePath: table.sourcePath,
    sourceType: "ocr_candidate",
    extractedAssetId: `assets/${table.sourcePath}`,
    extractionMethod: "macos_vision_supplemental_ocr",
    cropCoordinates: null,
    ocrText: `${productLine} official recommended print table.`,
    ocrConfidence: 0.9,
    fieldBindings: parameters.filter((item) => item.sourceFile === table.sourcePath).map((item) => item.canonicalKey || item.field),
    notes: "Supplemental OCR was limited to an unprocessed detail image containing the exact product identity and an official print-parameter heading.",
  })),
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
  supplementalOcrTableCount: visionTables.length,
  officialSpecificationTable: specTable ? "present" : "missing",
  parameterEvidenceComplete: Boolean(specTable),
  requiresManualReview: true,
  colorCandidateCount: colors.length,
  parameterCandidateCount: parameters.length,
  unresolvedCount: parameters.filter((item) => !["confirmed", "official"].includes(item.reviewStatus)).length + requiredMissing.length,
  warnings: reasons,
  parameterConflicts: explicitBasics.conflicts,
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
    fields: Object.fromEntries(parameters.filter((item) => item.reviewStatus === "official" && item.canonicalKey).map((item) => [item.canonicalKey, fieldValue(item)]).filter(([, value]) => value)),
    unmappedFields: Object.fromEntries(parameters.filter((item) => item.reviewStatus === "official" && !item.canonicalKey).map((item) => [item.officialRawName, fieldValue(item)]).filter(([, value]) => value)),
    candidates: parameters,
    sourceEvidence: parameters.map((item) => ({
      field: item.canonicalKey || item.field,
      sourceFile: item.sourceFile,
      sourceText: item.sourceText,
      confidence: item.confidence,
      reviewStatus: item.reviewStatus,
      testCondition: item.testCondition,
      productLineId,
      officialRawName: item.officialRawName,
    })),
    status: requiredMissing.length ? "official_partial" : "official",
    reviewNote: specTable
      ? "Imported from the official specification table scoped to this productLineId."
      : "Imported from explicit product and SKU text scoped to this productLineId; the official specification table is missing.",
  },
  evidence,
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
  supplementalOcrTableCount: visionTables.length,
  reviewReasons: reasons,
  fipBytes: zipped.byteLength,
  inputSha256: sourceHash,
}, null, 2)}\n`);
