export type BrandEntry = {
  id: string;
  name: string;
  nameZh: string;
  aliases: string[];
  popularityRank: number;
  filamentCount: number;
  verificationStatus: "verified" | "pending";
};

export type BrandSort = "popular" | "a-z" | "z-a" | "count";

export const BRAND_CATALOG: BrandEntry[] = [
  { id: "bambu-lab",   name: "Bambu Lab",   nameZh: "Bambu Lab", aliases: ["拓竹", "bambu"], popularityRank: 1,  filamentCount: 6, verificationStatus: "verified" },
  { id: "sunlu",       name: "SUNLU",       nameZh: "SUNLU", aliases: ["三绿", "sunlu"], popularityRank: 2,  filamentCount: 1, verificationStatus: "verified" },
  { id: "esun",        name: "eSUN",        nameZh: "eSUN", aliases: ["易生", "esun"], popularityRank: 3,  filamentCount: 2, verificationStatus: "verified" },
  { id: "polymaker",   name: "Polymaker",   nameZh: "Polymaker", aliases: ["polymaker"], popularityRank: 4,  filamentCount: 0, verificationStatus: "verified" },
  { id: "overture",    name: "Overture",    nameZh: "Overture", aliases: ["overture"], popularityRank: 5,  filamentCount: 0, verificationStatus: "verified" },
  { id: "jayo",        name: "JAYO",        nameZh: "JAYO", aliases: ["jayo"], popularityRank: 6,  filamentCount: 1, verificationStatus: "verified" },
  { id: "r3d",         name: "R3D",         nameZh: "R3D", aliases: ["r3d"], popularityRank: 7,  filamentCount: 2, verificationStatus: "pending" },
  { id: "kexcelled",   name: "Kexcelled",   nameZh: "Kexcelled", aliases: ["kexcelled"], popularityRank: 8,  filamentCount: 1, verificationStatus: "verified" },
  { id: "prusament",   name: "Prusament",   nameZh: "Prusament", aliases: ["prusa", "prusament"], popularityRank: 9,  filamentCount: 0, verificationStatus: "verified" },
  { id: "colorfabb",   name: "ColorFabb",   nameZh: "ColorFabb", aliases: ["colorfabb"], popularityRank: 10, filamentCount: 0, verificationStatus: "verified" },
  { id: "fiberlogy",   name: "Fiberlogy",   nameZh: "Fiberlogy", aliases: ["fiberlogy"], popularityRank: 11, filamentCount: 0, verificationStatus: "verified" },
  { id: "hatchbox",    name: "Hatchbox",    nameZh: "Hatchbox", aliases: ["hatchbox"], popularityRank: 12, filamentCount: 0, verificationStatus: "pending" },
  { id: "matterhackers", name: "MatterHackers", nameZh: "MatterHackers", aliases: ["matterhackers"], popularityRank: 13, filamentCount: 0, verificationStatus: "verified" },
  { id: "formfutura",  name: "FormFutura",  nameZh: "FormFutura", aliases: ["formfutura"], popularityRank: 14, filamentCount: 0, verificationStatus: "verified" },
  { id: "basf-ultrafuse", name: "BASF Ultrafuse", nameZh: "BASF Ultrafuse", aliases: ["basf", "ultrafuse"], popularityRank: 15, filamentCount: 0, verificationStatus: "verified" },
  { id: "fillamentum", name: "Fillamentum", nameZh: "Fillamentum", aliases: ["fillamentum"], popularityRank: 16, filamentCount: 0, verificationStatus: "verified" },
  { id: "flashforge",  name: "Flashforge",  nameZh: "Flashforge", aliases: ["flashforge", "闪铸"], popularityRank: 17, filamentCount: 0, verificationStatus: "verified" },
  { id: "creality",    name: "Creality",    nameZh: "Creality", aliases: ["creality", "创想三维"], popularityRank: 18, filamentCount: 0, verificationStatus: "verified" },
  { id: "anycubic",    name: "Anycubic",    nameZh: "Anycubic", aliases: ["anycubic", "纵维立方"], popularityRank: 19, filamentCount: 0, verificationStatus: "verified" },
  { id: "elegoo",      name: "ELEGOO",      nameZh: "ELEGOO", aliases: ["elegoo", "elegoo mars"], popularityRank: 20, filamentCount: 0, verificationStatus: "verified" },
  { id: "geeetech",    name: "Geeetech",    nameZh: "Geeetech", aliases: ["geeetech"], popularityRank: 21, filamentCount: 0, verificationStatus: "verified" },
  { id: "ziro",        name: "ZIRO",        nameZh: "ZIRO", aliases: ["ziro"], popularityRank: 22, filamentCount: 0, verificationStatus: "verified" },
  { id: "amolen",      name: "AMOLEN",      nameZh: "AMOLEN", aliases: ["amolen"], popularityRank: 23, filamentCount: 0, verificationStatus: "verified" },
  { id: "eryone",      name: "Eryone",      nameZh: "Eryone", aliases: ["eryone"], popularityRank: 24, filamentCount: 0, verificationStatus: "verified" },
  { id: "duramic",     name: "Duramic",     nameZh: "Duramic", aliases: ["duramic"], popularityRank: 25, filamentCount: 0, verificationStatus: "verified" },
  { id: "inland",      name: "Inland",      nameZh: "Inland", aliases: ["inland"], popularityRank: 26, filamentCount: 0, verificationStatus: "pending" },
  { id: "proto-pasta", name: "Proto-pasta", nameZh: "Proto-pasta", aliases: ["protopasta", "proto pasta"], popularityRank: 27, filamentCount: 0, verificationStatus: "verified" },
  { id: "atomic-filament", name: "Atomic Filament", nameZh: "Atomic Filament", aliases: ["atomic"], popularityRank: 28, filamentCount: 0, verificationStatus: "verified" },
  { id: "3dxtech",     name: "3DXTECH",     nameZh: "3DXTECH", aliases: ["3dxtech"], popularityRank: 29, filamentCount: 0, verificationStatus: "verified" },
  { id: "ninjatek",    name: "NinjaTek",    nameZh: "NinjaTek", aliases: ["ninjatek", "ninjaflex"], popularityRank: 30, filamentCount: 0, verificationStatus: "verified" },
  { id: "recreus",     name: "Recreus",     nameZh: "Recreus", aliases: ["recreus"], popularityRank: 31, filamentCount: 0, verificationStatus: "verified" },
  { id: "spectrum-filaments", name: "Spectrum Filaments", nameZh: "Spectrum Filaments", aliases: ["spectrum"], popularityRank: 32, filamentCount: 0, verificationStatus: "verified" },
  { id: "generic",     name: "Generic",     nameZh: "Generic", aliases: ["generic", "通用"], popularityRank: 99, filamentCount: 1, verificationStatus: "verified" },
];

export function sortBrands(brands: BrandEntry[], sort: BrandSort): BrandEntry[] {
  const sorted = [...brands];
  switch (sort) {
    case "popular":
      sorted.sort((a, b) => a.popularityRank - b.popularityRank);
      break;
    case "a-z":
      sorted.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      break;
    case "z-a":
      sorted.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
      break;
    case "count":
      sorted.sort((a, b) => b.filamentCount - a.filamentCount || a.popularityRank - b.popularityRank);
      break;
  }
  return sorted;
}

export function searchBrands(brands: BrandEntry[], query: string): BrandEntry[] {
  if (!query.trim()) return brands;
  const q = query.toLowerCase().trim();
  return brands.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.nameZh.toLowerCase().includes(q) ||
      b.aliases.some((a) => a.toLowerCase().includes(q)),
  );
}

export function getBrandCatalog() {
  return [...BRAND_CATALOG];
}
