import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AdminRole, AdminSession, ActorType } from "./types";
import { ADMIN_ROLES } from "./types";

export const ADMIN_SESSION_COOKIE = "oneclick_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

function isActorType(value: unknown): value is ActorType {
  return value === "human" || value === "service" || value === "anonymous";
}

export function isAdminSessionConfigured() {
  return sessionSecret() !== null;
}

export function createAdminSessionToken(
  actorId: string,
  role: AdminRole,
  actorType: ActorType = "human",
) {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is missing or shorter than 32 characters.");
  }

  const payload: AdminSession = {
    actorId,
    actorType,
    role,
    sessionId: randomUUID(),
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encoded}.${sign(encoded, secret)}`,
    session: payload,
  };
}

export function verifyAdminSessionToken(token: string): AdminSession | null {
  const secret = sessionSecret();
  if (!secret) {
    return null;
  }

  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) {
    return null;
  }

  const expected = sign(encoded, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<AdminSession>;
    if (
      typeof parsed.actorId !== "string" ||
      !isActorType(parsed.actorType) ||
      !isAdminRole(parsed.role) ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed as AdminSession;
  } catch {
    return null;
  }
}

export async function readAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return token ? verifyAdminSessionToken(token) : null;
}

export function attachAdminSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: number,
) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt * 1000),
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
