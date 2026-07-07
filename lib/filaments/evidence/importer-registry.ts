import path from "node:path";

/**
 * Brand-agnostic importer registry.
 *
 * Each registered brand exposes:
 *   - evidenceRoot: root path on disk for evidence import run directories
 *   - adminDraftStore: path to the single JSON file holding imported drafts for this brand
 *   - supported: whether imports for this brand are enabled
 *
 * Deleting / listing operations use this registry to resolve paths per (brandId, sourceRunId)
 * instead of hard-coding KEXCELLED paths.
 */

export type BrandImporterEntry = {
  brandId: string;
  evidenceRoot: string;       // relative to process.cwd()
  adminDraftStore: string;    // relative to process.cwd()
  supported: boolean;
};

const BRANDS: BrandImporterEntry[] = [
  {
    brandId: "kexcelled",
    evidenceRoot: "data/filaments/evidence-imports/kexcelled",
    adminDraftStore: "data/filaments/admin-drafts/kexcelled-imported-drafts.json",
    supported: true,
  },
  // Future brands register here:
  // { brandId: "aliz", evidenceRoot: "data/filaments/evidence-imports/aliz", adminDraftStore: "...", supported: false },
  // { brandId: "mochuang", ... },
  // { brandId: "r3d", ... },
];

const REGISTRY = new Map<string, BrandImporterEntry>(
  BRANDS.filter((b) => b.supported).map((b) => [b.brandId, b]),
);

export function getBrandRegistry(): ReadonlyMap<string, BrandImporterEntry> {
  return REGISTRY;
}

export function getBrandEntry(brandId: string): BrandImporterEntry | undefined {
  return REGISTRY.get(brandId.toLowerCase());
}

export function isBrandSupported(brandId: string): boolean {
  return REGISTRY.has(brandId.toLowerCase());
}

/** Resolve absolute evidence paths for a given brand + runId. */
export function resolveBrandEvidencePaths(brandId: string, runId: string) {
  const entry = getBrandEntry(brandId);
  if (!entry) {
    throw new Error(`Unsupported brand: ${brandId}`);
  }
  // Sanitize runId
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
    throw new Error("Invalid runId.");
  }
  const cwd = process.cwd();
  const evidenceAbs = path.join(cwd, entry.evidenceRoot);
  const runDir = path.join(evidenceAbs, runId);
  // Path traversal guard
  const rel = path.relative(evidenceAbs, runDir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid runId path.");
  }
  return {
    runDir,
    draftPath: path.join(runDir, "kexcelled-draft.json"),
    summaryPath: path.join(runDir, "kexcelled-import-summary.json"),
    adminDraftStore: path.join(cwd, entry.adminDraftStore),
    evidenceRoot: evidenceAbs,
  };
}
