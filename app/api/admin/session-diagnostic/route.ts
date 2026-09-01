import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/admin/session";
import {
  hasAdminSessionCookie,
  isHumanAdminSession,
  isSessionDiagnosticEnvironment,
  sessionDiagnosticPayload,
} from "@/lib/admin/session-diagnostic";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSessionDiagnosticEnvironment(process.env.VERCEL_ENV)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await readAdminSession();
  if (session && !isHumanAdminSession(session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = sessionDiagnosticPayload(
    hasAdminSessionCookie(request.headers.get("cookie")),
    session,
  );
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
