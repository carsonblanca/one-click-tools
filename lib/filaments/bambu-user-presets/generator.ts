import {
  buildBambuPresetDisplayName,
  buildBambuPresetFileName,
  buildStableFilamentId,
} from "./naming";
import type {
  BambuPresetTemplate,
  FilamentRecord,
  GeneratedBambuPreset,
  GeneratedPresetArtifact,
  PrinterCompatibilityProfile,
} from "./types";
import {
  assertValidation,
  validateFilamentRecord,
  validateGeneratedBambuPreset,
  validatePrinterCompatibilityProfile,
} from "./validation";

function toBambuArray(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return [String(value)];
}

function cloneTemplate(template: BambuPresetTemplate) {
  return JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
}

export function generateBambuUserFilamentPreset(
  filament: FilamentRecord,
  printer: PrinterCompatibilityProfile,
  template: BambuPresetTemplate,
): GeneratedPresetArtifact {
  assertValidation(validateFilamentRecord(filament));
  assertValidation(validatePrinterCompatibilityProfile(printer));

  const displayName = buildBambuPresetDisplayName(filament, printer);
  const filamentId = buildStableFilamentId(filament, printer);
  const preset = {
    ...cloneTemplate(template),
    type: "filament",
    from: "User",
    inherits: "",
    name: displayName,
    filament_settings_id: displayName,
    filament_id: filamentId,
    filament_type: filament.materialType,
    filament_vendor: filament.brand,
    compatible_printers: [...printer.compatiblePrinters],
    compatible_printers_condition: "",
    compatible_prints: [],
    compatible_prints_condition: "",
    filament_extruder_variant: [...printer.filamentExtruderVariant],
    filament_diameter: toBambuArray(filament.parameters.filamentDiameterMm?.value),
    filament_density: toBambuArray(filament.parameters.filamentDensityGcm3?.value),
    filament_flow_ratio: toBambuArray(filament.parameters.filamentFlowRatio?.value),
    filament_shrink: toBambuArray(filament.parameters.filamentShrink?.value),
    nozzle_temperature: toBambuArray(filament.parameters.nozzleTemperatureC?.otherLayers),
    nozzle_temperature_initial_layer: toBambuArray(
      filament.parameters.nozzleTemperatureC?.initialLayer,
    ),
    nozzle_temperature_range_low: toBambuArray(
      filament.parameters.nozzleTemperatureC?.rangeLow,
    ),
    nozzle_temperature_range_high: toBambuArray(
      filament.parameters.nozzleTemperatureC?.rangeHigh,
    ),
    cool_plate_temp: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.coolPlate.otherLayers,
    ),
    cool_plate_temp_initial_layer: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.coolPlate.initialLayer,
    ),
    eng_plate_temp: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.engineeringPlate.otherLayers,
    ),
    eng_plate_temp_initial_layer: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.engineeringPlate.initialLayer,
    ),
    hot_plate_temp: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.smoothPeiHighTempPlate.otherLayers,
    ),
    hot_plate_temp_initial_layer: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.smoothPeiHighTempPlate.initialLayer,
    ),
    textured_plate_temp: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.texturedPeiPlate.otherLayers,
    ),
    textured_plate_temp_initial_layer: toBambuArray(
      filament.parameters.buildPlateTemperatureC?.texturedPeiPlate.initialLayer,
    ),
    filament_max_volumetric_speed: toBambuArray(
      filament.parameters.maximumVolumetricSpeedMm3s?.value,
    ),
  } as GeneratedBambuPreset;

  assertValidation(validateGeneratedBambuPreset(preset));

  return {
    preset,
    displayName,
    fileName: buildBambuPresetFileName(filament, printer),
    filamentId,
  };
}
