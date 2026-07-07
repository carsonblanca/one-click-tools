export type FilamentSourceType =
  | "manufacturer_product_page"
  | "manufacturer_tds"
  | "manufacturer_sds"
  | "manufacturer_slicer_profile"
  | "bambu_official_profile"
  | "audited_community_test"
  | "manual_import_verification"
  | "manual_structure_sample";

export type VerificationStatus =
  | "verified"
  | "verified_compatible_fields"
  | "structure_sample"
  | "unconfirmed"
  | "pending";

export type FilamentSource = {
  id: string;
  type: FilamentSourceType;
  label: string;
  url?: string | null;
  retrievedAt?: string | null;
  verifiedAt?: string | null;
  notes?: string;
};

export type ParameterValue<T> = {
  value: T | null;
  unit?: string;
  status: VerificationStatus | "unconfirmed";
  sourceIds: string[];
};

export type LayerTemperature = {
  initialLayer: number | null;
  otherLayers: number | null;
};

export type FilamentAdvantagesAndLimitations = {
  advantages: string[];
  limitations: string[];
  printingNotes: string[];
  drying: {
    value: string | null;
    status: VerificationStatus | "unconfirmed";
  };
  cooling: {
    value: string | null;
    status: VerificationStatus | "unconfirmed";
  };
  enclosureRecommendation: {
    value: string | null;
    status: VerificationStatus | "unconfirmed";
  };
  hardenedNozzleRecommendation: {
    value: string | null;
    status: VerificationStatus | "unconfirmed";
  };
  amsCompatibility: {
    value: string | null;
    status: VerificationStatus | "unconfirmed";
  };
};

export type FilamentRecord = {
  id: string;
  brand: string;
  materialType: string;
  category: string;
  displayName: string;
  revisionDate: string;
  version: string;
  verificationStatus: VerificationStatus;
  sources: FilamentSource[];
  parameters: {
    filamentDiameterMm?: ParameterValue<number>;
    filamentDensityGcm3?: ParameterValue<number>;
    filamentFlowRatio?: ParameterValue<number>;
    filamentShrink?: ParameterValue<string>;
    nozzleTemperatureC?: {
      initialLayer: number | null;
      otherLayers: number | null;
      rangeLow: number | null;
      rangeHigh: number | null;
      status: VerificationStatus | "unconfirmed";
      sourceIds: string[];
    };
    buildPlateTemperatureC?: {
      coolPlate: LayerTemperature;
      engineeringPlate: LayerTemperature;
      smoothPeiHighTempPlate: LayerTemperature;
      texturedPeiPlate: LayerTemperature;
      status: VerificationStatus | "unconfirmed";
      sourceIds: string[];
    };
    maximumVolumetricSpeedMm3s?: ParameterValue<number>;
  };
  advantagesAndLimitations: FilamentAdvantagesAndLimitations;
};

export type PrinterCompatibilityProfile = {
  id: string;
  brand: string;
  model: string;
  nozzleDiameterMm: number;
  preciseName: string;
  compatiblePrinters: string[];
  filamentExtruderVariant: string[];
  source: FilamentSource;
  verificationStatus: VerificationStatus;
};

export type GeneratedBambuPreset = Record<string, unknown> & {
  type: "filament";
  from: "User";
  inherits: "";
  name: string;
  filament_settings_id: string;
  filament_id: string;
  filament_type: string;
  filament_vendor: string;
  compatible_printers: string[];
  compatible_printers_condition: "";
  compatible_prints: [];
  compatible_prints_condition: "";
  filament_extruder_variant: string[];
};

export type BambuPresetTemplate = Record<string, unknown>;

export type GeneratedPresetArtifact = {
  preset: GeneratedBambuPreset;
  displayName: string;
  fileName: string;
  filamentId: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};
