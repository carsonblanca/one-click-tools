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

type SpoolRemainingResult = {
  remainingWeight: number;
  remainingLength: number;
  remainingValue: number | null;
  printsRemaining: number | null;
};

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseOptionalPositive(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function calculateLengthMeters(weightGrams: number, diameterMm: number, density: number) {
  const volumeMm3 = (weightGrams / density) * 1000;
  const crossSectionMm2 = Math.PI * (diameterMm / 2) ** 2;

  return volumeMm3 / crossSectionMm2 / 1000;
}

function formatGrams(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`;
}

function formatMeters(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`;
}

function formatCurrency(value: number | null) {
  return value === null
    ? "Not provided"
    : value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function FilamentSpoolRemainingCalculatorTool() {
  const [currentTotalWeight, setCurrentTotalWeight] = useState("");
  const [emptySpoolWeight, setEmptySpoolWeight] = useState("");
  const [diameter, setDiameter] = useState<Diameter>("1.75");
  const [density, setDensity] = useState("1.24");
  const [pricePerKg, setPricePerKg] = useState("");
  const [modelWeight, setModelWeight] = useState("");
  const [result, setResult] = useState<SpoolRemainingResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const total = parsePositive(currentTotalWeight, "current spool total weight");
      const empty = parsePositive(emptySpoolWeight, "empty spool weight");
      const remainingWeight = total - empty;

      if (remainingWeight <= 0) {
        throw new Error("Current spool total weight must be greater than empty spool weight.");
      }

      const price = parseOptionalPositive(pricePerKg, "filament price per kg");
      const printWeight = parseOptionalPositive(modelWeight, "model weight");

      setResult({
        remainingWeight,
        remainingLength: calculateLengthMeters(remainingWeight, Number(diameter), parsePositive(density, "material density")),
        remainingValue: price === null ? null : (remainingWeight / 1000) * price,
        printsRemaining: printWeight === null ? null : Math.floor(remainingWeight / printWeight),
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate remaining filament.");
    }
  };

  const clear = () => {
    setCurrentTotalWeight("");
    setEmptySpoolWeight("");
    setDiameter("1.75");
    setDensity("1.24");
    setPricePerKg("");
    setModelWeight("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Current spool total weight (grams)</ToolLabel>
          <ToolInput value={currentTotalWeight} onChange={setCurrentTotalWeight} type="number" placeholder="785" />
        </div>
        <div>
          <ToolLabel>Empty spool weight (grams)</ToolLabel>
          <ToolInput value={emptySpoolWeight} onChange={setEmptySpoolWeight} type="number" placeholder="250" />
        </div>
        <div>
          <ToolLabel>Material density (g/cm³)</ToolLabel>
          <ToolInput value={density} onChange={setDensity} type="number" placeholder="1.24" />
        </div>
        <div>
          <ToolLabel>Filament price per kg optional</ToolLabel>
          <ToolInput value={pricePerKg} onChange={setPricePerKg} type="number" placeholder="24.99" />
        </div>
        <div>
          <ToolLabel>Model weight optional (grams)</ToolLabel>
          <ToolInput value={modelWeight} onChange={setModelWeight} type="number" placeholder="85" />
        </div>
      </div>

      <div className="mt-5">
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
      ) : result ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ToolStatCard label="Remaining weight" value={formatGrams(result.remainingWeight)} />
            <ToolStatCard label="Remaining length" value={formatMeters(result.remainingLength)} />
            <ToolStatCard label="Remaining value" value={formatCurrency(result.remainingValue)} />
            <ToolStatCard label="Approx. prints left" value={result.printsRemaining === null ? "Not provided" : result.printsRemaining} />
          </div>
          <ToolResultBox muted>
            Estimate only. Empty spool weights vary by brand, and filament density, diameter tolerance, humidity, and remaining coil shape can affect results.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Remaining spool estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
