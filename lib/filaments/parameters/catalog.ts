import type { FilamentParameterRecord } from "./types";

import esun from "@/data/filaments/parameters/esun.json";
import sunlu from "@/data/filaments/parameters/sunlu.json";
import kexcelled from "@/data/filaments/parameters/kexcelled.json";
import r3d from "@/data/filaments/parameters/r3d.json";

const BRAND_FILES = [esun, sunlu, kexcelled, r3d] as const;

function loadAll(): FilamentParameterRecord[] {
  const all: FilamentParameterRecord[] = [];
  for (const brand of BRAND_FILES) {
    for (const record of brand.records) {
      all.push(record as FilamentParameterRecord);
    }
  }
  return Object.freeze([...all]) as FilamentParameterRecord[];
}

const _cached = loadAll();

export function getAllFilamentParameters(): readonly FilamentParameterRecord[] {
  return _cached;
}

export function getParametersByProductLine(
  productLineId: string,
): readonly FilamentParameterRecord[] {
  return _cached.filter((p) => p.productLineId === productLineId);
}

export function getParameterByProductLine(
  productLineId: string,
): FilamentParameterRecord | null {
  return _cached.find((p) => p.productLineId === productLineId) ?? null;
}

export function getParameterStats(): {
  totalRecords: number;
  totalBrands: number;
  bySourceStatus: Record<string, number>;
  byParameterStatus: Record<string, number>;
} {
  const bySourceStatus: Record<string, number> = {};
  const byParameterStatus: Record<string, number> = {};

  for (const p of _cached) {
    bySourceStatus[p.sourceStatus] = (bySourceStatus[p.sourceStatus] || 0) + 1;
    byParameterStatus[p.parameterStatus] =
      (byParameterStatus[p.parameterStatus] || 0) + 1;
  }

  const brandIds = new Set(_cached.map((p) => p.brandId));

  return {
    totalRecords: _cached.length,
    totalBrands: brandIds.size,
    bySourceStatus,
    byParameterStatus,
  };
}
