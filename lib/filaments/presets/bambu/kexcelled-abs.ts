import type { BambuFilamentMaterial, BambuFilamentPreset } from "./types";
import { getBambuPrinter } from "./generator";

export type KexcelledAbsPresetInput = {
  productLine: string;
  parameters?: Record<string, unknown>;
  defaultColor?: string | null;
  printerId: string;
};

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const object = value as { value?: unknown; normalizedValue?: unknown };
    return text(object.normalizedValue ?? object.value);
  }
  return "";
}

function numberValue(parameters: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const raw = text(parameters[key]);
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    if (match) return match[0];
  }
  return "";
}

function array(value: string) {
  return [value];
}

const genericAbsMaterial: BambuFilamentMaterial = {
  id: "kexcelled-abs",
  name: "Kexcelled ABS",
  type: "ABS",
  source: "Kexcelled Production filament data",
  sourcePath: "Production draft parameters",
  templateInherits: "Generic ABS @base",
  inheritsPath: "Bambu Studio Generic ABS template",
  inheritsKind: "base_preset",
  importVerified: false,
  localPresetExists: false,
  defaultColor: "#222222",
  amsCompatibility: "Check the spool size and keep ABS dry.",
  enclosureRecommendation: "An enclosure is recommended for ABS.",
  hardenedNozzleRecommendation: "Not required for ordinary ABS.",
  drying: "Dry according to the manufacturer instructions before printing.",
  cooling: "Use low cooling to preserve layer adhesion.",
  advantages: ["Heat resistance", "Good strength"],
  disadvantages: ["Warping risk", "Requires ventilation"],
  notes: ["Use an enclosure and ventilation.", "Run a small calibration print first."],
  template: {
    type: "filament",
    from: "User",
    instantiation: "true",
    inherits: "Generic ABS @base",
    filament_type: array("ABS"),
    filament_vendor: array("Kexcelled"),
    filament_diameter: array("1.75"),
    filament_density: array("1.04"),
    filament_flow_ratio: array("0.98"),
    filament_shrink: array("100%"),
    filament_cost: array("0"),
    nozzle_temperature: array("260"),
    nozzle_temperature_initial_layer: array("260"),
    nozzle_temperature_range_low: array("240"),
    nozzle_temperature_range_high: array("280"),
    cool_plate_temp: array("0"),
    cool_plate_temp_initial_layer: array("0"),
    eng_plate_temp: array("90"),
    eng_plate_temp_initial_layer: array("90"),
    hot_plate_temp: array("90"),
    hot_plate_temp_initial_layer: array("90"),
    textured_plate_temp: array("90"),
    textured_plate_temp_initial_layer: array("90"),
    supertack_plate_temp: array("90"),
    supertack_plate_temp_initial_layer: array("90"),
    chamber_temperatures: array("0"),
    filament_max_volumetric_speed: array("12"),
    fan_min_speed: array("10"),
    fan_max_speed: array("30"),
    fan_cooling_layer_time: array("30"),
    slow_down_for_layer_cooling: array("1"),
    slow_down_layer_time: array("20"),
    slow_down_min_speed: array("15"),
    overhang_fan_speed: array("30"),
    overhang_fan_threshold: array("25%"),
    filament_retraction_length: array("0.8"),
    filament_retraction_speed: array("30"),
    filament_deretraction_speed: array("30"),
    filament_z_hop: array("0.4"),
    filament_printable: array("3"),
    filament_contact_safe: 1,
    filament_emission_safe: 0,
    filament_ingredients_safe: 0,
    compatible_printers: array("Bambu Lab P1S 0.4 nozzle"),
    compatible_printers_condition: "",
  },
};

export function generateKexcelledAbsPreset(input: KexcelledAbsPresetInput) {
  const printer = getBambuPrinter(input.printerId);
  const parameters = input.parameters || {};
  const nozzle = numberValue(parameters, "nozzleTemperature", "printingTemperature") || "260";
  const bed = numberValue(parameters, "bedTemperature") || "90";
  const density = numberValue(parameters, "density") || "1.04";
  const diameter = numberValue(parameters, "filamentDiameter", "diameter") || "1.75";
  const maxSpeed = numberValue(parameters, "maxVolumetricSpeed", "maxVolumetricSpeedMm3s") || "12";
  const flow = numberValue(parameters, "flowRatio") || "0.98";
  const color = input.defaultColor?.trim() || genericAbsMaterial.defaultColor || "#222222";
  const safeName = input.productLine.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const preset: BambuFilamentPreset = {
    ...genericAbsMaterial.template,
    name: `${input.productLine} @ ${printer.name}`,
    setting_id: `ONECLICK_KEXCELLED_ABS_${safeName.toUpperCase()}_${printer.id.toUpperCase().replace(/-/g, "_")}`,
    filament_diameter: array(diameter),
    filament_density: array(density),
    filament_flow_ratio: array(flow),
    nozzle_temperature: array(nozzle),
    nozzle_temperature_initial_layer: array(nozzle),
    eng_plate_temp: array(bed),
    eng_plate_temp_initial_layer: array(bed),
    hot_plate_temp: array(bed),
    hot_plate_temp_initial_layer: array(bed),
    textured_plate_temp: array(bed),
    textured_plate_temp_initial_layer: array(bed),
    supertack_plate_temp: array(bed),
    supertack_plate_temp_initial_layer: array(bed),
    filament_max_volumetric_speed: array(maxSpeed),
    default_filament_colour: array(color),
    compatible_printers: array(printer.compatiblePrinter),
  };

  return {
    material: genericAbsMaterial,
    printer,
    preset,
    fileName: `OneClick-${safeName}-${printer.id}-bambu-filament.json`,
  };
}
