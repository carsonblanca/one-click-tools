export const MATERIAL_TYPES = [
  "PLA", "PETG", "PET", "TPU", "ABS", "ASA", "PA", "PC",
  "PP", "PCTG", "TPE", "Composite", "PEEK", "PEI", "PVA", "HIPS", "Support", "Other",
] as const;

export const MATERIAL_VARIANTS: Record<string, string[]> = {
  PLA: ["Basic", "Matte", "Silk", "Metallic", "High Speed", "Tough", "Aero", "CF", "Glow", "Wood", "Marble", "Sparkle"],
  PETG: ["Basic", "HF", "High Speed", "CF", "GF", "Translucent", "ESD"],
  PET: ["Basic", "CF"],
  TPU: ["64D", "85A", "90A", "95A", "98A", "AMS Compatible"],
  ABS: ["Basic", "Transparent", "High Stability"],
  ASA: ["Basic"],
  PA: ["Basic", "CF", "GF"],
  PP: ["Basic", "GF"],
  PCTG: ["Basic"],
  TPE: ["Basic"],
  Composite: ["Basic", "CF", "GF"],
  PC: ["Basic"],
  PVA: ["Basic"],
  HIPS: ["Basic"],
  Support: ["Basic"],
  PEEK: ["Basic"],
  PEI: ["Basic"],
  Other: ["Basic"],
};

const MATERIAL_TOKENS = [
  "PETG", "TPU", "ABS", "ASA", "PEEK", "PEI", "PVA", "HIPS", "PCTG", "PLA", "PET", "PP", "PA", "PC", "TPE",
];

export function inferMaterialTypeFromName(name: string): string | null {
  const normalized = name.toUpperCase().replace(/[™®]/g, " ");
  return MATERIAL_TOKENS.find((token) => new RegExp(`(^|[^A-Z])${token}([^A-Z]|$)`).test(normalized)) || null;
}

export function normalizeMaterialType(value: unknown, productLineName = ""): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  const explicit = MATERIAL_TYPES.find((type) => type.toUpperCase() === normalized);
  if (explicit) return explicit;
  return inferMaterialTypeFromName(productLineName) || (normalized || "Other");
}

export function inferSurfaceFinishFromName(name: string, variant = ""): string {
  const text = `${name} ${variant}`.toLowerCase();
  if (text.includes("silk") || text.includes("丝绸")) return "silk";
  if (text.includes("matte") || text.includes("哑光") || /\b(?:pla|petg)[\s-]*m\b/i.test(text)) return "matte";
  if (text.includes("transparent") || text.includes("translucent") || text.includes("透明") || text.includes("半透明") || /\babs\s+t\b/i.test(text)) return "transparent";
  if (text.includes("sparkle") || text.includes("闪耀")) return "glossy";
  return "semi-glossy";
}
