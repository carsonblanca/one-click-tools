"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { strFromU8, unzipSync } from "fflate";
import {
  readJsonApiResponse,
  validateUploadFipStructure,
} from "./filament-import-upload";

type FipImportStatus = "draft" | "ready_for_review" | "blocked" | "invalid";
type DraftAction = "draft" | "new" | "update" | "skip";

type FipManifest = {
  schemaVersion: string;
  packageId: string;
  createdAt: string;
  importerVersion: string;
  sourcePackageCount: number;
  sourcePackageNames: string[];
  sourcePackageHashes: string[];
  brandCandidates: string[];
  productLineCandidates: string[];
  materialTypeCandidates: string[];
  languageHints: string[];
  totalAssetCount: number;
  totalPackageSizeBytes: number;
  importStatus: FipImportStatus;
  requiresManualReview: boolean;
  warnings: string[];
};

type FipColor = {
  colorId: string;
  displayNameZhCN: string | null;
  displayNameZhTW: string | null;
  displayNameEn: string | null;
  translationStatus: string;
  officialColorCode: string | null;
  colorCodeType: string | null;
  referenceColorCode?: string | null;
  referenceColorCodeType?: string | null;
  visualStatus: string;
  visualAssetId: string | null;
  visualAssetType: string | null;
  suggestedVisualAssetId?: string | null;
  suggestedVisualSource?: string | null;
  suggestedVisualConfidence?: number | null;
  manualVisualDataUrl?: string | null;
  sourceStatus: string;
  evidenceRefs: string[];
  requiresManualReview: boolean;
  confidence?: number;
  rawOcrText?: string;
};

type FipParamValue = string | null | { value?: number; valueMin?: number; valueMax?: number; sign?: string; unit?: string; source?: string; rawText?: string };

type FipProduct = {
  brandId: string | null;
  brandDisplayNameZhCN: string;
  brandDisplayNameZhTW: string;
  brandDisplayNameEn: string;
  productLineId: string;
  productLineNameZhCN: string | null;
  productLineNameZhTW: string | null;
  productLineNameEn: string | null;
  materialType: string | null;
  sourceStatus: string;
  translationStatus: string;
  colors: FipColor[];
  parameters: {
    nozzleTemperature: FipParamValue;
    bedTemperature: FipParamValue;
    printSpeed: FipParamValue;
    dryingTemperature: FipParamValue;
    dryingDuration: FipParamValue;
    amsCompatibility: FipParamValue;
    nozzleRequirement: FipParamValue;
    printNotes: FipParamValue;
    filamentDiameter?: FipParamValue;
    diameterTolerance?: FipParamValue;
    density?: FipParamValue;
    tensileStrength?: FipParamValue;
    flexuralStrength?: FipParamValue;
    netWeight?: FipParamValue;
    meltFlowIndex?: FipParamValue;
    elongationAtBreak?: FipParamValue;
    flexuralModulus?: FipParamValue;
    parameterStatus: "official" | "partial" | "inherited_unverified" | "missing";
    evidenceRefs: string[];
    requiresManualReview: boolean;
    rawCandidates?: Array<{ field?: string; rawValue?: string; normalized?: string; evidenceExcerpt?: string }>;
  };
  notes: string;
  evidenceRefs: string[];
};

type FipEvidence = {
  evidenceId: string;
  sourceZipFilename: string;
  sourceZipHash: string;
  sourceRelativePath: string;
  sourceType: string;
  extractedAssetId: string | null;
  extractionMethod: string;
  cropCoordinates: unknown;
  ocrText: string;
  ocrConfidence: number | null;
  fieldBindings: string[];
  notes: string;
};

type FipReport = {
  originalImageCount: number;
  retainedImageCount: number;
  discardedImageCount: number;
  originalImageBytes: number;
  retainedAssetBytes: number;
  fipSizeBytes: number;
  savingRatio: number | null;
  ocrImageCount: number;
  colorCandidateCount: number;
  parameterCandidateCount: number;
  unresolvedCount: number;
  warnings: string[];
};

type ParsedFip = {
  fileName: string;
  fileSize: number;
  manifest: FipManifest;
  products: FipProduct[];
  evidence: FipEvidence[];
  report: FipReport;
  assetPaths: string[];
  previewUrl: string | null;
  assetUrls: Record<string, string>;
  status: "draft" | "invalid";
  validationErrors: string[];
  action: DraftAction;
};

type KexcelledImportStatus = "queued" | "importing" | "imported_draft" | "unsupported" | "failed";

type KexcelledEvidenceImportResult = {
  fileName: string;
  recognizedBrand: string;
  productLine: string;
  materialType: string;
  colorCount: number;
  availableSkuCount: number;
  disabledSkuCount: number;
  imageCandidateCount: number;
  sharedImageCandidateCount: number;
  parameterStatus: string;
  status: KexcelledImportStatus;
  adminDraftStatus?: "not_imported" | "imported_to_admin_draft";
  rawSkuCount?: number;
  canonicalColorCount?: number;
  mergedVariantCount?: number;
  runId: string;
  draftPath: string;
  summaryPath: string;
  error: string;
  publicationStatus: string;
};

type BatchUploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: "queued" | "uploading" | "parsing" | "success" | "needs_review" | "failed";
  result: KexcelledEvidenceImportResult | null;
  error: string;
};

const SUPPORTED_SCHEMA = "fip.v1";
const MAX_FILES = 220;
const MAX_BYTES = 25 * 1024 * 1024;
const REJECTED_SUFFIX = /\.(exe|dll|dylib|so|sh|bat|cmd|js|mjs|app)$/i;
const SUPPORTED_IMPORT_BRANDS = [
  { id: "kexcelled", label: "KEXCELLED" },
] as const;
const DEFAULT_IMPORT_BRAND_ID = SUPPORTED_IMPORT_BRANDS[0]?.id || "";

function readJson<T>(files: Record<string, Uint8Array>, path: string): T {
  const file = files[path];
  if (!file) throw new Error(`Missing ${path}`);
  return JSON.parse(strFromU8(file)) as T;
}

function isUnsafePath(path: string) {
  return path.startsWith("/") || path.includes("../") || path.includes("..\\") || path.includes("\\");
}

function makeBlobUrl(files: Record<string, Uint8Array>, path: string) {
  const file = files[path];
  if (!file) return null;
  const bytes = file.slice();
  return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: path.endsWith(".webp") ? "image/webp" : "application/octet-stream" }));
}

function makeAssetUrls(files: Record<string, Uint8Array>) {
  const urls: Record<string, string> = {};
  let manifest: { assets?: Array<{ assetId: string; file: string }> } = {};
  try {
    manifest = files["swatch-manifest.json"] ? JSON.parse(strFromU8(files["swatch-manifest.json"])) : {};
  } catch {
    manifest = {};
  }
  for (const asset of manifest.assets || []) {
    const url = makeBlobUrl(files, asset.file);
    if (url) urls[asset.assetId] = url;
  }
  return urls;
}

function validateFip(files: Record<string, Uint8Array>, manifest: FipManifest, products: FipProduct[], evidence: FipEvidence[], report: FipReport, fileSize: number) {
  const errors: string[] = [];
  const names = Object.keys(files);
  const assetPaths = names.filter((name) => name.startsWith("assets/") || name.startsWith("preview/"));
  if (manifest.schemaVersion !== SUPPORTED_SCHEMA) errors.push(`Unsupported schemaVersion: ${manifest.schemaVersion}`);
  if (!manifest.packageId || !/^[a-z0-9._-]+$/i.test(manifest.packageId)) errors.push("Invalid packageId.");
  if (!["draft", "ready_for_review", "blocked", "invalid"].includes(manifest.importStatus)) errors.push("Invalid importStatus.");
  if (fileSize > MAX_BYTES) errors.push("FIP package exceeds admin upload size limit.");
  if (names.length > MAX_FILES) errors.push("FIP package contains too many files.");
  for (const name of names) {
    if (isUnsafePath(name)) errors.push(`Unsafe path rejected: ${name}`);
    if (REJECTED_SUFFIX.test(name)) errors.push(`Executable-like file rejected: ${name}`);
  }
  for (const required of ["manifest.json", "products.json", "evidence.json", "package-report.json", "ocr/images.json"]) {
    if (!files[required]) errors.push(`Missing ${required}`);
  }
  const assetIds = new Set<string>();
  for (const assetPath of assetPaths) {
    const id = assetPath.split("/").pop()?.replace(/\.[^.]+$/, "");
    if (id) assetIds.add(id);
  }
  for (const item of evidence) {
    if (item.extractedAssetId && !assetIds.has(item.extractedAssetId) && item.extractedAssetId !== "contact-sheet") {
      errors.push(`Evidence ${item.evidenceId} references missing asset ${item.extractedAssetId}.`);
    }
  }
  for (const product of products) {
    for (const color of product.colors) {
      if (!color.requiresManualReview) errors.push(`${color.colorId}: FIP color candidates must require manual review.`);
    }
    if (!product.parameters.requiresManualReview) errors.push(`${product.productLineId}: parameter candidates must require manual review.`);
  }
  return { errors, assetPaths };
}

async function parseFip(file: File): Promise<ParsedFip> {
  if (!file.name.endsWith(".filament-import.zip")) {
    throw new Error(`${file.name} is not a .filament-import.zip package.`);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const files = unzipSync(data);
  const manifest = readJson<FipManifest>(files, "manifest.json");
  const products = readJson<FipProduct[]>(files, "products.json");
  const evidence = readJson<FipEvidence[]>(files, "evidence.json");
  const report = readJson<FipReport>(files, "package-report.json");
  const validation = validateFip(files, manifest, products, evidence, report, file.size);
  return {
    fileName: file.name, fileSize: file.size, manifest, products, evidence, report,
    assetPaths: validation.assetPaths, previewUrl: makeBlobUrl(files, "preview/contact-sheet.webp"),
    assetUrls: makeAssetUrls(files),
    status: validation.errors.length ? "invalid" : "draft",
    validationErrors: validation.errors, action: "draft",
  };
}

// ── MOCHUANG material fix ──
function fixMochuangProduct(product: FipProduct, fileName: string): FipProduct {
  const fn = fileName.toLowerCase();
  if (fn.includes("mochuang") || fn.includes("魔创")) {
    if (fn.includes("petg-matte") || fn.includes("petg 哑光") || fn.includes("petg哑光")) {
      if (!product.materialType || product.materialType.toLowerCase() === "pla") {
        return { ...product, materialType: "PETG", productLineNameZhCN: product.productLineNameZhCN || "PETG Matte", requiresManualReview: true } as FipProduct;
      }
    }
  }
  return product;
}

export default function FilamentEvidenceImportClient({ role, sessionId }: { role: string; sessionId: string }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(DEFAULT_IMPORT_BRAND_ID);
  const [drafts, setDrafts] = useState<ParsedFip[]>([]);
  const [kexcelledResults, setKexcelledResults] = useState<KexcelledEvidenceImportResult[]>([]);
  const [message, setMessage] = useState("");
  const [kexcelledMessage, setKexcelledMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImportingEvidence, setIsImportingEvidence] = useState(false);
  const [selectedDraftKeys, setSelectedDraftKeys] = useState<Set<string>>(new Set());
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchUploadItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  function draftKey(result: KexcelledEvidenceImportResult) {
    return `${result.recognizedBrand}::${result.runId}`;
  }

  function isDeletableStatus(result: KexcelledEvidenceImportResult) {
    return (result.status === "imported_draft" || result.status === "queued")
      && !["directory_preview", "complete_profile"].includes(result.publicationStatus);
  }

  function formatRunIdTs(runId: string): string {
    // runId format: 20260630T130817Z-01-...
    const m = runId.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!m) return runId.slice(0, 19).replace("T", " ") || runId;
    return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function isPublishableStatus(result: KexcelledEvidenceImportResult) {
    return result.status === "imported_draft"
      && result.adminDraftStatus === "imported_to_admin_draft"
      && !["directory_preview", "complete_profile"].includes(result.publicationStatus);
  }

  function isImportableStatus(result: KexcelledEvidenceImportResult) {
    return result.status === "imported_draft" && result.adminDraftStatus !== "imported_to_admin_draft";
  }

  useEffect(() => {
    const saved = localStorage.getItem("oneclick-fip-import-drafts");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ParsedFip[];
      setDrafts(parsed.map((draft) => ({ ...draft, previewUrl: null, assetUrls: {} })));
      setMessage(`已恢复 ${parsed.length} 个本地草稿。`);
    } catch {
      setMessage("本地草稿读取失败，请重新上传 FIP。");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadKexcelledDrafts() {
      try {
        const response = await fetch("/api/admin/filament-import/kexcelled-evidence");
        if (!response.ok) return;
        const payload = (await response.json()) as { results?: KexcelledEvidenceImportResult[] };
        if (!cancelled && payload.results?.length) {
          setKexcelledResults(payload.results);
        }
      } catch {
        // Existing draft list is a convenience view; upload flow should remain usable if it fails.
      }
    }
    void loadKexcelledDrafts();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({
    packages: drafts.length,
    products: drafts.reduce((sum, draft) => sum + draft.products.length, 0),
    colors: drafts.reduce((sum, draft) => sum + draft.products.reduce((s, product) => s + product.colors.length, 0), 0),
    params: drafts.reduce((sum, draft) => sum + draft.report.parameterCandidateCount, 0),
  }), [drafts]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.length > 10) { setMessage("单次最多上传 10 个 FIP ZIP。"); return; }
    setIsParsing(true);
    setMessage("正在读取 FIP。默认只保存为草稿，不会发布或覆盖正式数据。");
    try {
      const parsed = await Promise.all(selected.map(parseFip));
      // Apply MOCHUANG material fix
      const saved = localStorage.getItem("oneclick-fip-import-drafts");
      const savedDrafts = saved ? JSON.parse(saved) as ParsedFip[] : [];
      const fixed = parsed.map((draft) => {
        const savedDraft = savedDrafts.find((item) => item.manifest.packageId === draft.manifest.packageId);
        const products = draft.products.map((p, productIndex) => {
          const product = fixMochuangProduct(p, draft.fileName);
          const savedProduct = savedDraft?.products?.[productIndex];
          if (!savedProduct) return product;
          return {
            ...product,
            colors: product.colors.map((color) => {
              const savedColor = savedProduct.colors.find((item) => item.colorId === color.colorId);
              return savedColor ? { ...color, visualAssetId: savedColor.visualAssetId, manualVisualDataUrl: savedColor.manualVisualDataUrl } : color;
            }),
          };
        });
        return { ...draft, products };
      });
      setDrafts(fixed);
      setMessage(`已读取 ${fixed.length} 个 FIP，${fixed.filter((item) => item.status === "invalid").length} 个需要先修复。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "FIP 读取失败。");
    } finally { setIsParsing(false); }
  }

  async function handleKexcelledEvidenceFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.length > 10) {
      setKexcelledMessage("单次最多上传 10 个文件。");
      return;
    }
    const uploadBrandId = selectedBrandId;
    if (!uploadBrandId) {
      setKexcelledMessage("请先选择品牌。");
      return;
    }

    // Build batch items
    const items: BatchUploadItem[] = selected.map((file, idx) => ({
      id: `batch-${Date.now()}-${idx}`,
      fileName: file.name,
      fileSize: file.size,
      status: "queued" as const,
      result: null,
      error: "",
    }));

    setBatchItems(items);
    setBatchProcessing(true);
    setKexcelledMessage("");

    // Process sequentially
    let succeededCount = 0;
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      setBatchItems((prev) => prev.map((bi, j) => j === i ? { ...bi, status: "uploading" } : bi));

      try {
        await validateUploadFipStructure(selected[i]);
        const body = new FormData();
        body.append("files", selected[i]);
        body.append("brandId", uploadBrandId);
        const response = await fetch("/api/admin/filament-import/kexcelled-evidence", {
          method: "POST",
          body,
        });
        const payload = await readJsonApiResponse<{
          success?: boolean;
          importId?: string;
          draftIds?: string[];
          redirectTo?: string;
          summary?: {
            productLine?: string;
            materialType?: string;
            colorCount?: number;
            parameterCount?: number;
            assetCount?: number;
          };
          error?: string;
          code?: string;
          details?: string;
        }>(response);
        if (!response.ok) throw new Error(payload.error || "导入失败");
        if (!payload.success || !payload.redirectTo) throw new Error("服务器未返回草稿入口");
        succeededCount++;
        const result: KexcelledEvidenceImportResult = {
          fileName: selected[i].name,
          recognizedBrand: "KEXCELLED",
          productLine: payload.summary?.productLine || "",
          materialType: payload.summary?.materialType || "",
          colorCount: payload.summary?.colorCount || 0,
          availableSkuCount: 0,
          disabledSkuCount: 0,
          imageCandidateCount: payload.summary?.assetCount || 0,
          sharedImageCandidateCount: 0,
          parameterStatus: (payload.summary?.parameterCount || 0) > 0 ? "official_partial" : "missing",
          status: "imported_draft",
          adminDraftStatus: "imported_to_admin_draft",
          runId: payload.redirectTo.split("/").pop() || "",
          draftPath: payload.redirectTo,
          summaryPath: "",
          error: "",
          publicationStatus: "draft",
        };

        setBatchItems((prev) => prev.map((bi, j) => j === i
          ? { ...bi, status: "success", result } : bi));

        // Merge into the persistent results list
        setKexcelledResults((current) => {
          const next = new Map(current.map((item) => [draftKey(item), item]));
          next.set(draftKey(result), result);
          return Array.from(next.values());
        });
        window.location.assign(payload.redirectTo);
        return;
      } catch (err) {
        failedCount++;
        setBatchItems((prev) => prev.map((bi, j) => j === i
          ? { ...bi, status: "failed", error: err instanceof Error ? err.message : "未知错误" } : bi));
      }
    }

    setBatchProcessing(false);
    setKexcelledMessage(`批量处理完成: ${succeededCount} 个成功, ${failedCount} 个失败`);
  }

  async function deleteKexcelledDraft(result: KexcelledEvidenceImportResult) {
    if (role !== "admin" || !result.runId) return;
    if (!isDeletableStatus(result)) {
      setKexcelledMessage("已发布耗材请前往耗材管理执行二次确认删除。");
      return;
    }
    setKexcelledMessage("正在删除导入草稿。");
    try {
      const response = await fetch(`/api/admin/filament-import/kexcelled-evidence/${encodeURIComponent(result.runId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        deletedRunId?: string;
        removedAdminDraftCount?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "删除失败。");
      }
      setKexcelledResults((current) => current.filter((item) => item.runId !== result.runId));
      setKexcelledMessage(`已删除，可重新上传 ZIP。已移除后台草稿记录 ${payload.removedAdminDraftCount ?? 0} 条。`);
    } catch (error) {
      setKexcelledMessage(error instanceof Error ? error.message : "删除失败。");
    }
  }

  const batchDeleteDrafts = useCallback(async () => {
    if (role !== "admin") return;
    if (selectedDraftKeys.size === 0) return;
    const deletable = kexcelledResults.filter(
      (r) => isDeletableStatus(r) && selectedDraftKeys.has(draftKey(r))
    );
    if (deletable.length === 0) {
      setKexcelledMessage("未选择可删除的未发布导入草稿。");
      return;
    }
    setBatchDeleting(true);
    setKexcelledMessage(`正在批量删除 ${deletable.length} 条草稿...`);

    const items = deletable.map((r) => ({
      brandId: r.recognizedBrand.toLowerCase(),
      sourceRunId: r.runId,
    }));

    try {
      const response = await fetch("/api/admin/filament-import/drafts/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json() as {
        deletedItems?: Array<{ brandId: string; sourceRunId: string }>;
        refusedItems?: Array<{ brandId: string; sourceRunId: string; errorCode: string }>;
        failedItems?: Array<{ brandId: string; sourceRunId: string; errorCode: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "批量删除请求失败。");
      }

      const deletedRunIds = new Set((payload.deletedItems || []).map((d) => d.sourceRunId));
      const failedRunIds = new Set((payload.failedItems || []).map((f) => f.sourceRunId));
      const refusedRunIds = new Set((payload.refusedItems || []).map((r) => r.sourceRunId));

      // Remove successfully deleted items; keep failed/refused
      setKexcelledResults((current) =>
        current.filter((item) => !deletedRunIds.has(item.runId))
      );
      setSelectedDraftKeys(new Set());

      let msg = `批量删除完成：成功 ${deletedRunIds.size} 条。`;
      if (refusedRunIds.size > 0) msg += ` 拒绝 ${refusedRunIds.size} 条（非未发布草稿）。`;
      if (failedRunIds.size > 0) msg += ` 失败 ${failedRunIds.size} 条。`;
      setKexcelledMessage(msg);
    } catch (error) {
      setKexcelledMessage(error instanceof Error ? error.message : "批量删除失败。");
    } finally {
      setBatchDeleting(false);
    }
  }, [role, selectedDraftKeys, kexcelledResults]);

  async function clearAllImportedDrafts() {
    if (role !== "admin") return;
    setBatchDeleting(true);
    setKexcelledMessage("正在清空全部导入草稿...");
    try {
      var response = await fetch("/api/admin/filament-import/drafts/clear-all", { method: "POST" });
      var payload = await response.json() as {
        deletedCount?: number;
        keptCount?: number;
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "清空失败。");
      setKexcelledResults([]);
      setSelectedDraftKeys(new Set());
      setKexcelledMessage(payload.message || ("已清空，删除 " + (payload.deletedCount || 0) + " 条。"));
    } catch (error) {
      setKexcelledMessage(error instanceof Error ? error.message : "清空失败。");
    } finally {
      setBatchDeleting(false);
    }
  }

  function showClearAllDialog() {
    var deletableCount = kexcelledResults.filter(isDeletableStatus).length;
    if (deletableCount === 0) {
      setKexcelledMessage("当前没有可删除的导入草稿。");
      return;
    }
    var confirmedText = window.prompt(
      "确认清空全部 " + deletableCount + " 条导入草稿？\n\n"
      + "请输入 DELETE IMPORTED DRAFTS 确认：\n\n"
      + "注意：只删除导入草稿，原始 ZIP 与正式 Catalog 不受影响。"
    );
    if (confirmedText !== "DELETE IMPORTED DRAFTS") {
      setKexcelledMessage("已取消：确认文本不匹配。");
      return;
    }
    void clearAllImportedDrafts();
  }

  const batchPublishDrafts = useCallback(async () => {
    if (role !== "admin" && role !== "codex") return;
    const publishable = kexcelledResults
      .filter((result) => isPublishableStatus(result) && selectedDraftKeys.has(draftKey(result)))
      .slice(0, 20);
    if (!publishable.length) {
      setKexcelledMessage("未选择可发布的未发布耗材草稿。");
      return;
    }

    setBatchPublishing(true);
    setKexcelledMessage(`正在发布 ${publishable.length} 条已选耗材。`);
    try {
      const response = await fetch("/api/admin/filament-drafts/batch-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRunIds: publishable.map((result) => result.runId) }),
      });
      const payload = await response.json() as {
        published?: string[];
        blocked?: Array<{ sourceRunId: string; issues: string[] }>;
        failed?: Array<{ sourceRunId: string; error: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "批量发布失败。");

      const published = new Set(payload.published || []);
      setKexcelledResults((current) => current.map((item) =>
        published.has(item.runId) ? { ...item, publicationStatus: "directory_preview" } : item
      ));
      setSelectedDraftKeys(new Set());

      const blockedText = (payload.blocked || [])
        .map((item) => `${item.sourceRunId}: ${item.issues.join("、")}`)
        .join("；");
      const failedText = (payload.failed || [])
        .map((item) => `${item.sourceRunId}: ${item.error}`)
        .join("；");
      setKexcelledMessage([
        `发布完成：成功 ${published.size} 条。`,
        blockedText ? `未满足条件：${blockedText}` : "",
        failedText ? `失败：${failedText}` : "",
      ].filter(Boolean).join(" "));
    } catch (error) {
      setKexcelledMessage(error instanceof Error ? error.message : "批量发布失败。");
    } finally {
      setBatchPublishing(false);
    }
  }, [role, selectedDraftKeys, kexcelledResults]);

  const batchImportDrafts = useCallback(async () => {
    if (role !== "admin" && role !== "codex") return;
    if (selectedImportKeys.size === 0) return;
    const importable = kexcelledResults
      .filter((r) => isImportableStatus(r) && selectedImportKeys.has(draftKey(r)))
      .slice(0, 20);
    if (importable.length === 0) {
      setKexcelledMessage("未选择可导入的 KEXCELLED FIP 草稿。");
      return;
    }

    setBatchImporting(true);
    setKexcelledMessage(`正在批量导入 ${importable.length} 条到耗材草稿库...`);

    const items = importable.map((r) => ({ brandId: "kexcelled", sourceRunId: r.runId }));
    try {
      const response = await fetch("/api/admin/filament-import/kexcelled-evidence/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json() as {
        importedItems?: Array<{ sourceRunId: string; rawSkuCount: number; canonicalColorCount: number; mergedVariantCount: number }>;
        alreadyImportedItems?: Array<{ sourceRunId: string; rawSkuCount: number; canonicalColorCount: number; mergedVariantCount: number }>;
        failedItems?: Array<{ sourceRunId: string; message: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "批量导入请求失败。");
      }

      const importedByRunId = new Map([
        ...(payload.importedItems || []),
        ...(payload.alreadyImportedItems || []),
      ].map((item) => [item.sourceRunId, item]));

      setKexcelledResults((current) => current.map((item) => {
        const imported = importedByRunId.get(item.runId);
        if (!imported) return item;
        return {
          ...item,
          adminDraftStatus: "imported_to_admin_draft",
          rawSkuCount: imported.rawSkuCount,
          canonicalColorCount: imported.canonicalColorCount,
          mergedVariantCount: imported.mergedVariantCount,
        };
      }));
      setSelectedImportKeys(new Set());

      const importedCount = payload.importedItems?.length || 0;
      const alreadyCount = payload.alreadyImportedItems?.length || 0;
      const failedCount = payload.failedItems?.length || 0;
      setKexcelledMessage(`批量导入完成：新增 ${importedCount} 条，已存在 ${alreadyCount} 条，失败 ${failedCount} 条。`);
    } catch (error) {
      setKexcelledMessage(error instanceof Error ? error.message : "批量导入失败。");
    } finally {
      setBatchImporting(false);
    }
  }, [role, selectedImportKeys, kexcelledResults]);

  function updateDraft(packageId: string, patch: Partial<ParsedFip>) {
    setDrafts((current) => current.map((draft) => draft.manifest.packageId === packageId ? { ...draft, ...patch } : draft));
  }

  function updateProduct(packageId: string, productIndex: number, patch: Partial<FipProduct>) {
    setDrafts((current) => current.map((draft) => {
      if (draft.manifest.packageId !== packageId) return draft;
      const products = draft.products.map((product, index) => index === productIndex ? { ...product, ...patch } : product);
      return { ...draft, products };
    }));
  }

  function updateColor(packageId: string, productIndex: number, colorIndex: number, patch: Partial<FipColor>) {
    setDrafts((current) => current.map((draft) => {
      if (draft.manifest.packageId !== packageId) return draft;
      const products = draft.products.map((product, pIdx) => {
        if (pIdx !== productIndex) return product;
        const colors = product.colors.map((color, cIdx) => cIdx === colorIndex ? { ...color, ...patch } : color);
        return { ...product, colors };
      });
      return { ...draft, products };
    }));
  }

  function updateParameter(packageId: string, productIndex: number, patch: Partial<FipProduct["parameters"]>) {
    setDrafts((current) => current.map((draft) => {
      if (draft.manifest.packageId !== packageId) return draft;
      const products = draft.products.map((product, index) => {
        if (index !== productIndex) return product;
        return { ...product, parameters: { ...product.parameters, ...patch } };
      });
      return { ...draft, products };
    }));
  }

  function saveDrafts() {
    const payload = drafts.map((draft) => ({ ...draft, previewUrl: null, assetUrls: {} }));
    localStorage.setItem("oneclick-fip-import-drafts", JSON.stringify(payload));
    setMessage("FIP 草稿已保存到当前浏览器。发布仍需后续明确操作。");
  }


  function handleManualVisualUpload(packageId: string, productIndex: number, colorIndex: number, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const manualId = `manual-${Date.now()}`;
      updateColor(packageId, productIndex, colorIndex, {
        visualAssetId: manualId,
        visualStatus: "visual_reference",
        manualVisualDataUrl: typeof reader.result === "string" ? reader.result : null,
      });
    };
    reader.readAsDataURL(file);
  }

  function paramDisplay(val: FipParamValue): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val.valueMin !== undefined && val.valueMax !== undefined) {
      return `${val.valueMin}–${val.valueMax} ${val.unit || ""}`.trim();
    }
    if (val.sign && val.value !== undefined) {
      return `${val.sign}${val.value} ${val.unit || ""}`.trim();
    }
    if (val.value !== undefined) {
      return `${val.value} ${val.unit || ""}`.trim();
    }
    if (val.rawText) return val.rawText;
    return "";
  }

  function exportReviewedFip(draft: ParsedFip) {
    const reviewedPackageId = draft.manifest.packageId + "-reviewed-" + new Date().toISOString().slice(0, 10);
    const reviewedAt = new Date().toISOString();

    const exportData = {
      schemaVersion: "fip.v1",
      packageId: reviewedPackageId,
      originalPackageId: draft.manifest.packageId,
      reviewedAt,
      importerVersion: "fip-reviewed-v1",
      importStatus: "ready_for_review",
      products: draft.products.map((product) => ({
        ...product,
        colors: product.colors.filter((c) => c.displayNameZhCN || c.displayNameEn),
      })),
      evidence: draft.evidence,
      packageReport: {
        ...draft.report,
        colorCandidateCount: draft.products.reduce((sum, p) => sum + p.colors.length, 0),
        parameterCandidateCount: draft.products.reduce((sum, p) => sum + (p.parameters.rawCandidates?.length || 0), 0),
        reviewNotes: "Human reviewed and confirmed in admin backend.",
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reviewedPackageId}.reviewed-fip.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`已导出确认版 FIP：${reviewedPackageId}。请将此文件与原始 FIP 一起提交给 Codex 审计。`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-[#667281]">Role: {role} · Session {sessionId}</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#18202A]">耗材包上传</h1>
        <p className="mt-1 max-w-4xl text-sm text-[#667281]">
          仅支持 .filament-import.zip FIP 文件。原始证据 ZIP 需先在本地生成 FIP，上传完成后将直接创建草稿，不会自动发布。
        </p>
      </div>

      <div className="rounded-xl border border-[#D9E0E7] bg-white p-5">
        <label className="block text-sm font-medium text-[#18202A]" htmlFor="filament-brand">品牌</label>
        <select
          id="filament-brand"
          className="mt-2 w-full max-w-sm rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"
          value={selectedBrandId}
          onChange={(event) => setSelectedBrandId(event.target.value)}
        >
          <option value="">请先选择品牌</option>
          {SUPPORTED_IMPORT_BRANDS.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.label}</option>
          ))}
          <option value="" disabled>ALIZ（暂未接入）</option>
          <option value="" disabled>MOCHUANG（暂未接入）</option>
          <option value="" disabled>R3D（暂未接入）</option>
        </select>
        <label className="mt-4 block text-sm font-medium text-[#18202A]" htmlFor="kexcelled-evidence-zips">上传耗材包</label>
        <input
          id="kexcelled-evidence-zips"
          className="mt-3 block w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm"
          type="file"
          accept=".filament-import.zip,application/zip"
          multiple
          disabled={batchProcessing}
          onChange={(event) => void handleKexcelledEvidenceFiles(event.target.files)}
        />
        <p className="mt-2 text-xs text-[#667281]">
          支持一次选择 1–10 个 FIP 文件。逐包上传，一个失败不影响其他文件。
        </p>
        {/* Batch progress cards */}
        {batchItems.length > 0 ? (
          <div className="mt-3 space-y-2">
            {batchItems.map((item) => (
              <div key={item.id} className={`rounded-lg border px-3 py-2 text-sm ${
                item.status === "success" ? "border-green-300 bg-green-50"
                : item.status === "needs_review" ? "border-amber-300 bg-amber-50"
                : item.status === "failed" ? "border-red-300 bg-red-50"
                : item.status === "uploading" ? "border-blue-300 bg-blue-50"
                : "border-[#D9E0E7] bg-[#F4F6F8]"
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#18202A]">{item.fileName}</p>
                    <p className="text-xs text-[#667281]">
                      {formatBytes(item.fileSize)} · {
                        item.status === "queued" ? "排队中"
                        : item.status === "uploading" ? "上传中…"
                        : item.status === "success" ? `已导入 · ${item.result?.productLine || ""}`
                        : item.status === "needs_review" ? "待确认 · 暂不支持"
                        : item.status === "failed" ? "导入失败"
                        : item.status
                      }
                    </p>
                    {item.error ? <p className="text-xs text-red-600">{item.error}</p> : null}
                  </div>
                  {item.status === "success" && item.result?.runId ? (
                    <Link href={`/admin/filament-import/kexcelled/${encodeURIComponent(item.result.runId)}`}
                      className="shrink-0 text-xs text-[#1F5FAF] hover:underline">查看草稿</Link>
                  ) : null}
                  {item.status === "uploading" ? (
                    <span className="shrink-0 text-xs text-[#667281]">⏳</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {kexcelledMessage ? <p className="mt-3 rounded-lg bg-[#F4F6F8] px-3 py-2 text-sm text-[#18202A]">{kexcelledMessage}</p> : null}
        {kexcelledResults.length ? (
          <div className="mt-4 overflow-x-auto">
            {false && (role === "admin" || role === "codex") ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#F4F6F8] px-3 py-1.5 text-xs text-[#18202A] hover:bg-[#E5E9ED] disabled:opacity-40"
                  disabled={batchDeleting || batchPublishing}
                  onClick={() =>
                    setSelectedDraftKeys(new Set(
                      kexcelledResults.filter(isPublishableStatus).map((r) => draftKey(r))
                    ))
                  }
                >
                  全选当前列表
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#F4F6F8] px-3 py-1.5 text-xs text-[#18202A] hover:bg-[#E5E9ED] disabled:opacity-40"
                  disabled={batchDeleting || batchPublishing}
                  onClick={() => setSelectedDraftKeys(new Set())}
                >
                  取消选择
                </button>
                <span className="text-xs text-[#667281]">
                  已选择 {selectedDraftKeys.size} 条
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-[#1F5FAF] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  disabled={selectedDraftKeys.size === 0 || batchPublishing}
                  onClick={() => void batchPublishDrafts()}
                >
                  {batchPublishing ? "发布中…" : "发布耗材"}
                </button>
                {role === "admin" ? (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-40"
                  disabled={selectedDraftKeys.size === 0 || batchDeleting}
                  onClick={() => void batchDeleteDrafts()}
                >
                  {batchDeleting ? "删除中…" : "删除已选"}
                </button>
                ) : null}
                {role === "admin" ? (
                <button
                  type="button"
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                  disabled={batchDeleting || batchPublishing}
                  onClick={showClearAllDialog}
                >
                  清空导入草稿
                </button>
                ) : null}
              </div>
            ) : null}
            <table className="min-w-full text-left text-xs">
              <thead className="text-[#667281]">
                <tr className="border-b border-[#D9E0E7]">
                  {false && (role === "admin" || role === "codex") ? (
                    <th className="w-8 py-2 pr-1">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={
                          kexcelledResults.filter(isPublishableStatus).length > 0 &&
                          kexcelledResults.filter(isPublishableStatus).every((r) =>
                            selectedDraftKeys.has(draftKey(r))
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDraftKeys(new Set(
                              kexcelledResults.filter(isPublishableStatus).map((r) => draftKey(r))
                            ));
                          } else {
                            setSelectedDraftKeys(new Set());
                          }
                        }}
                      />
                    </th>
                  ) : null}
                  <th className="py-2 pr-3 font-medium">ZIP</th>
                  <th className="py-2 pr-3 font-medium">状态</th>
                  <th className="py-2 pr-3 font-medium">品牌</th>
                  <th className="py-2 pr-3 font-medium">创建时间</th>
                  <th className="py-2 pr-3 font-medium">产品线</th>
                  <th className="py-2 pr-3 font-medium">材料</th>
                  <th className="py-2 pr-3 font-medium">颜色</th>
                  <th className="py-2 pr-3 font-medium">归并</th>
                  <th className="py-2 pr-3 font-medium">可售 / 禁用</th>
                  <th className="py-2 pr-3 font-medium">图片 / 共享</th>
                  <th className="py-2 pr-3 font-medium">参数</th>
                  <th className="py-2 pr-3 font-medium">操作</th>
                  <th className="py-2 pr-3 font-medium">导入信息</th>
                </tr>
              </thead>
              <tbody>
                {kexcelledResults.map((result) => (
                  <tr key={`${result.fileName}-${result.runId || result.status}`} className="border-b border-[#EEF2F6] align-top">
                    {false && (role === "admin" || role === "codex") ? (
                      <td className="w-8 py-2 pr-1">
                        <input
                          type="checkbox"
                          className="rounded"
                          disabled={!isPublishableStatus(result)}
                          checked={selectedDraftKeys.has(draftKey(result))}
                          onChange={(e) => {
                            const key = draftKey(result);
                            setSelectedDraftKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                        />
                      </td>
                    ) : null}
                    <td className="max-w-[220px] py-2 pr-3 text-[#18202A]">{result.fileName}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 ${
                        result.status === "imported_draft"
                          ? "bg-green-50 text-green-700"
                          : result.status === "unsupported"
                            ? "bg-amber-50 text-amber-700"
                            : result.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-[#F4F6F8] text-[#667281]"
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.recognizedBrand || "-"}</td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.productLine || "-"}</td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.materialType || "-"}</td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.colorCount || "-"}</td>
                    <td className="py-2 pr-3 text-[#18202A]">
                      {result.adminDraftStatus === "imported_to_admin_draft"
                        ? `${result.canonicalColorCount || 0} 色 / ${result.rawSkuCount || 0} SKU / 合并 ${result.mergedVariantCount || 0}`
                        : "同步失败"}
                    </td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.availableSkuCount} / {result.disabledSkuCount}</td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.imageCandidateCount} / {result.sharedImageCandidateCount}</td>
                    <td className="py-2 pr-3 text-[#18202A]">{result.parameterStatus || "-"}</td>
                    <td className="py-2 pr-3">
                      {result.status === "imported_draft" && result.runId ? (
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/filament-drafts/${encodeURIComponent(result.runId)}`} className="text-[#1F5FAF] hover:underline">
                            编辑耗材
                          </Link>
                          {role === "admin" && isDeletableStatus(result) ? (
                            <button
                              type="button"
                              className="text-red-600 hover:underline"
                              onClick={() => void deleteKexcelledDraft(result)}
                            >
                              删除
                            </button>
                          ) : ["directory_preview", "complete_profile"].includes(result.publicationStatus) ? (
                            <Link href="/admin/filaments" className="text-[#1F5FAF] hover:underline">
                              前往耗材管理
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[#9AA3AD]">—</span>
                      )}
                    </td>
                    <td className="max-w-[360px] py-2 pr-3 text-[#667281]">
                      {result.error ? result.error : result.runId ? `草稿已生成 · ${result.runId}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="hidden">
        <label className="block text-sm font-medium text-[#18202A]" htmlFor="fip-zips">上传 FIP ZIP</label>
        <input id="fip-zips" className="mt-3 block w-full rounded-lg border border-[#CBD3DC] bg-white px-3 py-2 text-sm" type="file" accept=".filament-import.zip,application/zip" multiple onChange={(event) => void handleFiles(event.target.files)} />
        <p className="mt-2 text-xs text-[#667281]">
          支持一次上传 1–10 个 FIP。原始证据 ZIP 不作为后台上传入口；请先使用本地工具生成 FIP。
        </p>
        {message ? <p className="mt-3 rounded-lg bg-[#F4F6F8] px-3 py-2 text-sm text-[#18202A]">{message}</p> : null}
      </div>

      <div className="hidden">
        <Stat label="FIP" value={stats.packages} />
        <Stat label="产品线" value={stats.products} />
        <Stat label="颜色候选" value={stats.colors} />
        <Stat label="参数候选" value={stats.params} />
      </div>

      <div className="hidden">
        {drafts.map((draft) => (
          <section key={draft.manifest.packageId} className="rounded-xl border border-[#D9E0E7] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#18202A]">{draft.fileName}</h2>
                <p className="mt-1 text-xs text-[#667281]">
                  {draft.manifest.packageId} · {draft.manifest.importStatus} · {draft.report.retainedImageCount}/{draft.report.originalImageCount} images retained
                </p>
              </div>
              <select className="rounded-lg border border-[#CBD3DC] px-3 py-2 text-sm" value={draft.action} onChange={(event) => updateDraft(draft.manifest.packageId, { action: event.target.value as DraftAction })}>
                <option value="draft">保留草稿</option><option value="new">新增</option><option value="update">更新</option><option value="skip">跳过</option>
              </select>
            </div>
            {draft.validationErrors.length ? (
              <ul className="mt-3 rounded-lg bg-[#FFF3E6] p-3 text-xs text-[#8A4B0A]">
                {draft.validationErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-4">
                {draft.products.map((product, index) => (
                  <div key={`${draft.manifest.packageId}-${product.productLineId}`} className="rounded-lg bg-[#F7F9FB] p-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="品牌" value={product.brandDisplayNameZhCN || product.brandId || ""} onChange={(value) => updateProduct(draft.manifest.packageId, index, { brandDisplayNameZhCN: value })} />
                      <Field label="产品线" value={product.productLineNameZhCN ?? product.productLineNameEn ?? ""} onChange={(value) => updateProduct(draft.manifest.packageId, index, { productLineNameZhCN: value })} />
                      <Field label="Material" value={product.materialType ?? ""} onChange={(value) => updateProduct(draft.manifest.packageId, index, { materialType: value })} />
                    </div>

                    {/* ── Editable Color Cards ── */}
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[#18202A]">颜色候选 ({product.colors.length})</p>
                      {product.colors.length === 0 ? (
                        <p className="text-xs text-[#9AA3AD]">无颜色候选</p>
                      ) : (
                        <div className="space-y-2">
                          {product.colors.map((color, cIdx) => (
                            <div key={color.colorId} className="rounded-lg border border-[#D9E0E7] bg-white p-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <Field small label="简中名称" value={color.displayNameZhCN || ""} onChange={(v) => updateColor(draft.manifest.packageId, index, cIdx, { displayNameZhCN: v })} />
                                <Field small label="英文名称" value={color.displayNameEn || ""} onChange={(v) => updateColor(draft.manifest.packageId, index, cIdx, { displayNameEn: v })} />
                                <Field small label="官方色号" value={color.officialColorCode || ""} onChange={(v) => updateColor(draft.manifest.packageId, index, cIdx, { officialColorCode: v || null })} />
                                {(color as any).pendingReferenceColorCode ? (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-[#667281]">参考色号：待人工确认 ▾</summary>
                                    <div className="mt-1 rounded bg-[#F7F2E8] p-2 text-[#B8860B]">
                                      OCR 识别线索：Pantone {(color as any).pendingReferenceColorCode}
                                      <button type="button" className="ml-2 text-red-500 hover:underline" onClick={() => {
                                        updateColor(draft.manifest.packageId, index, cIdx, { referenceColorCode: (color as any).pendingReferenceColorCode, referenceColorCodeType: 'pantone_reference' } as any);
                                      }}>确认</button>
                                    </div>
                                  </details>
                                ) : color.referenceColorCode ? (
                                  <label className="block">
                                    <span className="text-xs text-[#667281]">参考色号 ({color.referenceColorCodeType || "reference"})</span>
                                    <div className="mt-0.5 flex items-center gap-2">
                                      <input className="w-full rounded-lg border border-[#CBD3DC] px-2 py-1.5 text-xs bg-[#F7F2E8]" value={color.referenceColorCode} readOnly />
                                      <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => updateColor(draft.manifest.packageId, index, cIdx, { referenceColorCode: null })}>清空</button>
                                    </div>
                                    <span className="text-[10px] text-[#B8860B]">仅供色彩参考，非官方SKU色号</span>
                                  </label>
                                ) : (
                                  <span className="text-xs text-[#9AA3AD]">参考色号：待人工确认</span>
                                )}
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                                <div className="h-24 w-24 overflow-hidden rounded-lg border border-[#D9E0E7] bg-[#F4F6F8]">
                                  {color.manualVisualDataUrl ? (
                                    <img src={color.manualVisualDataUrl} alt="manual visual" className="h-full w-full object-cover" />
                                  ) : color.visualAssetId && draft.assetUrls[color.visualAssetId] ? (
                                    <img src={draft.assetUrls[color.visualAssetId]} alt="bound swatch" className="h-full w-full object-cover" />
                                  ) : color.suggestedVisualAssetId && draft.assetUrls[color.suggestedVisualAssetId] ? (
                                    <img src={draft.assetUrls[color.suggestedVisualAssetId]} alt="suggested swatch" className="h-full w-full object-cover opacity-75" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#9AA3AD]">视觉待补</div>
                                  )}
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full border border-[#CBD3DC] px-2 py-0.5 text-[#667281]">{color.visualStatus}</span>
                                    {color.visualAssetId ? <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-green-800">已绑定：{color.visualAssetId}</span> : <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">保持未绑定</span>}
                                  </div>
                                  {color.suggestedVisualAssetId ? (
                                    <div className="rounded-lg border border-[#D9E0E7] bg-[#F8FAFC] p-2">
                                      <p className="font-medium text-[#18202A]">建议色块图</p>
                                      <p className="mt-1 text-[#667281]">{color.suggestedVisualAssetId} · {color.suggestedVisualSource || "color_chart_crop"} · confidence {color.suggestedVisualConfidence ?? "manual"}</p>
                                      <button type="button" className="mt-2 rounded-lg border border-[#1F5FAF] px-2 py-1 text-[#1F5FAF]" onClick={() => updateColor(draft.manifest.packageId, index, cIdx, { visualAssetId: color.suggestedVisualAssetId || null, visualStatus: "visual_reference" })}>采用建议图</button>
                                    </div>
                                  ) : <p className="text-[#9AA3AD]">无建议色块图</p>}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" className="rounded-lg border border-[#CBD3DC] px-2 py-1 text-[#18202A]" onClick={() => updateColor(draft.manifest.packageId, index, cIdx, { visualAssetId: null, visualStatus: "visual_pending", manualVisualDataUrl: null })}>取消绑定</button>
                                    <label className="rounded-lg border border-[#CBD3DC] px-2 py-1 text-[#18202A]">
                                      手动替换图片
                                      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleManualVisualUpload(draft.manifest.packageId, index, cIdx, event.target.files?.[0] || null)} />
                                    </label>
                                    <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100" onClick={() => {
                                      const newColors = product.colors.filter((_, i) => i !== cIdx);
                                      updateProduct(draft.manifest.packageId, index, { colors: newColors } as Partial<FipProduct>);
                                    }}>删除</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Editable Parameter Fields ── */}
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[#18202A]">参数候选</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {([
                          ["线径", "filamentDiameter"],
                          ["公差", "diameterTolerance"],
                          ["喷嘴温度", "nozzleTemperature"],
                          ["热床温度", "bedTemperature"],
                          ["打印速度", "printSpeed"],
                          ["密度", "density"],
                          ["拉伸强度", "tensileStrength"],
                          ["弯曲强度", "flexuralStrength"],
                          ["净重", "netWeight"],
                          ["熔指", "meltFlowIndex"],
                          ["断裂伸长率", "elongationAtBreak"],
                          ["弯曲模量", "flexuralModulus"],
                          ["干燥温度", "dryingTemperature"],
                          ["干燥时长", "dryingDuration"],
                          ["AMS兼容", "amsCompatibility"],
                          ["喷嘴要求", "nozzleRequirement"],
                          ["打印备注", "printNotes"],
                        ] as const).map(([label, key]) => (
                          <label key={key} className="block">
                            <span className="text-xs text-[#667281]">{label}</span>
                            <input
                              className="mt-0.5 w-full rounded-lg border border-[#CBD3DC] px-2 py-1.5 text-xs"
                              value={paramDisplay((product.parameters as Record<string, unknown>)[key] as FipParamValue)}
                              onChange={(e) => {
                                const newVal: FipParamValue = e.target.value || null;
                                updateParameter(draft.manifest.packageId, index, { [key]: newVal } as Partial<FipProduct["parameters"]>);
                              }}
                            />
                          </label>
                        ))}
                        <label className="block">
                          <span className="text-xs text-[#667281]">参数状态</span>
                          <select
                            className="mt-0.5 w-full rounded-lg border border-[#CBD3DC] px-2 py-1.5 text-xs"
                            value={product.parameters.parameterStatus}
                            onChange={(e) => updateParameter(draft.manifest.packageId, index, { parameterStatus: e.target.value as FipProduct["parameters"]["parameterStatus"] })}
                          >
                            <option value="missing">OCR 候选 / 待人工核验</option>
                            <option value="partial">部分官方（人工确认后）</option>
                            <option value="official">官方正式（人工确认后）</option>
                            <option value="inherited_unverified">临时继承未验证</option>
                          </select>
                          {product.parameters.requiresManualReview && (
                            <span className="mt-1 block text-[10px] text-[#B8860B]">⚠ OCR 候选数据，待人工确认</span>
                          )}
                        </label>
                      </div>
                      {/* Raw candidate excerpts */}
                      {product.parameters.rawCandidates && product.parameters.rawCandidates.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-[#1F5FAF]">查看原始候选文本 ({product.parameters.rawCandidates.length} 条)</summary>
                          <div className="mt-1 max-h-32 overflow-auto rounded-lg bg-[#F4F6F8] p-2 text-xs text-[#667281]">
                            {product.parameters.rawCandidates.map((rc, i) => (
                              <div key={i} className="mb-1 border-b border-[#D9E0E7] pb-1 last:border-0">
                                {rc.field && <span className="font-medium">{rc.field}: </span>}
                                {rc.rawValue || rc.evidenceExcerpt || ""}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Evidence refs */}
                    <div className="mt-3 text-xs text-[#667281]">
                      来源证据: {product.evidenceRefs.length} 条 | 需人工审核: {product.parameters.requiresManualReview ? "是" : "否"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {draft.previewUrl ? <img src={draft.previewUrl} alt="FIP contact sheet preview" className="w-full rounded-lg border border-[#D9E0E7]" /> : <div className="rounded-lg border border-dashed border-[#CBD3DC] p-4 text-xs text-[#667281]">无 contact sheet 预览</div>}
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-medium text-[#18202A]">Package report</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#667281]">
                    <li>Original: {draft.report.originalImageCount}</li>
                    <li>Retained: {draft.report.retainedImageCount}</li>
                    <li>Discarded: {draft.report.discardedImageCount}</li>
                    <li>OCR: {draft.report.ocrImageCount}</li>
                    <li>Unresolved: {draft.report.unresolvedCount}</li>
                  </ul>
                </div>
                {draft.evidence.length > 0 && (
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-medium text-[#18202A]">图片资源 ({draft.evidence.length})</p>
                    <div className="mt-2 max-h-48 overflow-auto space-y-1">
                      {draft.evidence.slice(0, 20).map((item) => (
                        <div key={item.evidenceId} className="text-xs text-[#667281]">
                          <span className="font-medium">{item.extractedAssetId || "无ID"}</span>
                          <span className="mx-1">·</span>
                          <span>{item.sourceType}</span>
                          {item.ocrText && <span className="ml-2 text-[#9AA3AD] truncate block">OCR: {item.ocrText.slice(0, 40)}</span>}
                        </div>
                      ))}
                      {draft.evidence.length > 20 && <p className="text-xs text-[#9AA3AD]">... 还有 {draft.evidence.length - 20} 条</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/filaments" className="rounded-lg border border-[#CBD3DC] px-4 py-2 text-sm text-[#18202A]">
          耗材管理
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#D9E0E7] bg-white p-4"><p className="text-xs text-[#667281]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#18202A]">{value}</p></div>;
}

function Field({ label, value, onChange, small }: { label: string; value: string; onChange: (value: string) => void; small?: boolean }) {
  return (
    <label className="block">
      <span className={`font-medium text-[#18202A] ${small ? "text-xs" : "text-sm"}`}>{label}</span>
      <input className={`mt-1 w-full rounded-lg border border-[#CBD3DC] px-3 py-2 ${small ? "text-xs" : "text-sm"}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={label.includes("官方") ? "暂无官方色号" : ""} />
    </label>
  );
}
