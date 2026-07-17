export type ParameterCategory =
  | "规格"
  | "打印"
  | "物性"
  | "机械性能"
  | "热性能"
  | "干燥与兼容"
  | "料盘";

export type ParameterCandidateStatus =
  | "approved"
  | "candidate"
  | "conflict"
  | "sku_candidate"
  | "rejected"
  | "unmapped";

export type ParameterDefinition = {
  canonicalKey: string;
  zhCNLabel: string;
  aliases: readonly string[];
  defaultUnit: string | null;
  unitRules: readonly string[];
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
  unitRules: readonly string[] = defaultUnit ? [defaultUnit] : [],
): ParameterDefinition => ({
  canonicalKey,
  zhCNLabel,
  aliases,
  defaultUnit,
  unitRules,
  category,
  sortOrder,
  missingDisplay: "缺失/待补充",
});

// This is the sole authoritative parameter-name and display dictionary.
export const FILAMENT_PARAMETER_DEFINITIONS = Object.freeze([
  definition("filamentDiameter", "线径", ["diameter", "线径"], "mm", "规格", 10),
  definition("diameterOptions", "可选线径", ["线径选项"], "mm", "规格", 20),
  definition("diameterTolerance", "线径公差", ["tolerance", "公差", "直径公差"], "mm", "规格", 30),
  definition("netWeight", "净重", ["net_weight", "净重", "净含量"], "g", "规格", 40, ["g", "kg"]),
  definition("netWeightOptions", "可选净重", ["净重选项"], "kg", "规格", 50, ["g", "kg"]),
  definition("nozzleTemperature", "喷嘴温度", ["printingTemperature", "打印温度", "喷嘴温度"], "°C", "打印", 100),
  definition("bedTemperature", "热床温度", ["buildPlateTemperature", "热床温度"], "°C", "打印", 110),
  definition("printSpeed", "打印速度", ["recommendedPrintSpeed", "打印速度"], "mm/s", "打印", 120),
  definition("coolingFan", "冷却风扇", ["fan", "风扇", "冷却风扇"], "%", "打印", 130),
  definition("chamberTemperature", "腔体温度", ["chamberTemp", "腔体温度"], "°C", "打印", 140),
  definition("maxVolumetricSpeed", "最大体积流量", ["maxVolumetricSpeedMm3s", "最大体积流量"], "mm³/s", "打印", 150),
  definition("flowRatio", "流量比例", ["flow", "流量比例"], null, "打印", 160),
  definition("minNozzleDiameter", "最小喷嘴直径", ["minimumNozzleDiameter", "最小喷嘴直径"], "mm", "打印", 170),
  definition("retractionDistance", "回抽距离", ["retraction", "回抽距离"], "mm", "打印", 180),
  definition("retractionSpeed", "回抽速度", ["回抽速度"], "mm/s", "打印", 190),
  definition("density", "密度", ["密度"], "g/cm³", "物性", 200),
  definition("meltFlowIndex", "熔体流动速率", ["mfi", "MFI", "熔指", "熔体流动速率"], "g/10min", "物性", 210),
  definition("tensileStrength", "拉伸强度", ["拉伸强度"], "MPa", "机械性能", 300),
  definition("elongationAtBreak", "断裂伸长率", ["断裂伸长率"], "%", "机械性能", 310),
  definition("flexuralStrength", "弯曲强度", ["弯曲强度"], "MPa", "机械性能", 320),
  definition("flexuralModulus", "弯曲模量", ["弯曲模量"], "MPa", "机械性能", 330),
  definition("unnotchedImpactStrength", "无缺口冲击强度", ["无缺口冲击强度"], "kJ/m²", "机械性能", 340),
  definition("notchedImpactStrength", "缺口冲击强度", ["缺口冲击强度"], "kJ/m²", "机械性能", 350),
  definition("heatDeflectionTemperature", "热变形温度", ["hdt", "HDT", "热变形温度"], "°C", "热性能", 400),
  definition("vicatSofteningTemperature", "维卡软化温度", ["vicat", "Vicat", "维卡软化温度"], "°C", "热性能", 410),
  definition("dryingTemperature", "干燥温度", ["烘干温度", "干燥温度"], "°C", "干燥与兼容", 500),
  definition("dryingDuration", "干燥时长", ["烘干时长", "干燥时长"], "h", "干燥与兼容", 510),
  definition("amsCompatibility", "AMS 兼容性", ["AMS兼容", "AMS 兼容性"], null, "干燥与兼容", 520),
  definition("nozzleRequirement", "喷嘴要求", ["喷嘴要求"], null, "干燥与兼容", 530),
  definition("spoolOuterDiameter", "料盘外径", ["outerDiameter", "料盘外径"], "mm", "料盘", 600),
  definition("spoolWidth", "料盘宽度", ["width", "料盘宽度"], "mm", "料盘", 610),
  definition("spoolHubDiameter", "料盘中心孔直径", ["hubDiameter", "中心孔直径"], "mm", "料盘", 620),
  definition("emptySpoolWeight", "空料盘重量", ["emptySpoolWeightG", "空盘重量", "空料盘重量"], "g", "料盘", 630),
] as const);

const definitionByCanonicalKey = new Map(
  FILAMENT_PARAMETER_DEFINITIONS.map((item) => [item.canonicalKey, item]),
);
const canonicalByAlias = new Map<string, string>();
for (const item of FILAMENT_PARAMETER_DEFINITIONS) {
  canonicalByAlias.set(item.canonicalKey, item.canonicalKey);
  for (const alias of item.aliases) canonicalByAlias.set(alias, item.canonicalKey);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function boolean(value: unknown): boolean {
  return value === true || value === "true";
}

export function getParameterDefinition(key: unknown): ParameterDefinition | null {
  const canonicalKey = resolveCanonicalParameterKey(key);
  return canonicalKey ? definitionByCanonicalKey.get(canonicalKey) ?? null : null;
}

export function resolveCanonicalParameterKey(key: unknown): string | null {
  const raw = text(key);
  if (!raw) return null;
  return canonicalByAlias.get(raw) ?? null;
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

function candidateSourceType(candidate: Record<string, unknown>): string {
  const explicit = text(candidate.sourceType);
  if (explicit) return explicit;
  const sourceFile = text(candidate.sourceFile);
  if (boolean(candidate.skuVariantSpecific) || sourceFile === "color-mappings.json") return "sku";
  if (sourceFile.startsWith("ocr/")) return "ocr";
  if (sourceFile) return "structured_capture";
  return "unknown";
}

function candidateStatus(
  candidate: Record<string, unknown>,
  canonicalKey: string | null,
  sourceType: string,
): ParameterCandidateStatus {
  if (!canonicalKey) return "unmapped";
  const reviewStatus = text(candidate.reviewStatus).toLowerCase();
  if (
    reviewStatus === "rejected"
    || boolean(candidate.contaminated)
    || boolean(candidate.polluted)
    || sourceType === "contamination"
  ) return "rejected";
  if (
    reviewStatus === "conflict"
    || boolean(candidate.identityConflict)
    || boolean(candidate.productIdentityConflict)
  ) return "conflict";
  if (boolean(candidate.skuVariantSpecific) || sourceType === "sku") return "sku_candidate";
  if (
    ["approved", "confirmed", "official"].includes(reviewStatus)
    && candidate.publicVisible !== false
  ) return "approved";
  return "candidate";
}

export type NormalizedParameterCandidate = Record<string, unknown> & {
  canonicalKey: string | null;
  candidateStatus: ParameterCandidateStatus;
  sourceType: string;
  normalizedDisplayValue: string;
};

export function normalizeParameterCandidate(value: unknown): NormalizedParameterCandidate {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawKey = text(candidate.canonicalKey) || text(candidate.field) || text(candidate.key);
  const canonicalKey = resolveCanonicalParameterKey(rawKey);
  const sourceType = candidateSourceType(candidate);
  const candidateValue = normalizeParameterValue(candidate.normalizedValue)
    || normalizeParameterValue(candidate.rawValue)
    || normalizeParameterValue(candidate.value);
  const unit = text(candidate.unit);
  return {
    ...candidate,
    canonicalKey,
    candidateStatus: candidateStatus(candidate, canonicalKey, sourceType),
    sourceType,
    normalizedDisplayValue: candidateValue
      ? `${candidateValue}${unit ? ` ${unit}` : ""}`
      : "",
  };
}

export function fieldsAcceptedFromCandidates(candidates: unknown): Record<string, string> {
  if (!Array.isArray(candidates)) return {};
  return Object.fromEntries(candidates.flatMap((value) => {
    const candidate = normalizeParameterCandidate(value);
    return candidate.canonicalKey
      && candidate.candidateStatus === "approved"
      && candidate.normalizedDisplayValue
      ? [[candidate.canonicalKey, candidate.normalizedDisplayValue]]
      : [];
  }));
}

export type ParameterTemplateRow = {
  canonicalKey: string;
  zhCNLabel: string;
  category: ParameterCategory | "待归类";
  sortOrder: number;
  value: string;
  status: "field" | ParameterCandidateStatus | "missing";
  candidates: NormalizedParameterCandidate[];
  missingDisplay: string;
};

export function normalizeStoredParameters(value: unknown) {
  const parameters = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const normalizedFields = normalizeParameterFields(parameters.fields);
  const existingUnmapped = normalizeParameterFields(parameters.unmappedFields).unmappedFields;
  const candidates = Array.isArray(parameters.candidates)
    ? parameters.candidates.map(normalizeParameterCandidate)
    : [];
  const fields = normalizedFields.fields;
  const unmappedFields = { ...existingUnmapped, ...normalizedFields.unmappedFields };
  const candidatesByKey = new Map<string, NormalizedParameterCandidate[]>();
  for (const candidate of candidates) {
    const key = candidate.canonicalKey || `unmapped:${text(candidate.field) || text(candidate.key) || "unknown"}`;
    candidatesByKey.set(key, [...(candidatesByKey.get(key) || []), candidate]);
  }
  const rows: ParameterTemplateRow[] = FILAMENT_PARAMETER_DEFINITIONS.map((item) => {
    const matching = candidatesByKey.get(item.canonicalKey) || [];
    const strongest = matching.find((candidate) => candidate.candidateStatus === "conflict")
      || matching.find((candidate) => candidate.candidateStatus === "rejected")
      || matching.find((candidate) => candidate.candidateStatus === "sku_candidate")
      || matching.find((candidate) => candidate.candidateStatus === "candidate")
      || matching.find((candidate) => candidate.candidateStatus === "approved");
    return {
      canonicalKey: item.canonicalKey,
      zhCNLabel: item.zhCNLabel,
      category: item.category,
      sortOrder: item.sortOrder,
      value: fields[item.canonicalKey] || "",
      status: fields[item.canonicalKey] ? "field" : strongest?.candidateStatus || "missing",
      candidates: matching,
      missingDisplay: item.missingDisplay,
    };
  });
  for (const [key, rawValue] of Object.entries(unmappedFields)) {
    rows.push({
      canonicalKey: key,
      zhCNLabel: "待归类参数",
      category: "待归类",
      sortOrder: 10_000,
      value: rawValue,
      status: "unmapped",
      candidates: [],
      missingDisplay: "待人工归类",
    });
  }
  for (const [key, matching] of candidatesByKey) {
    if (!key.startsWith("unmapped:")) continue;
    rows.push({
      canonicalKey: key.slice("unmapped:".length),
      zhCNLabel: "待归类参数",
      category: "待归类",
      sortOrder: 10_000,
      value: "",
      status: "unmapped",
      candidates: matching,
      missingDisplay: "待人工归类",
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

export function visiblePublishedParameterFields(
  draftData: unknown,
  publicationStatus: unknown,
): Record<string, string> {
  if (!["directory_preview", "complete_profile", "published"].includes(text(publicationStatus))) {
    return {};
  }
  const data = draftData && typeof draftData === "object" && !Array.isArray(draftData)
    ? draftData as Record<string, unknown>
    : {};
  return normalizeStoredParameters(data.parameters).fields;
}
