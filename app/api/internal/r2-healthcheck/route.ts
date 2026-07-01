import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getR2Client, getR2Config } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthcheckStage = "config" | "write" | "read" | "verify" | "cleanup";

type HealthcheckResult = {
  ok: boolean;
  stage: HealthcheckStage;
  bucket: string;
  message: string;
};

function response(result: HealthcheckResult, status: number) {
  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function failureMessage(stage: HealthcheckStage) {
  const messages: Record<HealthcheckStage, string> = {
    config: "R2 healthcheck configuration is unavailable or invalid.",
    write: "R2 healthcheck write failed.",
    read: "R2 healthcheck read failed.",
    verify: "R2 healthcheck content verification failed.",
    cleanup: "R2 healthcheck object cleanup failed.",
  };
  return messages[stage];
}

function tokenMatches(actual: string, expected: string) {
  const actualHash = createHash("sha256").update(actual).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export async function POST(request: NextRequest) {
  if (process.env.R2_HEALTHCHECK_ENABLED !== "true") {
    return response(
      {
        ok: false,
        stage: "config",
        bucket: "",
        message: "R2 healthcheck is disabled.",
      },
      403,
    );
  }

  const expectedToken = process.env.R2_HEALTHCHECK_TOKEN?.trim();
  if (!expectedToken) {
    return response(
      {
        ok: false,
        stage: "config",
        bucket: "",
        message: "R2 healthcheck configuration is unavailable or invalid.",
      },
      500,
    );
  }

  const suppliedToken = request.headers.get("x-r2-healthcheck-token")?.trim();
  if (!suppliedToken) {
    return response(
      { ok: false, stage: "config", bucket: "", message: "Unauthorized." },
      401,
    );
  }
  if (!tokenMatches(suppliedToken, expectedToken)) {
    return response(
      { ok: false, stage: "config", bucket: "", message: "Forbidden." },
      403,
    );
  }

  let stage: HealthcheckStage = "config";
  let bucket = "";
  let key = "";
  let client: ReturnType<typeof getR2Client> | null = null;
  let operationFailed = false;
  let cleanupFailed = false;

  try {
    const config = getR2Config();
    bucket = config.importsBucket;
    client = getR2Client();
    const token = randomUUID();
    key = `_healthcheck/${Date.now()}-${token}.txt`;
    const expectedBody = `one-click-tools-r2-healthcheck:${token}`;

    stage = "write";
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: expectedBody,
      ContentType: "text/plain; charset=utf-8",
      CacheControl: "no-store",
    }));

    stage = "read";
    const stored = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    stage = "verify";
    const actualBody = stored.Body
      ? await stored.Body.transformToString("utf-8")
      : "";
    if (actualBody !== expectedBody) {
      throw new Error("content_mismatch");
    }
  } catch {
    operationFailed = true;
  } finally {
    if (client && bucket && key) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch {
        cleanupFailed = true;
      }
    }
  }

  if (operationFailed) {
    return response(
      {
        ok: false,
        stage,
        bucket,
        message: cleanupFailed
          ? `${failureMessage(stage)} Cleanup was not confirmed.`
          : failureMessage(stage),
      },
      stage === "config" ? 500 : 502,
    );
  }
  if (cleanupFailed) {
    return response(
      { ok: false, stage: "cleanup", bucket, message: failureMessage("cleanup") },
      502,
    );
  }
  return response(
    {
      ok: true,
      stage: "cleanup",
      bucket,
      message: "R2 write, read, verify, and cleanup succeeded.",
    },
    200,
  );
}
