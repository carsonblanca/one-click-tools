import type { FilamentProductLine } from "./types";

import bambuLab from "@/data/filaments/product-lines/bambu-lab.json";
import sunlu from "@/data/filaments/product-lines/sunlu.json";
import esun from "@/data/filaments/product-lines/esun.json";
import polymaker from "@/data/filaments/product-lines/polymaker.json";
import overture from "@/data/filaments/product-lines/overture.json";
import prusament from "@/data/filaments/product-lines/prusament.json";
import colorfabb from "@/data/filaments/product-lines/colorfabb.json";
import fiberlogy from "@/data/filaments/product-lines/fiberlogy.json";
import fillamentum from "@/data/filaments/product-lines/fillamentum.json";
import spectrumFilaments from "@/data/filaments/product-lines/spectrum-filaments.json";
import kexcelled from "@/data/filaments/product-lines/kexcelled.json";
import r3d from "@/data/filaments/product-lines/r3d.json";
import aliz from "@/data/filaments/product-lines/aliz.json";
import mochuang from "@/data/filaments/product-lines/mochuang.json";

const BRAND_FILES = [
  bambuLab,
  sunlu,
  esun,
  polymaker,
  overture,
  prusament,
  colorfabb,
  fiberlogy,
  fillamentum,
  spectrumFilaments,
  kexcelled,
  r3d,
  aliz,
  mochuang,
] as const;

function loadAll(): FilamentProductLine[] {
  const all: FilamentProductLine[] = [];
  for (const brand of BRAND_FILES) {
    for (const line of brand.productLines) {
      all.push(line as FilamentProductLine);
    }
  }
  return Object.freeze([...all]) as FilamentProductLine[];
}

const _cached = loadAll();

export function getAllProductLines(): readonly FilamentProductLine[] {
  return _cached;
}

export function getProductLinesByBrand(
  brandId: string,
): readonly FilamentProductLine[] {
  return _cached.filter((l) => l.brandId === brandId);
}

export function getProductLinesByMaterial(
  materialType: string,
): readonly FilamentProductLine[] {
  return _cached.filter(
    (l) => l.materialType.toLowerCase() === materialType.toLowerCase(),
  );
}

export function getProductLinesBySeries(
  series: string | null,
): readonly FilamentProductLine[] {
  if (series === null) {
    return _cached.filter((l) => l.series === null);
  }
  return _cached.filter(
    (l) => l.series?.toLowerCase() === series.toLowerCase(),
  );
}

export function getProductLineById(
  id: string,
): FilamentProductLine | undefined {
  return _cached.find((l) => l.id === id);
}

export function getProductLineStats(): {
  totalProductLines: number;
  totalBrands: number;
  byMaterial: Record<string, number>;
  byVerificationStatus: Record<string, number>;
  uniqueIds: number;
} {
  const byMaterial: Record<string, number> = {};
  const byVerificationStatus: Record<string, number> = {};
  const ids = new Set<string>();

  for (const line of _cached) {
    byMaterial[line.materialType] =
      (byMaterial[line.materialType] || 0) + 1;
    byVerificationStatus[line.verificationStatus] =
      (byVerificationStatus[line.verificationStatus] || 0) + 1;
    ids.add(line.id);
  }

  const brandIds = new Set(_cached.map((l) => l.brandId));

  return {
    totalProductLines: _cached.length,
    totalBrands: brandIds.size,
    byMaterial,
    byVerificationStatus,
    uniqueIds: ids.size,
  };
}

export function getBrands(): string[] {
  return [...new Set(_cached.map((l) => l.brandId))].sort();
}

export function getMaterials(): string[] {
  return [...new Set(_cached.map((l) => l.materialType))].sort();
}
