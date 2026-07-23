import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { hasAdminScope } from "./permissions";
import { authenticateOpenCodeBearer } from "./machine-auth";
import { readAdminSession } from "./session";
import type { AdminScope } from "./types";

export type BootstrapAdminConfig = {
  configured: boolean;
  message: string;
};

export function getBootstrapAdminConfig(): BootstrapAdminConfig {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!email || !password || !secret || secret.length < 32) {
    return {
      configured: false,
      message:
        "后台开发登录尚未配置。请设置 ADMIN_BOOTSTRAP_EMAIL、ADMIN_BOOTSTRAP_PASSWORD，并提供至少 32 个字符的 ADMIN_SESSION_SECRET。",
    };
  }

  return {
    configured: true,
    message: "开发环境 Bootstrap Admin 已配置。",
  };
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function authenticateBootstrapAdmin(email: string, password: string) {
  const config = getBootstrapAdminConfig();
  if (!config.configured) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  const expectedEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "";
  const expectedPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  const emailMatches = safeEqual(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase(),
  );
  const passwordMatches = safeEqual(password, expectedPassword);
  const ok = emailMatches && passwordMatches;

  return ok
    ? { ok: true as const, actorId: `bootstrap-admin:${expectedEmail}` }
    : { ok: false as const, reason: "invalid_credentials" as const };
}

export async function requireAdminSession() {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAdminScope(scope: AdminScope) {
  const session = await requireAdminSession();
  if (!hasAdminScope(session.role, scope)) {
    redirect("/admin/forbidden");
  }
  return session;
}

export async function readAdminApiSession(request: Pick<NextRequest, "headers">) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    return authenticateOpenCodeBearer(authorization).session;
  }
  return readAdminSession();
}

export function adminRequestContext(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    ip: forwarded?.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent"),
  };
}
