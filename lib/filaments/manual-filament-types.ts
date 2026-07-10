export type ManualBrand = {
  brandId: string;
  brandName: string;
  brandNameZh: string;
  brandNameEn: string;
};

export const manualFilamentBrands: ManualBrand[] = [
  { brandId: "kexcelled", brandName: "Kexcelled", brandNameZh: "Kexcelled", brandNameEn: "Kexcelled" },
  { brandId: "aliz", brandName: "ALIZ", brandNameZh: "爱丽滋", brandNameEn: "ALIZ" },
  { brandId: "mochuang", brandName: "MOCHUANG", brandNameZh: "魔创", brandNameEn: "MOCHUANG" },
  { brandId: "r3d", brandName: "R3D", brandNameZh: "爱三迪", brandNameEn: "R3D" },
];

export type ManualParameterInput = {
  key: string;
  category: string;
  labelZh: string;
  labelEn: string;
  value: string;
  unit?: string;
  sourceStatus: "official" | "manual" | "missing";
  sourceNote?: string;
};

export type ManualColorInput = {
  id: string;
  colorNameZh: string;
  colorNameEn?: string;
  officialColorCode?: string;
  availability?: string;
  image?: {
    objectKey: string;
    url: string;
    fileName: string;
    contentType: string;
    size: number;
    displayMode: "contain" | "cover";
  } | null;
  note?: string;
};

export type ManualPresetInput = {
  id: string;
  name: string;
  fileName: string;
  objectKey: string;
  url: string;
  fileType: string;
  size: number;
  note?: string;
};

export function getManualBrand(brandId: string) {
  return manualFilamentBrands.find((brand) => brand.brandId === brandId) || null;
}

export function safeManualSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || fallback;
}
