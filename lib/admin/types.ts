export const ADMIN_ROLES = [
  "admin",
  "codex",
  "opencode",
  "pull_service",
  "viewer",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type ActorType = "human" | "service" | "anonymous";

export const CONTENT_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "rejected",
  "hidden",
  "archived",
  "superseded",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type AdminSession = {
  actorId: string;
  actorType: ActorType;
  role: AdminRole;
  sessionId: string;
  expiresAt: number;
};

export type AdminScope =
  | "display.view"
  | "candidate.view"
  | "candidate.create"
  | "candidate.edit.own"
  | "candidate.edit.any"
  | "display.draft.create"
  | "display.draft.edit"
  | "display.published.edit"
  | "candidate.review"
  | "review.approve"
  | "review.reject"
  | "publish.request"
  | "publish.execute"
  | "archive.request"
  | "archive.execute"
  | "audit.view"
  | "audit.export"
  | "account.create"
  | "account.disable"
  | "role.manage"
  | "token.create"
  | "token.revoke"
  | "source.batch.append"
  | "job.view";

export type AdminTargetType =
  | "session"
  | "candidate"
  | "display_record"
  | "archive_request"
  | "account"
  | "role"
  | "token"
  | "import_job"
  | "sync_job"
  | "pull_job"
  | "publish_job"
  | "rollback_job"
  | "source_batch";
