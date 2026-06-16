export type BambuFieldValue = string | number | string[];

export type BambuFilamentPreset = Record<string, BambuFieldValue>;

export type BambuFilamentMaterial = {
  id: string;
  name: string;
  type: string;
  source: string;
  sourcePath: string;
  templateInherits: string;
  inheritsPath: string;
  inheritsKind: "system_template" | "base_preset" | "inheritance_node";
  importVerified: boolean;
  localPresetExists: boolean;
  defaultColor?: string;
  amsCompatibility: string;
  enclosureRecommendation: string;
  hardenedNozzleRecommendation: string;
  drying: string;
  cooling: string;
  advantages: string[];
  disadvantages: string[];
  notes: string[];
  template: BambuFilamentPreset;
};

export type BambuPrinterTemplate = {
  id: string;
  name: string;
  compatiblePrinter: string;
  source: string;
  sourcePath: string;
  importVerified: boolean;
  status: "implemented_unverified" | "supported";
  template: BambuFilamentPreset;
};

export type MergeLayer = {
  source: string;
  values: BambuFilamentPreset;
};

export type GeneratedBambuFilamentPreset = {
  material: BambuFilamentMaterial;
  printer: BambuPrinterTemplate;
  preset: BambuFilamentPreset;
  sources: Record<string, string>;
  fileName: string;
};
