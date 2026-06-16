import {
  hasGcodeFieldName,
  OFFICIAL_BAMBU_FILAMENT_FIELDS,
  REQUIRED_BAMBU_FILAMENT_FIELDS,
} from "./fields";
import { bambuCompatiblePrinters, bambuPrinterTemplateIds } from "./printers";
import type { BambuFieldValue, BambuFilamentPreset, GeneratedBambuFilamentPreset } from "./types";

function valueList(value: BambuFieldValue | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isNumericString(value: string) {
  return value !== "nil" && value.trim() !== "" && Number.isFinite(Number(value));
}

export function validateBambuFilamentPresetShape(preset: BambuFilamentPreset) {
  const keys = Object.keys(preset);
  const unsupported = keys.filter((key) => !OFFICIAL_BAMBU_FILAMENT_FIELDS.has(key));
  const missing = REQUIRED_BAMBU_FILAMENT_FIELDS.filter((key) => preset[key] === undefined);
  const gcodeFields = keys.filter(hasGcodeFieldName);

  return {
    valid: unsupported.length === 0 && missing.length === 0 && gcodeFields.length === 0,
    unsupported,
    missing,
    gcodeFields,
  };
}

export function validateGeneratedBambuPreset(generated: GeneratedBambuFilamentPreset) {
  const issues: string[] = [];
  const { preset, material, printer, fileName } = generated;
  const shape = validateBambuFilamentPresetShape(preset);

  if (!shape.valid) {
    issues.push(`shape=${JSON.stringify(shape)}`);
  }

  if (preset.type !== "filament") {
    issues.push("output must be a filament preset");
  }

  const json = JSON.stringify(preset);
  const parsed = JSON.parse(json) as BambuFilamentPreset;
  if (!parsed || parsed.type !== preset.type) {
    issues.push("output must serialize and parse back to JSON");
  }

  for (const [key, value] of Object.entries(preset)) {
    if (value === undefined) {
      issues.push(`${key} is undefined`);
    }

    if (typeof value === "number" && Number.isNaN(value)) {
      issues.push(`${key} is NaN`);
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === undefined) issues.push(`${key}[${index}] is undefined`);
        if (item === "NaN") issues.push(`${key}[${index}] is NaN`);
      });
    }
  }

  if (!bambuPrinterTemplateIds.has(printer.id)) {
    issues.push(`printer ${printer.id} is not in the printer whitelist`);
  }

  for (const compatiblePrinter of valueList(preset.compatible_printers)) {
    if (!bambuCompatiblePrinters.has(String(compatiblePrinter))) {
      issues.push(`compatible_printers contains non-whitelisted value ${compatiblePrinter}`);
    }
  }

  if (preset.inherits !== material.templateInherits) {
    issues.push("inherits must come from the selected material template, not user input");
  }

  if (!printer.sourcePath) {
    issues.push(`${printer.id} missing printer sourcePath`);
  }

  if (!material.sourcePath || !material.inheritsPath) {
    issues.push(`${material.id} missing material source path`);
  }

  for (const key of [
    "nozzle_temperature",
    "nozzle_temperature_initial_layer",
    "cool_plate_temp",
    "cool_plate_temp_initial_layer",
    "eng_plate_temp",
    "eng_plate_temp_initial_layer",
    "hot_plate_temp",
    "hot_plate_temp_initial_layer",
    "textured_plate_temp",
    "textured_plate_temp_initial_layer",
    "supertack_plate_temp",
    "supertack_plate_temp_initial_layer",
    "chamber_temperatures",
  ]) {
    for (const rawValue of valueList(preset[key])) {
      const text = String(rawValue);
      if (isNumericString(text)) {
        const numeric = Number(text);
        if (numeric < 0 || numeric > 350) {
          issues.push(`${key} temperature out of range: ${text}`);
        }
      }
    }
  }

  for (const rawValue of valueList(preset.filament_max_volumetric_speed)) {
    const text = String(rawValue);
    if (isNumericString(text) && Number(text) <= 0) {
      issues.push(`filament_max_volumetric_speed must be positive or inherited, got ${text}`);
    }
  }

  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    issues.push(`unsafe fileName ${fileName}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
