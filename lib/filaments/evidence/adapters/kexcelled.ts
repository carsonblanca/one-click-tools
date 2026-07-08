// ── Stub adapters: not needed for Supabase draft save path ──
// The PATCH save chain does not call FIP adapter functions.
// These stubs exist only to break the kexcelled-draft-store → adapters import chain.

export type KexcelledEvidenceType =
  | "official_color_reference_sheet" | "purchase_option_evidence"
  | "print_parameter_sheet" | "material_property_sheet"
  | "sku_thumbnail" | "generic_detail_image" | "unknown";

export type KexcelledEvidenceClassification = {
  assetId: string; evidenceType: KexcelledEvidenceType;
  safeEvidenceRef: string; imagePath: string; packagePath: string;
  ocrTextPath: string;
};

export type KexcelledStandardParameter = {
  field: string; fieldKey: string; rawLabel: string; rawValue: string;
  unit: string; normalizedValue: string;
  sourceType: string; sourceImagePath: string; sourceEvidenceRef: string;
  confidence: "exact_label_value" | "exact_text_context" | "ambiguous";
  alternatives: Array<Record<string, unknown>>;
};

export type KexcelledParameterGroups = {
  recommendedPrintParameters: KexcelledStandardParameter[];
  filamentSpecifications: KexcelledStandardParameter[];
  materialProperties: KexcelledStandardParameter[];
  testsAndWarnings: KexcelledStandardParameter[];
};

export function adaptKexcelledFip(_input: unknown): {
  colors: Array<Record<string, unknown>>;
  parameterGroups: KexcelledParameterGroups;
  evidenceClassifications: KexcelledEvidenceClassification[];
  unmatchedSkuCandidates: Array<Record<string, unknown>>;
  officialColorCardAssets?: Array<Record<string, unknown>>;
} {
  return { colors: [], parameterGroups: {} as KexcelledParameterGroups, evidenceClassifications: [], unmatchedSkuCandidates: [] };
}

export function buildKexcelledSingleImageEvidence(_files: unknown): Array<Record<string, unknown>> {
  return [];
}

export function mergeKexcelledAdapterColorSources(
  purchaseColors: Array<Record<string, unknown>>,
  referenceColors: Array<Record<string, unknown>>,
): { canonical: Array<Record<string, unknown>>; unmatchedSkuCandidates: Array<Record<string, unknown>> } {
  return { canonical: [...purchaseColors, ...referenceColors], unmatchedSkuCandidates: [] };
}
