import type { AdminSession } from "@/lib/admin/types";

export const FROZEN_ABS_SOURCE_RUN_IDS = new Set([
  "capture-20260817024719-a9870e0684e1-4b966ba9",
  "capture-20260817024614-e0d318af934a-0037851c",
  "capture-20260817024438-9acb75e7a1e3-d9ed9669",
  "capture-20260817024828-d998ea43cf3a-27ab63c4",
]);

type RuntimeEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export function frozenRawExportEnabled(environment: RuntimeEnvironment = process.env): boolean {
  if (environment.VERCEL_ENV) return environment.VERCEL_ENV !== "production";
  return environment.NODE_ENV !== "production";
}

export function mayReadFrozenRawExport(
  session: AdminSession | null,
  sourceRunId: string,
  environment: RuntimeEnvironment = process.env,
): boolean {
  return frozenRawExportEnabled(environment)
    && FROZEN_ABS_SOURCE_RUN_IDS.has(sourceRunId)
    && session?.actorType === "human"
    && session.role === "admin";
}

export function frozenAssetObjectKeys(value: unknown): string[] {
  const keys = new Set<string>();
  const visit = (item: unknown) => {
    if (typeof item === "string") {
      if (item.startsWith("filament-imports/")) keys.add(item);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item && typeof item === "object") {
      Object.values(item).forEach(visit);
    }
  };
  visit(value);
  return [...keys].sort();
}
