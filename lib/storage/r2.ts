import "server-only";

import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type R2Config = {
  accountId: string;
  assetsBucket: string;
  importsBucket: string;
  endpoint: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`missing_${name.toLowerCase()}`);
  }
  return value;
}

export function getR2Config(): R2Config {
  if (cachedConfig) return cachedConfig;

  const endpoint = requiredEnv("R2_ENDPOINT").replace(/\/+$/, "");
  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== "https:") {
    throw new Error("invalid_r2_endpoint");
  }

  cachedConfig = {
    accountId: requiredEnv("R2_ACCOUNT_ID"),
    assetsBucket: requiredEnv("R2_BUCKET_ASSETS"),
    importsBucket: requiredEnv("R2_BUCKET_IMPORTS"),
    endpoint,
  };
  return cachedConfig;
}

export function getR2Client() {
  if (cachedClient) return cachedClient;

  const config = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

export type R2ImportUpload = {
  bucket: string;
  objectKey: string;
  originalFilename: string;
  contentType: string;
  size: number;
};

function safeImportFilename(originalFilename: string) {
  const normalized = originalFilename
    .normalize("NFKC")
    .replace(/[\\/]+/g, "-")
    .trim();
  const lower = normalized.toLowerCase();
  const extension = lower.endsWith(".filament-import.zip")
    ? ".filament-import.zip"
    : lower.endsWith(".zip")
      ? ".zip"
      : "";
  const stem = normalized
    .slice(0, extension ? -extension.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${stem || "import-package"}${extension || ".zip"}`;
}

function safeObjectSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || fallback;
}

function safeAssetFilename(originalFilename: string) {
  const normalized = originalFilename
    .normalize("NFKC")
    .replace(/[\\/]+/g, "-")
    .trim();
  const extension = normalized.includes(".")
    ? `.${normalized.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "bin"}`
    : "";
  const stem = normalized
    .slice(0, extension ? -extension.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${stem || "manual-asset"}${extension || ".bin"}`;
}

export async function uploadImportPackageToR2(input: {
  bytes: Uint8Array;
  originalFilename: string;
  contentType: string;
}): Promise<R2ImportUpload> {
  const config = getR2Config();
  const uploadId = randomUUID();
  const objectKey = `imports/${uploadId}/${safeImportFilename(input.originalFilename)}`;
  const contentType = input.contentType || "application/zip";

  await getR2Client().send(new PutObjectCommand({
    Bucket: config.importsBucket,
    Key: objectKey,
    Body: input.bytes,
    ContentType: contentType,
  }));

  return {
    bucket: config.importsBucket,
    objectKey,
    originalFilename: input.originalFilename,
    contentType,
    size: input.bytes.byteLength,
  };
}

export async function uploadFipPackageToR2(input: {
  importId: string;
  brandId: string;
  bytes: Uint8Array;
  originalFilename: string;
  contentType: string;
}): Promise<R2ImportUpload> {
  const config = getR2Config();
  const brandId = safeObjectSegment(input.brandId, "unknown-brand");
  const objectKey = `imports/fip/${brandId}/${input.importId}/${safeImportFilename(input.originalFilename)}`;
  const contentType = input.contentType || "application/zip";
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.importsBucket,
    Key: objectKey,
    Body: input.bytes,
    ContentType: contentType,
  }));
  return {
    bucket: config.importsBucket,
    objectKey,
    originalFilename: input.originalFilename,
    contentType,
    size: input.bytes.byteLength,
  };
}

export async function uploadFipAssetToR2(input: {
  importId: string;
  brandId: string;
  packagePath: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  const config = getR2Config();
  const brandId = safeObjectSegment(input.brandId, "unknown-brand");
  const packagePath = input.packagePath
    .split("/")
    .map((segment) => safeObjectSegment(segment, "asset"))
    .join("/");
  const objectKey = `filament-imports/${brandId}/${input.importId}/${packagePath}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.assetsBucket,
    Key: objectKey,
    Body: input.bytes,
    ContentType: input.contentType,
  }));
  return { bucket: config.assetsBucket, objectKey };
}

export async function uploadManualFilamentAssetToR2(input: {
  brandId: string;
  kind: "images" | "presets";
  bytes: Uint8Array;
  originalFilename: string;
  contentType: string;
}) {
  const config = getR2Config();
  const brandId = safeObjectSegment(input.brandId, "unknown-brand");
  const objectKey = `manual-filaments/${brandId}/${input.kind}/${randomUUID()}-${safeAssetFilename(input.originalFilename)}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.assetsBucket,
    Key: objectKey,
    Body: input.bytes,
    ContentType: input.contentType || "application/octet-stream",
  }));
  return {
    bucket: config.assetsBucket,
    objectKey,
    url: `/api/admin/filament-import/kexcelled-evidence/asset?key=${encodeURIComponent(objectKey)}`,
  };
}

export async function readFipAssetFromR2(objectKey: string) {
  const config = getR2Config();
  if (!objectKey.startsWith("filament-imports/") && !objectKey.startsWith("manual-filaments/")) {
    throw new Error("invalid_fip_asset_key");
  }
  const result = await getR2Client().send(new GetObjectCommand({
    Bucket: config.assetsBucket,
    Key: objectKey,
  }));
  if (!result.Body) throw new Error("fip_asset_not_found");
  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType || "application/octet-stream",
  };
}

export async function deleteFipAssetFromR2(objectKey: string) {
  const config = getR2Config();
  if (!objectKey.startsWith("filament-imports/")) {
    throw new Error("invalid_fip_asset_key");
  }
  await getR2Client().send(new DeleteObjectCommand({
    Bucket: config.assetsBucket,
    Key: objectKey,
  }));
}

export async function deleteImportObjectFromR2(input: {
  bucket: string;
  objectKey: string;
}) {
  const config = getR2Config();
  if (
    input.bucket !== config.importsBucket
    || !input.objectKey.startsWith("imports/")
  ) {
    throw new Error("invalid_import_object_reference");
  }

  await getR2Client().send(new DeleteObjectCommand({
    Bucket: input.bucket,
    Key: input.objectKey,
  }));
}
