import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { resolveBrandEvidencePaths } from "./importer-registry";
import type {
  ParameterEvidenceCandidate,
  ProductLineParameterDisplay,
} from "@/lib/filaments/drafts/admin-drafts";
import type {
  KexcelledEvidenceClassification,
  KexcelledParameterGroups,
} from "./adapters/kexcelled";
import type { KexcelledOfficialColorCardAsset } from "./adapters/kexcelled-color-card-extractor";
import {
  adaptKexcelledFip,
  buildKexcelledSingleImageEvidence,
  mergeKexcelledAdapterColorSources,
} from "./adapters/kexcelled";

export type KexcelledDraftColor = {
  domIndex: number;
  rawSkuText: string;
  officialColorCode: string;
  variantCode?: string;
  nameZh: string;
  nameEn: string;
  availability: "available" | "disabled" | "unknown";
  imageCandidateUrl: string;
  localImagePath: string;
  imageSourceMethod: string;
  imageQualityRole: "sku_thumbnail" | "sku_image" | "variant_image_candidate" | "unknown";
  isSharedImageCandidate: boolean;
  requiresManualReview: boolean;
  reviewStatus: "pending_review" | string;
  sourceEvidence: Array<Record<string, unknown>>;
  notes: string[];
  evidenceAssetId?: string;
  evidenceType?: string;
  rawSkuIds?: string[];
  packageSkuIds?: string[];
  imageCandidates?: string[];
  primaryImage?: string;
  imageSelectionReason?: "official_spool_sku_image" | "official_variant_detail_image" | "official_refill_fallback" | "manual_confirmed" | "";
  cropAssetId?: string;
  cropRelativePath?: string;
  cropRect?: [number, number, number, number];
  cropConfidence?: number;
  pantoneCode?: string;
  officialReferenceText?: string;
  officialHexReference?: string;
  officialRgbReference?: string;
  sourceType?: "imported_package";
  colorStatus?: "text_imported_pending_swatch";
  swatchStatus?: "pending" | "matched" | "not_required" | "needs_review";
};

export type KexcelledSkuImageCandidateItem = {
  domIndex?: number;
  skuText?: string;
  colorCode?: string;
  nameZh?: string;
  nameEn?: string;
  availability?: string;
  selectedCandidateImageUrl?: string;
  selectedCandidateImageLocalPath?: string;
  imageSourceMethod?: string;
  imageQualityRole?: string;
  isSharedImageCandidate?: boolean;
  requiresManualReview?: boolean;
};

export type KexcelledPackageVariant = "spool" | "spooled" | "refill" | "unknown";

export type KexcelledColorVariant = {
  rawSkuText: string;
  variantCode?: string;
  packageVariant: KexcelledPackageVariant;
  weight?: string;
  imageCandidates?: Array<Record<string, unknown>>;
  selectedImage?: string;
  sourceEvidenceRef?: string;
  availability: KexcelledDraftColor["availability"];
  sourceEvidence: Array<Record<string, unknown>>;
};

export type CanonicalKexcelledDraftColor = KexcelledDraftColor & {
  representativeImageCandidateUrl: string;
  colorVariants: KexcelledColorVariant[];
  rawSkuCount: number;
};

export type KexcelledColorMergeStats = {
  rawSkuCount: number;
  canonicalColorCount: number;
  mergedVariantCount: number;
};

export type KexcelledEvidenceDraft = {
  brand: {
    name: string;
    nameZh: string;
    sourceType: string;
    sourceUrl: string;
    reviewStatus: string;
  };
  productLine: {
    name: string;
    materialType: string;
    diameterMm: number | null;
    netWeightG: number | null;
    variant?: string;
    notes?: string[];
    sourceEvidence: Array<Record<string, unknown>>;
    reviewStatus: string;
  };
  colors: KexcelledDraftColor[];
  parameters: {
    status: "missing" | string;
    sourceType: "missing" | string;
    fields: Record<string, unknown>;
  };
  importMeta: {
    schemaVersion: string;
    createdAt: string;
    sourceZipName: string;
    sourceZipPath: string;
    pageTitle: string;
    primaryInput: string;
    variantFallbackInput: string;
    compatibilityInput: string;
    compatibilityNote: string;
    requiresManualReview: boolean;
  };
};

export type KexcelledImportSummary = {
  sourceZipName: string;
  sourceZipPath: string;
  runId: string;
  productLineName?: string;
  materialType?: string;
  variant?: string;
  totalSkuCount: number;
  availableSkuCount: number;
  disabledSkuCount: number;
  colorRecordCount: number;
  imageCandidateCount: number;
  sharedImageCandidateCount: number;
  clickedFallbackImageCount: number;
  parameterStatus: string;
  unresolvedFields: Array<Record<string, unknown>>;
  warnings: string[];
};

export type ImportedFilamentDraft = {
  id: string;
  sourceRunId: string;
  sourceZipName: string;
  sourceEvidencePath: string;
  sourceEvidenceStatus?: "available" | "missing";
  sourceEvidenceMissingReason?: string;
  status: "draft";
  importStatus: "imported_draft" | "failed" | "unsupported";
  reviewStatus: "draft" | "pending_review" | "approved" | "published";
  isPublished: boolean;
  brand: KexcelledEvidenceDraft["brand"];
  productLine: KexcelledEvidenceDraft["productLine"];
  colors: CanonicalKexcelledDraftColor[];
  canonicalColors?: CanonicalKexcelledDraftColor[];
  rawSkuCount: number;
  canonicalColorCount: number;
  mergedVariantCount: number;
  parameters: KexcelledEvidenceDraft["parameters"];
  parameterStatus: string;
  productLineParameters?: ProductLineParameterDisplay[];
  productLineParametersUpdatedAt?: string;
  parameterEvidenceCandidates?: ParameterEvidenceCandidate[];
  unmatchedSkuCandidates?: Array<Record<string, unknown>>;
  kexcelledEvidenceClassifications?: KexcelledEvidenceClassification[];
  kexcelledParameterGroups?: KexcelledParameterGroups;
  officialColorCardAssets?: KexcelledOfficialColorCardAsset[];
  importedAt: string;
};

const EVIDENCE_ROOT = "data/filaments/evidence-imports/kexcelled";
const IMPORTED_DRAFTS_PATH = "data/filaments/admin-drafts/kexcelled-imported-drafts.json";
const FIP_OUTPUT_ROOT = "data/filaments/fip-output";
const PRODUCT_LINE_PARAMETER_FIELDS: ParameterEvidenceCandidate["field"][] = [
  "nozzleTemperature",
  "bedTemperature",
  "speed",
  "drying",
  "nozzleRestriction",
  "density",
  "diameterMm",
  "netWeightG",
  "materialWarning",
  "additionalSpecifications",
];

function safeRunId(runId: string) {
  return /^[A-Za-z0-9._-]+$/.test(runId);
}

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeColorCode(value: string) {
  return normalizeSpaces(value).toUpperCase();
}

function completeProductLineParameters(parameters: ProductLineParameterDisplay[]) {
  return PRODUCT_LINE_PARAMETER_FIELDS.map((field) => parameters.find((item) => item.field === field) || {
    field,
    displayValue: "页面未提供",
    values: [],
    sourceTypes: [],
    sourceLabel: "",
    evidencePaths: [],
    hasMultipleValues: false,
    pageProvided: false,
  });
}

export function normalizeKexcelledColorNameForMerge(value: string) {
  return normalizeSpaces(value)
    .replace(/[-_\s]*(无盘|有盘|带盘|补充装)\s*$/u, "")
    .replace(/[-_\s]+$/u, "")
    .trim();
}

function getPackageVariant(color: KexcelledDraftColor): KexcelledPackageVariant {
  const text = `${color.rawSkuText} ${color.nameZh}`;
  if (/无盘|补充装/u.test(text)) return "refill";
  if (/有盘|带盘/u.test(text)) return "spool";
  return "unknown";
}

function colorMergeKey(color: KexcelledDraftColor) {
  const code = normalizeColorCode(color.officialColorCode || "");
  if (code) return `code:${code}`;
  const name = normalizeKexcelledColorNameForMerge(color.nameZh || "");
  if (name) return `name:${name}`;
  return `row:${color.domIndex}:${normalizeSpaces(color.rawSkuText || "")}`;
}

function mergedAvailability(colors: KexcelledDraftColor[]): KexcelledDraftColor["availability"] {
  if (colors.some((color) => color.availability === "available")) return "available";
  if (colors.length && colors.every((color) => color.availability === "disabled")) return "disabled";
  return "unknown";
}

function representativeColor(colors: KexcelledDraftColor[]) {
  return [...colors].sort((left, right) => {
    const leftPackage = getPackageVariant(left);
    const rightPackage = getPackageVariant(right);
    const packageRank = (value: KexcelledPackageVariant) => value === "spool" || value === "spooled" ? 0 : value === "unknown" ? 1 : 2;
    if (packageRank(leftPackage) !== packageRank(rightPackage)) return packageRank(leftPackage) - packageRank(rightPackage);
    const leftImage = left.imageCandidateUrl || left.localImagePath ? 1 : 0;
    const rightImage = right.imageCandidateUrl || right.localImagePath ? 1 : 0;
    if (leftImage !== rightImage) return rightImage - leftImage;
    const leftAvailable = left.availability === "available" ? 1 : 0;
    const rightAvailable = right.availability === "available" ? 1 : 0;
    if (leftAvailable !== rightAvailable) return rightAvailable - leftAvailable;
    return left.domIndex - right.domIndex;
  })[0];
}

export function mergeKexcelledColors(colors: KexcelledDraftColor[]): {
  colors: CanonicalKexcelledDraftColor[];
  stats: KexcelledColorMergeStats;
} {
  const groups = new Map<string, KexcelledDraftColor[]>();
  for (const color of colors) {
    const key = colorMergeKey(color);
    const group = groups.get(key) || [];
    group.push({ ...color, requiresManualReview: true });
    groups.set(key, group);
  }

  const canonical = Array.from(groups.values()).map((group) => {
    const representative = representativeColor(group);
    const normalizedName = normalizeKexcelledColorNameForMerge(representative.nameZh || "");
    const imageUrl = representative.imageCandidateUrl || representative.localImagePath || "";
    const imageSelectionReason: KexcelledDraftColor["imageSelectionReason"] =
      getPackageVariant(representative) === "refill"
        ? "official_refill_fallback"
        : getPackageVariant(representative) === "spool" || getPackageVariant(representative) === "spooled"
          ? "official_spool_sku_image"
          : "official_variant_detail_image";
    return {
      ...representative,
      nameZh: normalizedName || representative.nameZh,
      availability: mergedAvailability(group),
      representativeImageCandidateUrl: imageUrl,
      requiresManualReview: true,
      colorVariants: group.map((item) => ({
        rawSkuText: item.rawSkuText,
        variantCode: item.variantCode || item.officialColorCode,
        packageVariant: getPackageVariant(item),
        availability: item.availability,
        imageCandidates: item.imageCandidateUrl || item.localImagePath
          ? [{
            sourceUrl: item.imageCandidateUrl,
            localPath: item.localImagePath,
            packageVariant: getPackageVariant(item),
          }]
          : [],
        selectedImage: item.imageCandidateUrl || item.localImagePath || "",
        sourceEvidenceRef: String(item.evidenceAssetId || ""),
        sourceEvidence: item.sourceEvidence,
      })),
      rawSkuIds: group.map((item) => item.rawSkuText).filter(Boolean),
      packageSkuIds: group
        .filter((item) => getPackageVariant(item) === "refill")
        .map((item) => item.rawSkuText)
        .filter(Boolean),
      rawSkuCount: group.length,
      primaryImage: imageUrl,
      imageSelectionReason,
    };
  });

  return {
    colors: canonical,
    stats: {
      rawSkuCount: colors.length,
      canonicalColorCount: canonical.length,
      mergedVariantCount: Math.max(0, colors.length - canonical.length),
    },
  };
}

export function mapKexcelledSkuImageCandidatesToColors(
  items: KexcelledSkuImageCandidateItem[],
): KexcelledDraftColor[] {
  return items.flatMap((item, index) => {
    const rawSkuText = normalizeSpaces(String(item.skuText || ""));
    const nameZh = normalizeSpaces(String(item.nameZh || ""));
    const officialColorCode = normalizeColorCode(String(item.colorCode || ""));
    if (!rawSkuText && !nameZh && !officialColorCode) return [];
    const availability: KexcelledDraftColor["availability"] =
      item.availability === "available" || item.availability === "disabled"
        ? item.availability
        : "unknown";
    const imageQualityRole: KexcelledDraftColor["imageQualityRole"] =
      item.imageQualityRole === "sku_thumbnail"
      || item.imageQualityRole === "sku_image"
      || item.imageQualityRole === "variant_image_candidate"
        ? item.imageQualityRole
        : "unknown";
    return [{
      domIndex: typeof item.domIndex === "number" ? item.domIndex : index,
      rawSkuText,
      officialColorCode,
      nameZh,
      nameEn: "",
      availability,
      imageCandidateUrl: String(item.selectedCandidateImageUrl || ""),
      localImagePath: String(item.selectedCandidateImageLocalPath || ""),
      imageSourceMethod: String(item.imageSourceMethod || "sku_image_candidates"),
      imageQualityRole,
      isSharedImageCandidate: Boolean(item.isSharedImageCandidate),
      requiresManualReview: true,
      reviewStatus: "pending_review",
      sourceEvidence: [{
        file: "sku-image-candidates-evidence.json",
        domIndex: typeof item.domIndex === "number" ? item.domIndex : index,
        rawSkuText,
        sourceType: "imported_package",
      }],
      notes: [],
      sourceType: "imported_package",
      colorStatus: "text_imported_pending_swatch",
      swatchStatus: "pending",
    }];
  });
}

export function kexcelledDraftPaths(runId: string) {
  if (!safeRunId(runId)) {
    throw new Error("Invalid runId.");
  }
  const root = path.join(process.cwd(), EVIDENCE_ROOT, runId);
  const evidenceRoot = path.join(process.cwd(), EVIDENCE_ROOT);
  const relative = path.relative(evidenceRoot, root);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid runId path.");
  }
  return {
    root,
    draftPath: path.join(root, "kexcelled-draft.json"),
    summaryPath: path.join(root, "kexcelled-import-summary.json"),
  };
}

export async function readKexcelledEvidenceDraft(runId: string) {
  const paths = kexcelledDraftPaths(runId);
  const [draftRaw, summaryRaw] = await Promise.all([
    readFile(paths.draftPath, "utf8"),
    readFile(paths.summaryPath, "utf8"),
  ]);
  return {
    runId,
    sourceEvidencePath: paths.root,
    draft: JSON.parse(draftRaw) as KexcelledEvidenceDraft,
    summary: JSON.parse(summaryRaw) as KexcelledImportSummary,
  };
}

async function readImportedDrafts(): Promise<ImportedFilamentDraft[]> {
  const storePath = path.join(process.cwd(), IMPORTED_DRAFTS_PATH);
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as ImportedFilamentDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeImportedDrafts(drafts: ImportedFilamentDraft[]) {
  const storePath = path.join(process.cwd(), IMPORTED_DRAFTS_PATH);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(drafts, null, 2) + "\n", "utf8");
}

function needsCanonicalColorMigration(draft: ImportedFilamentDraft) {
  return !draft.colors.every((color) => Array.isArray((color as Partial<CanonicalKexcelledDraftColor>).colorVariants));
}

function canonicalizeImportedDraft(draft: ImportedFilamentDraft): ImportedFilamentDraft {
  if (!needsCanonicalColorMigration(draft)) {
    return {
      ...draft,
      rawSkuCount: draft.rawSkuCount || draft.colors.reduce((sum, color) => sum + (color.rawSkuCount || 1), 0),
      canonicalColorCount: draft.canonicalColorCount || draft.colors.length,
      mergedVariantCount: draft.mergedVariantCount || 0,
    };
  }
  const merged = mergeKexcelledColors(draft.colors as KexcelledDraftColor[]);
  return {
    ...draft,
    colors: merged.colors as ImportedFilamentDraft["colors"],
    rawSkuCount: merged.stats.rawSkuCount,
    canonicalColorCount: merged.stats.canonicalColorCount,
    mergedVariantCount: merged.stats.mergedVariantCount,
  };
}

async function readMatchingProductLineParameters(
  sourceRunId: string,
  sourceZipName: string,
): Promise<ProductLineParameterDisplay[]> {
  const root = path.join(process.cwd(), FIP_OUTPUT_ROOT);
  let names: string[] = [];
  try {
    names = (await readdir(root)).filter((name) => name.endsWith(".filament-import.zip")).sort();
  } catch {
    return [];
  }
  let sameSource: ProductLineParameterDisplay[] = [];
  for (const name of names) {
    try {
      const files = unzipSync(new Uint8Array(await readFile(path.join(root, name))));
      if (!files["manifest.json"] || !files["product-line-parameters.json"]) continue;
      const manifest = JSON.parse(strFromU8(files["manifest.json"])) as {
        sourceRunId?: string;
        sourceZipName?: string;
      };
      const parameters = JSON.parse(strFromU8(files["product-line-parameters.json"])) as ProductLineParameterDisplay[];
      if (manifest.sourceRunId === sourceRunId) return completeProductLineParameters(parameters);
      if (manifest.sourceZipName === sourceZipName) sameSource = completeProductLineParameters(parameters);
    } catch {
      // Ignore malformed unrelated packages.
    }
  }
  return completeProductLineParameters(sameSource);
}

async function readMatchingKexcelledFipAdapterData(sourceRunId: string, sourceZipName: string) {
  const root = path.join(process.cwd(), FIP_OUTPUT_ROOT);
  let names: string[] = [];
  try {
    names = (await readdir(root)).filter((name) => name.endsWith(".filament-import.zip")).sort();
  } catch {
    return null;
  }
  let sameSource: ReturnType<typeof adaptKexcelledFip> | null = null;
  for (const name of names) {
    try {
      const files = unzipSync(new Uint8Array(await readFile(path.join(root, name))));
      if (!files["manifest.json"]) continue;
      const manifest = JSON.parse(strFromU8(files["manifest.json"])) as {
        sourceRunId?: string;
        sourceZipName?: string;
        brand?: string;
      };
      if (!/kexcelled/i.test(manifest.brand || "")) continue;
      const productLineParameters = files["product-line-parameters.json"]
        ? JSON.parse(strFromU8(files["product-line-parameters.json"])) as ProductLineParameterDisplay[]
        : [];
      const parameterCandidates = files["parameter-candidates.json"]
        ? JSON.parse(strFromU8(files["parameter-candidates.json"])) as Array<Record<string, unknown>>
        : [];
      const images = files["images.json"]
        ? JSON.parse(strFromU8(files["images.json"])) as Array<Record<string, unknown>>
        : [];
      const evidence = files["evidence.json"]
        ? JSON.parse(strFromU8(files["evidence.json"])) as Array<Record<string, unknown>>
        : [];
      const patch = adaptKexcelledFip({
        colors: [],
        productLineParameters,
        parameterCandidates,
        images: Array.isArray(images) ? images : [],
        evidence: Array.isArray(evidence) ? evidence : [],
        singleImageEvidence: buildKexcelledSingleImageEvidence(files),
      });
      if (manifest.sourceRunId === sourceRunId) return patch;
      if (manifest.sourceZipName === sourceZipName) sameSource = patch;
    } catch {
      // Ignore malformed unrelated packages.
    }
  }
  return sameSource;
}

function canonicalColorsFromAdapter(records: Array<Record<string, unknown>>): CanonicalKexcelledDraftColor[] {
  return records.map((record, index) => {
    const variants = Array.isArray(record.skuVariants)
      ? record.skuVariants as Array<Record<string, unknown>>
      : [];
    const colorVariants: KexcelledColorVariant[] = variants.map((variant) => ({
      rawSkuText: String(variant.rawSkuText || variant.skuText || ""),
      variantCode: String(variant.variantCode || record.variantCode || record.officialColorCode || ""),
      packageVariant: variant.packageVariant === "refill" || variant.packageVariant === "spooled" || variant.packageVariant === "spool"
        ? variant.packageVariant
        : "unknown",
      weight: String(variant.weight || ""),
      imageCandidates: Array.isArray(variant.imageCandidates)
        ? variant.imageCandidates as Array<Record<string, unknown>>
        : [],
      selectedImage: String(variant.selectedImage || ""),
      sourceEvidenceRef: String(variant.sourceEvidenceRef || ""),
      availability: variant.availability === "available" || variant.availability === "disabled"
        ? variant.availability
        : "unknown",
      sourceEvidence: Array.isArray(variant.sourceEvidence)
        ? variant.sourceEvidence as Array<Record<string, unknown>>
        : [],
    }));
    const imageCandidates = Array.isArray(record.imageCandidates)
      ? record.imageCandidates.map(String)
      : [];
    const imageCandidateUrl = String(record.imageCandidateUrl || imageCandidates.find((value) => /^https?:/i.test(value)) || "");
    const localImagePath = String(record.localImagePath || imageCandidates.find((value) => !/^https?:/i.test(value)) || "");
    return {
      domIndex: typeof record.domIndex === "number" ? record.domIndex : index,
      rawSkuText: String(record.rawSkuText || colorVariants[0]?.rawSkuText || ""),
      officialColorCode: String(record.officialColorCode || ""),
      variantCode: String(record.variantCode || record.officialColorCode || ""),
      nameZh: String(record.nameZh || ""),
      nameEn: String(record.nameEn || ""),
      availability: record.availability === "available" || record.availability === "disabled"
        ? record.availability
        : "unknown",
      imageCandidateUrl,
      localImagePath,
      imageSourceMethod: String(record.imageSourceMethod || "kexcelled_adapter"),
      imageQualityRole: record.imageQualityRole === "sku_thumbnail"
        || record.imageQualityRole === "sku_image"
        || record.imageQualityRole === "variant_image_candidate"
        ? record.imageQualityRole
        : "unknown",
      isSharedImageCandidate: Boolean(record.isSharedImageCandidate),
      requiresManualReview: true,
      reviewStatus: "pending_review",
      sourceEvidence: Array.isArray(record.sourceEvidence)
        ? record.sourceEvidence as Array<Record<string, unknown>>
        : [],
      notes: [],
      evidenceAssetId: String(record.evidenceAssetId || ""),
      evidenceType: String(record.evidenceType || ""),
      rawSkuIds: Array.isArray(record.rawSkuIds) ? record.rawSkuIds.map(String) : [],
      packageSkuIds: Array.isArray(record.packageSkuIds) ? record.packageSkuIds.map(String) : [],
      imageCandidates,
      primaryImage: String(record.primaryImage || imageCandidateUrl || localImagePath),
      imageSelectionReason: String(record.imageSelectionReason || "") as KexcelledDraftColor["imageSelectionReason"],
      cropAssetId: String(record.cropAssetId || ""),
      cropRelativePath: String(record.cropRelativePath || ""),
      cropRect: Array.isArray(record.cropRect) && record.cropRect.length === 4
        ? record.cropRect.map(Number) as [number, number, number, number]
        : undefined,
      cropConfidence: typeof record.cropConfidence === "number" ? record.cropConfidence : undefined,
      pantoneCode: String(record.pantoneCode || ""),
      officialReferenceText: String(record.officialReferenceText || ""),
      officialHexReference: String(record.officialHexReference || ""),
      officialRgbReference: String(record.officialRgbReference || ""),
      representativeImageCandidateUrl: String(record.cropRelativePath || imageCandidateUrl || localImagePath),
      colorVariants,
      rawSkuCount: colorVariants.length || 1,
    };
  });
}

function mergeImportedColors(
  incoming: CanonicalKexcelledDraftColor[],
  existing: ImportedFilamentDraft["colors"],
) {
  return incoming.map((color) => {
    const previous = existing.find((item) =>
      (color.officialColorCode && item.officialColorCode === color.officialColorCode)
      || (!color.officialColorCode && item.nameZh === color.nameZh)
    );
    if (!previous) return color;
    const review = previous as typeof previous & {
      displayStatus?: string;
      imageDisplayStatus?: string;
      imageReviewNote?: string;
      reviewedAt?: string;
      reviewedBy?: string;
    };
    return {
      ...color,
      displayStatus: review.displayStatus,
      imageDisplayStatus: review.imageDisplayStatus,
      imageReviewNote: review.imageReviewNote,
      reviewedAt: review.reviewedAt,
      reviewedBy: review.reviewedBy,
    };
  });
}

export async function importKexcelledDraftToAdminStore(
  runId: string,
  packageColorFallback: KexcelledDraftColor[] = [],
  options: { skipHistoricalFipLookup?: boolean } = {},
) {
  const source = await readKexcelledEvidenceDraft(runId);
  const imported = await readImportedDrafts();
  const existing = imported.find((item) => item.sourceRunId === runId);
  const productLineParameters = options.skipHistoricalFipLookup
    ? []
    : await readMatchingProductLineParameters(
        runId,
        source.draft.importMeta.sourceZipName,
      );
  const matchedAdapterData = options.skipHistoricalFipLookup
    ? null
    : await readMatchingKexcelledFipAdapterData(
        runId,
        source.draft.importMeta.sourceZipName,
      );
  const colorAdapterPatch = adaptKexcelledFip({
    colors: source.draft.colors.map((color) => ({
      ...color,
      skuVariants: [{
        rawSkuText: color.rawSkuText,
        availability: color.availability,
        sourceEvidence: color.sourceEvidence,
      }],
    })),
    productLineParameters: [],
    parameterCandidates: [],
    images: [],
    evidence: [],
    singleImageEvidence: [],
  });
  const authoritativeColorPatch = matchedAdapterData?.colors.length
    ? mergeKexcelledAdapterColorSources(colorAdapterPatch.colors, matchedAdapterData.colors)
    : {
      canonical: colorAdapterPatch.colors,
      unmatchedSkuCandidates: colorAdapterPatch.unmatchedSkuCandidates,
    };
  const adapterColors = canonicalColorsFromAdapter(authoritativeColorPatch.canonical);
  const fallbackColors = mergeKexcelledColors(
    packageColorFallback.length ? packageColorFallback : source.draft.colors,
  ).colors;
  const canonicalColors = adapterColors.length ? adapterColors : fallbackColors;
  const rawSkuCount = canonicalColors.reduce((sum, color) => sum + color.rawSkuCount, 0);
  const mergedVariantCount = Math.max(0, rawSkuCount - canonicalColors.length);
  if (existing) {
    const migrated = canonicalizeImportedDraft(existing);
    const reviewedColors = mergeImportedColors(canonicalColors, migrated.colors) as ImportedFilamentDraft["colors"];
    const updated: ImportedFilamentDraft = {
      ...migrated,
      sourceZipName: source.draft.importMeta.sourceZipName,
      sourceEvidencePath: source.sourceEvidencePath,
      sourceEvidenceStatus: "available",
      sourceEvidenceMissingReason: "",
      brand: source.draft.brand,
      productLine: source.draft.productLine,
      colors: reviewedColors,
      canonicalColors: reviewedColors,
      rawSkuCount,
      canonicalColorCount: canonicalColors.length,
      mergedVariantCount,
      productLineParameters,
      productLineParametersUpdatedAt: productLineParameters.length ? new Date().toISOString() : migrated.productLineParametersUpdatedAt,
      unmatchedSkuCandidates: authoritativeColorPatch.unmatchedSkuCandidates,
      kexcelledEvidenceClassifications: matchedAdapterData?.evidenceClassifications || [],
      kexcelledParameterGroups: matchedAdapterData?.parameterGroups,
    };
    await writeImportedDrafts(imported.map((item) => item.sourceRunId === runId ? updated : item));
    return { status: "updated" as const, draft: updated };
  }

  const record: ImportedFilamentDraft = {
    id: `kexcelled-${runId}`,
    sourceRunId: runId,
    sourceZipName: source.draft.importMeta.sourceZipName,
    sourceEvidencePath: source.sourceEvidencePath,
    sourceEvidenceStatus: "available",
    sourceEvidenceMissingReason: "",
    status: "draft",
    importStatus: "imported_draft",
    reviewStatus: "pending_review",
    isPublished: false,
    brand: source.draft.brand,
    productLine: source.draft.productLine,
    colors: canonicalColors,
    canonicalColors,
    rawSkuCount,
    canonicalColorCount: canonicalColors.length,
    mergedVariantCount,
    parameters: source.draft.parameters,
    parameterStatus: source.summary.parameterStatus || source.draft.parameters.status,
    productLineParameters,
    productLineParametersUpdatedAt: productLineParameters.length ? new Date().toISOString() : "",
    unmatchedSkuCandidates: authoritativeColorPatch.unmatchedSkuCandidates,
    kexcelledEvidenceClassifications: matchedAdapterData?.evidenceClassifications || [],
    kexcelledParameterGroups: matchedAdapterData?.parameterGroups,
    importedAt: new Date().toISOString(),
  };

  await writeImportedDrafts([...imported, record]);
  return { status: "imported" as const, draft: record };
}

export async function backfillKexcelledAdminDraftColorsFromZip(input: {
  sourceRunId: string;
  zipPath: string;
}) {
  if (!safeRunId(input.sourceRunId)) throw new Error("Invalid sourceRunId.");
  const files = unzipSync(new Uint8Array(await readFile(input.zipPath)));
  if (!files["sku-image-candidates-evidence.json"]) {
    throw new Error("sku-image-candidates-evidence.json is missing.");
  }
  const parsed = JSON.parse(strFromU8(files["sku-image-candidates-evidence.json"])) as {
    items?: KexcelledSkuImageCandidateItem[];
  };
  const rawColors = mapKexcelledSkuImageCandidatesToColors(
    Array.isArray(parsed.items) ? parsed.items : [],
  );
  if (!rawColors.length) throw new Error("No color text records found.");
  const merged = mergeKexcelledColors(rawColors);
  const imported = await readImportedDrafts();
  const index = imported.findIndex((item) => item.sourceRunId === input.sourceRunId);
  if (index < 0) throw new Error("Admin draft not found.");
  const existing = canonicalizeImportedDraft(imported[index]);
  const preserved = mergeImportedColors(merged.colors, existing.canonicalColors || existing.colors);
  const existingKeys = new Set(preserved.map(colorMergeKey));
  const nextColors = [
    ...preserved,
    ...(existing.canonicalColors || existing.colors).filter((color) => !existingKeys.has(colorMergeKey(color))),
  ] as ImportedFilamentDraft["colors"];
  const next: ImportedFilamentDraft = {
    ...existing,
    colors: nextColors,
    canonicalColors: nextColors,
    rawSkuCount: rawColors.length,
    canonicalColorCount: nextColors.length,
    mergedVariantCount: Math.max(0, rawColors.length - merged.colors.length),
  };
  const records = [...imported];
  records[index] = next;
  await writeImportedDrafts(records);
  return {
    draft: next,
    sourceItemCount: rawColors.length,
    canonicalColorCount: merged.colors.length,
  };
}

function buildParametersFromGroups(
  groups: KexcelledParameterGroups | undefined | null,
  product?: { diameterMm?: number | null; netWeightG?: number | null },
): ImportedFilamentDraft["parameters"] {
  const fields: Record<string, unknown> = {};
  if (groups) {
    const groupKeys: Array<keyof KexcelledParameterGroups> = [
      "recommendedPrintParameters",
      "filamentSpecifications",
      "materialProperties",
      "testsAndWarnings",
    ];
    for (const gk of groupKeys) {
      const groupFields = groups[gk] as Array<{ field?: string; rawLabel?: string; rawValue?: string; unit?: string }> | undefined;
      if (!groupFields) continue;
      for (const gf of groupFields) {
        if (gf.field && gf.rawValue) {
          fields[gf.field] = gf.rawValue + (gf.unit ? ` ${gf.unit}` : "");
        }
      }
    }
  }
  if (product?.diameterMm != null && !fields["filament_diameter"]) {
    fields["filament_diameter"] = `${product.diameterMm} mm`;
  }
  if (product?.netWeightG != null && !fields["net_weight"]) {
    fields["net_weight"] = `${(product.netWeightG / 1000).toFixed(2)} kg`;
  }
  const hasFields = Object.keys(fields).length > 0;
  return {
    status: hasFields ? "official_partial" : "missing",
    sourceType: hasFields ? "official_partial" : "missing",
    fields,
  };
}

export async function importKexcelledFipToAdminStore(input: {
  sourceRunId: string;
  sourceZipName: string;
  sourceEvidencePath: string;
  product: {
    brand?: string;
    productLine?: string;
    materialType?: string;
    variant?: string;
    diameterMm?: number | null;
    netWeightG?: number | null;
  };
  colors: Array<{
    officialColorCode?: string;
    variantCode?: string;
    nameZh?: string;
    nameEn?: string;
    availability?: KexcelledDraftColor["availability"];
    imageCandidateUrl?: string;
    localImagePath?: string;
    imageQualityRole?: KexcelledDraftColor["imageQualityRole"];
    isSharedImageCandidate?: boolean;
    requiresManualReview?: boolean;
    skuVariants?: KexcelledColorVariant[];
    sourceEvidence?: Array<Record<string, unknown>>;
    evidenceAssetId?: string;
    evidenceType?: string;
    rawSkuIds?: string[];
    packageSkuIds?: string[];
    imageCandidates?: string[];
    primaryImage?: string;
    imageSelectionReason?: KexcelledDraftColor["imageSelectionReason"];
    cropAssetId?: string;
    cropRelativePath?: string;
    cropRect?: [number, number, number, number];
    cropConfidence?: number;
    pantoneCode?: string;
    officialReferenceText?: string;
    officialHexReference?: string;
    officialRgbReference?: string;
  }>;
  productLineParameters: ProductLineParameterDisplay[];
  parameterEvidenceCandidates: ParameterEvidenceCandidate[];
  unmatchedSkuCandidates: Array<Record<string, unknown>>;
  evidenceClassifications: KexcelledEvidenceClassification[];
  parameterGroups: KexcelledParameterGroups;
  officialColorCardAssets: KexcelledOfficialColorCardAsset[];
}) {
  const imported = await readImportedDrafts();
  const existing = imported.find((item) => item.sourceRunId === input.sourceRunId);
  const rawColors: KexcelledDraftColor[] = input.colors.flatMap((color, index) => {
    const variants = color.skuVariants?.length ? color.skuVariants : [{
      rawSkuText: "",
      packageVariant: "unknown" as const,
      availability: color.availability || "unknown",
      sourceEvidence: color.sourceEvidence || [],
    }];
    return variants.map((variant, variantIndex) => ({
      domIndex: index * 1000 + variantIndex,
      rawSkuText: variant.rawSkuText,
      officialColorCode: color.officialColorCode || "",
      variantCode: color.variantCode || color.officialColorCode || "",
      nameZh: color.nameZh || "",
      nameEn: color.nameEn || "",
      availability: variant.availability || color.availability || "unknown",
      imageCandidateUrl: color.imageCandidateUrl || "",
      localImagePath: color.localImagePath || "",
      imageSourceMethod: "fip",
      imageQualityRole: color.imageQualityRole || "unknown",
      isSharedImageCandidate: Boolean(color.isSharedImageCandidate),
      requiresManualReview: true,
      reviewStatus: "pending_review",
      sourceEvidence: variant.sourceEvidence || color.sourceEvidence || [],
      notes: [],
      evidenceAssetId: color.evidenceAssetId,
      evidenceType: color.evidenceType,
      rawSkuIds: color.rawSkuIds,
      packageSkuIds: color.packageSkuIds,
      imageCandidates: color.imageCandidates,
      primaryImage: color.primaryImage,
      imageSelectionReason: color.imageSelectionReason,
      cropAssetId: color.cropAssetId,
      cropRelativePath: color.cropRelativePath,
      cropRect: color.cropRect,
      cropConfidence: color.cropConfidence,
      pantoneCode: color.pantoneCode,
      officialReferenceText: color.officialReferenceText,
      officialHexReference: color.officialHexReference,
      officialRgbReference: color.officialRgbReference,
    }));
  });
  const adapterColors = canonicalColorsFromAdapter(input.colors as Array<Record<string, unknown>>);
  const merged = adapterColors.length
    ? {
      colors: adapterColors,
      stats: {
        rawSkuCount: adapterColors.reduce((sum, color) => sum + Math.max(1, color.colorVariants.length), 0),
        canonicalColorCount: adapterColors.length,
        mergedVariantCount: adapterColors.reduce(
          (sum, color) => sum + Math.max(0, color.colorVariants.length - 1),
          0,
        ),
      },
    }
    : mergeKexcelledColors(rawColors);
  const timestamp = new Date().toISOString();
  const base: ImportedFilamentDraft = {
    id: `kexcelled-${input.sourceRunId}`,
    sourceRunId: input.sourceRunId,
    sourceZipName: input.sourceZipName,
    sourceEvidencePath: input.sourceEvidencePath,
    sourceEvidenceStatus: "available",
    sourceEvidenceMissingReason: "",
    status: "draft",
    importStatus: "imported_draft",
    reviewStatus: "pending_review",
    isPublished: false,
    brand: {
      name: input.product.brand || "KEXCELLED",
      nameZh: input.product.brand || "KEXCELLED",
      sourceType: "official_store_or_marketplace",
      sourceUrl: "",
      reviewStatus: "pending_review",
    },
    productLine: {
      name: input.product.productLine || "",
      materialType: input.product.materialType || "",
      diameterMm: input.product.diameterMm ?? null,
      netWeightG: input.product.netWeightG ?? null,
      variant: input.product.variant || "",
      sourceEvidence: [{ file: input.sourceZipName }],
      reviewStatus: "pending_review",
    },
    colors: merged.colors,
    canonicalColors: merged.colors,
    rawSkuCount: merged.stats.rawSkuCount,
    canonicalColorCount: merged.stats.canonicalColorCount,
    mergedVariantCount: merged.stats.mergedVariantCount,
    parameters: buildParametersFromGroups(input.parameterGroups, input.product),
    parameterStatus: "missing",
    productLineParameters: completeProductLineParameters(input.productLineParameters),
    productLineParametersUpdatedAt: timestamp,
    parameterEvidenceCandidates: input.parameterEvidenceCandidates,
    unmatchedSkuCandidates: input.unmatchedSkuCandidates,
    kexcelledEvidenceClassifications: input.evidenceClassifications,
    kexcelledParameterGroups: input.parameterGroups,
    officialColorCardAssets: input.officialColorCardAssets,
    importedAt: timestamp,
  };
  const next = existing ? {
    ...existing,
    ...base,
    colors: mergeImportedColors(merged.colors, existing.canonicalColors || existing.colors) as ImportedFilamentDraft["colors"],
    canonicalColors: mergeImportedColors(merged.colors, existing.canonicalColors || existing.colors) as ImportedFilamentDraft["colors"],
    parameters: Object.keys(base.parameters.fields).length > 0 ? base.parameters : existing.parameters,
    parameterStatus: Object.keys(base.parameters.fields).length > 0 ? base.parameters.status : existing.parameterStatus,
    isPublished: existing.isPublished,
    reviewStatus: existing.reviewStatus,
    importedAt: existing.importedAt,
  } : base;
  await writeImportedDrafts(
    existing
      ? imported.map((item) => item.sourceRunId === input.sourceRunId ? next : item)
      : [...imported, next],
  );
  return { status: existing ? "updated" as const : "imported" as const, draft: next };
}

export type BatchImportItem = { brandId: string; sourceRunId: string };

export type BatchImportResult = {
  importedItems: Array<{ brandId: string; sourceRunId: string; canonicalColorCount: number; rawSkuCount: number; mergedVariantCount: number }>;
  alreadyImportedItems: Array<{ brandId: string; sourceRunId: string; canonicalColorCount: number; rawSkuCount: number; mergedVariantCount: number }>;
  failedItems: Array<{ brandId: string; sourceRunId: string; errorCode: string; message: string }>;
};

export async function importKexcelledDraftsToAdminStoreBatch(items: BatchImportItem[]): Promise<BatchImportResult> {
  const result: BatchImportResult = { importedItems: [], alreadyImportedItems: [], failedItems: [] };
  for (const item of items) {
    if (item.brandId !== "kexcelled") {
      result.failedItems.push({ ...item, errorCode: "unsupported_brand", message: "Only KEXCELLED Evidence Pack drafts are supported." });
      continue;
    }
    if (!safeRunId(item.sourceRunId)) {
      result.failedItems.push({ ...item, errorCode: "invalid_run_id", message: "Invalid sourceRunId." });
      continue;
    }
    try {
      const imported = await importKexcelledDraftToAdminStore(item.sourceRunId);
      const payload = {
        brandId: item.brandId,
        sourceRunId: item.sourceRunId,
        canonicalColorCount: imported.draft.canonicalColorCount || imported.draft.colors.length,
        rawSkuCount: imported.draft.rawSkuCount || imported.draft.colors.reduce((sum, color) => sum + (color.rawSkuCount || 1), 0),
        mergedVariantCount: imported.draft.mergedVariantCount || 0,
      };
      result.importedItems.push(payload);
    } catch (error) {
      result.failedItems.push({
        ...item,
        errorCode: "import_failed",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }
  return result;
}

export async function deleteKexcelledEvidenceDraft(runId: string) {
  const paths = kexcelledDraftPaths(runId);
  await access(paths.root);

  const imported = await readImportedDrafts();
  const remaining = imported.filter((item) => item.sourceRunId !== runId);
  const removed = imported.length - remaining.length;
  let adminStoreUpdated = false;

  if (removed > 0) {
    await writeImportedDrafts(remaining);
    adminStoreUpdated = true;
  }

  try {
    await rm(paths.root, { recursive: true, force: false });
  } catch (error) {
    if (adminStoreUpdated) {
      await writeImportedDrafts(imported);
    }
    throw error;
  }

  return {
    deletedRunId: runId,
    removedAdminDraftCount: removed,
  };
}

// ── Brand-agnostic batch delete ──

/** Check if a draft record is eligible for deletion (unpublished imported draft). */
export function isDeletableDraft(draft: ImportedFilamentDraft): boolean {
  if (draft.isPublished) return false;
  if (draft.reviewStatus === "approved" || draft.reviewStatus === "published") return false;
  if (draft.importStatus !== "imported_draft") return false;
  return true;
}

export type BatchDeleteItem = { brandId: string; sourceRunId: string };

export type BatchDeleteResult = {
  deletedItems: Array<{ brandId: string; sourceRunId: string; removedAdminDraftCount: number }>;
  refusedItems: Array<{ brandId: string; sourceRunId: string; errorCode: string; message: string }>;
  failedItems: Array<{ brandId: string; sourceRunId: string; errorCode: string; message: string }>;
};

export async function deleteUnpublishedDraftsBatch(items: BatchDeleteItem[]): Promise<BatchDeleteResult> {
  const result: BatchDeleteResult = { deletedItems: [], refusedItems: [], failedItems: [] };

  for (const item of items) {
    const { brandId, sourceRunId } = item;

    // Validate identifiers
    if (!/^[a-z0-9_-]+$/.test(brandId)) {
      result.refusedItems.push({ brandId, sourceRunId, errorCode: "invalid_brand_id", message: `Invalid brandId: ${brandId}` });
      continue;
    }
    if (!/^[A-Za-z0-9._-]+$/.test(sourceRunId)) {
      result.refusedItems.push({ brandId, sourceRunId, errorCode: "invalid_run_id", message: `Invalid sourceRunId: ${sourceRunId}` });
      continue;
    }

    // Resolve paths via registry
    let paths: ReturnType<typeof resolveBrandEvidencePaths>;
    try {
      paths = resolveBrandEvidencePaths(brandId, sourceRunId);
    } catch {
      result.refusedItems.push({ brandId, sourceRunId, errorCode: "unsupported_brand", message: `Brand not in importer registry: ${brandId}` });
      continue;
    }

    // Check evidence directory exists
    try {
      await access(paths.runDir);
    } catch {
      result.refusedItems.push({ brandId, sourceRunId, errorCode: "not_found", message: "Evidence run directory not found." });
      continue;
    }

    // Read admin draft store
    let imported: ImportedFilamentDraft[];
    try {
      const raw = await readFile(paths.adminDraftStore, "utf8");
      imported = JSON.parse(raw) as ImportedFilamentDraft[];
      if (!Array.isArray(imported)) imported = [];
    } catch {
      imported = [];
    }

    // Find the matching record
    const target = imported.find((d) => d.sourceRunId === sourceRunId);
    if (!target) {
      // No admin draft record, but evidence dir exists. We can still delete the evidence dir.
      try {
        await rm(paths.runDir, { recursive: true, force: false });
        result.deletedItems.push({ brandId, sourceRunId, removedAdminDraftCount: 0 });
      } catch (e) {
        result.failedItems.push({ brandId, sourceRunId, errorCode: "delete_failed", message: `Failed to delete evidence directory: ${(e as Error).message || "unknown"}` });
      }
      continue;
    }

    // Check if deletable
    if (!isDeletableDraft(target)) {
      result.refusedItems.push({
        brandId, sourceRunId,
        errorCode: "refused_not_unpublished_draft",
        message: `Draft is ${target.reviewStatus}/${target.importStatus} (isPublished=${target.isPublished}) — cannot delete.`
      });
      continue;
    }

    // Remove from admin draft store first
    const remaining = imported.filter((d) => d.sourceRunId !== sourceRunId);
    const removedCount = imported.length - remaining.length;
    try {
      await mkdir(path.dirname(paths.adminDraftStore), { recursive: true });
      await writeFile(paths.adminDraftStore, JSON.stringify(remaining, null, 2) + "\n", "utf8");
    } catch (e) {
      result.failedItems.push({ brandId, sourceRunId, errorCode: "admin_store_write_failed", message: `Failed to update admin draft store: ${(e as Error).message || "unknown"}` });
      continue; // Do NOT delete evidence dir if admin store update failed
    }

    // Delete evidence directory
    try {
      await rm(paths.runDir, { recursive: true, force: false });
    } catch (e) {
      // Rollback admin store
      try {
        const allExisting = await readFile(paths.adminDraftStore, "utf8").then(JSON.parse).catch(() => []);
        const restored = [...(Array.isArray(allExisting) ? allExisting : []), target];
        await writeFile(paths.adminDraftStore, JSON.stringify(restored, null, 2) + "\n", "utf8");
      } catch {}
      result.failedItems.push({ brandId, sourceRunId, errorCode: "evidence_delete_failed", message: `Failed to delete evidence directory: ${(e as Error).message || "unknown"}` });
      continue;
    }

    result.deletedItems.push({ brandId, sourceRunId, removedAdminDraftCount: removedCount });
  }

  return result;
}

/** Load imported drafts for a given brand from the admin draft store. */
export async function listImportedDrafts(brandId: string): Promise<ImportedFilamentDraft[]> {
  if (!/^[a-z0-9_-]+$/.test(brandId)) return [];
  let resolved: ReturnType<typeof resolveBrandEvidencePaths>;
  try {
    resolved = resolveBrandEvidencePaths(brandId, "dummy");
  } catch {
    return [];
  }
  try {
    const raw = await readFile(resolved.adminDraftStore, "utf8");
    const parsed = JSON.parse(raw) as ImportedFilamentDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
