import type { AdminRole, AdminScope } from "./types";

export const ROLE_SCOPES: Readonly<Record<AdminRole, readonly AdminScope[]>> = {
  admin: [
    "display.view",
    "candidate.view",
    "candidate.create",
    "candidate.edit.any",
    "display.draft.create",
    "display.draft.edit",
    "display.published.edit",
    "candidate.review",
    "review.approve",
    "review.reject",
    "publish.request",
    "publish.execute",
    "archive.request",
    "archive.execute",
    "audit.view",
    "audit.export",
    "account.create",
    "account.disable",
    "role.manage",
    "token.create",
    "token.revoke",
    "job.view",
  ],
  codex: [
    "display.view",
    "candidate.view",
    "candidate.create",
    "candidate.edit.any",
    "display.draft.create",
    "display.draft.edit",
    "display.published.edit",
    "candidate.review",
    "review.approve",
    "review.reject",
    "publish.request",
    "archive.request",
    "audit.view",
    "job.view",
  ],
  opencode: [
    "display.view",
    "candidate.view",
    "candidate.create",
    "candidate.edit.own",
    "display.draft.create",
    "display.draft.edit",
    "job.view",
  ],
  pull_service: ["source.batch.append", "job.view"],
  viewer: ["display.view"],
};

export class AdminAuthorizationError extends Error {
  constructor(scope: AdminScope) {
    super(`Missing required admin scope: ${scope}`);
    this.name = "AdminAuthorizationError";
  }
}

export function hasAdminScope(role: AdminRole, scope: AdminScope) {
  return ROLE_SCOPES[role].includes(scope);
}

export function assertAdminScope(role: AdminRole, scope: AdminScope) {
  if (!hasAdminScope(role, scope)) {
    throw new AdminAuthorizationError(scope);
  }
}
