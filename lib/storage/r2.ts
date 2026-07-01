import "server-only";

import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
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

export async function uploadEvidencePackageToR2(input: {
  importId: string;
  bytes: Uint8Array;
  originalFilename: string;
  contentType: string;
}): Promise<R2ImportUpload> {
  const config = getR2Config();
  const objectKey = `imports/evidence/${input.importId}/${safeImportFilename(input.originalFilename)}`;
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
