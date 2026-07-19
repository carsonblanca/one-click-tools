export type ParameterCategory = "基础" | "打印" | "物性" | "机械性能" | "热性能" | "干燥";

export type ParameterDefinition = {
  canonicalKey: string;
  zhCNLabel: string;
  aliases: readonly string[];
  defaultUnit: string | null;
  category: ParameterCategory;
  sortOrder: number;
  missingDisplay: "缺失/待补充";
};

const definition = (
  canonicalKey: string,
  zhCNLabel: string,
  aliases: readonly string[],
  defaultUnit: string | null,
  category: ParameterCategory,
  sortOrder: number,
): ParameterDefinition => ({
  canonicalKey,
  zhCNLabel,
  aliases,
  defaultUnit,
  category,
  sortOrder,
  missingDisplay: "缺失/待补充",
});

// The sole authoritative mapping for the first-stage core parameter set.
export const FILAMENT_PARAMETER_DEFINITIONS = Object.freeze([
  definition("materialType", "材料类型", ["material", "材料", "材料类型"], null, "基础", 10),
  definition("filamentDiameter", "线径", ["diameter", "线径"], "mm", "基础", 20),
  definition("netWeight", "净重", ["net_weight", "净重", "净含量"], "g", "基础", 30),
  definition("density", "密度", ["密度"], "g/cm³", "物性", 40),
  definition("diameterTolerance", "线径公差", ["tolerance", "公差", "直径公差"], "mm", "基础", 50),
  definition("meltFlowIndex", "熔融指数", ["mfi", "MFI", "熔融指数", "熔体流动速率"], "g/10min", "物性", 60),
  definition("nozzleTemperature", "喷嘴温度", ["printingTemperature", "打印温度", "喷嘴温度"], "°C", "打印", 100),
  definition("bedTemperature", "热床温度", ["buildPlateTemperature", "热床温度"], "°C", "打印", 110),
  definition("printingSpeed", "打印速度", ["printSpeed", "recommendedPrintSpeed", "打印速度"], "mm/s", "打印", 120),
  definition("tensileStrength", "拉伸强度", ["拉伸强度"], "MPa", "机械性能", 200),
  definition("elongationAtBreak", "断裂伸长率", ["断裂伸长率"], "%", "机械性能", 210),
  definition("impactStrength", "冲击强度", ["冲击强度"], "kJ/m²", "机械性能", 220),
  definition("unnotchedImpactStrength", "无缺口冲击强度", ["无缺口冲击强度"], "kJ/m²", "机械性能", 221),
  definition("notchedImpactStrength", "缺口冲击强度", ["缺口冲击强度"], "kJ/m²", "机械性能", 222),
  definition("flexuralStrength", "弯曲强度", ["弯曲强度"], "MPa", "机械性能", 230),
  definition("flexuralModulus", "弯曲模量", ["弯曲模量"], "MPa", "机械性能", 240),
  definition("heatDeflectionTemperature", "热变形温度", ["hdt", "HDT", "热变形温度"], "°C", "热性能", 300),
  definition("vicatSofteningTemperature", "维卡软化温度", ["vicat", "Vicat", "维卡软化温度"], "°C", "热性能", 310),
  definition("dryingTemperature", "干燥温度", ["烘干温度", "干燥温度"], "°C", "干燥", 400),
  definition("dryingTime", "干燥时间", ["dryingDuration", "烘干时长", "干燥时长", "干燥时间"], "h", "干燥", 410),
] as const);

const definitionByCanonicalKey = new Map(
  FILAMENT_PARAMETER_DEFINITIONS.map((item) => [item.canonicalKey, item]),
);
const canonicalByAlias = new Map<string, string>();
for (const item of FILAMENT_PARAMETER_DEFINITIONS) {
  for (const alias of [item.canonicalKey, ...item.aliases]) {
    canonicalByAlias.set(alias, item.canonicalKey);
    canonicalByAlias.set(alias.toLowerCase(), item.canonicalKey);
  }
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function boolean(value: unknown): boolean {
  return value === true || value === "true";
}

export function resolveCanonicalParameterKey(key: unknown): string | null {
  const raw = text(key);
  return raw ? canonicalByAlias.get(raw) ?? canonicalByAlias.get(raw.toLowerCase()) ?? null : null;
}

export function getParameterDefinition(key: unknown): ParameterDefinition | null {
  const canonicalKey = resolveCanonicalParameterKey(key);
  return canonicalKey ? definitionByCanonicalKey.get(canonicalKey) ?? null : null;
}

export function normalizeParameterValue(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}

export function normalizeParameterFields(value: unknown): {
  fields: Record<string, string>;
  unmappedFields: Record<string, string>;
} {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const fields: Record<string, string> = {};
  const unmappedFields: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const normalizedValue = normalizeParameterValue(rawValue);
    if (!normalizedValue) continue;
    const canonicalKey = resolveCanonicalParameterKey(rawKey);
    if (canonicalKey) fields[canonicalKey] = normalizedValue;
    else unmappedFields[rawKey] = normalizedValue;
  }
  return { fields, unmappedFields };
}

function candidateDisplayValue(candidate: Record<string, unknown>): string {
  const value = normalizeParameterValue(candidate.normalizedValue)
    || normalizeParameterValue(candidate.rawValue)
    || normalizeParameterValue(candidate.value);
  const unit = text(candidate.unit);
  if (!value || !unit || value.toLowerCase().endsWith(unit.toLowerCase())) return value;
  return `${value} ${unit}`;
}

export type NormalizedParameterCandidate = Record<string, unknown> & {
  canonicalKey: string | null;
  rawKey: string;
  displayLabel: string;
  normalizedDisplayValue: string;
};

export function normalizeParameterCandidate(value: unknown): NormalizedParameterCandidate {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawKey = text(candidate.canonicalKey) || text(candidate.field) || text(candidate.key);
  const canonicalKey = resolveCanonicalParameterKey(rawKey);
  return {
    ...candidate,
    canonicalKey,
    rawKey,
    displayLabel: canonicalKey
      ? definitionByCanonicalKey.get(canonicalKey)?.zhCNLabel ?? rawKey
      : rawKey || "未知参数",
    normalizedDisplayValue: candidateDisplayValue(candidate),
  };
}

function isTrustedCandidate(candidate: Record<string, unknown>): boolean {
  const reviewStatus = text(candidate.reviewStatus).toLowerCase();
  const isRejected = ["rejected", "conflict"].includes(reviewStatus)
    || boolean(candidate.skuVariantSpecific)
    || candidate.publicVisible === false
    || boolean(candidate.contaminated)
    || boolean(candidate.polluted)
    || boolean(candidate.identityConflict)
    || boolean(candidate.productIdentityConflict);
  const isApproved = ["approved", "confirmed", "official"].includes(reviewStatus)
    || boolean(candidate.trusted)
    || boolean(candidate.accepted);
  return isApproved && !isRejected;
}

export function fieldsAcceptedFromCandidates(candidates: unknown): Record<string, string> {
  if (!Array.isArray(candidates)) return {};
  return Object.fromEntries(candidates.flatMap((value) => {
    const candidate = normalizeParameterCandidate(value);
    return candidate.canonicalKey
      && candidate.normalizedDisplayValue
      && isTrustedCandidate(candidate)
      ? [[candidate.canonicalKey, candidate.normalizedDisplayValue]]
      : [];
  }));
}

export type ParameterTemplateRow = {
  canonicalKey: string;
  zhCNLabel: string;
  category: ParameterCategory | "其他";
  sortOrder: number;
  value: string;
  status: "field" | "missing" | "unmapped";
  missingDisplay: string;
};

export function normalizeStoredParameters(value: unknown) {
  const parameters = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const normalizedFields = normalizeParameterFields(parameters.fields);
  const normalizedExistingUnmapped = normalizeParameterFields(parameters.unmappedFields);
  const fields = {
    ...normalizedExistingUnmapped.fields,
    ...normalizedFields.fields,
  };
  const unmappedFields = {
    ...normalizedExistingUnmapped.unmappedFields,
    ...normalizedFields.unmappedFields,
  };
  const candidates = Array.isArray(parameters.candidates)
    ? parameters.candidates.map(normalizeParameterCandidate)
    : [];
  const rows: ParameterTemplateRow[] = FILAMENT_PARAMETER_DEFINITIONS.map((item) => ({
    canonicalKey: item.canonicalKey,
    zhCNLabel: item.zhCNLabel,
    category: item.category,
    sortOrder: item.sortOrder,
    value: fields[item.canonicalKey] || "",
    status: fields[item.canonicalKey] ? "field" : "missing",
    missingDisplay: item.missingDisplay,
  }));
  for (const [rawKey, rawValue] of Object.entries(unmappedFields)) {
    rows.push({
      canonicalKey: rawKey,
      zhCNLabel: rawKey,
      category: "其他",
      sortOrder: 10_000,
      value: rawValue,
      status: "unmapped",
      missingDisplay: "缺失/待补充",
    });
  }
  return {
    fields,
    candidates,
    unmappedFields,
    rows,
    status: Object.keys(fields).length ? "official_partial" : "missing",
  };
}
