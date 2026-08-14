import { strFromU8, unzipSync } from "fflate";
import {
  FILAMENT_CANONICAL_PARAMETER_KEYS,
  FILAMENT_PARAMETER_SCHEMA_VERSION,
  fieldsAcceptedFromCandidates,
  isSupportedCanonicalParameterKey,
  normalizeParameterCandidate,
} from "@/lib/filaments/parameters/normalized-parameters";

const REQUIRED_FILES = [
  "manifest.json",
  "products.json",
  "evidence.json",
  "package-report.json",
  "parameter-candidates.json",
  "parameter-schema.json",
  "parameter-coverage.json",
  "draft-patch.json",
] as const;

type JsonObject = Record<string, unknown>;

export type ParsedKexcelledFip = {
  files: Record<string, Uint8Array>;
  manifest: JsonObject;
  products: JsonObject[];
  evidence: unknown;
  report: JsonObject;
  parameterSchema: JsonObject;
  parameterCoverage: JsonObject;
  draftPatch: JsonObject;
  expectedParameterFields: Record<string, string>;
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

function stringFields(value: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(objectValue(value)).flatMap(([key, rawValue]) => {
    const normalized = typeof rawValue === "string" || typeof rawValue === "number"
      ? String(rawValue).trim()
      : "";
    return normalized ? [[key, normalized]] : [];
  }));
}

function validateParameterContract(input: {
  manifest: JsonObject;
  parameterSchema: JsonObject;
  parameters: JsonObject[];
  draftPatch: JsonObject;
}) {
  const manifestVersion = String(input.manifest.parameterSchemaVersion ?? "").trim();
  const schemaVersion = String(input.parameterSchema.schemaVersion ?? "").trim();
  if (manifestVersion !== FILAMENT_PARAMETER_SCHEMA_VERSION || schemaVersion !== FILAMENT_PARAMETER_SCHEMA_VERSION) {
    throw new FipValidationError(
      "FIP 参数规范版本不兼容",
      `期望 ${FILAMENT_PARAMETER_SCHEMA_VERSION}，manifest=${manifestVersion || "缺失"}，schema=${schemaVersion || "缺失"}`,
    );
  }

  const schemaKeys = arrayOfObjects(input.parameterSchema.definitions)
    .map((item) => String(item.canonicalKey ?? "").trim())
    .filter(Boolean)
    .sort();
  const currentKeys = [...FILAMENT_CANONICAL_PARAMETER_KEYS].sort();
  if (schemaKeys.length !== currentKeys.length || schemaKeys.some((key, index) => key !== currentKeys[index])) {
    throw new FipValidationError("FIP 参数规范不兼容", "parameter-schema.json 与当前 Production canonical schema 不一致");
  }

  const unknownCandidateKeys = [...new Set(input.parameters.flatMap((candidate) => {
    const key = String(candidate.canonicalKey ?? "").trim();
    return key && !isSupportedCanonicalParameterKey(key) ? [key] : [];
  }))];
  const expectedFields = stringFields(objectValue(input.draftPatch.parameters).fields);
  const unknownFieldKeys = Object.keys(expectedFields).filter((key) => !isSupportedCanonicalParameterKey(key));
  const unknownKeys = [...new Set([...unknownCandidateKeys, ...unknownFieldKeys])];
  if (unknownKeys.length) {
    throw new FipValidationError("FIP 包含未知参数字段", `UNKNOWN_CANONICAL_KEYS:${unknownKeys.join(",")}`);
  }
  return expectedFields;
}

function sortedFields(value: Record<string, string>) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export function projectKexcelledFipParameters(
  parameters: JsonObject[],
  expectedParameterFields: Record<string, string>,
) {
  const candidates = parameters.map(normalizeParameterCandidate);
  const fields = fieldsAcceptedFromCandidates(candidates);
  if (JSON.stringify(sortedFields(fields)) !== JSON.stringify(sortedFields(expectedParameterFields))) {
    const missing = Object.keys(expectedParameterFields).filter((key) => !(key in fields));
    const added = Object.keys(fields).filter((key) => !(key in expectedParameterFields));
    const changed = Object.keys(fields).filter((key) => (
      key in expectedParameterFields && fields[key] !== expectedParameterFields[key]
    ));
    throw new FipValidationError(
      "FIP 参数投影与 Draft 不一致",
      `PARAMETER_PROJECTION_MISMATCH:missing=${missing.join(",") || "none"};added=${added.join(",") || "none"};changed=${changed.join(",") || "none"}`,
    );
  }
  return { candidates, fields };
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
  const parameterSchema = objectValue(readJson(files, "parameter-schema.json"));
  const parameterCoverage = objectValue(readJson(files, "parameter-coverage.json"));
  const draftPatch = objectValue(readJson(files, "draft-patch.json"));
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
  const parameters = arrayOfObjects(readJson(files, "parameter-candidates.json"));
  const expectedParameterFields = validateParameterContract({
    manifest,
    parameterSchema,
    parameters,
    draftPatch,
  });

  return {
    files,
    manifest,
    products,
    evidence,
    report,
    parameterSchema,
    parameterCoverage,
    draftPatch,
    expectedParameterFields,
    colors: files["colors.json"] ? arrayOfObjects(readJson(files, "colors.json")) : [],
    parameters,
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
