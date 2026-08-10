import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  buildFilamentResetDryRun,
  createFilamentResetBackup,
  executeFilamentReset,
  getFilamentResetEnvironment,
  resetAuditDetails,
  type FilamentResetCounts,
} from "@/lib/filaments/admin/filament-reset";
import {
  appendAdminAuditLog,
  readFilamentBusinessSnapshot,
} from "@/lib/filaments/imports/supabase-import-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({
    error: error instanceof Error ? error.message : "filament_reset_failed",
  }, { status });
}

async function requireResetAdmin() {
  const session = await readAdminSession();
  if (!session) return { response: errorResponse("unauthorized", 401) } as const;
  if (session.role !== "admin" || !hasAdminScope(session.role, "archive.execute")) {
    return { response: errorResponse("forbidden", 403) } as const;
  }
  return { session } as const;
}

export async function GET() {
  const auth = await requireResetAdmin();
  if ("response" in auth) return auth.response;
  try {
    const environment = getFilamentResetEnvironment();
    const snapshot = await readFilamentBusinessSnapshot();
    return NextResponse.json({
      mode: "dry-run",
      ...buildFilamentResetDryRun(snapshot, environment),
      backupRequiredBeforeClear: true,
      clearExecuted: false,
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireResetAdmin();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as {
    action?: "backup" | "clear";
    backupKey?: string;
    backupSha256?: string;
    confirmationPhrase?: string;
    expectedSnapshotDigest?: string;
    expectedCounts?: FilamentResetCounts;
  } | null;
  if (!body?.action) return errorResponse("invalid_filament_reset_action");

  const environment = getFilamentResetEnvironment();
  try {
    if (body.action === "backup") {
      const snapshot = await readFilamentBusinessSnapshot();
      const stored = await createFilamentResetBackup({
        snapshot,
        environment,
        actorId: auth.session.actorId,
      });
      await appendAdminAuditLog({
        actorId: auth.session.actorId,
        action: "filament_reset_backup_created",
        entityType: "filament_business_data",
        entityId: null,
        details: resetAuditDetails({
          environment,
          backupKey: stored.backupKey,
          backupSha256: stored.backupSha256,
          snapshotDigest: stored.backup.snapshotDigest,
          counts: stored.backup.counts,
        }),
      });
      return NextResponse.json({
        action: "backup",
        environment,
        backupKey: stored.backupKey,
        backupSha256: stored.backupSha256,
        backupSize: stored.backupSize,
        snapshotDigest: stored.backup.snapshotDigest,
        counts: stored.backup.counts,
        readbackVerified: true,
        clearExecuted: false,
      });
    }

    if (body.action !== "clear"
      || !body.backupKey
      || !body.backupSha256
      || !body.confirmationPhrase
      || !body.expectedSnapshotDigest
      || !body.expectedCounts) {
      return errorResponse("incomplete_filament_reset_clear_request");
    }

    const resetRequest = {
      backupKey: body.backupKey,
      backupSha256: body.backupSha256,
      actorId: auth.session.actorId,
      environment,
      confirmationPhrase: body.confirmationPhrase,
      expectedSnapshotDigest: body.expectedSnapshotDigest,
      expectedCounts: body.expectedCounts,
    };
    const result = await executeFilamentReset({
      ...resetRequest,
      beforeDelete: async (details) => {
        await appendAdminAuditLog({
          actorId: auth.session.actorId,
          action: "filament_business_data_clear_started",
          entityType: "filament_business_data",
          entityId: null,
          details: resetAuditDetails({
            environment,
            backupKey: body.backupKey,
            backupSha256: body.backupSha256,
            ...details,
          }),
        });
      },
    });
    let auditRecorded = true;
    try {
      await appendAdminAuditLog({
        actorId: auth.session.actorId,
        action: "filament_business_data_cleared",
        entityType: "filament_business_data",
        entityId: null,
        details: resetAuditDetails({
          environment,
          backupKey: body.backupKey,
          backupSha256: body.backupSha256,
          snapshotDigest: result.snapshotDigest,
          deleted: result.deleted,
          remaining: result.remaining,
        }),
      });
    } catch {
      auditRecorded = false;
    }
    return NextResponse.json({ action: "clear", environment, ...result, auditRecorded });
  } catch (error) {
    return errorResponse(error, 409);
  }
}
