import type { CaptureDraftPatch } from "./capture-draft-patch";

export const GENERATED_PATCH_TARGET = {
  sourceRunId: "opencode-20260718081745-d5c1e1ff-d199c528",
  draftId: "8a3ac57b-ffc6-4c35-9d2a-41482d5002a8",
  productName: "THE K5 PETG M",
  productLineId: "kexcelled-k5-petg-m",
} as const;

export const ORIGINAL_OFFICIAL_PARAMETER_KEYS = [
  "filamentDiameter",
  "netWeight",
  "diameterTolerance",
  "density",
  "meltFlowIndex",
  "heatDeflectionTemperature",
  "vicatSofteningTemperature",
  "tensileStrength",
  "elongationAtBreak",
  "flexuralStrength",
  "flexuralModulus",
  "unnotchedImpactStrength",
  "notchedImpactStrength",
] as const;

export const GENERATED_PRINT_PARAMETER_KEYS = [
  "nozzleTemperature",
  "nozzleDiameter",
  "bedTemperature",
  "coolingFan",
  "printingSpeed",
  "retractionDistance",
  "retractionSpeed",
  "dryingTemperature",
  "dryingTime",
  "buildPlateSurface",
] as const;

type DraftRowLike = {
  id: string;
  source_run_id: string;
  status: string;
  publication_status: string;
  product_line_name: string | null;
  material_type: string | null;
  draft_data: unknown;
};

export type ApplySafetyCounts = {
  importCount: number;
  draftCount: number;
  matchingDraftCount: number;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parameterValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = objectValue(value);
  const raw = record.value ?? record.normalizedDisplayValue ?? record.normalizedValue;
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
}

function productName(draft: DraftRowLike, data: Record<string, unknown>): string {
  const productLine = objectValue(data.productLine);
  return draft.product_line_name
    || text(productLine.name)
    || text(productLine.productLine)
    || text(data.productLineName)
    || text(data.displayName);
}

function imageReference(record: Record<string, unknown>): string {
  return text(record.localImagePath)
    || text(record.visualAssetId)
    || text(record.imagePath)
    || text(record.sourcePath)
    || text(record.imageUrl);
}

function skuFingerprint(record: Record<string, unknown>): string {
  return JSON.stringify({
    sourceSkuId: record.sourceSkuId ?? null,
    skuId: record.skuId ?? null,
    rawSkuText: record.rawSkuText ?? null,
    officialColorCode: record.officialColorCode ?? null,
    image: imageReference(record),
  });
}

export function summarizeGeneratedPatchDraft(
  draft: DraftRowLike,
  counts: ApplySafetyCounts,
) {
  const data = objectValue(draft.draft_data);
  const parameters = objectValue(data.parameters);
  const fields = objectValue(parameters.fields);
  const candidates = arrayValue(parameters.candidates);
  const sourceEvidence = arrayValue(parameters.sourceEvidence);
  const colors = arrayValue(data.colors);
  const canonicalColors = arrayValue(data.canonicalColors);
  const images = arrayValue(data.images);
  const evidence = arrayValue(data.evidence);
  const serializedEvidence = JSON.stringify({ candidates, sourceEvidence, evidence });
  const productLine = objectValue(data.productLine);
  const relationSource = canonicalColors.length ? canonicalColors : colors;

  return {
    ...counts,
    sourceRunId: draft.source_run_id,
    draftId: draft.id,
    productName: productName(draft, data),
    productLineId: text(productLine.productLineId) || text(data.productLineId),
    materialType: parameterValue(fields.materialType) || draft.material_type || text(productLine.materialType),
    status: draft.status,
    publicationStatus: draft.publication_status,
    fieldCount: Object.keys(fields).length,
    candidateCount: candidates.length,
    parameterEvidenceCount: sourceEvidence.length,
    colorCount: colors.length,
    canonicalColorCount: canonicalColors.length,
    imageCount: images.length,
    colorImageRelationCount: relationSource.filter((color) => Boolean(imageReference(color))).length,
    manufacturerColorCodeCount: colors.filter((color) => Boolean(text(color.officialColorCode))).length,
    pcK7Count: (serializedEvidence.match(/PC K7/gi) || []).length,
    englishNamePendingCount: (JSON.stringify(data).match(/英文名待补充/g) || []).length,
    fieldKeys: Object.keys(fields).sort(),
  };
}

export function validateGeneratedPatchBaseline(
  draft: DraftRowLike,
  counts: ApplySafetyCounts,
): string[] {
  const summary = summarizeGeneratedPatchDraft(draft, counts);
  const issues: string[] = [];
  if (summary.importCount !== 1) issues.push(`filament_imports 必须为 1，当前为 ${summary.importCount}`);
  if (summary.draftCount !== 1) issues.push(`filament_drafts 必须为 1，当前为 ${summary.draftCount}`);
  if (summary.matchingDraftCount !== 1) issues.push(`sourceRunId 匹配数必须为 1，当前为 ${summary.matchingDraftCount}`);
  if (summary.sourceRunId !== GENERATED_PATCH_TARGET.sourceRunId) issues.push("sourceRunId 不匹配");
  if (summary.draftId !== GENERATED_PATCH_TARGET.draftId) issues.push("草稿 ID 不匹配");
  if (summary.productName !== GENERATED_PATCH_TARGET.productName) issues.push("产品名称不匹配");
  if (summary.status !== "draft" || summary.publicationStatus !== "draft") issues.push("草稿不是未发布状态");
  if (summary.fieldCount !== 13) issues.push(`写入前正式参数必须为 13，当前为 ${summary.fieldCount}`);
  if (summary.colorCount !== 22) issues.push(`颜色必须为 22，当前为 ${summary.colorCount}`);
  if (summary.imageCount !== 36) issues.push(`图片必须为 36，当前为 ${summary.imageCount}`);
  if (summary.colorImageRelationCount !== 22) issues.push(`颜色图片关系必须为 22，当前为 ${summary.colorImageRelationCount}`);
  return issues;
}

export function validateGeneratedPatchInput(value: unknown): string[] {
  const patch = objectValue(value) as CaptureDraftPatch;
  const parameters = objectValue(patch.parameters);
  const fields = objectValue(parameters.fields);
  const candidates = arrayValue(parameters.candidates);
  const sourceEvidence = arrayValue(parameters.sourceEvidence);
  const identity = objectValue(patch.identityScope);
  const issues: string[] = [];
  const requiredKeys = ["materialType", ...ORIGINAL_OFFICIAL_PARAMETER_KEYS, ...GENERATED_PRINT_PARAMETER_KEYS];

  if (identity.brandId !== "kexcelled"
    || identity.productLineId !== GENERATED_PATCH_TARGET.productLineId
    || identity.productKey !== GENERATED_PATCH_TARGET.productLineId) {
    issues.push("补丁产品身份不匹配");
  }
  if (Object.keys(fields).length !== 24) issues.push(`正式参数必须为 24，当前为 ${Object.keys(fields).length}`);
  if (candidates.length !== 24) issues.push(`候选参数必须为 24，当前为 ${candidates.length}`);
  if (sourceEvidence.length !== 24) issues.push(`参数证据必须为 24，当前为 ${sourceEvidence.length}`);
  for (const key of requiredKeys) {
    if (!parameterValue(fields[key])) issues.push(`缺少正式参数 ${key}`);
  }
  if (parameterValue(fields.materialType) !== "PETG") issues.push("材料类型必须为 PETG");
  if ("impactStrength" in fields) issues.push("不得使用通用 impactStrength 代替缺口/无缺口冲击强度");
  if (!parameterValue(fields.diameterTolerance).includes("±0.03")) issues.push("线径公差必须保留 ±0.03 mm");
  const serialized = JSON.stringify(patch);
  if ((serialized.match(/PC K7/gi) || []).length) issues.push("补丁仍包含 PC K7");
  if (serialized.includes("英文名待补充")) issues.push("补丁仍包含“英文名待补充”");
  if ("colors" in patch) issues.push("专用补丁不得提交颜色变更");
  return issues;
}

export function validateGeneratedPatchPreservation(beforeValue: unknown, afterValue: unknown): string[] {
  const before = objectValue(beforeValue);
  const after = objectValue(afterValue);
  const issues: string[] = [];
  const beforeColors = arrayValue(before.colors);
  const afterColors = arrayValue(after.colors);
  const beforeImages = arrayValue(before.images);
  const afterImages = arrayValue(after.images);
  const beforeSkus = arrayValue(before.skus);
  const afterSkus = arrayValue(after.skus);

  if (beforeColors.length !== afterColors.length) issues.push("颜色数量发生变化");
  if (beforeImages.length !== afterImages.length) issues.push("图片数量发生变化");
  if (beforeSkus.length !== afterSkus.length) issues.push("SKU 数量发生变化");
  if (JSON.stringify(beforeColors.map(skuFingerprint)) !== JSON.stringify(afterColors.map(skuFingerprint))) {
    issues.push("颜色名称、SKU、厂家编码或图片关系发生变化");
  }
  if (JSON.stringify(beforeImages.map(imageReference)) !== JSON.stringify(afterImages.map(imageReference))) {
    issues.push("图片路径发生变化");
  }
  if (JSON.stringify(beforeSkus) !== JSON.stringify(afterSkus)) issues.push("SKU 原始内容发生变化");
  return issues;
}

export function validateGeneratedPatchReadback(
  draft: DraftRowLike,
  counts: ApplySafetyCounts,
): string[] {
  const summary = summarizeGeneratedPatchDraft(draft, counts);
  const requiredKeys = ["materialType", ...ORIGINAL_OFFICIAL_PARAMETER_KEYS, ...GENERATED_PRINT_PARAMETER_KEYS];
  const issues: string[] = [];
  if (summary.importCount !== 1 || summary.draftCount !== 1 || summary.matchingDraftCount !== 1) issues.push("草稿或导入数量发生变化");
  if (summary.sourceRunId !== GENERATED_PATCH_TARGET.sourceRunId || summary.draftId !== GENERATED_PATCH_TARGET.draftId) issues.push("草稿身份发生变化");
  if (summary.productName !== GENERATED_PATCH_TARGET.productName || summary.productLineId !== GENERATED_PATCH_TARGET.productLineId) issues.push("产品身份发生变化");
  if (summary.status !== "draft" || summary.publicationStatus !== "draft") issues.push("发布状态发生变化");
  if (summary.fieldCount !== 24 || summary.candidateCount !== 24 || summary.parameterEvidenceCount !== 24) issues.push("参数、候选或参数证据数量不正确");
  if (summary.materialType !== "PETG") issues.push("材料类型不是 PETG");
  if (summary.colorCount !== 22 || summary.imageCount !== 36 || summary.colorImageRelationCount !== 22) issues.push("颜色、图片或关系数量不正确");
  if (summary.manufacturerColorCodeCount !== 22) issues.push("厂家颜色编码不完整");
  if (summary.pcK7Count !== 0) issues.push("写后数据仍包含 PC K7");
  if (summary.englishNamePendingCount !== 0) issues.push("写后数据仍包含“英文名待补充”");
  for (const key of requiredKeys) {
    if (!summary.fieldKeys.includes(key)) issues.push(`写后缺少参数 ${key}`);
  }
  return issues;
}
