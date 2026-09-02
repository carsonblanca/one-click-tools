import { strFromU8, unzipSync } from "fflate";

const REQUIRED_FILES = [
  "manifest.json",
  "products.json",
  "colors.json",
  "evidence.json",
  "images.json",
  "package-report.json",
  "parameter-candidates.json",
] as const;

type JsonObject = Record<string, unknown>;

export type ParsedFilamentFip = {
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

/** Keep one import's source identity while giving each product draft a unique route key. */
export function sourceRunIdForProduct(sourceRunId: string, productIndex: number) {
  return `${sourceRunId}::product-${productIndex}`;
}

export function genericDraftColorNames(color: JsonObject) {
  const nameZh = [color.nameZh, color.displayNameZhCN, color.sellerColorName, color.rawSellerOption]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0) || "";
  const nameEn = [color.nameEn, color.displayNameEn]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0) || "";
  return { nameZh: nameZh.trim(), nameEn: nameEn.trim() };
}

export class GenericFipValidationError extends Error {
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
    throw new GenericFipValidationError("不是合法 FIP", `${name} 不是有效 JSON`);
  }
}

function unsafePath(name: string) {
  return name.startsWith("/")
    || name.includes("../")
    || name.includes("..\\")
    || name.includes("\\")
    || name.includes("\0");
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseFilamentFip(bytes: Uint8Array): ParsedFilamentFip {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new GenericFipValidationError("不是合法 FIP", "ZIP 无法解压");
  }

  const missing = REQUIRED_FILES.filter((name) => !files[name]);
  if (missing.length) throw new GenericFipValidationError("不是合法 FIP", `缺少 ${missing.join(" / ")}`);
  const invalidPath = Object.keys(files).find(unsafePath);
  if (invalidPath) throw new GenericFipValidationError("不是合法 FIP", `包含不安全路径：${invalidPath}`);

  const manifest = objectValue(readJson(files, "manifest.json"));
  const products = arrayOfObjects(readJson(files, "products.json"));
  const evidence = readJson(files, "evidence.json");
  const report = objectValue(readJson(files, "package-report.json"));
  const colors = arrayOfObjects(readJson(files, "colors.json"));
  const images = arrayOfObjects(readJson(files, "images.json"));
  const parameters = arrayOfObjects(readJson(files, "parameter-candidates.json"));
  const brand = String(manifest.brand ?? "").trim();
  const sourceRunId = String(manifest.sourceRunId ?? "").trim();

  if (!nonEmptyString(brand)) throw new GenericFipValidationError("不是合法 FIP", "manifest.brand 缺失");
  if (!products.length) throw new GenericFipValidationError("不是合法 FIP", "products.json 不包含产品记录");
  if (!colors.length) throw new GenericFipValidationError("不是合法 FIP", "colors.json 不包含颜色记录");
  if (!images.length) throw new GenericFipValidationError("不是完整 FIP", "images.json 不包含图片记录");
  if (!sourceRunId) throw new GenericFipValidationError("不是合法 FIP", "manifest.sourceRunId 缺失");
  if (Number.isInteger(report.parameterCandidateCount) && report.parameterCandidateCount !== parameters.length) {
    throw new GenericFipValidationError("不是完整 FIP", `参数数量不一致：report=${report.parameterCandidateCount}, candidates=${parameters.length}`);
  }

  const imagePaths = new Set(images.flatMap((image) => [image.sourcePath, image.packagePath]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)));
  const missingColorImages = colors.filter((color) => color.imageStatus === "available"
    && typeof color.imagePath === "string"
    && color.imagePath.trim()
    && !imagePaths.has(color.imagePath));
  if (missingColorImages.length) {
    throw new GenericFipValidationError("不是完整 FIP", `${missingColorImages.length} 个颜色缺少对应图片资产`);
  }

  return { files, manifest, products, evidence, report, colors, parameters, images, sourceRunId };
}

export function fipImageEntries(parsed: ParsedFilamentFip) {
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
