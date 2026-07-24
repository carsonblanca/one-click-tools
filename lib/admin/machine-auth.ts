import { createHash, timingSafeEqual } from "node:crypto";
import type { AdminSession } from "./types";

export type OpenCodeMachineAuthResult =
  | { status: "disabled" | "missing" | "invalid"; session: null }
  | { status: "authenticated"; session: AdminSession };

const MACHINE_SESSION: AdminSession = {
  actorId: "machine:opencode",
  actorType: "service",
  role: "opencode",
  sessionId: "machine:opencode",
  expiresAt: 253402300799,
};

function configuredDigest(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-f0-9]{64}$/.test(normalized)
    ? Buffer.from(normalized, "hex")
    : null;
}

export function authenticateOpenCodeBearer(
  authorization: string | null,
  expectedSha256 = process.env.ONE_CLICK_OPENCODE_TOKEN_SHA256,
): OpenCodeMachineAuthResult {
  const expected = configuredDigest(expectedSha256);
  if (!expected) return { status: "disabled", session: null };
  if (!authorization) return { status: "missing", session: null };

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";
  if (!token) return { status: "invalid", session: null };

  const actual = createHash("sha256").update(token, "utf8").digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { status: "invalid", session: null };
  }
  return { status: "authenticated", session: { ...MACHINE_SESSION } };
}
