import { strFromU8, unzipSync } from "fflate";

const REQUIRED_FILES = [
  "manifest.json",
  "products.json",
  "evidence.json",
  "package-report.json",
] as const;

type JsonObject = Record<string, unknown>;

export type ParsedKexcelledFip = {
  files: Record<string, Uint8Array>;
  manifest: JsonObject;
  products: JsonObject[];
  evidence: unknown;
  report: JsonObject;
  colors: JsonObject[];
  parameters: JsonObject[];
  images: JsonObject[];
  sourceRunId: string;
};

export class FipValidationError extends Error {
  readonly details: string;

  constructor(message: string, details: string) {
    super(message);
    this.details = details;
  }
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function arrayOfObjects(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const single = text(value);
  return single ? [single] : [];
}

function parameterBinding(candidate: JsonObject): string {
  return text(candidate.canonicalKey) || text(candidate.field) || text(candidate.key);
}

function mergeBindings(record: JsonObject, binding: string): JsonObject {
  const fieldBindings = [...new Set([
    ...stringArray(record.fieldBindings),
    ...(binding ? [binding] : []),
  ])];
  return fieldBindings.length ? { ...record, fieldBindings } : { ...record };
}

function evidenceKey(record: JsonObject): string {
  const evidenceId = text(record.evidenceId);
  if (evidenceId) return `id:${evidenceId}`;
  return JSON.stringify([
    text(record.sourceFile) || text(record.sourceRelativePath),
    text(record.sourceUrl) || text(record.url),
    text(record.sourceText) || text(record.ocrText),
  ]);
}

/**
 * Select only evidence actually referenced by parameter candidates. Evidence
 * records are kept intact; candidate-local source text is used only when the
 * FIP has no matching top-level evidence record.
 */
export function parameterSourceEvidence(parameters: unknown, evidence: unknown): JsonObject[] {
  const candidates = arrayOfObjects(parameters);
  const evidenceRecords = arrayOfObjects(evidence);
  const selected = new Map<string, JsonObject>();

  const add = (record: JsonObject, binding: string) => {
    const key = evidenceKey(record);
    const existing = selected.get(key);
    selected.set(key, mergeBindings(existing ? { ...record, ...existing } : record, binding));
  };

  for (const candidate of candidates) {
    const binding = parameterBinding(candidate);
    const sourceFile = text(candidate.sourceFile) || text(candidate.sourceRelativePath);
    const sourceText = text(candidate.sourceText) || text(candidate.ocrText);
    const explicitIds = new Set([
      ...stringArray(candidate.evidenceId),
      ...stringArray(candidate.evidenceIds),
      ...stringArray(candidate.evidenceRef),
      ...stringArray(candidate.evidenceRefs),
    ]);
    const matches = evidenceRecords.filter((record) => {
      const recordId = text(record.evidenceId);
      if (recordId && explicitIds.has(recordId)) return true;
      const recordSource = text(record.sourceFile) || text(record.sourceRelativePath);
      const bindings = stringArray(record.fieldBindings);
      return Boolean(sourceFile && recordSource === sourceFile && binding && bindings.includes(binding));
    });

    if (matches.length) {
      for (const record of matches) add(record, binding);
      continue;
    }

    if (!sourceFile || !sourceText) continue;
    const localEvidence: JsonObject = {
      ...(text(candidate.evidenceId) ? { evidenceId: text(candidate.evidenceId) } : {}),
      sourceFile,
      sourceText,
      ...(text(candidate.sourceUrl) || text(candidate.url)
        ? { sourceUrl: text(candidate.sourceUrl) || text(candidate.url) }
        : {}),
      ...(candidate.confidence !== undefined ? { confidence: candidate.confidence } : {}),
      ...(candidate.testCondition !== undefined ? { testCondition: candidate.testCondition } : {}),
      ...(text(candidate.productLineId) ? { productLineId: text(candidate.productLineId) } : {}),
    };
    add(localEvidence, binding);
  }

  return [...selected.values()];
}

function readJson(files: Record<string, Uint8Array>, name: string): unknown {
  try {
    return JSON.parse(strFromU8(files[name]));
  } catch {
    throw new FipValidationError("不是合法 FIP", `${name} 不是有效 JSON`);
  }
}

function unsafePath(name: string) {
  return name.startsWith("/")
    || name.includes("../")
    || name.includes("..\\")
    || name.includes("\\")
    || name.includes("\0");
}

export function parseKexcelledFip(bytes: Uint8Array): ParsedKexcelledFip {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new FipValidationError("不是合法 FIP", "ZIP 无法解压");
  }

  const missing = REQUIRED_FILES.filter((name) => !files[name]);
  if (missing.length) {
    throw new FipValidationError("不是合法 FIP", `缺少 ${missing.join(" / ")}`);
  }

  const invalidPath = Object.keys(files).find(unsafePath);
  if (invalidPath) {
    throw new FipValidationError("不是合法 FIP", `包含不安全路径：${invalidPath}`);
  }

  const manifest = objectValue(readJson(files, "manifest.json"));
  const products = arrayOfObjects(readJson(files, "products.json"));
  const evidence = readJson(files, "evidence.json");
  const report = objectValue(readJson(files, "package-report.json"));
  const brand = String(manifest.brand ?? "").trim().toUpperCase();
  if (brand !== "KEXCELLED") {
    throw new FipValidationError("不是合法 KEXCELLED FIP", `manifest.brand 为 ${brand || "空"}`);
  }
  if (!products.length) {
    throw new FipValidationError("不是合法 FIP", "products.json 不包含产品记录");
  }

  const sourceRunId = String(manifest.sourceRunId ?? "").trim();
  if (!sourceRunId) {
    throw new FipValidationError("不是合法 FIP", "manifest.sourceRunId 缺失");
  }

  return {
    files,
    manifest,
    products,
    evidence,
    report,
    colors: files["colors.json"] ? arrayOfObjects(readJson(files, "colors.json")) : [],
    parameters: files["parameter-candidates.json"]
      ? arrayOfObjects(readJson(files, "parameter-candidates.json"))
      : [],
    images: files["images.json"] ? arrayOfObjects(readJson(files, "images.json")) : [],
    sourceRunId,
  };
}

export function fipImageEntries(parsed: ParsedKexcelledFip) {
  const entries = new Map<string, { bytes: Uint8Array; contentType: string }>();
  for (const image of parsed.images) {
    const packagePath = String(image.packagePath ?? "").trim();
    const bytes = parsed.files[packagePath];
    if (!packagePath || !bytes || unsafePath(packagePath)) continue;
    const contentType = packagePath.toLowerCase().endsWith(".png")
      ? "image/png"
      : packagePath.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    entries.set(packagePath, { bytes, contentType });
  }
  return entries;
}
