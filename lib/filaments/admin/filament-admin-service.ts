import "server-only";

import type { AdminSession } from "@/lib/admin/types";
import { hasAdminScope } from "@/lib/admin/permissions";
import { applyFilamentAdminPatch, type FilamentAdminPatch } from "./filament-admin";
import {
  appendAdminAuditLog,
  getFilamentDraftById,
  listPublishedFilamentDrafts,
  updateFilamentDraftById,
} from "@/lib/filaments/imports/supabase-import-repository";
import { validateDraftForPublish } from "@/lib/filaments/publishing/minimal-publish";
import { resolveCanonicalParameterKey } from "@/lib/filaments/parameters/normalized-parameters";

export class FilamentAdminUpdateError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function updateFilamentDraftAsAdmin(input: {
  session: AdminSession;
  draftId: string;
  patch: FilamentAdminPatch;
  expectedUpdatedAt?: string;
}) {
  const current = await getFilamentDraftById(input.draftId);
  if (!current) throw new FilamentAdminUpdateError("draft_not_found", 404);
  const requiredScope = current.publication_status === "published"
    ? "display.published.edit" as const
    : "display.draft.edit" as const;
  if (!hasAdminScope(input.session.role, requiredScope)) {
    throw new FilamentAdminUpdateError("forbidden", 403);
  }

  const next = applyFilamentAdminPatch(current, input.patch);
  const publicationStatusChanged = next.publicationStatus !== current.publication_status;
  if (publicationStatusChanged && (next.publicationStatus === "published" || current.publication_status === "published")) {
    if (input.session.role !== "admin" || !hasAdminScope(input.session.role, "publish.execute")) {
      throw new FilamentAdminUpdateError("publish_status_change_forbidden", 403);
    }
  }
  if (publicationStatusChanged && (next.publicationStatus === "archived" || current.publication_status === "archived")) {
    if (input.session.role !== "admin" || !hasAdminScope(input.session.role, "archive.execute")) {
      throw new FilamentAdminUpdateError("archive_forbidden", 403);
    }
  }
  const editedAt = new Date().toISOString();
  const draftDataObject = next.draftData && typeof next.draftData === "object" && !Array.isArray(next.draftData)
    ? next.draftData
    : {};
  const parameterObject = draftDataObject.parameters && typeof draftDataObject.parameters === "object" && !Array.isArray(draftDataObject.parameters)
    ? draftDataObject.parameters
    : {};
  const existingFieldMetadata = parameterObject.fieldMetadata && typeof parameterObject.fieldMetadata === "object" && !Array.isArray(parameterObject.fieldMetadata)
    ? { ...parameterObject.fieldMetadata }
    : {};
  const changedParameterKeys = input.patch.parameters
    ? Object.keys(parameterObject.fields && typeof parameterObject.fields === "object" && !Array.isArray(parameterObject.fields) ? parameterObject.fields : {})
    : Object.keys(input.patch.parameterUpdates ?? {}).flatMap((key) => resolveCanonicalParameterKey(key) || []);
  for (const key of changedParameterKeys) {
    existingFieldMetadata[key] = {
      source: "admin_manual",
      sourceType: "admin_manual",
      manufacturerProvided: null,
      updatedBy: input.session.actorId,
      updatedAt: editedAt,
    };
  }
  for (const key of input.patch.clearParameterKeys ?? []) {
    const canonicalKey = resolveCanonicalParameterKey(key);
    if (canonicalKey) delete existingFieldMetadata[canonicalKey];
  }
  next.draftData = {
    ...draftDataObject,
    ...(changedParameterKeys.length || input.patch.clearParameterKeys?.length
      ? { parameters: { ...parameterObject, fieldMetadata: existingFieldMetadata } }
      : {}),
    adminEditMetadata: {
      source: "admin_manual",
      sourceType: "admin_manual",
      updatedBy: input.session.actorId,
      updatedAt: editedAt,
      changedFields: Object.keys(input.patch),
    },
  };
  if (next.publicationStatus === "published" && current.publication_status !== "published") {
    if (input.session.role !== "admin" || !hasAdminScope(input.session.role, "publish.execute")) {
      throw new FilamentAdminUpdateError("publish_forbidden", 403);
    }
    const publishedRows = await listPublishedFilamentDrafts();
    const candidate = {
      ...current,
      status: next.status,
      review_status: next.reviewStatus,
      publication_status: next.publicationStatus,
      brand_id: next.brandId,
      product_line_name: next.productLineName,
      material_type: next.materialType,
      variant: next.variant,
      draft_data: next.draftData,
    };
    const issues = validateDraftForPublish(candidate, publishedRows, {
      sourceRunId: current.source_run_id,
      draftId: current.id,
    });
    if (issues.length) throw new FilamentAdminUpdateError(`publish_validation_failed:${issues.join("|")}`, 409);
  }

  let updated;
  try {
    updated = await updateFilamentDraftById({
      id: current.id,
      expectedUpdatedAt: input.expectedUpdatedAt,
      actorId: input.session.actorId,
      ...next,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "filament_draft_update_conflict") {
      throw new FilamentAdminUpdateError("filament_draft_update_conflict", 409);
    }
    throw error;
  }
  await appendAdminAuditLog({
    actorId: input.session.actorId,
    action: "filament_admin_updated",
    entityType: "filament_draft",
    entityId: current.id,
    details: {
      sourceRunId: current.source_run_id,
      changedFields: Object.keys(input.patch),
      previousPublicationStatus: current.publication_status,
      nextPublicationStatus: updated.publication_status,
    },
  });
  return updated;
}
