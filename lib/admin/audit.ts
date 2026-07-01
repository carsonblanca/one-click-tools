import type {
  ActorType,
  AdminRole,
  AdminTargetType,
} from "./types";

export const AUDIT_ACTIONS = [
  "auth.login.success",
  "auth.login.failure",
  "auth.logout",
  "candidate.create",
  "display.edit",
  "review.approve",
  "review.reject",
  "publish.request",
  "publish.execute",
  "archive.request",
  "archive.execute",
  "account.create",
  "account.disable",
  "role.change",
  "token.create",
  "token.revoke",
  "import.create",
  "pull.create",
  "sync.create",
  "rollback.request",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResult = "success" | "failure" | "denied";

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actorId: string;
  actorType: ActorType;
  actorRole: AdminRole | null;
  action: AuditAction;
  targetType: AdminTargetType;
  targetId: string;
  result: AuditResult;
  requestId: string;
  beforeSummary: string | null;
  afterSummary: string | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  ip: string | null;
  userAgent: string | null;
};

export type AppendAuditInput = Omit<AuditLogEntry, "id" | "timestamp">;

export interface AppendOnlyAuditAdapter {
  append(entry: AppendAuditInput): Promise<AuditLogEntry>;
  list(): Promise<readonly AuditLogEntry[]>;
}
