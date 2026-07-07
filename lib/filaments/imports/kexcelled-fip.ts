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
