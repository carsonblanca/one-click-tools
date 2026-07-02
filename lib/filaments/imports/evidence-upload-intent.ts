import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type EvidenceUploadIntent = {
  importId: string;
  sourceRunId: string;
  actorId: string;
  brandId: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  size: number;
  contentType: string;
  expiresAt: number;
};

function signingSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("upload_intent_signing_unavailable");
  }
  return secret;
}

function sign(encoded: string) {
  return createHmac("sha256", signingSecret())
    .update(`evidence-upload:${encoded}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createEvidenceUploadIntentToken(intent: EvidenceUploadIntent) {
  const encoded = Buffer.from(JSON.stringify(intent)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyEvidenceUploadIntentToken(
  token: string,
): EvidenceUploadIntent | null {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !safeEqual(signature, sign(encoded))) {
    return null;
  }

  try {
    const intent = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<EvidenceUploadIntent>;
    if (
      typeof intent.importId !== "string"
      || typeof intent.sourceRunId !== "string"
      || typeof intent.actorId !== "string"
      || typeof intent.brandId !== "string"
      || typeof intent.bucket !== "string"
      || typeof intent.objectKey !== "string"
      || typeof intent.originalFilename !== "string"
      || typeof intent.size !== "number"
      || typeof intent.contentType !== "string"
      || typeof intent.expiresAt !== "number"
      || intent.expiresAt <= Date.now()
    ) {
      return null;
    }
    return intent as EvidenceUploadIntent;
  } catch {
    return null;
  }
}
