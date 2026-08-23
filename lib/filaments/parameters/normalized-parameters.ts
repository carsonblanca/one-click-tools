import type { JsonValue } from "@/lib/filaments/imports/supabase-import-repository";

type JsonObject = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function arrayOfObjects(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

const aliases: Record<string, string> = {
  material: "materialType",
  materialtype: "materialType",
  diameter: "filamentDiameter",
  filamentdiameter: "filamentDiameter",
  netweight: "netWeight",
  net_weight: "netWeight",
  tolerance: "diameterTolerance",
  diametertolerance: "diameterTolerance",
  density: "density",
  meltflowindex: "meltFlowIndex",
  nozzletemperature: "nozzleTemperature",
  printingtemperature: "nozzleTemperature",
  nozzlediameter: "nozzleDiameter",
  bedtemperature: "bedTemperature",
  coolingfan: "coolingFan",
  fanspeed: "coolingFan",
  printingspeed: "recommendedPrintSpeed",
  printspeed: "recommendedPrintSpeed",
  recommendedprintspeed: "recommendedPrintSpeed",
  retractiondistance: "retractionDistance",
  retractionspeed: "retractionSpeed",
  buildplatesurface: "buildPlateSurface",
  buildplatematerial: "buildPlateSurface",
  dryingtemperature: "dryingTemperature",
  dryingtime: "dryingTime",
  dryingduration: "dryingTime",
  tensilestrength: "tensileStrength",
  elongationatbreak: "elongationAtBreak",
  impactstrength: "impactStrength",
  unnotchedimpactstrength: "unnotchedImpactStrength",
  notchedimpactstrength: "notchedImpactStrength",
  flexuralstrength: "flexuralStrength",
  flexuralmodulus: "flexuralModulus",
  heatdeflectiontemperature: "heatDeflectionTemperature",
  vicatsofteningtemperature: "vicatSofteningTemperature",
};

export function resolveCanonicalParameterKey(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return aliases[raw.toLowerCase().replace(/[\s-]/g, "")] ?? aliases[raw.toLowerCase()] ?? null;
}

function normalizedValue(candidate: JsonObject): string {
  const value = text(candidate.normalizedValue) || text(candidate.rawValue) || text(candidate.value);
  const unit = text(candidate.unit);
  return value && unit && !value.toLowerCase().endsWith(unit.toLowerCase()) ? `${value} ${unit}` : value;
}

function trusted(candidate: JsonObject): boolean {
  if (candidate.trusted === false || candidate.publicVisible === false) return false;
  const status = text(candidate.reviewStatus).toLowerCase();
  return !["rejected", "conflict"].includes(status)
    && (candidate.trusted === true || candidate.accepted === true || ["official", "approved", "confirmed", "manual_override"].includes(status));
}

export function normalizeParameterCandidate(value: unknown): JsonObject {
  const candidate = objectValue(value);
  const canonicalKey = resolveCanonicalParameterKey(candidate.canonicalKey)
    || resolveCanonicalParameterKey(candidate.field)
    || resolveCanonicalParameterKey(candidate.key);
  return { ...candidate, canonicalKey, normalizedDisplayValue: normalizedValue(candidate) };
}

export function fieldsAcceptedFromCandidates(value: unknown): Record<string, string> {
  return Object.fromEntries(arrayOfObjects(value).flatMap((raw) => {
    const candidate = normalizeParameterCandidate(raw);
    return candidate.canonicalKey && trusted(candidate) && text(candidate.normalizedDisplayValue)
      ? [[String(candidate.canonicalKey), String(candidate.normalizedDisplayValue)]]
      : [];
  }));
}

function evidenceKey(record: JsonObject): string {
  return text(record.evidenceId) || `${text(record.sourceFile)}|${text(record.sourceText)}|${text(record.sourceUrl)}`;
}

export function parameterSourceEvidence(parameters: unknown, evidence: unknown): JsonValue[] {
  const candidates = arrayOfObjects(parameters);
  const records = arrayOfObjects(evidence);
  const selected = new Map<string, JsonObject>();
  for (const candidate of candidates) {
    if (!trusted(candidate)) continue;
    const ids = new Set([text(candidate.evidenceId), ...(Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds.map(text) : [])].filter(Boolean));
    const sourceFile = text(candidate.sourceFile) || text(candidate.sourceImage);
    const matches = records.filter((record) => {
      const id = text(record.evidenceId);
      const recordFile = text(record.sourceFile) || text(record.sourceImage);
      return (id && ids.has(id)) || (sourceFile && recordFile === sourceFile);
    });
    for (const record of matches) selected.set(evidenceKey(record), record);
    if (!matches.length && sourceFile) {
      const local = { evidenceId: text(candidate.evidenceId) || undefined, sourceFile, sourceText: text(candidate.sourceText) || text(candidate.ocrSnippet) };
      selected.set(evidenceKey(local), local);
    }
  }
  return [...selected.values()].map((item) => JSON.parse(JSON.stringify(item)) as JsonValue);
}
