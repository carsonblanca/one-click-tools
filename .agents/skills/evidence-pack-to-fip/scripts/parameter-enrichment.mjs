// canonical parameter enrichment for KEXCELLED FIP OCR.
//
// v3-lite: every OCR-derived parameter becomes a stable, self-describing
// "candidate" that carries its full provenance (source image + OCR text path
// + snippet). Candidates are generated ONLY at build-fip time. Upload/review
// stages must NOT re-interpret OCR or regenerate parameters.
//
// Design rules (per spec):
//  - candidateId is a deterministic hash(productLine + canonicalKey +
//    normalizedValue + sourceImage); re-running the same ZIP yields the same id.
//  - canonicalKey is restricted to a fixed allowlist.
//  - Contamination is judged PER IMAGE, never by merging the whole ZIP OCR.
//  - Only "label + value + unit" lines are accepted (no bare numbers, SKUs,
//    prices, dates, recommended-product weights, page stats).
//  - Ranges are preserved (230-260°C stays a range). Tolerances keep the ±
//    sign. Drying is split into {temperatureC, durationHours}.

export const KEXCELLED_BRAND = "KEXCELLED";

// Allowed canonical keys. Anything OCR detects but cannot map safely is
// rejected (or recorded as raw evidence) — no new fields are invented.
export const CANONICAL_PARAMETER_FIELDS = [
  // parameter-level
  "nozzleTemperature",
  "bedTemperature",
  "recommendedPrintSpeed",
  "dryingRecommendation",
  "density",
  "diameterTolerance",
  // product-level
  "filamentDiameter",
  "netWeight",
];

const PRODUCT_LEVEL_KEYS = new Set(["filamentDiameter", "netWeight"]);

// Unit allowlist for canonical numeric parameters.
const ALLOWED_UNITS = new Set([
  "°C",
  "mm",
  "mm/s",
  "g/cm³",
  "g",
  "kg",
]);

// Identity tokens that must be present in the OCR text for it to be considered
// "this product, not a foreign / recommended item".
const ACCEPTED_IDENTITY_TOKENS = ["THE K5 PETG M", "PETG M", "PETG", "ABS", "PLA M", "PLA"];

// Tokens that mark a line / image as foreign intrusion and must be rejected.
// (e.g. recommended products, other material lines, unrelated brands)
const FOREIGN_INTRUSION_TOKENS = [
  "PLA Pure",
  "Bambu",
  "拓竹",
  "推荐商品",
  "组合装",
  "其他材料",
  "THE K6",
  "K6 PETG",
];

// Label aliases -> canonicalKey. Only these labels are accepted; anything else
// that looks numeric but has no known label is rejected (no bare numbers).
// min/max are plausible numeric ranges used to flag (not drop) suspicious
// values. Out-of-range values are still recorded as candidates (review-gated)
// but marked plausible:false so a reviewer knows they need a human check.
const LABEL_TO_KEY = [
  { key: "nozzleTemperature", aliases: ["喷嘴温度", "喷头温度", "喷嘴", "打印温度", "挤出温度", "nozzle", "nozzle temp", "extruder"], unit: "°C", min: 150, max: 350 },
  { key: "bedTemperature", aliases: ["热床温度", "平台温度", "底板温度", "床温", "热床", "bed", "bed temp", "build plate"], unit: "°C", min: 0, max: 150 },
  { key: "recommendedPrintSpeed", aliases: ["打印速度", "打印速率", "打印流速", "速度", "打印速度推荐", "print speed", "speed"], unit: "mm/s", min: 10, max: 600 },
  { key: "dryingRecommendation", aliases: ["干燥", "烘干", "干燥建议", "干燥温度", "drying", "dry"], unit: "°C", min: 0, max: 100 },
  { key: "density", aliases: ["密度", "比重", "density"], unit: "g/cm³", min: 0.5, max: 3 },
  { key: "diameterTolerance", aliases: ["公差", "直径公差", "线径公差", "尺寸公差", "tolerance", "diameter tolerance"], unit: "mm", min: 0, max: 0.5 },
  { key: "filamentDiameter", aliases: ["线径", "直径", "丝径", "filament diameter", "diameter"], unit: "mm", min: 1, max: 3 },
  { key: "netWeight", aliases: ["净重", "净含量", "重量", "net weight", "weight"], unit: "g", min: 100, max: 8000 },
];

import { createHash as nodeCreateHash } from "node:crypto";

export function stableHash(parts) {
  const input = parts.join("|");
  return nodeCreateHash("sha256").update(input, "utf8").digest("hex").slice(0, 16);
}

function normalizeUnit(rawUnit) {
  const u = (rawUnit || "").trim();
  if (!u) return "";
  // normalize common unicode / ascii variants
  const map = {
    "℃": "°C",
    "ºC": "°C",
    "°c": "°C",
    "C": "°C",
    "mm/s": "mm/s",
    "mm／s": "mm/s",
    "m/s": "mm/s",
    "g/cm3": "g/cm³",
    "g/cm³": "g/cm³",
    "g·cm⁻³": "g/cm³",
    "KG": "kg",
    "Kg": "kg",
    "千克": "kg",
    "G": "g",
    "克": "g",
  };
  const norm = map[u] || u;
  return ALLOWED_UNITS.has(norm) ? norm : "";
}

function parseRange(raw) {
  // "230-260" -> {operator:"range", min, max}
  // "≤60" / "<=60" -> {operator:"lte", max}
  // "≥200" / ">=200" -> {operator:"gte"... } (we only store lte/lt/range/eq)
  // "60" -> {operator:"eq", value}
  const s = String(raw).trim();
  const range = s.match(/^(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)$/);
  if (range) {
    const min = parseFloat(range[1]);
    const max = parseFloat(range[2]);
    return { operator: "range", value: null, min, max };
  }
  const lte = s.match(/^(?:≤|<=|≦)\s*(-?\d+(?:\.\d+)?)$/);
  if (lte) return { operator: "lte", value: null, min: null, max: parseFloat(lte[1]) };
  const lt = s.match(/^<\s*(-?\d+(?:\.\d+)?)$/);
  if (lt) return { operator: "lt", value: null, min: null, max: parseFloat(lt[1]) };
  const eq = s.match(/^(-?\d+(?:\.\d+)?)$/);
  if (eq) return { operator: "eq", value: parseFloat(eq[1]), min: null, max: null };
  return null;
}

function parseTolerance(raw) {
  // "±0.03" -> {operator:"eq"... min/max derived} keep ± meaning: store value and
  // a symmetric tolerance. We keep operator "eq" with a tolerance field to preserve
  // the ± sign in normalizedValue.
  const s = String(raw).trim();
  const m = s.match(/^±\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const v = parseFloat(m[1]);
    return { present: true, value: v };
  }
  return null;
}

function parseDrying(raw) {
  // "55°C 8小时" / "55℃ 8h" / "60度6小时" -> {temperatureC, durationHours}
  const s = String(raw);
  const temp = s.match(/(\d+(?:\.\d+)?)\s*(?:°C|℃|度|ºC)/);
  const dur = s.match(/(\d+(?:\.\d+)?)\s*(?:小时|h|H|hr)/);
  const temperatureC = temp ? parseFloat(temp[1]) : null;
  const durationHours = dur ? parseFloat(dur[1]) : null;
  if (temperatureC === null && durationHours === null) return null;
  return { temperatureC, durationHours };
}

function buildSnippet(text, matchStart, matchEnd) {
  const pre = text.slice(Math.max(0, matchStart - 20), matchStart).replace(/\s+/g, " ");
  const hit = text.slice(matchStart, matchEnd).replace(/\s+/g, " ");
  const post = text.slice(matchEnd, matchEnd + 20).replace(/\s+/g, " ");
  return `${pre}»${hit}«${post}`.trim();
}

function lineHasForeignIntrusion(line) {
  return FOREIGN_INTRUSION_TOKENS.filter((tok) => line.includes(tok));
}

function lineHasAcceptedIdentity(line) {
  return ACCEPTED_IDENTITY_TOKENS.some((tok) => line.includes(tok));
}

function isIdentitySafeForProduct(text, productLine) {
  // Per-image identity check: the line must reference an accepted token, and
  // must NOT contain a foreign-intrusion token.
  if (lineHasForeignIntrusion(text).length) return false;
  // an accepted token that matches the product line is ideal
  if (productLine && text.includes(productLine)) return true;
  return lineHasAcceptedIdentity(text);
}

// Plausibility: only trust a candidate when (a) it carries an explicit unit
// that matches the label's expected unit, and (b) every numeric component is
// inside the label's sane range. Out-of-range / unit-mismatched values are
// still recorded (review-gated) but flagged plausible:false.
function makePlausible(def, parsed, unit, confidence) {
  if (confidence === "inferred_unit" && unit !== def.unit) return false;
  if (unit && unit !== def.unit) return false; // explicit but wrong unit
  const nums = [];
  if (parsed.value != null) nums.push(parsed.value);
  if (parsed.min != null) nums.push(parsed.min);
  if (parsed.max != null) nums.push(parsed.max);
  for (const n of nums) {
    if (Number.isNaN(n)) return false;
    if (n < def.min || n > def.max) return false;
  }
  return true;
}

function parseParamLine(line, productLine) {
  // returns {key, rawValue, normalizedValue, unit, parsed, confidence} or null
  for (const def of LABEL_TO_KEY) {
    // Locate the EARLIEST occurrence of any label alias in this line. The value
    // + unit are extracted ONLY from the text AFTER that label, so stray digits
    // that appear before the label (e.g. "THE K5", "3D打印") can never be
    // mistaken for the parameter value. This is the root-cause fix for the
    // first-number mis-capture; it does not rely on a plausibility floor.
    let labelHit = null;
    let labelIndex = Infinity;
    for (const alias of def.aliases) {
      const idx = line.indexOf(alias);
      if (idx !== -1 && idx < labelIndex) {
        labelIndex = idx;
        labelHit = alias;
      }
    }
    if (!labelHit) continue;

    const afterLabel = line.slice(labelIndex + labelHit.length);

    // value extraction
    let rawValue = "";
    let parsed = null;
    let unit = "";
    let confidence = "single_line";
    let normalizedValue = "";

    // drying: special handling -> split temperature + duration
    if (def.key === "dryingRecommendation") {
      const dry = parseDrying(afterLabel);
      if (!dry) return null;
      rawValue = line.trim();
      parsed = { operator: "eq", value: dry.temperatureC, min: null, max: null, temperatureC: dry.temperatureC, durationHours: dry.durationHours };
      normalizedValue = `${dry.temperatureC}°C ${dry.durationHours}h`;
      unit = "°C";
      confidence = "exact_label_value";
      const plausibleD = makePlausible(def, parsed, unit, confidence);
      return { key: def.key, rawValue, normalizedValue, unit, parsed, confidence, plausible: plausibleD };
    }

    // tolerance: keep ±
    const tol = afterLabel.match(/±\s*(\d+(?:\.\d+)?)\s*(mm|MM)?/);
    if (def.key === "diameterTolerance" && tol) {
      const v = parseFloat(tol[1]);
      rawValue = `±${tol[1]}mm`;
      normalizedValue = `±${tol[1]}mm`;
      unit = "mm";
      parsed = { operator: "eq", value: v, min: null, max: null, tolerance: v };
      confidence = "exact_label_value";
      const plausibleT = makePlausible(def, parsed, unit, confidence);
      return { key: def.key, rawValue, normalizedValue, unit, parsed, confidence, plausible: plausibleT };
    }

    // range or single value with unit — searched ONLY in the window after the label
    const numMatch = afterLabel.match(/(-?\d+(?:\.\d+)?\s*[-–—]\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?)\s*(°C|℃|ºC|mm\/s|mm|m\/s|g\/cm[³3]|g·cm⁻³|g|kg|KG|千克|克)?/);
    if (!numMatch) return null;
    const numPart = numMatch[1];
    const rawUnitPart = numMatch[2] || "";
    parsed = parseRange(numPart);
    if (!parsed) return null;
    unit = normalizeUnit(rawUnitPart);
    if (!unit) {
      // infer unit from label default, mark confidence
      unit = def.unit;
      confidence = "inferred_unit";
    } else {
      confidence = "exact_label_value";
    }

    // Unit normalization for product-level fields. KEXCELLED labels weight in kg
    // on the packaging while the canonical unit is grams; convert so a normal
    // "1kg" / "0.5kg" input is NOT flagged as a suspect. The original manufacturer
    // text is preserved in rawValue.
    if (def.key === "netWeight" && (unit === "kg" || unit === "千克")) {
      const factor = 1000;
      if (parsed.value != null) parsed.value *= factor;
      if (parsed.min != null) parsed.min *= factor;
      if (parsed.max != null) parsed.max *= factor;
      unit = "g";
      if (parsed.operator === "range") normalizedValue = `${parsed.min}-${parsed.max}g`;
      else if (parsed.operator === "lte") normalizedValue = `≤${parsed.max}g`;
      else if (parsed.operator === "lt") normalizedValue = `<${parsed.max}g`;
      else normalizedValue = `${parsed.value}g`;
    } else if (parsed.operator === "range") {
      normalizedValue = `${parsed.min}-${parsed.max}${unit}`;
    } else if (parsed.operator === "lte") {
      normalizedValue = `≤${parsed.max}${unit}`;
    } else if (parsed.operator === "lt") {
      normalizedValue = `<${parsed.max}${unit}`;
    } else {
      normalizedValue = `${parsed.value}${unit}`;
    }
    rawValue = line.trim();
    const plausible = makePlausible(def, parsed, unit, confidence);
    return { key: def.key, rawValue, normalizedValue, unit, parsed, confidence, plausible };
  }
  return null;
}

function makeCandidate(productLine, sourceImage, ocrTextPath, line, parsed) {
  const candidateId = stableHash([
    productLine || "",
    parsed.key,
    parsed.normalizedValue,
    sourceImage || "",
  ]);
  return {
    candidateId,
    canonicalKey: parsed.key,
    rawValue: parsed.rawValue,
    normalizedValue: parsed.normalizedValue,
    unit: parsed.unit,
    parsed: {
      operator: parsed.parsed.operator,
      value: parsed.parsed.value ?? null,
      min: parsed.parsed.min ?? null,
      max: parsed.parsed.max ?? null,
      ...(parsed.parsed.tolerance !== undefined ? { tolerance: parsed.parsed.tolerance } : {}),
      ...(parsed.parsed.temperatureC !== undefined ? { temperatureC: parsed.parsed.temperatureC } : {}),
      ...(parsed.parsed.durationHours !== undefined ? { durationHours: parsed.parsed.durationHours } : {}),
    },
    confidence: parsed.confidence,
    source: {
      ocrTextPath: ocrTextPath || "",
      sourceImage: sourceImage || "",
      snippet: buildSnippet(line, line.indexOf(parsed.rawValue.replace(/\s+/g, "").slice(0, 8)) >= 0 ? line.indexOf(parsed.rawValue.replace(/\s+/g, "").slice(0, 8)) : 0, Math.min(line.length, (line.indexOf(parsed.rawValue.replace(/\s+/g, "").slice(0, 8)) >= 0 ? line.indexOf(parsed.rawValue.replace(/\s+/g, "").slice(0, 8)) : 0) + 24)),
    },
    identityVerified: true,
    foreignIntrusions: [],
    plausible: parsed.plausible !== false,
    reviewStatus: "pending_review",
  };
}

// Keep the snippet builder simple & robust (no fragile index math).
function buildCandidate(productLine, sourceImage, ocrTextPath, line, parsed) {
  const c = makeCandidate(productLine, sourceImage, ocrTextPath, line, parsed);
  // recompute snippet simply
  const hit = parsed.rawValue || line;
  c.source.snippet = buildSnippet(line, line.indexOf(hit) >= 0 ? line.indexOf(hit) : 0, line.indexOf(hit) >= 0 ? Math.min(line.length, line.indexOf(hit) + hit.length) : line.length);
  return c;
}

export function buildOcrParameterCandidates(evidenceFiles, identity, sourceRunId) {
  const indexText = stringOrEmpty(evidenceFiles["ocr/index.json"]);
  let ocrIndex = [];
  try {
    const parsed = JSON.parse(indexText);
    ocrIndex = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.entries) ? parsed.entries : []);
  } catch {
    ocrIndex = [];
  }

  const productLine = stringOrEmpty(identity && identity.productLine);

  const candidates = [];
  const suspectCandidates = [];
  const rejections = [];
  let sourceImageCount = 0;

  for (const entry of ocrIndex) {
    const imagePath = normalizeSourceImage(entry.imagePath);
    const ocrTextPath = stringOrEmpty(entry.ocrTextPath);
    if (!ocrTextPath) continue;
    const ocrRaw = evidenceFiles[ocrTextPath];
    if (!ocrRaw) continue;
    const text = stringOrEmpty(ocrRaw);

    // Per-image identity gate.
    if (!isIdentitySafeForProduct(text, productLine)) {
      const intrusions = lineHasForeignIntrusion(text);
      rejections.push({
        reason: "identity_unverified_or_foreign",
        sourceImage: imagePath,
        ocrTextPath,
        intrusions,
        snippet: text.slice(0, 80).replace(/\s+/g, " "),
      });
      continue;
    }
    if (imagePath) sourceImageCount += 1;

    const lines = text.split(/\r?\n/);
    let imageProducedCandidate = false;
    for (const line of lines) {
      const intrusions = lineHasForeignIntrusion(line);
      if (intrusions.length) {
        rejections.push({
          reason: "foreign_intrusion_in_line",
          sourceImage: imagePath,
          ocrTextPath,
          intrusions,
          snippet: line.trim().slice(0, 80),
        });
        continue;
      }
      const parsed = parseParamLine(line, productLine);
      if (!parsed) continue;
      // reject bare numbers / implausible (e.g. price/date) — only accept if a
      // known label matched (parseParamLine already enforces label presence)
      const candidate = buildCandidate(productLine, imagePath, ocrTextPath, line, parsed);
      // HARDENING: plausible=false candidates are NOT trusted. They must not
      // enter the formal candidate list (which becomes FIP parameter-candidates.json).
      // They are quarantined into suspectCandidates for human review instead.
      if (candidate.plausible === false) {
        suspectCandidates.push(candidate);
      } else {
        candidates.push(candidate);
      }
      imageProducedCandidate = true;
    }
    // if a non-foreign image produced nothing, record a soft miss for the report
    if (!imageProducedCandidate) {
      // not counted as rejection; just no candidate
    }
  }

  // de-duplicate identical (canonicalKey + normalizedValue + sourceImage)
  const seen = new Set();
  const deduped = [];
  for (const c of candidates) {
    const k = `${c.canonicalKey}|${c.normalizedValue}|${c.source.sourceImage}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(c);
  }

  // de-duplicate suspect candidates (plausible=false) by the same key
  const seenSuspect = new Set();
  const dedupedSuspect = [];
  for (const c of suspectCandidates) {
    const k = `${c.canonicalKey}|${c.normalizedValue}|${c.source.sourceImage}`;
    if (seenSuspect.has(k)) continue;
    seenSuspect.add(k);
    dedupedSuspect.push(c);
  }

  return {
    candidates: deduped,
    suspectCandidates: dedupedSuspect,
    rejections,
    sourceImageCount,
    ocrTextCount: ocrIndex.length,
    usedOcrPaths: ocrIndex.map((e) => stringOrEmpty(e.ocrTextPath)).filter(Boolean),
  };
}

function normalizeSourceImage(imagePath) {
  // Preserve the OCR index's original asset path verbatim. It is the stable,
  // ZIP-bound provenance of the source screenshot (e.g.
  // "screenshots/segments/0015.png"). The FIP maps it to a hashed asset via
  // images.json, so downstream review can always resolve the original image.
  return stringOrEmpty(imagePath);
}

function stringOrEmpty(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder("utf-8").decode(value);
  if (value == null) return "";
  try {
    return String(value);
  } catch {
    return "";
  }
}

export const CANONICAL_PARAMETER_PRODUCT_LEVEL_KEYS = PRODUCT_LEVEL_KEYS;
