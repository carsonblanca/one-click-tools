export type FilamentEvidenceSourceStatus =
  | "official_product_page"
  | "official_collection_page"
  | "official_tds"
  | "official_preset"
  | "marketplace_product_page"
  | "not_found";

export type FilamentEvidenceParameterStatus =
  | "official"
  | "partial"
  | "inherited_unverified"
  | "missing";

export type FilamentVisualStatus =
  | "visual_reference"
  | "visual_pending"
  | "confirmed_color_source";

export type FilamentTranslationStatus = "confirmed" | "pending" | "not_required";

export type UnifiedFilamentColorRecord = {
  brandId: string;
  productLineId: string;
  materialType: string;
  displayName: string;
  displayNameZhCN: string | null;
  displayNameZhTW: string | null;
  displayNameEn: string | null;
  officialColorCode: string | null;
  colorCodeType: "official_sku" | "pantone_reference" | "none" | null;
  visualStatus: FilamentVisualStatus;
  visualAssetPath: string | null;
  visualAssetType: "sku_thumbnail" | "color_chart" | "physical_swatch" | "none" | null;
  sourceStatus: FilamentEvidenceSourceStatus;
  parameterStatus: FilamentEvidenceParameterStatus;
  translationStatus: FilamentTranslationStatus;
  sourceZipFilename: string | null;
  sourceEvidencePath: string | null;
  evidenceNote: string;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedFilamentParameterRecord = {
  brandId: string;
  productLineId: string;
  nozzleTemperature: string | null;
  bedTemperature: string | null;
  printSpeed: string | null;
  dryingTemperature: string | null;
  dryingDuration: string | null;
  amsCompatibility: string | null;
  nozzleRequirement: string | null;
  printNotes: string | null;
  parameterStatus: FilamentEvidenceParameterStatus;
  evidenceSource: {
    sourceStatus: FilamentEvidenceSourceStatus;
    sourceZipFilename: string | null;
    sourceEvidencePath: string | null;
    evidenceNote: string;
  };
};

export type EvidenceImportDraft = {
  id: string;
  status: "draft" | "pending_review" | "ready_to_publish" | "published_preview";
  brandId: string | null;
  productLineId: string | null;
  materialType: string | null;
  colorCandidates: UnifiedFilamentColorRecord[];
  parameterCandidates: UnifiedFilamentParameterRecord[];
  sourceZipFilename: string | null;
  requiresManualConfirmation: boolean;
};
