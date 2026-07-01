import { NextRequest, NextResponse } from "next/server";
import {
  adminRequestContext,
  authenticateBootstrapAdmin,
} from "@/lib/admin/auth";
import { adminAudit } from "@/lib/admin/audit-adapter";
import {
  attachAdminSessionCookie,
  createAdminSessionToken,
} from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = adminRequestContext(request);
  let credentials: { email?: unknown; password?: unknown };

  try {
    credentials = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };
  } catch {
    await adminAudit.append({
      actorId: "anonymous",
      actorType: "anonymous",
      actorRole: null,
      action: "auth.login.failure",
      targetType: "session",
      targetId: "bootstrap-admin",
      result: "failure",
      requestId: context.requestId,
      beforeSummary: null,
      afterSummary: null,
      metadata: { reason: "invalid_request" },
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const email =
    typeof credentials.email === "string" ? credentials.email : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";
  const auth = authenticateBootstrapAdmin(email, password);

  if (!auth.ok) {
    await adminAudit.append({
      actorId: "anonymous",
      actorType: "anonymous",
      actorRole: null,
      action: "auth.login.failure",
      targetType: "session",
      targetId: "bootstrap-admin",
      result: auth.reason === "not_configured" ? "denied" : "failure",
      requestId: context.requestId,
      beforeSummary: null,
      afterSummary: null,
      metadata: { reason: auth.reason },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    const status = auth.reason === "not_configured" ? 503 : 401;
    const error =
      auth.reason === "not_configured"
        ? "后台登录尚未配置，访问已关闭。"
        : "邮箱或密码不正确。";
    return NextResponse.json({ error }, { status });
  }

  const { token, session } = createAdminSessionToken(auth.actorId, "admin");
  const response = NextResponse.json({ ok: true, redirectTo: "/admin" });
  attachAdminSessionCookie(response, token, session.expiresAt);

  await adminAudit.append({
    actorId: session.actorId,
    actorType: session.actorType,
    actorRole: session.role,
    action: "auth.login.success",
    targetType: "session",
    targetId: session.sessionId,
    result: "success",
    requestId: context.requestId,
    beforeSummary: null,
    afterSummary: "Bootstrap Admin session created.",
    metadata: { expiresAt: session.expiresAt },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return response;
}
