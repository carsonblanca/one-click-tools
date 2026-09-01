/**
 * Brand-agnostic evidence normalization.
 *
 * This layer intentionally keeps raw seller labels and does not infer values
 * from image appearance, SKU order, or brand-specific defaults. Downstream
 * FIP adapters may reject unresolved groups without losing the raw evidence.
 */

const MATERIAL_PATTERNS = [
  ["PLA", /(?:^|[^A-Z])PLA(?:$|[^A-Z])/i],
  ["PETG", /(?:^|[^A-Z])PETG(?:$|[^A-Z])/i],
  ["ABS", /(?:^|[^A-Z])ABS(?:$|[^A-Z])/i],
  ["ASA", /(?:^|[^A-Z])ASA(?:$|[^A-Z])/i],
  ["TPU", /(?:^|[^A-Z])TPU(?:$|[^A-Z])/i],
  ["PC", /(?:^|[^A-Z])PC(?:$|[^A-Z])/i],
  ["PA", /(?:^|[^A-Z])PA(?:$|[^A-Z])/i],
];

const EFFECT_PATTERNS = [
  ["matte", /哑光|matte/i],
  ["silk", /丝绸|silk/i],
  ["transparent", /透明|transparent|clear/i],
  ["marble", /大理石|marble/i],
  ["glow", /夜光|荧光|glow/i],
  ["glitter", /闪光|亮片|glitter/i],
  ["carbon-fiber", /碳纤|碳纤维|carbon[- ]?fiber|\bCF\b/i],
  ["glass-fiber", /玻纤|玻璃纤维|glass[- ]?fiber|\bGF\b/i],
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstMatch(value, patterns) {
  return patterns.find(([, pattern]) => pattern.test(value))?.[0] || null;
}

function resolveBrand({ captureIdentity = {}, pageMeta = {}, pageText = "" }) {
  const structured = text(captureIdentity.brand);
  if (structured) return { value: structured, source: "capture.json.productIdentity.brand", confidence: "high", status: "CONFIRMED" };

  for (const [key, value] of Object.entries(pageMeta)) {
    if (!/brand/i.test(key) || !text(value)) continue;
    return { value: text(value), source: `page.meta.json.${key}`, confidence: "high", status: "CONFIRMED" };
  }

  const reverseLabeled = pageText.match(/([A-Za-z][A-Za-z0-9._-]*)(?:（[^）]+）)?\s+(?:品牌|brand)/i)?.[1];
  if (reverseLabeled) return { value: reverseLabeled.trim(), source: "page.txt.brand-label", confidence: "medium", status: "CONFIRMED" };

  const labeled = pageText.match(/(?:品牌|brand)\s*[:：]?\s*([A-Za-z][A-Za-z0-9._-]*)/i)?.[1];
  if (labeled) return { value: labeled.trim(), source: "page.txt.brand-label", confidence: "medium", status: "CONFIRMED" };

  const shop = pageText.match(/([A-Za-z][A-Za-z0-9 .&-]{0,40})旗舰店/i)?.[1];
  if (shop) return { value: shop.trim(), source: "page.txt.shop-name", confidence: "medium", status: "CONFIRMED" };

  return { value: null, source: null, confidence: "none", status: "UNKNOWN" };
}

function resolveMaterial(value) {
  const material = firstMatch(value, MATERIAL_PATTERNS);
  return material
    ? { value: material, status: "CONFIRMED" }
    : { value: null, status: "UNKNOWN" };
}

function resolveEffect(value) {
  const effect = firstMatch(value, EFFECT_PATTERNS);
  return effect
    ? { value: effect, status: "CONFIRMED" }
    : { value: null, status: "UNKNOWN" };
}

function resolvePackage(value) {
  const raw = text(value);
  const packageLabel = raw.match(/(?:\d+(?:\.\d+)?\s*(?:kg|g)|\d+卷|\d+\s*卷|多卷|补充装|无盘|refill|spool[- ]?free)/i)?.[0] || null;
  return { label: packageLabel, status: packageLabel ? "CONFIRMED" : "UNKNOWN" };
}

function normalizeSku(mapping, index) {
  const sellerOptionLabel = text(mapping?.sourceText);
  const material = resolveMaterial(sellerOptionLabel);
  const effect = resolveEffect(sellerOptionLabel);
  const packageVariant = resolvePackage(sellerOptionLabel);
  const officialColorCode = text(mapping?.officialColorCode) || null;
  const sellerColorEvidence = text(mapping?.colorName) || sellerOptionLabel || null;
  const colorStatus = sellerColorEvidence && (text(mapping?.skuId) || text(mapping?.variantId)) ? "CONFIRMED" : "UNKNOWN";

  return {
    index,
    sellerOptionLabel,
    sellerColorEvidence,
    officialColorCode,
    colorIdentityStatus: colorStatus,
    material,
    effect,
    packageVariant,
    skuId: text(mapping?.skuId) || null,
    variantId: text(mapping?.variantId) || null,
    imagePath: text(mapping?.imagePath) || null,
    imageUrl: text(mapping?.imageUrl) || null,
    imageStatus: text(mapping?.imageStatus).toLowerCase() || "unknown",
    provenance: {
      sourceFile: "color-mappings.json",
      sourceMethod: text(mapping?.sourceMethod) || null,
      sourceText: mapping?.sourceText ?? null,
      sourceUrl: text(mapping?.sourceUrl) || null,
    },
  };
}

function groupKey(sku) {
  return `${sku.material.value || "UNKNOWN"}|${sku.effect.value || "UNKNOWN"}`;
}

function groupName(skus) {
  const labels = skus.map((sku) => sku.sellerOptionLabel).filter(Boolean);
  const first = labels[0] || null;
  const material = skus[0]?.material.value;
  const effect = skus[0]?.effect.value;
  return { rawLabel: first, normalizedMaterial: material, normalizedEffect: effect };
}

function normalizeImageEvidence(imageMetadata) {
  return imageMetadata.map((image, index) => {
    const explicitRole = text(image?.imageRole) || text(image?.role);
    const pageSection = text(image?.pageSection).toLowerCase();
    const discoveredFrom = Array.isArray(image?.discoveredFrom) ? image.discoveredFrom.map(text).filter(Boolean) : [];
    const inferredRole = explicitRole
      || (discoveredFrom.includes("sku_dom_img") || discoveredFrom.includes("color_mapping") ? "sku_color"
        : pageSection.includes("detail") ? "detail"
          : null);
    return {
      index,
      sourcePath: text(image?.localPath) || null,
      role: inferredRole || "UNKNOWN",
      imageStatus: text(image?.imageStatus).toLowerCase()
        || (text(image?.downloadStatus).toLowerCase() === "success" ? "available" : "unknown"),
      provenance: { pageSection: text(image?.pageSection) || null, discoveredFrom },
    };
  });
}

export function normalizeEvidencePack({ capture = {}, pageMeta = {}, pageText = "", colorMappings = [], parameterEvidence = [], imageMetadata = [] } = {}) {
  const captureIdentity = capture?.productIdentity && typeof capture.productIdentity === "object" ? capture.productIdentity : {};
  const brand = resolveBrand({ captureIdentity, pageMeta, pageText });
  const skus = colorMappings.map((mapping, index) => normalizeSku(mapping, index));
  const groups = new Map();

  for (const sku of skus) {
    const key = groupKey(sku);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sku);
  }

  const productCandidates = [...groups.entries()].map(([key, groupedSkus]) => {
    const label = groupName(groupedSkus);
    const identityStatus = label.normalizedMaterial && label.normalizedEffect ? "CONFIRMED" : "UNKNOWN";
    const packageVariants = [...new Set(groupedSkus.map((sku) => sku.packageVariant.label).filter(Boolean))];
    return {
      groupId: key.toLowerCase().replace(/[^a-z0-9|_-]+/g, "-"),
      canonicalIdentity: {
        status: identityStatus,
        brand: brand.value,
        material: label.normalizedMaterial,
        effect: label.normalizedEffect,
        rawSellerLabel: label.rawLabel,
      },
      skuCount: groupedSkus.length,
      colorCount: new Set(groupedSkus.map((sku) => sku.sellerColorEvidence).filter(Boolean)).size,
      packageVariants,
      skus: groupedSkus,
      evidence: { source: "color-mappings.json", groupKey: key },
    };
  });

  const parameters = parameterEvidence.map((entry, index) => ({
    index,
    key: text(entry?.candidateField) || null,
    value: text(entry?.value) || null,
    unit: text(entry?.unit) || null,
    status: text(entry?.value) ? "PENDING_REVIEW" : "UNKNOWN",
    provenance: {
      sourceFile: "parameter-evidence.json",
      sourceText: entry?.sourceText ?? null,
      sourceUrl: text(entry?.sourceUrl) || null,
    },
  }));

  return {
    schemaVersion: "normalized-filament-source.v1",
    brand,
    listing: {
      officialUrl: text(captureIdentity.officialUrl) || text(pageMeta.url) || null,
      captureTime: text(captureIdentity.captureTime) || null,
      rawProductLine: text(captureIdentity.productLine) || null,
      rawMaterial: text(captureIdentity.material) || null,
    },
    skus,
    productCandidates,
    parameters,
    imageMetadata,
    imageEvidence: normalizeImageEvidence(imageMetadata),
    warnings: [
      ...(brand.status === "UNKNOWN" ? ["brand could not be resolved from structured or page evidence"] : []),
      ...(productCandidates.some((candidate) => candidate.canonicalIdentity.status !== "CONFIRMED") ? ["one or more product boundaries are unresolved"] : []),
      ...(skus.some((sku) => !sku.officialColorCode) ? ["officialColorCode is absent for one or more SKUs; seller evidence is retained"] : []),
    ],
  };
}
