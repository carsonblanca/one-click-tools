import type { AdminSession } from "./types";

export const SESSION_DIAGNOSTIC_ENVIRONMENTS = ["preview", "production"] as const;

export function isSessionDiagnosticEnvironment(value: string | undefined) {
  return SESSION_DIAGNOSTIC_ENVIRONMENTS.includes(
    value as (typeof SESSION_DIAGNOSTIC_ENVIRONMENTS)[number],
  );
}

export function hasAdminSessionCookie(cookieHeader: string | null) {
  return /(?:^|;\s*)oneclick_admin_session=/.test(cookieHeader ?? "");
}

export function isHumanAdminSession(session: AdminSession | null) {
  return session?.actorType === "human" && session.role === "admin";
}

export function sessionDiagnosticPayload(
  cookieNamePresent: boolean,
  session: AdminSession | null,
) {
  if (!session) {
    return { cookieNamePresent, sessionValid: false } as const;
  }

  return {
    cookieNamePresent,
    sessionValid: true,
    actorType: session.actorType,
    role: session.role,
    actorIdPresent: Boolean(session.actorId),
  } as const;
}
