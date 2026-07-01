import { NextRequest, NextResponse } from "next/server";
import { adminRequestContext } from "@/lib/admin/auth";
import { adminAudit } from "@/lib/admin/audit-adapter";
import {
  clearAdminSessionCookie,
  readAdminSession,
} from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = adminRequestContext(request);
  const session = await readAdminSession();
  const response = NextResponse.json({ ok: true, redirectTo: "/admin/login" });
  clearAdminSessionCookie(response);

  await adminAudit.append({
    actorId: session?.actorId ?? "anonymous",
    actorType: session?.actorType ?? "anonymous",
    actorRole: session?.role ?? null,
    action: "auth.logout",
    targetType: "session",
    targetId: session?.sessionId ?? "missing-session",
    result: "success",
    requestId: context.requestId,
    beforeSummary: session ? "Active admin session." : null,
    afterSummary: "Admin session cookie cleared.",
    metadata: { hadSession: Boolean(session) },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return response;
}
