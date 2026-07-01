import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

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
