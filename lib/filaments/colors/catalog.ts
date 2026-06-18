import type { FilamentColorSku } from "./types";

import plaBasic from "@/data/filaments/colors/bambu-lab/pla-basic.json";
import plaMatte from "@/data/filaments/colors/bambu-lab/pla-matte.json";
import plaSilkPlus from "@/data/filaments/colors/bambu-lab/pla-silk-plus.json";
import plaAero from "@/data/filaments/colors/bambu-lab/pla-aero.json";
import plaCf from "@/data/filaments/colors/bambu-lab/pla-cf.json";
import plaGlow from "@/data/filaments/colors/bambu-lab/pla-glow.json";
import plaMarble from "@/data/filaments/colors/bambu-lab/pla-marble.json";
import plaWood from "@/data/filaments/colors/bambu-lab/pla-wood.json";
import plaMetal from "@/data/filaments/colors/bambu-lab/pla-metal.json";
import petgHf from "@/data/filaments/colors/bambu-lab/petg-hf.json";
import petgBasic from "@/data/filaments/colors/bambu-lab/petg-basic.json";
import petgTranslucent from "@/data/filaments/colors/bambu-lab/petg-translucent.json";
import petgCf from "@/data/filaments/colors/bambu-lab/petg-cf.json";
import abs from "@/data/filaments/colors/bambu-lab/abs.json";
import asa from "@/data/filaments/colors/bambu-lab/asa.json";
import tpu from "@/data/filaments/colors/bambu-lab/tpu.json";
import paCf from "@/data/filaments/colors/bambu-lab/pa-cf.json";
import pa6Cf from "@/data/filaments/colors/bambu-lab/pa6-cf.json";
import pahtCf from "@/data/filaments/colors/bambu-lab/paht-cf.json";
import pc from "@/data/filaments/colors/bambu-lab/pc.json";
import pva from "@/data/filaments/colors/bambu-lab/pva.json";
import supportPla from "@/data/filaments/colors/bambu-lab/support-pla.json";
import supportPetg from "@/data/filaments/colors/bambu-lab/support-petg.json";
import k5pla from "@/data/filaments/colors/kexcelled/k5-pla.json";
import k5plam from "@/data/filaments/colors/kexcelled/k5-pla-m.json";
import k6pla from "@/data/filaments/colors/kexcelled/k6-pla.json";
import k5plap from "@/data/filaments/colors/kexcelled/k5-pla-p.json";
import k5petggf from "@/data/filaments/colors/kexcelled/k5-petg-gf.json";
import k5plamagic from "@/data/filaments/colors/kexcelled/k5-pla-magic.json";
import k6placf10 from "@/data/filaments/colors/kexcelled/k6-pla-cf10.json";
import k5placf from "@/data/filaments/colors/kexcelled/k5-pla-cf.json";
import k5plasparkle from "@/data/filaments/colors/kexcelled/k5-pla-sparkle.json";
import k5wood from "@/data/filaments/colors/kexcelled/k5-wood.json";
import k5placc from "@/data/filaments/colors/kexcelled/k5-pla-cc.json";

const COLOR_FILES = [
  plaBasic,
  plaMatte,
  plaSilkPlus,
  plaAero,
  plaCf,
  plaGlow,
  plaMarble,
  plaWood,
  plaMetal,
  petgHf,
  petgBasic,
  petgTranslucent,
  petgCf,
  abs,
  asa,
  tpu,
  paCf,
  pa6Cf,
  pahtCf,
  pc,
  pva,
  supportPla,
  supportPetg,
  k5pla,
  k5plam,
  k6pla,
  k5plap,
  k5petggf,
  k5plamagic,
  k6placf10,
  k5placf,
  k5plasparkle,
  k5wood,
  k5placc,
] as const;

function loadAll(): FilamentColorSku[] {
  const all: FilamentColorSku[] = [];
  for (const file of COLOR_FILES) {
    for (const color of file.colors) {
      all.push(color as FilamentColorSku);
    }
  }
  return Object.freeze([...all]) as FilamentColorSku[];
}

const _cached = loadAll();

export function getAllFilamentColors(): readonly FilamentColorSku[] {
  return _cached;
}

export function getColorsByProductLine(
  productLineId: string,
): readonly FilamentColorSku[] {
  return _cached.filter((c) => c.productLineId === productLineId);
}

export function getColorsByBrand(
  brandId: string,
): readonly FilamentColorSku[] {
  return _cached.filter((c) => c.brandId === brandId);
}

export function getColorById(
  id: string,
): FilamentColorSku | undefined {
  return _cached.find((c) => c.id === id);
}

export function getColorStats(): {
  totalColors: number;
  totalBrands: number;
  byProductLine: Record<string, number>;
  byVerificationStatus: Record<string, number>;
  byColorValueSource: Record<string, number>;
  uniqueIds: number;
} {
  const byProductLine: Record<string, number> = {};
  const byVerificationStatus: Record<string, number> = {};
  const byColorValueSource: Record<string, number> = {};
  const ids = new Set<string>();

  for (const c of _cached) {
    byProductLine[c.productLineId] =
      (byProductLine[c.productLineId] || 0) + 1;
    byVerificationStatus[c.verificationStatus] =
      (byVerificationStatus[c.verificationStatus] || 0) + 1;
    byColorValueSource[c.colorValueSource] =
      (byColorValueSource[c.colorValueSource] || 0) + 1;
    ids.add(c.id);
  }

  const brandIds = new Set(_cached.map((c) => c.brandId));

  return {
    totalColors: _cached.length,
    totalBrands: brandIds.size,
    byProductLine,
    byVerificationStatus,
    byColorValueSource,
    uniqueIds: ids.size,
  };
}

export function getCoveredProductLines(): string[] {
  return [...new Set(_cached.map((c) => c.productLineId))].sort();
}
