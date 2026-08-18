#!/usr/bin/env node

// Deterministic product-identity resolver for KEXCELLED Evidence Packs.
//
// Resolution priority:
//   1. structured.json / tmall_sku_base / SKU strings  (model prefix + letter variant)
//   2. page.txt / README.md / title                    (official series words)
//   3. capture.json.productLine                        (canonical base line)
//
// Rules:
//   - Never return an empty productLine when evidence carries a clear model.
//   - Never guess; series words are recognized only from the curated official
//     vocabulary below (evidence-backed, not inferred from description text).
//   - Never concatenate description words into the product line (e.g. never
//     produce "THE K5™ ABS T 透明高透光").

import { strFromU8 } from "fflate";

// Official KEXCELLED series words observed in official product titles /
// README "Product:" lines. These are product-line identifiers, not descriptions.
const OFFICIAL_SERIES_WORDS = ["夜光系列", "高安定性"];

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readJsonSafe(files, name) {
  if (!files[name]) return null;
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    return null;
  }
}

// "THE K5™ ABS P-1.75-SLV-1KG（银色）" -> "THE K5™ ABS P"
function skuModelPrefix(skuText) {
  const text = stringValue(skuText);
  const match = text.match(/^(.*?)(?:-\d+(?:\.\d+)?-|$)/);
  return match ? match[1].trim() : "";
}

function dominantSkuPrefix(prefixes) {
  const counts = new Map();
  for (const prefix of prefixes) {
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}

// Priority 1: SKU strings from structured.json tmall_sku_base then color-mappings.json.
function collectSkuTexts(files) {
  const texts = [];
  const structured = readJsonSafe(files, "snapshot/structured.json");
  if (structured && Array.isArray(structured.embeddedJson)) {
    for (const entry of structured.embeddedJson) {
      const data = entry && entry.data;
      if (data && Array.isArray(data.colors)) {
        for (const color of data.colors) {
          if (color && typeof color.name === "string") texts.push(color.name);
        }
      }
    }
  }
  const mappings = readJsonSafe(files, "color-mappings.json");
  if (Array.isArray(mappings)) {
    for (const mapping of mappings) {
      if (mapping && typeof mapping.sourceText === "string") texts.push(mapping.sourceText);
    }
  }
  return texts.filter(Boolean);
}

// Priority 2: page.txt / README.md / title text.
function collectTitleText(files) {
  const parts = [];
  const structured = readJsonSafe(files, "snapshot/structured.json");
  if (structured) {
    for (const key of ["detectedProductName", "pageTitle"]) {
      if (typeof structured[key] === "string") parts.push(structured[key]);
    }
    if (Array.isArray(structured.titleCandidates)) {
      for (const candidate of structured.titleCandidates) {
        if (candidate && typeof candidate.value === "string") parts.push(candidate.value);
      }
    }
  }
  for (const name of ["README.md", "page.txt"]) {
    if (files[name]) parts.push(strFromU8(files[name]));
  }
  return parts.join("\n");
}

export function resolveKexcelledProductLine(files, identity) {
  const skuTexts = collectSkuTexts(files);
  const prefixes = skuTexts.map(skuModelPrefix).filter(Boolean);
  const skuPrefix = dominantSkuPrefix(prefixes);
  const captureLine = stringValue(identity && identity.productLine);

  // Priority 3 base: capture.productLine when present (canonical, no ™),
  // otherwise the SKU-derived model prefix (verbatim, keeps ™).
  let productLine = captureLine || skuPrefix;

  // Letter variant from the SKU prefix (e.g. P, T) beyond the base family,
  // appended only when the base line does not already carry it.
  const familyMatch = skuPrefix.match(/^(THE K\d+\s*™?\s*[A-Z]{2,4})(?:\s+(.+))?$/i);
  const letterVariant = familyMatch ? stringValue(familyMatch[2]) : "";
  if (letterVariant && !new RegExp(`(^|\\s)${escapeRegex(letterVariant)}($|\\s)`, "i").test(productLine)) {
    productLine = `${productLine} ${letterVariant}`.trim();
  }

  // Official series word from the title, appended only when evidence-backed
  // and not already part of the line. Description words are never appended.
  const titleText = collectTitleText(files);
  const seriesWord = OFFICIAL_SERIES_WORDS.find(
    (word) => titleText.includes(word) && !productLine.includes(word),
  );
  if (seriesWord) productLine = `${productLine} ${seriesWord}`.trim();

  return productLine;
}
