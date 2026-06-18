export type CategoryNode = {
  id: string;
  labelZh: string;
  labelEn: string;
  children?: CategoryNode[];
};

export const MATERIAL_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "pla",
    labelZh: "PLA",
    labelEn: "PLA",
    children: [
      { id: "pla-basic",    labelZh: "基础",   labelEn: "Basic" },
      { id: "pla-matte",    labelZh: "哑光",   labelEn: "Matte" },
      { id: "pla-silk",     labelZh: "丝绸",   labelEn: "Silk" },
      { id: "pla-hs",       labelZh: "高速",   labelEn: "High Speed" },
      { id: "pla-cf",       labelZh: "碳纤",   labelEn: "CF" },
      { id: "pla-glow",     labelZh: "发光",   labelEn: "Glow" },
      { id: "pla-tough",    labelZh: "高韧性", labelEn: "Tough" },
      { id: "pla-metallic", labelZh: "金属质感", labelEn: "Metallic" },
      { id: "pla-marble",   labelZh: "大理石",  labelEn: "Marble" },
      { id: "pla-sparkle",  labelZh: "闪耀",    labelEn: "Sparkle" },
      { id: "pla-wood",     labelZh: "木质",    labelEn: "Wood" },
    ],
  },
  {
    id: "petg",
    labelZh: "PETG",
    labelEn: "PETG",
    children: [
      { id: "petg-basic",   labelZh: "基础",   labelEn: "Basic" },
      { id: "petg-hf",      labelZh: "HF",     labelEn: "HF" },
      { id: "petg-cf",      labelZh: "碳纤",   labelEn: "CF" },
      { id: "petg-gf",      labelZh: "玻纤",   labelEn: "GF" },
    ],
  },
  {
    id: "tpu",
    labelZh: "TPU",
    labelEn: "TPU",
    children: [
      { id: "tpu-basic",    labelZh: "基础",   labelEn: "Basic" },
      { id: "tpu-ams",      labelZh: "AMS 兼容", labelEn: "AMS Compatible" },
    ],
  },
  { id: "abs",       labelZh: "ABS",       labelEn: "ABS" },
  { id: "asa",       labelZh: "ASA",       labelEn: "ASA" },
  { id: "pa",        labelZh: "PA (尼龙)", labelEn: "PA (Nylon)" },
  { id: "pc",        labelZh: "PC",        labelEn: "PC" },
  { id: "support",   labelZh: "支撑材料",   labelEn: "Support" },
  { id: "other",     labelZh: "其他",       labelEn: "Other" },
];

export const BRAND_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "bambu-lab",
    labelZh: "Bambu Lab",
    labelEn: "Bambu Lab",
    children: [
      { id: "bambu-pla",     labelZh: "PLA",      labelEn: "PLA" },
      { id: "bambu-petg",    labelZh: "PETG",     labelEn: "PETG" },
      { id: "bambu-pa",      labelZh: "PA",       labelEn: "PA" },
      { id: "bambu-support", labelZh: "支撑材料", labelEn: "Support" },
    ],
  },
  {
    id: "r3d",
    labelZh: "R3D",
    labelEn: "R3D",
    children: [
      { id: "r3d-petg", labelZh: "PETG", labelEn: "PETG" },
      { id: "r3d-tpu",  labelZh: "TPU",  labelEn: "TPU" },
    ],
  },
  {
    id: "jayo",
    labelZh: "JAYO",
    labelEn: "JAYO",
    children: [
      { id: "jayo-pla",  labelZh: "PLA",  labelEn: "PLA" },
      { id: "jayo-petg", labelZh: "PETG", labelEn: "PETG" },
    ],
  },
  {
    id: "sunlu",
    labelZh: "SUNLU",
    labelEn: "SUNLU",
    children: [
      { id: "sunlu-pla",  labelZh: "PLA",  labelEn: "PLA" },
      { id: "sunlu-petg", labelZh: "PETG", labelEn: "PETG" },
      { id: "sunlu-tpu",  labelZh: "TPU",  labelEn: "TPU" },
    ],
  },
  {
    id: "esun",
    labelZh: "eSUN",
    labelEn: "eSUN",
    children: [
      { id: "esun-pla",  labelZh: "PLA",  labelEn: "PLA" },
      { id: "esun-petg", labelZh: "PETG", labelEn: "PETG" },
      { id: "esun-abs",  labelZh: "ABS",  labelEn: "ABS" },
    ],
  },
  {
    id: "kexcelled",
    labelZh: "Kexcelled",
    labelEn: "Kexcelled",
    children: [
      { id: "kexcelled-pla", labelZh: "PLA", labelEn: "PLA" },
      { id: "kexcelled-petg", labelZh: "PETG", labelEn: "PETG" },
    ],
  },
  {
    id: "generic",
    labelZh: "Generic",
    labelEn: "Generic",
    children: [
      { id: "generic-pla",  labelZh: "PLA",  labelEn: "PLA" },
      { id: "generic-petg", labelZh: "PETG", labelEn: "PETG" },
      { id: "generic-asa",  labelZh: "ASA",  labelEn: "ASA" },
    ],
  },
];

export function flattenTree(nodes: CategoryNode[]): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    result.push(n.id);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

export function findNodeById(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function filterByMaterial(id: string): { materialType: string; variant: string | null } {
  const parts = id.split("-");
  return { materialType: parts[0]?.toUpperCase() ?? "", variant: parts.slice(1).join("-") || null };
}
