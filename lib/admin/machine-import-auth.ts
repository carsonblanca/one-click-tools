import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const MACHINE_IMPORT_TOKEN_ENV = "OPENCODE_IMPORT_API_TOKEN";

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function hasMachineImportToken(request: NextRequest) {
  const expected = process.env[MACHINE_IMPORT_TOKEN_ENV]?.trim() || "";
  const authorization = request.headers.get("authorization")?.trim() || "";
  if (!expected || !authorization.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length).trim();
  return supplied.length > 0 && safeEqual(supplied, expected);
}

export const MACHINE_IMPORT_ACTOR_ID = "machine:opencode-import";
