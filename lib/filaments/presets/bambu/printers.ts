import type { BambuPrinterTemplate } from "./types";

const array = (value: string) => [value];

export const bambuPrinterTemplates: BambuPrinterTemplate[] = [
  {
    id: "bambu-x1c",
    name: "Bambu Lab X1 Carbon 0.4 nozzle",
    compatiblePrinter: "Bambu Lab X1 Carbon 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Bambu PLA Basic @BBL X1C.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: ["nil", "0.4"],
      filament_z_hop: ["nil", "0.6"],
      filament_long_retractions_when_cut: ["1", "1"],
      filament_retraction_distances_when_cut: ["18", "18"],
      long_retractions_when_ec: ["0", "0"],
      retraction_distances_when_ec: ["0", "0"],
    },
  },
  {
    id: "bambu-p1s",
    name: "Bambu Lab P1S 0.4 nozzle",
    compatiblePrinter: "Bambu Lab P1S 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Bambu PLA Basic @BBL P1S 0.4 nozzle.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: ["nil", "0.4"],
      filament_z_hop: ["nil", "0.6"],
      filament_retraction_speed: ["nil", "50"],
      filament_deretraction_speed: ["nil", "50"],
      filament_long_retractions_when_cut: ["1", "1"],
      filament_retraction_distances_when_cut: ["18", "18"],
      long_retractions_when_ec: ["0", "0"],
      retraction_distances_when_ec: ["0", "0"],
    },
  },
  {
    id: "bambu-a1",
    name: "Bambu Lab A1 0.4 nozzle",
    compatiblePrinter: "Bambu Lab A1 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Generic PLA @BBL A1.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: array("nil"),
      filament_long_retractions_when_cut: array("nil"),
      filament_retraction_distances_when_cut: array("nil"),
      long_retractions_when_ec: array("0"),
      retraction_distances_when_ec: array("0"),
    },
  },
  {
    id: "bambu-a1-mini",
    name: "Bambu Lab A1 mini 0.4 nozzle",
    compatiblePrinter: "Bambu Lab A1 mini 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Generic PLA @BBL A1M.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: array("nil"),
      filament_long_retractions_when_cut: array("nil"),
      filament_retraction_distances_when_cut: array("nil"),
      long_retractions_when_ec: array("0"),
      retraction_distances_when_ec: array("0"),
    },
  },
  {
    id: "bambu-h2d",
    name: "Bambu Lab H2D 0.4 nozzle",
    compatiblePrinter: "Bambu Lab H2D 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Generic PLA @BBL H2D.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: array("nil"),
      filament_z_hop: array("nil"),
      filament_long_retractions_when_cut: array("nil"),
      filament_retraction_distances_when_cut: array("nil"),
      long_retractions_when_ec: array("1"),
      retraction_distances_when_ec: array("10"),
    },
  },
  {
    id: "bambu-h2s",
    name: "Bambu Lab H2S 0.4 nozzle",
    compatiblePrinter: "Bambu Lab H2S 0.4 nozzle",
    source: "Bambu Studio bundled BBL filament profile",
    sourcePath: "resources/profiles/BBL/filament/Generic PLA @BBL H2S.json",
    importVerified: false,
    status: "implemented_unverified",
    template: {
      filament_retraction_length: ["0.4", "0.4"],
      filament_z_hop: array("nil"),
      filament_z_hop_types: ["Spiral Lift", "Spiral Lift"],
      filament_wipe: ["1", "1"],
      filament_wipe_distance: ["1", "1"],
      long_retractions_when_ec: ["0", "0"],
      retraction_distances_when_ec: ["0", "0"],
    },
  },
];

export const bambuPrinterTemplateIds = new Set(
  bambuPrinterTemplates.map((printer) => printer.id),
);

export const bambuCompatiblePrinters = new Set(
  bambuPrinterTemplates.map((printer) => printer.compatiblePrinter),
);

export function getBambuPrinterOptions() {
  return bambuPrinterTemplates.map((printer) => ({
    id: printer.id,
    name: printer.name,
    compatiblePrinter: printer.compatiblePrinter,
    sourcePath: printer.sourcePath,
    importVerified: printer.importVerified,
    status: printer.status,
  }));
}
