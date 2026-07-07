import type {
  FilamentRecord,
  GeneratedBambuPreset,
  PrinterCompatibilityProfile,
  ValidationResult,
} from "./types";

function hasDangerousGcodeKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("gcode") || normalized.includes("g-code");
}

function walk(value: unknown, path: string, errors: string[]) {
  if (value === undefined) {
    errors.push(`${path} is undefined`);
    return;
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    errors.push(`${path} is NaN`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, errors));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (hasDangerousGcodeKey(key)) {
        errors.push(`${path}.${key} is a forbidden G-code field`);
      }
      walk(nested, `${path}.${key}`, errors);
    }
  }
}

export function validateFilamentRecord(record: FilamentRecord): ValidationResult {
  const errors: string[] = [];

  if (!record.brand?.trim()) errors.push("Filament brand is required.");
  if (!record.materialType?.trim()) errors.push("Filament materialType is required.");
  if (!record.category?.trim()) errors.push("Filament category is required.");
  if (!record.revisionDate?.trim()) errors.push("Filament revisionDate is required.");

  return { ok: errors.length === 0, errors };
}

export function validatePrinterCompatibilityProfile(
  profile: PrinterCompatibilityProfile,
): ValidationResult {
  const errors: string[] = [];

  if (!profile.preciseName?.trim()) errors.push("Printer preciseName is required.");
  if (!profile.compatiblePrinters?.length) errors.push("compatiblePrinters must not be empty.");
  if (!profile.filamentExtruderVariant?.length) {
    errors.push("filamentExtruderVariant must not be empty.");
  }

  return { ok: errors.length === 0, errors };
}

export function validateGeneratedBambuPreset(preset: GeneratedBambuPreset): ValidationResult {
  const errors: string[] = [];

  try {
    JSON.parse(JSON.stringify(preset));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Preset is not JSON serializable.");
  }

  walk(preset, "preset", errors);

  if (preset.from !== "User") errors.push('from must be "User".');
  if (preset.inherits !== "") errors.push("inherits must be an empty string.");
  if (!preset.name?.trim()) errors.push("name must not be empty.");
  if (preset.filament_settings_id !== preset.name) {
    errors.push("filament_settings_id must match name.");
  }
  if (!preset.filament_id?.trim()) errors.push("filament_id must not be empty.");
  if (!preset.filament_type?.trim()) errors.push("filament_type must not be empty.");
  if (!preset.filament_vendor?.trim()) errors.push("filament_vendor must not be empty.");
  if (!preset.compatible_printers?.length) errors.push("compatible_printers must not be empty.");
  if (!preset.filament_extruder_variant?.length) {
    errors.push("filament_extruder_variant must not be empty.");
  }
  if (preset.compatible_printers_condition !== "") {
    errors.push("compatible_printers_condition must be empty.");
  }
  if (preset.compatible_prints_condition !== "") {
    errors.push("compatible_prints_condition must be empty.");
  }
  if (!Array.isArray(preset.compatible_prints) || preset.compatible_prints.length !== 0) {
    errors.push("compatible_prints must be an empty array.");
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidation(result: ValidationResult) {
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
}
