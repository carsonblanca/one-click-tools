import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import {
  readAdminFilamentDraft,
  updateAdminFilamentDraft,
  type AdminFilamentDraft,
  type ParameterEvidenceCandidate,
  type ParameterEvidenceConfidence,
  type ParameterEvidenceField,
  type ParameterEvidenceSourceKind,
  type ParameterExtractionSummary,
} from "./admin-drafts";
import { kexcelledDraftPaths, type KexcelledImportSummary } from "@/lib/filaments/evidence/kexcelled-draft-store";

type EvidenceTextSource = {
  sourceKind: ParameterEvidenceSourceKind;
  evidencePath: string;
  text: string;
};

type CandidateMergeStats = {
  addedCandidateCount: number;
  mergedCandidateCount: number;
  preservedExistingCount: number;
  preservedFipCandidateCount: number;
};

const FIP_OUTPUT_ROOT = path.join(process.cwd(), "data/filaments/fip-output");
const EVIDENCE_IMPORT_ROOT = path.join(process.cwd(), "data/filaments/evidence-imports");

const FIELD_LABELS: Record<ParameterEvidenceField, string> = {
  nozzleTemperature: "喷嘴温度",
  bedTemperature: "热床温度",
  speed: "打印速度",
  drying: "干燥建议",
  nozzleRestriction: "喷嘴限制",
  density: "材料密度",
  diameterMm: "线材直径",
  netWeightG: "净重",
  materialWarning: "材料提醒",
  additionalSpecifications: "其他材料规格",
};

const BATCH_PARAMETER_FIELDS = new Set<ParameterEvidenceField>([
  "nozzleTemperature",
  "bedTemperature",
  "speed",
  "drying",
  "nozzleRestriction",
]);

export type BatchParameterEvidenceSelection = {
  field: ParameterEvidenceField;
  normalizedValue: string;
  unit: string;
};

export type BatchParameterEvidenceResult = {
  acceptedFields: ParameterEvidenceField[];
  skippedFields: Array<{ field: string; reason: string }>;
  failedFields: Array<{ field: string; errorCode: string; message: string }>;
  draft: AdminFilamentDraft;
};

export type ProductLineParameterSuggestion = {
  field: ParameterEvidenceField;
  value: string;
  unit: string;
  confidence: ParameterEvidenceConfidence;
  hasConflict: boolean;
  evidenceCount: number;
  representativeRawText: string;
  representativeEvidencePath: string;
  sourceLabel: string;
  speedSemantic: SpeedSemantic;
};

export type SpeedSemantic =
  | "recommended_speed"
  | "max_speed"
  | "first_layer_speed"
  | "travel_speed"
  | "unclassified";

export type ParameterEvidenceDetail = {
  candidateId: string;
  field: ParameterEvidenceField;
  value: string;
  unit: string;
  rawText: string;
  ocrText: string;
  sourceKind: ParameterEvidenceSourceKind;
  evidencePath: string;
  originalImagePath: string;
  originalImageDataUrl: string;
  imageSourceUrl: string;
  pageContext: string;
  pageContextExpanded: string;
  confidence: ParameterEvidenceConfidence;
  conflict: boolean;
  speedSemantic: SpeedSemantic;
};

export function classifySpeedSemantic(value: string): SpeedSemantic {
  if (/(推荐打印速度|建议打印速度|建议速度)/u.test(value)) return "recommended_speed";
  if (/(最大打印速度|最高打印速度|最大速度)/u.test(value)) return "max_speed";
  if (/(首层速度|第一层速度)/u.test(value)) return "first_layer_speed";
  if (/(移动速度|空驶速度)/u.test(value)) return "travel_speed";
  return "unclassified";
}

function stripHtml(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function compactLines(text: string) {
  return text.split(/\r?\n|。|；|;/).map((line) => line.trim().replace(/\s+/g, " ")).filter((line) => line.length >= 3);
}

function stableId(sourceRunId: string, field: string, rawText: string, evidencePath: string) {
  const base = `${sourceRunId}|${field}|${rawText}|${evidencePath}`;
  let hash = 0;
  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
  }
  return `param-${field}-${hash.toString(16)}`;
}

function addCandidate(
  candidates: ParameterEvidenceCandidate[],
  sourceRunId: string,
  field: ParameterEvidenceField,
  normalizedValue: string,
  unit: string,
  rawText: string,
  source: EvidenceTextSource,
  confidence: ParameterEvidenceConfidence,
  notes = "",
) {
  const trimmedRaw = rawText.trim();
  if (!trimmedRaw || !normalizedValue.trim()) return;
  const candidateId = stableId(sourceRunId, field, trimmedRaw, source.evidencePath);
  if (candidates.some((candidate) => candidate.candidateId === candidateId)) return;
  candidates.push({
    candidateId,
    field,
    normalizedValue: normalizedValue.trim(),
    unit,
    rawText: trimmedRaw,
    sourceKind: source.sourceKind,
    evidencePath: source.evidencePath,
    sourceRunId,
    confidence,
    conflict: false,
    reviewStatus: "pending_review",
    notes,
  });
}

function extractFromLine(candidates: ParameterEvidenceCandidate[], sourceRunId: string, line: string, source: EvidenceTextSource) {
  const temp = /(\d{2,3})\s*(?:[-~–—至]\s*(\d{2,3}))?\s*(?:℃|°C|度)/i;
  const speed = /(\d{1,3})\s*(?:[-~–—至]\s*(\d{1,3}))?\s*mm\s*\/\s*s/i;
  const density = /(\d+(?:\.\d+)?)\s*g\s*\/\s*cm(?:3|³)/i;
  const diameter = /(1\.75|2\.85)\s*mm/i;
  const weight = /(1000\s*g|1\s*kg)/i;

  const tempMatch = line.match(temp);
  if (tempMatch && /(喷嘴温度|打印温度|挤出温度)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "nozzleTemperature", tempMatch[2] ? `${tempMatch[1]}-${tempMatch[2]}` : tempMatch[1], "°C", line, source, "exact_label_value");
  }
  if (tempMatch && /(热床温度|底板温度|平台温度)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "bedTemperature", tempMatch[2] ? `${tempMatch[1]}-${tempMatch[2]}` : tempMatch[1], "°C", line, source, "exact_label_value");
  }

  const speedMatch = line.match(speed);
  if (speedMatch && /(打印速度|建议速度|速度)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "speed", speedMatch[2] ? `${speedMatch[1]}-${speedMatch[2]}` : speedMatch[1], "mm/s", line, source, "exact_label_value");
  }

  if (/(干燥|烘干)/u.test(line) && (temp.test(line) || /\d+\s*(?:h|小时)/i.test(line))) {
    addCandidate(candidates, sourceRunId, "drying", line, "", line, source, "exact_text_context");
  }
  if (/(硬化喷嘴|硬质喷嘴|不锈钢喷嘴|喷嘴限制|建议喷嘴)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "nozzleRestriction", line, "", line, source, "exact_text_context");
  }

  const densityMatch = line.match(density);
  if (densityMatch && /密度/u.test(line)) {
    addCandidate(candidates, sourceRunId, "density", densityMatch[1], "g/cm³", line, source, "exact_label_value");
  }
  const diameterMatch = line.match(diameter);
  if (diameterMatch && /(线径|直径|规格|耗材)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "diameterMm", diameterMatch[1], "mm", line, source, "exact_text_context");
  }
  const weightMatch = line.match(weight);
  if (weightMatch && /(净重|重量|规格|KG|kg|g)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "netWeightG", /kg/i.test(weightMatch[1]) ? "1000" : "1000", "g", line, source, "exact_text_context");
  }
  if (/(易吸湿|建议干燥|需干燥|需烘干|磨损|脆|翘边|气味|通风)/u.test(line)) {
    addCandidate(candidates, sourceRunId, "materialWarning", line, "", line, source, "ambiguous", "材料风险提示候选，需人工确认。" );
  }
}

function markConflicts(candidates: ParameterEvidenceCandidate[]) {
  const byField = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const values = byField.get(candidate.field) || new Set<string>();
    values.add(`${candidate.normalizedValue}|${candidate.unit}`);
    byField.set(candidate.field, values);
  }
  return candidates.map((candidate) => ({
    ...candidate,
    conflict: (byField.get(candidate.field)?.size || 0) > 1,
  }));
}

function summarize(candidates: ParameterEvidenceCandidate[]): ParameterExtractionSummary {
  return {
    candidateCount: candidates.length,
    exactCandidateCount: candidates.filter((candidate) => candidate.confidence !== "ambiguous").length,
    conflictCount: candidates.filter((candidate) => candidate.conflict).length,
    unresolvedCount: candidates.filter((candidate) => candidate.confidence === "ambiguous").length,
    lastExtractedAt: new Date().toISOString(),
  };
}

function candidateMergeKey(candidate: ParameterEvidenceCandidate) {
  return [
    candidate.field,
    candidate.normalizedValue,
    candidate.unit,
    candidate.evidencePath,
  ].join("\u001f");
}

function mergeParameterCandidates(
  existing: ParameterEvidenceCandidate[],
  incoming: ParameterEvidenceCandidate[],
): { candidates: ParameterEvidenceCandidate[]; stats: CandidateMergeStats } {
  const merged = existing.map((candidate) => ({ ...candidate }));
  const index = new Map(merged.map((candidate) => [candidateMergeKey(candidate), candidate]));
  let addedCandidateCount = 0;
  let mergedCandidateCount = 0;
  for (const candidate of incoming) {
    const key = candidateMergeKey(candidate);
    const current = index.get(key);
    if (!current) {
      const next = {
        ...candidate,
        reviewStatus: "pending_review" as const,
        evidenceOccurrences: Math.max(1, candidate.evidenceOccurrences || 1),
        evidenceExamples: candidate.evidenceExamples?.slice(0, 5) || [candidate.evidencePath],
      };
      merged.push(next);
      index.set(key, next);
      addedCandidateCount += 1;
      continue;
    }
    const previousStatus = current.reviewStatus;
    current.evidenceOccurrences = Math.max(1, current.evidenceOccurrences || 1)
      + Math.max(1, candidate.evidenceOccurrences || 1);
    current.evidenceExamples = Array.from(new Set([
      ...(current.evidenceExamples || [current.evidencePath]),
      ...(candidate.evidenceExamples || [candidate.evidencePath]),
    ])).slice(0, 5);
    current.reviewStatus = previousStatus;
    mergedCandidateCount += 1;
  }
  return {
    candidates: markConflicts(merged),
    stats: {
      addedCandidateCount,
      mergedCandidateCount,
      preservedExistingCount: existing.length,
      preservedFipCandidateCount: existing.filter((candidate) =>
        candidate.sourceKind === "ocr_text"
        && BATCH_PARAMETER_FIELDS.has(candidate.field)
      ).length,
    },
  };
}

function textContext(source: string, candidate: ParameterEvidenceCandidate, radius = 150) {
  const needles = [candidate.rawText, candidate.normalizedValue, FIELD_LABELS[candidate.field]]
    .filter(Boolean);
  const normalized = source.replace(/\s+/g, " ");
  const index = needles.reduce((found, needle) => {
    if (found >= 0) return found;
    return normalized.indexOf(needle);
  }, -1);
  if (index < 0) return "";
  return normalized.slice(Math.max(0, index - radius), Math.min(normalized.length, index + radius));
}

function imageMimeType(imagePath: string) {
  const extension = path.extname(imagePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

async function detailFromFipCandidate(
  candidate: ParameterEvidenceCandidate,
): Promise<ParameterEvidenceDetail> {
  const [rawFipPath, innerEvidencePath = ""] = candidate.evidencePath.split("::", 2);
  const fipPath = path.resolve(rawFipPath);
  const allowedFipRoots = [FIP_OUTPUT_ROOT, EVIDENCE_IMPORT_ROOT]
    .map((root) => `${path.resolve(root)}${path.sep}`);
  if (!allowedFipRoots.some((root) => fipPath.startsWith(root))) {
    throw new Error("invalid_fip_evidence_path");
  }
  const files = unzipSync(new Uint8Array(await readFile(fipPath)));
  const ocrText = files[innerEvidencePath] ? strFromU8(files[innerEvidencePath]) : "";
  const ocrIndex = files["ocr/index.json"]
    ? JSON.parse(strFromU8(files["ocr/index.json"])) as Array<{
      imagePath?: string;
      imageSourceUrl?: string;
      ocrTextPath?: string;
    }>
    : [];
  const imageRecord = ocrIndex.find((item) => item.ocrTextPath === innerEvidencePath);
  const originalImagePath = imageRecord?.imagePath || "";
  let originalImageDataUrl = "";
  let imageSourceUrl = imageRecord?.imageSourceUrl || "";
  let pageContext = "";
  let pageContextExpanded = "";

  if (files["package-report.json"]) {
    const report = JSON.parse(strFromU8(files["package-report.json"])) as { inputSource?: string };
    const sourceZipPath = report.inputSource ? path.resolve(report.inputSource) : "";
    if (
      sourceZipPath
      && sourceZipPath.startsWith(`${path.resolve(EVIDENCE_IMPORT_ROOT)}${path.sep}`)
    ) {
      const sourceFiles = unzipSync(new Uint8Array(await readFile(sourceZipPath)));
      if (originalImagePath && sourceFiles[originalImagePath]) {
        originalImageDataUrl = `data:${imageMimeType(originalImagePath)};base64,${Buffer.from(sourceFiles[originalImagePath]).toString("base64")}`;
      }
      if (!imageSourceUrl && sourceFiles["images.json"]) {
        const sourceImages = JSON.parse(strFromU8(sourceFiles["images.json"])) as Array<{
          localPath?: string;
          originalUrl?: string;
          normalizedUrl?: string;
        }>;
        const sourceImage = sourceImages.find((item) => item.localPath === originalImagePath);
        imageSourceUrl = sourceImage?.originalUrl || sourceImage?.normalizedUrl || "";
      }
      for (const pageName of ["page.txt", "page.html"]) {
        if (!sourceFiles[pageName]) continue;
        const context = textContext(strFromU8(sourceFiles[pageName]), candidate);
        if (context) {
          pageContext = context;
          pageContextExpanded = textContext(strFromU8(sourceFiles[pageName]), candidate, 600);
          break;
        }
      }
    }
  }

  return {
    candidateId: candidate.candidateId,
    field: candidate.field,
    value: candidate.normalizedValue,
    unit: candidate.unit,
    rawText: candidate.rawText,
    ocrText,
    sourceKind: candidate.sourceKind,
    evidencePath: candidate.evidencePath,
    originalImagePath,
    originalImageDataUrl,
    imageSourceUrl,
    pageContext,
    pageContextExpanded,
    confidence: candidate.confidence,
    conflict: candidate.conflict,
    speedSemantic: candidate.field === "speed"
      ? classifySpeedSemantic(`${candidate.rawText}\n${textContext(ocrText, candidate)}`)
      : "unclassified",
  };
}

async function detailFromTextCandidate(
  candidate: ParameterEvidenceCandidate,
): Promise<ParameterEvidenceDetail> {
  const [rawSourcePath, innerPath = ""] = candidate.evidencePath.split("::", 2);
  const sourcePath = path.resolve(rawSourcePath);
  let sourceText = "";
  if (sourcePath.startsWith(`${path.resolve(EVIDENCE_IMPORT_ROOT)}${path.sep}`)) {
    try {
      if (innerPath) {
        const files = unzipSync(new Uint8Array(await readFile(sourcePath)));
        if (files[innerPath]) sourceText = strFromU8(files[innerPath]);
      } else {
        sourceText = await readFile(sourcePath, "utf8");
      }
    } catch {
      sourceText = "";
    }
  }
  return {
    candidateId: candidate.candidateId,
    field: candidate.field,
    value: candidate.normalizedValue,
    unit: candidate.unit,
    rawText: candidate.rawText,
    ocrText: candidate.sourceKind === "ocr_text" ? sourceText : "",
    sourceKind: candidate.sourceKind,
    evidencePath: candidate.evidencePath,
    originalImagePath: "",
    originalImageDataUrl: "",
    imageSourceUrl: "",
    pageContext: textContext(sourceText, candidate),
    pageContextExpanded: textContext(sourceText, candidate, 600),
    confidence: candidate.confidence,
    conflict: candidate.conflict,
    speedSemantic: candidate.field === "speed"
      ? classifySpeedSemantic(`${candidate.rawText}\n${sourceText}`)
      : "unclassified",
  };
}

export async function readParameterEvidenceDetails(
  sourceRunId: string,
  field: ParameterEvidenceField,
) {
  const draft = await readAdminFilamentDraft(sourceRunId);
  if (!draft) throw new Error("未找到 admin draft，不读取参数证据。");
  const fipCandidates = await readFipCandidatesForDraft(draft);
  const merged = mergeParameterCandidates(draft.parameterEvidenceCandidates, fipCandidates);
  const candidates = merged.candidates.filter((candidate) => candidate.field === field);
  const details = [];
  for (const candidate of candidates) {
    try {
      details.push(
        candidate.evidencePath.includes(".filament-import.zip::")
          ? await detailFromFipCandidate(candidate)
          : await detailFromTextCandidate(candidate),
      );
    } catch {
      details.push({
        candidateId: candidate.candidateId,
        field: candidate.field,
        value: candidate.normalizedValue,
        unit: candidate.unit,
        rawText: candidate.rawText,
        ocrText: "",
        sourceKind: candidate.sourceKind,
        evidencePath: candidate.evidencePath,
        originalImagePath: "",
        originalImageDataUrl: "",
        imageSourceUrl: "",
        pageContext: "",
        pageContextExpanded: "",
        confidence: candidate.confidence,
        conflict: candidate.conflict,
        speedSemantic: candidate.field === "speed"
          ? classifySpeedSemantic(candidate.rawText)
          : "unclassified",
      } satisfies ParameterEvidenceDetail);
    }
  }
  return details;
}

async function readFipCandidatesForDraft(
  draft: AdminFilamentDraft,
): Promise<ParameterEvidenceCandidate[]> {
  let names: string[];
  try {
    names = (await readdir(FIP_OUTPUT_ROOT))
      .filter((name) => name.endsWith(".filament-import.zip"))
      .sort();
  } catch {
    return [];
  }
  const exact: Array<{ path: string; files: Record<string, Uint8Array> }> = [];
  const sameSource: Array<{ path: string; files: Record<string, Uint8Array> }> = [];
  for (const name of names) {
    try {
      const fipPath = path.join(FIP_OUTPUT_ROOT, name);
      const files = unzipSync(new Uint8Array(await readFile(fipPath)));
      const manifest = JSON.parse(strFromU8(files["manifest.json"])) as {
        sourceRunId?: string;
        sourceZipName?: string;
      };
      const item = { path: fipPath, files };
      if (manifest.sourceRunId === draft.sourceRunId) exact.push(item);
      else if (manifest.sourceZipName && manifest.sourceZipName === draft.sourceZipName) sameSource.push(item);
    } catch {
      // A malformed unrelated FIP must not block supplementary extraction.
    }
  }
  const selected = exact.at(-1) || sameSource.at(-1);
  if (!selected?.files["parameter-candidates.json"]) return [];
  const parsed = JSON.parse(strFromU8(selected.files["parameter-candidates.json"])) as Array<Partial<ParameterEvidenceCandidate>>;
  return parsed.flatMap((candidate) => {
    const field = candidate.field;
    if (!field || !FIELD_LABELS[field]) return [];
    const evidencePath = `${selected.path}::${candidate.evidencePath || "parameter-candidates.json"}`;
    const rawText = String(candidate.rawText || "").trim();
    const normalizedValue = String(candidate.normalizedValue || "").trim();
    if (!rawText || !normalizedValue) return [];
    return [{
      ...candidate,
      candidateId: stableId(draft.sourceRunId, field, rawText, evidencePath),
      field,
      normalizedValue,
      unit: String(candidate.unit || ""),
      rawText,
      sourceKind: candidate.sourceKind || "ocr_text",
      evidencePath,
      sourceRunId: draft.sourceRunId,
      confidence: candidate.confidence || "ambiguous",
      conflict: Boolean(candidate.conflict),
      reviewStatus: "pending_review",
      notes: String(candidate.notes || ""),
    } as ParameterEvidenceCandidate];
  });
}

async function maybeReadText(filePath: string, sourceKind: ParameterEvidenceSourceKind): Promise<EvidenceTextSource | null> {
  try {
    const text = await readFile(filePath, "utf8");
    return { sourceKind, evidencePath: filePath, text };
  } catch {
    return null;
  }
}

async function readZipTextSources(zipPath: string): Promise<EvidenceTextSource[]> {
  try {
    const bytes = new Uint8Array(await readFile(zipPath));
    const files = unzipSync(bytes);
    const sources: EvidenceTextSource[] = [];
    for (const [name, value] of Object.entries(files)) {
      if (name === "page.txt") sources.push({ sourceKind: "page_txt", evidencePath: `${zipPath}::${name}`, text: strFromU8(value) });
      else if (name === "page.html") sources.push({ sourceKind: "page_html", evidencePath: `${zipPath}::${name}`, text: stripHtml(strFromU8(value)) });
      else if (name === "images.json") sources.push({ sourceKind: "image_metadata", evidencePath: `${zipPath}::${name}`, text: strFromU8(value) });
      else if (/ocr|raw/i.test(name) && /\.(txt|json)$/i.test(name)) sources.push({ sourceKind: "ocr_text", evidencePath: `${zipPath}::${name}`, text: strFromU8(value) });
    }
    return sources;
  } catch {
    return [];
  }
}

async function collectEvidenceSources(sourceRunId: string): Promise<EvidenceTextSource[]> {
  const paths = kexcelledDraftPaths(sourceRunId);
  try {
    await access(paths.root);
  } catch {
    throw new Error(`原始证据缺失：${paths.root}`);
  }
  const sources: EvidenceTextSource[] = [];
  const localSources = await Promise.all([
    maybeReadText(path.join(paths.root, "page.txt"), "page_txt"),
    maybeReadText(path.join(paths.root, "page.html"), "page_html"),
    maybeReadText(paths.draftPath, "existing_draft"),
    maybeReadText(paths.summaryPath, "existing_draft"),
  ]);
  for (const source of localSources) if (source) sources.push(source.sourceKind === "page_html" ? { ...source, text: stripHtml(source.text) } : source);

  try {
    const summary = JSON.parse(await readFile(paths.summaryPath, "utf8")) as KexcelledImportSummary;
    if (summary.sourceZipPath) {
      sources.push(...await readZipTextSources(summary.sourceZipPath));
    }
  } catch {
    // Missing summary keeps extraction empty instead of guessing.
  }
  return sources;
}

export async function extractParameterEvidenceForDraft(sourceRunId: string) {
  const existing = await readAdminFilamentDraft(sourceRunId);
  if (!existing) throw new Error("未找到 admin draft，不执行参数提取。");
  const sources = await collectEvidenceSources(sourceRunId);
  const candidates: ParameterEvidenceCandidate[] = [];
  for (const source of sources) {
    for (const line of compactLines(source.text)) {
      extractFromLine(candidates, sourceRunId, line, source);
    }
  }
  const fipCandidates = await readFipCandidatesForDraft(existing);
  const freshCandidates = [...candidates, ...fipCandidates];
  const merged = mergeParameterCandidates(
    existing.parameterEvidenceCandidates || [],
    freshCandidates,
  );
  const summary = summarize(merged.candidates);
  const updated = await updateAdminFilamentDraft(sourceRunId, (draft) => ({
    ...draft,
    parameterEvidenceCandidates: merged.candidates,
    parameterExtractionSummary: summary,
    updatedAt: new Date().toISOString(),
    updatedBy: "parameter-evidence-reader",
  }));
  return { draft: updated, candidates: merged.candidates, summary, mergeStats: merged.stats };
}

export async function reviewParameterEvidenceCandidate(sourceRunId: string, candidateId: string, action: "accept" | "reject", actorId: string) {
  const updated = await updateAdminFilamentDraft(sourceRunId, (draft) => {
    const candidate = draft.parameterEvidenceCandidates.find((item) => item.candidateId === candidateId);
    if (!candidate) return draft;
    if (action === "accept" && !BATCH_PARAMETER_FIELDS.has(candidate.field)) {
      throw new Error("field_not_supported_for_print_parameters");
    }
    if (action === "accept" && draft.parameters.parameterLocked) {
      throw new Error("parameter_locked");
    }
    if (action === "accept" && String(draft.parameters.fields[candidate.field] || "").trim()) {
      throw new Error("field_already_has_value");
    }
    if (
      action === "accept"
      && (
        candidate.conflict
        || candidate.confidence === "ambiguous"
        || candidate.reviewStatus !== "pending_review"
        || !candidate.normalizedValue.trim()
        || !candidate.evidencePath.trim()
      )
    ) {
      throw new Error("candidate_not_eligible");
    }
    const candidates = draft.parameterEvidenceCandidates.map((item) => item.candidateId === candidateId ? {
      ...item,
      reviewStatus: action === "accept" ? "accepted" as const : "rejected" as const,
    } : item);
    if (action === "reject" || candidate.conflict) {
      return { ...draft, parameterEvidenceCandidates: candidates };
    }
    const note = `${FIELD_LABELS[candidate.field]}：${candidate.rawText}`;
    return {
      ...draft,
      parameterEvidenceCandidates: candidates,
      parameters: {
        ...draft.parameters,
        status: "official_partial",
        sourceType: "official_partial",
        fields: {
          ...draft.parameters.fields,
          [candidate.field]: candidate.unit ? `${candidate.normalizedValue} ${candidate.unit}` : candidate.normalizedValue,
        },
        sourceEvidence: [{
          sourceLabel: "Evidence Pack 参数证据",
          sourceUrl: "",
          evidencePath: candidate.evidencePath,
          note,
        }],
        reviewNote: note,
        reviewedAt: new Date().toISOString(),
        reviewedBy: actorId,
      },
      parameterStatus: "official_partial",
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    };
  });
  if (!updated) throw new Error("未找到 admin draft，不执行参数提取。");
  return updated;
}

function sourceLabelForCandidate(candidate: ParameterEvidenceCandidate) {
  return candidate.sourceKind === "ocr_text"
    ? "KEXCELLED Evidence Pack 本地 OCR"
    : "KEXCELLED Evidence Pack 页面文本";
}

export function buildProductLineParameterSuggestions(
  candidates: ParameterEvidenceCandidate[],
): ProductLineParameterSuggestion[] {
  const suggestions: ProductLineParameterSuggestion[] = [];
  for (const field of BATCH_PARAMETER_FIELDS) {
    const eligible = candidates.filter((candidate) =>
      candidate.field === field
      && candidate.reviewStatus !== "rejected"
      && candidate.confidence !== "ambiguous"
      && candidate.normalizedValue.trim()
      && candidate.evidencePath.trim()
    ).sort((left, right) => {
      const priority = (candidate: ParameterEvidenceCandidate) => {
        if (candidate.sourceKind === "ocr_text" && candidate.evidencePath.includes(".filament-import.zip::")) return 3;
        if (candidate.sourceKind === "ocr_text") return 2;
        if (candidate.sourceKind === "page_txt" || candidate.sourceKind === "page_html") return 1;
        return 0;
      };
      return priority(right) - priority(left);
    });
    if (!eligible.length) continue;
    const values = new Map<string, ParameterEvidenceCandidate[]>();
    for (const candidate of eligible) {
      const semantic = field === "speed" ? classifySpeedSemantic(candidate.rawText) : "unclassified";
      const key = `${semantic}\u001f${candidate.normalizedValue}\u001f${candidate.unit}`;
      const group = values.get(key) || [];
      group.push(candidate);
      values.set(key, group);
    }
    const bySemantic = new Map<SpeedSemantic, ParameterEvidenceCandidate[][]>();
    for (const [key, group] of values) {
      const semantic = key.split("\u001f")[0] as SpeedSemantic;
      bySemantic.set(semantic, [...(bySemantic.get(semantic) || []), group]);
    }
    for (const [speedSemantic, semanticGroups] of bySemantic) {
      const semanticCandidates = semanticGroups.flat();
      const representative = semanticCandidates[0];
      const hasConflict = semanticGroups.length > 1;
      suggestions.push({
        field,
        value: hasConflict ? "" : representative.normalizedValue,
        unit: hasConflict ? "" : representative.unit,
        confidence: representative.confidence,
        hasConflict,
        evidenceCount: semanticCandidates.reduce(
          (sum, candidate) => sum + Math.max(1, candidate.evidenceOccurrences || 1),
          0,
        ),
        representativeRawText: representative.rawText,
        representativeEvidencePath: representative.evidencePath,
        sourceLabel: semanticCandidates.some((candidate) => candidate.sourceKind === "ocr_text")
          ? "KEXCELLED Evidence Pack 本地 OCR"
          : "KEXCELLED Evidence Pack 页面文本",
        speedSemantic,
      });
    }
  }
  return suggestions;
}

export async function acceptProductLineParameterSuggestion(
  sourceRunId: string,
  field: ParameterEvidenceField,
  speedSemantic: SpeedSemantic,
  actorId: string,
) {
  if (!BATCH_PARAMETER_FIELDS.has(field)) {
    throw new Error("field_not_supported_for_print_parameters");
  }
  const updated = await updateAdminFilamentDraft(sourceRunId, (draft) => {
    if (draft.parameters.parameterLocked) throw new Error("parameter_locked");
    if (String(draft.parameters.fields[field] || "").trim()) {
      throw new Error("field_already_has_value");
    }
    const suggestion = buildProductLineParameterSuggestions(
      draft.parameterEvidenceCandidates,
    ).find((item) => item.field === field && item.speedSemantic === speedSemantic);
    if (!suggestion) throw new Error("parameter_suggestion_not_found");
    if (suggestion.hasConflict || !suggestion.value || !suggestion.representativeEvidencePath) {
      throw new Error("parameter_suggestion_conflict");
    }
    if (field === "speed" && !["recommended_speed", "unclassified"].includes(speedSemantic)) {
      throw new Error("speed_semantic_not_supported_for_formal_parameter");
    }
    const matchingIds = new Set(
      draft.parameterEvidenceCandidates
        .filter((candidate) =>
          candidate.field === field
          && candidate.normalizedValue === suggestion.value
          && candidate.unit === suggestion.unit
          && (field !== "speed" || classifySpeedSemantic(candidate.rawText) === speedSemantic)
          && candidate.reviewStatus === "pending_review"
        )
        .map((candidate) => candidate.candidateId),
    );
    const timestamp = new Date().toISOString();
    return {
      ...draft,
      parameterEvidenceCandidates: draft.parameterEvidenceCandidates.map((candidate) =>
        matchingIds.has(candidate.candidateId)
          ? { ...candidate, reviewStatus: "accepted" as const }
          : candidate
      ),
      parameters: {
        ...draft.parameters,
        fields: {
          ...draft.parameters.fields,
          [field]: suggestion.unit
            ? `${suggestion.value} ${suggestion.unit}`
            : suggestion.value,
        },
        sourceEvidence: [{
          sourceLabel: suggestion.sourceLabel,
          sourceUrl: "",
          evidencePath: suggestion.representativeEvidencePath,
          note: `${FIELD_LABELS[field]}：${suggestion.representativeRawText}`,
        }, ...draft.parameters.sourceEvidence],
        reviewedAt: timestamp,
        reviewedBy: actorId,
      },
      updatedAt: timestamp,
      updatedBy: actorId,
    };
  });
  if (!updated) throw new Error("未找到 admin draft，不执行参数建议采纳。");
  return updated;
}

export async function batchAcceptParameterEvidenceCandidates(
  sourceRunId: string,
  selections: BatchParameterEvidenceSelection[],
  actorId: string,
): Promise<BatchParameterEvidenceResult> {
  const acceptedFields: ParameterEvidenceField[] = [];
  const skippedFields: Array<{ field: string; reason: string }> = [];
  const failedFields: Array<{ field: string; errorCode: string; message: string }> = [];

  const updated = await updateAdminFilamentDraft(sourceRunId, (draft) => {
    if (draft.parameters.parameterLocked) {
      for (const selection of selections) {
        skippedFields.push({ field: selection.field, reason: "parameter_locked" });
      }
      return draft;
    }

    const nextFields = { ...draft.parameters.fields };
    const acceptedEvidence: AdminFilamentDraft["parameters"]["sourceEvidence"] = [];
    const acceptedCandidateIds = new Set<string>();
    const seenFields = new Set<ParameterEvidenceField>();

    for (const selection of selections) {
      try {
        if (!BATCH_PARAMETER_FIELDS.has(selection.field)) {
          skippedFields.push({ field: selection.field, reason: "field_not_supported_for_print_parameters" });
          continue;
        }
        if (seenFields.has(selection.field)) {
          skippedFields.push({ field: selection.field, reason: "duplicate_field_selection" });
          continue;
        }
        seenFields.add(selection.field);
        if (String(nextFields[selection.field] || "").trim()) {
          skippedFields.push({ field: selection.field, reason: "field_already_has_value" });
          continue;
        }

        const group = draft.parameterEvidenceCandidates.filter((candidate) =>
          candidate.field === selection.field
          && candidate.normalizedValue === selection.normalizedValue
          && candidate.unit === selection.unit
          && candidate.reviewStatus === "pending_review"
        );
        if (!group.length) {
          skippedFields.push({ field: selection.field, reason: "candidate_group_not_found" });
          continue;
        }
        if (
          group.some((candidate) =>
            candidate.conflict
            || candidate.confidence === "ambiguous"
            || !candidate.evidencePath.trim()
            || !candidate.normalizedValue.trim()
          )
        ) {
          skippedFields.push({ field: selection.field, reason: "candidate_group_not_eligible" });
          continue;
        }

        const representative = group[0];
        nextFields[selection.field] = representative.unit
          ? `${representative.normalizedValue} ${representative.unit}`
          : representative.normalizedValue;
        acceptedEvidence.push({
          sourceLabel: sourceLabelForCandidate(representative),
          sourceUrl: "",
          evidencePath: representative.evidencePath,
          note: `${FIELD_LABELS[selection.field]}：${representative.rawText}`,
        });
        for (const candidate of group) acceptedCandidateIds.add(candidate.candidateId);
        acceptedFields.push(selection.field);
      } catch (error) {
        failedFields.push({
          field: selection.field,
          errorCode: "field_accept_failed",
          message: error instanceof Error ? error.message : "字段采纳失败。",
        });
      }
    }

    if (!acceptedFields.length) return draft;
    const timestamp = new Date().toISOString();
    return {
      ...draft,
      parameterEvidenceCandidates: draft.parameterEvidenceCandidates.map((candidate) =>
        acceptedCandidateIds.has(candidate.candidateId)
          ? { ...candidate, reviewStatus: "accepted" as const }
          : candidate
      ),
      parameters: {
        ...draft.parameters,
        status: "official_partial",
        sourceType: "official_partial",
        fields: nextFields,
        sourceEvidence: [...acceptedEvidence, ...draft.parameters.sourceEvidence],
        reviewedAt: timestamp,
        reviewedBy: actorId,
      },
      parameterStatus: "official_partial",
      updatedAt: timestamp,
      updatedBy: actorId,
    };
  });
  if (!updated) throw new Error("未找到 admin draft，不执行参数候选采纳。");
  return { acceptedFields, skippedFields, failedFields, draft: updated };
}
