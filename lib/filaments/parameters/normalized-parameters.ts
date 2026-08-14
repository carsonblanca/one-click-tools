export type ParameterCategory = "基础" | "打印" | "物性" | "机械性能" | "热性能" | "干燥";

export const FILAMENT_PARAMETER_SCHEMA_VERSION = "oneclick.filament-parameters.v1";

export type ParameterUnitFamily =
  | "text" | "length" | "mass" | "density" | "flow-index" | "temperature"
  | "percent" | "speed" | "volumetric-speed" | "pressure" | "impact" | "time";

export type ParameterValueType = "text" | "number" | "range" | "number_or_range" | "number_range_or_text";

export type ParameterDefinition = {
  canonicalKey: string;
  labelZh: string;
  labelEn: string;
  aliasesZh: readonly string[];
  aliasesEn: readonly string[];
  unitFamily: ParameterUnitFamily;
  typicalUnits: readonly string[];
  valueType: ParameterValueType;
  rangeAllowed: boolean;
  textAllowed: boolean;
  reasonableRange: Readonly<{ min: number; max: number }> | null;
  zhCNLabel: string;
  aliases: readonly string[];
  defaultUnit: string | null;
  category: ParameterCategory;
  sortOrder: number;
  missingDisplay: "缺失/待补充";
};

const definition = (
  canonicalKey: string,
  labelZh: string,
  labelEn: string,
  aliasesZh: readonly string[],
  aliasesEn: readonly string[],
  defaultUnit: string | null,
  unitFamily: ParameterUnitFamily,
  valueType: ParameterValueType,
  rangeAllowed: boolean,
  textAllowed: boolean,
  reasonableRange: Readonly<{ min: number; max: number }> | null,
  category: ParameterCategory,
  sortOrder: number,
): ParameterDefinition => ({
  canonicalKey,
  labelZh,
  labelEn,
  aliasesZh,
  aliasesEn,
  unitFamily,
  typicalUnits: defaultUnit ? [defaultUnit] : [],
  valueType,
  rangeAllowed,
  textAllowed,
  reasonableRange,
  zhCNLabel: labelZh,
  aliases: [...aliasesZh, ...aliasesEn],
  defaultUnit,
  category,
  sortOrder,
  missingDisplay: "缺失/待补充",
});

// The sole authoritative mapping for the first-stage core parameter set.
export const FILAMENT_PARAMETER_DEFINITIONS = Object.freeze([
  definition("materialType", "材料类型", "Material type", ["材质", "材料", "材料类型"], ["material", "material type"], null, "text", "text", false, true, null, "基础", 10),
  definition("filamentDiameter", "线径", "Filament diameter", ["线径", "丝径", "耗材直径"], ["diameter", "filament diameter"], "mm", "length", "number", false, false, { min: 0.1, max: 10 }, "基础", 20),
  definition("netWeight", "净重", "Net weight", ["净重", "线材净重", "净含量", "重量"], ["net_weight", "net weight"], "g", "mass", "number_or_range", true, false, { min: 1, max: 100000 }, "基础", 30),
  definition("density", "密度", "Density", ["密度"], ["density"], "g/cm³", "density", "number_or_range", true, false, { min: 0.1, max: 10 }, "物性", 40),
  definition("diameterTolerance", "线径公差", "Diameter tolerance", ["线径公差", "公差", "直径公差"], ["tolerance", "diameter tolerance"], "mm", "length", "number_or_range", true, false, { min: 0, max: 2 }, "基础", 50),
  definition("meltFlowIndex", "熔融指数", "Melt flow index", ["熔融指数", "熔体流动指数", "熔融流动指数", "熔体流动速率"], ["mfi", "mfr", "melt flow index", "melt flow rate"], "g/10min", "flow-index", "number_or_range", true, false, { min: 0, max: 1000 }, "物性", 60),
  definition("chamberTemperature", "腔室温度", "Chamber temperature", ["腔室温度", "腔体温度"], ["chamber temperature", "ambient chamber temperature"], "°C", "temperature", "number_range_or_text", true, true, { min: -50, max: 500 }, "打印", 90),
  definition("nozzleTemperature", "喷嘴温度", "Nozzle temperature", ["打印温度", "喷嘴温度", "喷头温度", "挤出温度"], ["printingTemperature", "nozzle temperature", "printing temperature"], "°C", "temperature", "number_or_range", true, false, { min: 0, max: 500 }, "打印", 100),
  definition("nozzleDiameter", "喷嘴口径", "Nozzle diameter", ["喷嘴口径", "喷嘴直径"], ["nozzle diameter"], "mm", "length", "number_or_range", true, false, { min: 0.1, max: 10 }, "打印", 105),
  definition("bedTemperature", "热床温度", "Bed temperature", ["底板温度", "底盘温度", "平台温度", "热床温度"], ["buildPlateTemperature", "bed temperature", "build plate temperature"], "°C", "temperature", "number_range_or_text", true, true, { min: -50, max: 300 }, "打印", 110),
  definition("coolingFan", "冷却风扇", "Cooling fan", ["冷却风扇", "风扇", "风扇速度"], ["cooling fan", "fan speed"], "%", "percent", "number_or_range", true, false, { min: 0, max: 100 }, "打印", 115),
  definition("printingSpeed", "打印速度", "Printing speed", ["打印速度", "打印速率"], ["printSpeed", "recommendedPrintSpeed", "print speed", "printing speed"], "mm/s", "speed", "number_or_range", true, false, { min: 0, max: 2000 }, "打印", 120),
  definition("maxVolumetricSpeed", "最大体积速度", "Maximum volumetric speed", ["最大体积速度", "最大体积流量"], ["max volumetric speed", "maximum volumetric speed", "maxVolumetricSpeedMm3s"], "mm³/s", "volumetric-speed", "number_or_range", true, false, { min: 0, max: 500 }, "打印", 125),
  definition("retractionDistance", "回抽距离", "Retraction distance", ["回抽距离", "回抽长度", "回抽上距离"], ["retraction distance"], "mm", "length", "number_or_range", true, false, { min: 0, max: 100 }, "打印", 130),
  definition("retractionSpeed", "回抽速度", "Retraction speed", ["回抽速度"], ["retraction speed"], "mm/s", "speed", "number_or_range", true, false, { min: 0, max: 500 }, "打印", 140),
  definition("buildPlateSurface", "底板材质", "Build plate surface", ["底板材质", "平台材质", "打印平台"], ["build plate surface", "build plate material"], null, "text", "text", false, true, null, "打印", 150),
  definition("tensileStrength", "拉伸强度", "Tensile strength", ["拉伸强度", "抗拉强度"], ["tensile strength"], "MPa", "pressure", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 200),
  definition("elongationAtBreak", "断裂伸长率", "Elongation at break", ["断裂伸长率", "断裂延伸率", "拉伸断裂伸长率"], ["elongation at break"], "%", "percent", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 210),
  definition("impactStrength", "冲击强度", "Impact strength", ["冲击强度"], ["impact strength"], "kJ/m²", "impact", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 220),
  definition("unnotchedImpactStrength", "无缺口冲击强度", "Unnotched impact strength", ["无缺口冲击强度"], ["unnotched impact strength"], "kJ/m²", "impact", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 221),
  definition("notchedImpactStrength", "缺口冲击强度", "Notched impact strength", ["缺口冲击强度", "有缺口冲击强度"], ["notched impact strength"], "kJ/m²", "impact", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 222),
  definition("flexuralStrength", "弯曲强度", "Flexural strength", ["弯曲强度"], ["flexural strength"], "MPa", "pressure", "number_or_range", true, false, { min: 0, max: 10000 }, "机械性能", 230),
  definition("flexuralModulus", "弯曲模量", "Flexural modulus", ["弯曲模量"], ["flexural modulus"], "MPa", "pressure", "number_or_range", true, false, { min: 0, max: 100000 }, "机械性能", 240),
  definition("heatDeflectionTemperature", "热变形温度", "Heat deflection temperature", ["热变形温度", "热变形温度HDT"], ["hdt", "heat deflection temperature"], "°C", "temperature", "number_or_range", true, false, { min: -50, max: 500 }, "热性能", 300),
  definition("vicatSofteningTemperature", "维卡软化温度", "Vicat softening temperature", ["维卡软化温度", "维卡温度"], ["vicat", "vicat softening temperature"], "°C", "temperature", "number_or_range", true, false, { min: -50, max: 500 }, "热性能", 310),
  definition("dryingTemperature", "干燥温度", "Drying temperature", ["烘干温度", "干燥温度"], ["drying temperature"], "°C", "temperature", "number_or_range", true, false, { min: 0, max: 300 }, "干燥", 400),
  definition("dryingTime", "干燥时间", "Drying time", ["烘干时长", "烘干时间", "干燥时长", "干燥时间"], ["dryingDuration", "drying time"], "h", "time", "number_or_range", true, false, { min: 0, max: 1000 }, "干燥", 410),
] as const);

const definitionByCanonicalKey = new Map(
  FILAMENT_PARAMETER_DEFINITIONS.map((item) => [item.canonicalKey, item]),
);
const canonicalByAlias = new Map<string, string>();

function normalizedAlias(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).normalize("NFKC").toLowerCase().replace(/[™®\s_\-—–:：/\\()[\]{}'"“”‘’，,.]/g, "")
    : "";
}

for (const item of FILAMENT_PARAMETER_DEFINITIONS) {
  for (const alias of [item.canonicalKey, ...item.aliases]) {
    canonicalByAlias.set(alias, item.canonicalKey);
    canonicalByAlias.set(alias.toLowerCase(), item.canonicalKey);
    canonicalByAlias.set(normalizedAlias(alias), item.canonicalKey);
  }
}

export const FILAMENT_CANONICAL_PARAMETER_KEYS = Object.freeze(
  FILAMENT_PARAMETER_DEFINITIONS.map((item) => item.canonicalKey),
);

export function isSupportedCanonicalParameterKey(value: unknown): value is string {
  const raw = typeof value === "string" ? value.trim() : "";
  return Boolean(raw && definitionByCanonicalKey.has(raw));
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
  return raw
    ? canonicalByAlias.get(raw)
      ?? canonicalByAlias.get(raw.toLowerCase())
      ?? canonicalByAlias.get(normalizedAlias(raw))
      ?? null
    : null;
}

export function getParameterDefinition(key: unknown): ParameterDefinition | null {
  const canonicalKey = resolveCanonicalParameterKey(key);
  return canonicalKey ? definitionByCanonicalKey.get(canonicalKey) ?? null : null;
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    let diagonal = rows[0];
    rows[0] = rightIndex;
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const previous = rows[leftIndex];
      rows[leftIndex] = Math.min(
        rows[leftIndex] + 1,
        rows[leftIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return rows[left.length];
}

function fuzzyDefinition(rawLabel: string): { definition: ParameterDefinition; score: number } | null {
  const normalized = normalizedAlias(rawLabel);
  if (normalized.length < 3) return null;
  const matches = FILAMENT_PARAMETER_DEFINITIONS.flatMap((definition) => (
    [definition.labelZh, definition.labelEn, ...definition.aliases]
      .map(normalizedAlias)
      .filter((alias) => alias.length >= 3)
      .map((alias) => {
        const distance = editDistance(normalized, alias);
        return { definition, distance, score: 1 - distance / Math.max(normalized.length, alias.length) };
      })
  )).filter((match) => match.distance <= 2 && match.score >= 0.72)
    .sort((left, right) => right.score - left.score || left.distance - right.distance);
  if (!matches.length || (matches[1] && matches[1].score === matches[0].score
    && matches[1].definition.canonicalKey !== matches[0].definition.canonicalKey)) return null;
  return { definition: matches[0].definition, score: matches[0].score };
}

function numericValues(value: unknown): number[] {
  const normalizedRanges = text(value).replace(/(?<=\d)\s*[~～–—-]\s*(?=\d)/g, " ");
  return normalizedRanges.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
}

export function validateCanonicalParameterValue(canonicalKey: unknown, value: unknown): {
  valid: boolean;
  reason: string;
} {
  const definition = getParameterDefinition(canonicalKey);
  if (!definition) return { valid: false, reason: "unknown_canonical_key" };
  const raw = text(value);
  if (!raw) return { valid: false, reason: "missing_value" };
  const numbers = numericValues(raw);
  if (!numbers.length) {
    return definition.textAllowed
      ? { valid: true, reason: "allowed_text_value" }
      : { valid: false, reason: "numeric_value_required" };
  }
  if (numbers.length > 1 && !definition.rangeAllowed) {
    return { valid: false, reason: "range_not_allowed" };
  }
  if (definition.reasonableRange && numbers.some((number) => (
    number < definition.reasonableRange!.min || number > definition.reasonableRange!.max
  ))) {
    return { valid: false, reason: "outside_reasonable_range" };
  }
  return { valid: true, reason: "value_shape_and_range_valid" };
}

export type ParameterResolution = {
  canonicalKey: string | null;
  matchReason: string;
  confidence: "high" | "medium" | "low";
  reviewStatus: "official" | "candidate" | "unresolved";
  valueValidation: string;
};

export function resolveParameterCandidate(input: {
  rawLabel: unknown;
  rawValue: unknown;
  spatialRelation?: "clear" | "weak" | "none";
  productContextMatched?: boolean;
}): ParameterResolution {
  const rawLabel = text(input.rawLabel);
  const spatialRelation = input.spatialRelation ?? "none";
  const productContextMatched = input.productContextMatched === true;
  const exactKey = resolveCanonicalParameterKey(rawLabel);
  const fuzzy = exactKey ? null : fuzzyDefinition(rawLabel);
  const canonicalKey = exactKey || fuzzy?.definition.canonicalKey || null;
  if (!canonicalKey) {
    return {
      canonicalKey: null,
      matchReason: rawLabel ? "label_not_in_schema" : "missing_label",
      confidence: "low",
      reviewStatus: "unresolved",
      valueValidation: "not_evaluated_without_identity",
    };
  }
  const validation = validateCanonicalParameterValue(canonicalKey, input.rawValue);
  if (!validation.valid) {
    return {
      canonicalKey,
      matchReason: exactKey ? "exact_alias_but_invalid_value" : "fuzzy_alias_but_invalid_value",
      confidence: "low",
      reviewStatus: "candidate",
      valueValidation: validation.reason,
    };
  }
  if (exactKey && spatialRelation === "clear" && productContextMatched) {
    return {
      canonicalKey,
      matchReason: "exact_alias+clear_spatial_relation+valid_value+product_context",
      confidence: "high",
      reviewStatus: "official",
      valueValidation: validation.reason,
    };
  }
  return {
    canonicalKey,
    matchReason: exactKey
      ? `exact_alias+${spatialRelation}_spatial_relation${productContextMatched ? "+product_context" : "+unverified_product_context"}`
      : `fuzzy_alias(${fuzzy!.score.toFixed(2)})+${spatialRelation}_spatial_relation${productContextMatched ? "+product_context" : "+unverified_product_context"}`,
    confidence: exactKey || fuzzy!.score >= 0.8 ? "high" : "medium",
    reviewStatus: "candidate",
    valueValidation: validation.reason,
  };
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
  unknownCanonicalKey: string | null;
  rawKey: string;
  displayLabel: string;
  normalizedDisplayValue: string;
};

export function normalizeParameterCandidate(value: unknown): NormalizedParameterCandidate {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const suppliedCanonicalKey = text(candidate.canonicalKey);
  const rawKey = suppliedCanonicalKey || text(candidate.field) || text(candidate.key);
  const canonicalKey = suppliedCanonicalKey
    ? isSupportedCanonicalParameterKey(suppliedCanonicalKey) ? suppliedCanonicalKey : null
    : resolveCanonicalParameterKey(rawKey);
  return {
    ...candidate,
    canonicalKey,
    unknownCanonicalKey: suppliedCanonicalKey && !canonicalKey ? suppliedCanonicalKey : null,
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

export function parameterSourceEvidence(parameters: unknown, evidence: unknown): Record<string, unknown>[] {
  if (!Array.isArray(parameters)) return [];
  const evidenceRecords = Array.isArray(evidence)
    ? evidence.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const selected = new Map<string, Record<string, unknown>>();
  const textValue = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const add = (record: Record<string, unknown>) => {
    const key = textValue(record.evidenceId)
      || `${textValue(record.sourceFile) || textValue(record.sourceRelativePath)}|${textValue(record.sourceText) || textValue(record.ocrText)}`;
    if (key) selected.set(key, record);
  };
  for (const raw of parameters) {
    const candidate = normalizeParameterCandidate(raw);
    const sourceFile = textValue(candidate.sourceFile) || textValue(candidate.sourceRelativePath) || textValue(candidate.sourceImage);
    const ids = new Set([
      textValue(candidate.evidenceId),
      ...(Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds.map(textValue) : []),
    ].filter(Boolean));
    const matches = evidenceRecords.filter((record) => {
      const recordId = textValue(record.evidenceId);
      const recordFile = textValue(record.sourceFile) || textValue(record.sourceRelativePath) || textValue(record.sourceImage);
      return (recordId && ids.has(recordId)) || (sourceFile && recordFile === sourceFile);
    });
    matches.forEach(add);
    if (!matches.length && sourceFile) {
      add({
        ...(textValue(candidate.evidenceId) ? { evidenceId: textValue(candidate.evidenceId) } : {}),
        sourceFile,
        sourceText: textValue(candidate.sourceText) || textValue(candidate.ocrSnippet),
      });
    }
  }
  return [...selected.values()];
}

export function unmappedFieldsAcceptedFromCandidates(candidates: unknown): Record<string, string> {
  if (!Array.isArray(candidates)) return {};
  return Object.fromEntries(candidates.flatMap((value) => {
    const candidate = normalizeParameterCandidate(value);
    return !candidate.canonicalKey
      && candidate.rawKey
      && candidate.normalizedDisplayValue
      && isTrustedCandidate(candidate)
      ? [[candidate.rawKey, candidate.normalizedDisplayValue]]
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
  const hasSpecificImpactStrengths = Boolean(
    fields.unnotchedImpactStrength && fields.notchedImpactStrength,
  );
  const rows: ParameterTemplateRow[] = FILAMENT_PARAMETER_DEFINITIONS
    .filter((item) => item.canonicalKey !== "impactStrength" || !hasSpecificImpactStrengths)
    .map((item) => ({
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
