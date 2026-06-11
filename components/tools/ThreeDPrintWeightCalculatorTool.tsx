"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

const materialPresets = [
  { name: "PLA", density: 1.24 },
  { name: "PETG", density: 1.27 },
  { name: "ABS", density: 1.04 },
  { name: "TPU", density: 1.21 },
  { name: "Nylon", density: 1.14 },
  { name: "ASA", density: 1.07 },
  { name: "PC", density: 1.2 },
];

type Diameter = "1.75" | "2.85";

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function calculateWeightGrams(lengthMeters: number, diameterMm: number, density: number) {
  const lengthMm = lengthMeters * 1000;
  const crossSectionMm2 = Math.PI * (diameterMm / 2) ** 2;
  const volumeCm3 = (lengthMm * crossSectionMm2) / 1000;

  return volumeCm3 * density;
}

function formatGrams(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
}

export default function ThreeDPrintWeightCalculatorTool({ locale = "en" }: { locale?: string }) {
  const [length, setLength] = useState("");
  const [diameter, setDiameter] = useState<Diameter>("1.75");
  const [density, setDensity] = useState("1.24");
  const [weightGrams, setWeightGrams] = useState<number | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setWeightGrams(
        calculateWeightGrams(
          parsePositive(length, "filament length"),
          Number(diameter),
          parsePositive(density, "material density"),
        ),
      );
      setError("");
    } catch (caught) {
      setWeightGrams(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate print weight.");
    }
  };

  const clear = () => {
    setLength("");
    setDiameter("1.75");
    setDensity("1.24");
    setWeightGrams(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Filament length (meters)</ToolLabel>
          <ToolInput value={length} onChange={setLength} type="number" placeholder="120" />
        </div>
        <div>
          <ToolLabel>Filament diameter</ToolLabel>
          <ToolButtonRow>
            <ToolButton onClick={() => setDiameter("1.75")} variant={diameter === "1.75" ? "primary" : "secondary"}>
              1.75 mm
            </ToolButton>
            <ToolButton onClick={() => setDiameter("2.85")} variant={diameter === "2.85" ? "primary" : "secondary"}>
              2.85 mm
            </ToolButton>
          </ToolButtonRow>
        </div>
        <div>
          <ToolLabel>Material density (g/cm³)</ToolLabel>
          <ToolInput value={density} onChange={setDensity} type="number" placeholder="1.24" />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Material density presets</ToolLabel>
        <ToolButtonRow>
          {materialPresets.map((preset) => (
            <ToolButton key={preset.name} onClick={() => setDensity(String(preset.density))} variant="secondary">
              {preset.name} {preset.density}
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={calculate}>Calculate</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : weightGrams !== null ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToolStatCard label="Estimated filament weight" value={formatGrams(weightGrams)} />
            <ToolStatCard label="Diameter" value={`${diameter} mm`} />
          </div>
          <ToolResultBox muted>
            Estimate only. Real print weight depends on filament diameter tolerance, material density, moisture, additives, purge, supports, and slicer settings.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Estimated filament weight will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
