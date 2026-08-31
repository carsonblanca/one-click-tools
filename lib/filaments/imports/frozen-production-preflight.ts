import type { AdminSession } from "@/lib/admin/types";

export const FROZEN_ABS_PRODUCTION_PREFLIGHT_TARGETS = [
  {
    sourceRunId: "capture-20260817024719-a9870e0684e1-4b966ba9",
    draftKey: "capture-20260817024719-a9870e0684e1-4b966ba9::0",
    parentImportId: "4b966ba9-43f5-4a27-9ac5-d8558efb0384",
  },
  {
    sourceRunId: "capture-20260817024614-e0d318af934a-0037851c",
    draftKey: "capture-20260817024614-e0d318af934a-0037851c::0",
    parentImportId: "0037851c-cb8a-4159-a2b3-1fcb46647048",
  },
  {
    sourceRunId: "capture-20260817024438-9acb75e7a1e3-d9ed9669",
    draftKey: "capture-20260817024438-9acb75e7a1e3-d9ed9669::0",
    parentImportId: "d9ed9669-d776-4048-ba97-3ab894a6f707",
  },
  {
    sourceRunId: "capture-20260817024828-d998ea43cf3a-27ab63c4",
    draftKey: "capture-20260817024828-d998ea43cf3a-27ab63c4::0",
    parentImportId: "27ab63c4-222d-436c-a533-24b9b5cd7563",
  },
] as const;

export function mayReadFrozenProductionPreflight(session: AdminSession | null): boolean {
  return session?.actorType === "human" && session.role === "admin";
}

export function frozenProductionParentStrategy(input: {
  sourceRunCollisionCount: number;
  parentIdCollisionCount: number;
}): "insert_new_parent_per_source" | "blocked_existing_parent_collision" {
  return input.sourceRunCollisionCount === 0 && input.parentIdCollisionCount === 0
    ? "insert_new_parent_per_source"
    : "blocked_existing_parent_collision";
}
