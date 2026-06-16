import { bambuCommonFilamentTemplate, bambuFilamentMaterials } from "./material-templates";
import { bambuPrinterTemplates } from "./printers";
import type { BambuFilamentPreset, MergeLayer } from "./types";

export function slugifyPresetFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function mergePresetLayers(layers: MergeLayer[]) {
  const preset: BambuFilamentPreset = {};
  const sources: Record<string, string> = {};

  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer.values)) {
      preset[key] = Array.isArray(value) ? [...value] : value;
      sources[key] = layer.source;
    }
  }

  return { preset, sources };
}

export function getBambuMaterial(materialId: string) {
  return bambuFilamentMaterials.find((material) => material.id === materialId) || bambuFilamentMaterials[0];
}

export function getBambuPrinter(printerId: string) {
  return bambuPrinterTemplates.find((printer) => printer.id === printerId) || bambuPrinterTemplates[0];
}

export function generateBambuFilamentPreset(materialId: string, printerId: string) {
  const material = getBambuMaterial(materialId);
  const printer = getBambuPrinter(printerId);
  const settingId = `OC_${slugifyPresetFilePart(material.id)}_${slugifyPresetFilePart(printer.id)}`
    .toUpperCase()
    .replace(/-/g, "_");
  const generatedValues: BambuFilamentPreset = {
    name: `OneClick ${material.name} @ ${printer.name}`,
    inherits: material.templateInherits,
    setting_id: settingId,
    compatible_printers: [printer.compatiblePrinter],
  };

  const { preset, sources } = mergePresetLayers([
    { source: "Bambu Studio common filament system template", values: bambuCommonFilamentTemplate },
    { source: printer.sourcePath, values: printer.template },
    { source: material.sourcePath, values: material.template },
    { source: "OneClick generated identity and selected printer binding", values: generatedValues },
  ]);

  return {
    material,
    printer,
    preset,
    sources,
    fileName: `${slugifyPresetFilePart(material.name)}-${slugifyPresetFilePart(printer.id)}-bambu-filament.json`,
  };
}

export function generateBambuFilamentPresetSet(printerId: string) {
  return bambuFilamentMaterials.map((material) =>
    generateBambuFilamentPreset(material.id, printerId),
  );
}

export function getPresetDisplayValue(preset: BambuFilamentPreset, key: string) {
  const value = preset[key];

  if (Array.isArray(value)) {
    return value.join(" / ");
  }

  return value === undefined ? "Inherited" : String(value);
}

export function serializeBambuFilamentPreset(preset: BambuFilamentPreset) {
  return JSON.stringify(preset, null, 2);
}
