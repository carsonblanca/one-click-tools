export type SourceStatus =
  | "official_product_page"
  | "official_collection_page"
  | "official_tds"
  | "official_preset"
  | "not_found";

export type ParameterStatus = "complete" | "partial" | "missing";

export type NumericParameter = {
  operator: "range" | "lt" | "lte" | "eq";
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string;
  raw: string | null;
};

export type SourceAttribution = {
  url: string | null;
  label: string;
  sourceStatus: SourceStatus;
  lastVerifiedAt: string | null;
};

export type TemperatureRange = {
  initialLayer: NumericParameter | null;
  otherLayers: NumericParameter | null;
  recommended: NumericParameter | null;
};

export type SpoolSpecRecord = {
  outerDiameterMm: number | null;
  widthMm: number | null;
  hubHoleDiameterMm: number | null;
  emptySpoolWeightG: number | null;
  spoolMaterial: string | null;
  refillable: boolean | null;
  cardboardSpool: boolean | null;
};

export type AmsCompatibilityRecord = {
  amsFit: "yes" | "conditional" | "no" | null;
  adapterRequired: boolean | null;
  notes: string | null;
};

export type ParameterConditionSet = {
  nozzleTemperature?: NumericParameter | null;
  bedTemperature?: NumericParameter | null;
  printSpeed?: NumericParameter | null;
  raw: string;
};

export type DryingRecommendation = {
  temperatureC: number | null;
  durationHours: number | null;
  notes: string | null;
};

export type FilamentParameterRecord = {
  id: string;
  productLineId: string;
  brandId: string;

  nozzleTemperature: TemperatureRange;
  bedTemperature: TemperatureRange;
  maxVolumetricSpeedMm3s: number | null;
  recommendedPrintSpeed: NumericParameter | null;

  dryingRecommendation: DryingRecommendation;
  hardenedNozzleRequired: boolean | null;
  enclosureRecommended: boolean | null;

  spoolSpecs: SpoolSpecRecord;
  amsCompatibility: AmsCompatibilityRecord;

  conditionSets?: ParameterConditionSet[] | null;

  sources: SourceAttribution[];
  sourceStatus: SourceStatus;
  parameterStatus: ParameterStatus;
  lastVerifiedAt: string | null;
  sourceNotes: string;
};

export type BrandParameterData = {
  brandId: string;
  brandName: string;
  verifiedAt: string | null;
  records: FilamentParameterRecord[];
};

export type ParameterCompleteness = {
  totalRecords: number;
  withNozzleTemp: number;
  withBedTemp: number;
  withSpeed: number;
  withDrying: number;
  withSpoolSpecs: number;
  withAmsInfo: number;
  partial: number;
  complete: number;
  missing: number;
};
