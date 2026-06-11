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

type NozzleSize = "0.2" | "0.4" | "0.6" | "0.8";
type Complexity = "simple" | "normal" | "complex";

type EstimatorResult = {
  filamentGrams: number;
  materialCost: number | null;
  flowRate: number;
  printHours: number;
};

const nozzlePresets: Record<NozzleSize, { layerHeight: string; lineWidth: string }> = {
  "0.2": { layerHeight: "0.10", lineWidth: "0.22" },
  "0.4": { layerHeight: "0.20", lineWidth: "0.42" },
  "0.6": { layerHeight: "0.30", lineWidth: "0.62" },
  "0.8": { layerHeight: "0.40", lineWidth: "0.82" },
};

const complexityEfficiency: Record<Complexity, number> = {
  simple: 0.75,
  normal: 0.55,
  complex: 0.38,
};

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseOptionalNonNegative(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Enter a valid ${label} of zero or more.`);
  }

  return parsed;
}

function parsePercent(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Enter a valid ${label} between 0 and 100.`);
  }

  return parsed;
}

function shellFactorFromWalls(walls: number) {
  if (walls <= 1) return 0.18;
  if (walls === 2) return 0.28;
  if (walls === 3) return 0.36;
  if (walls === 4) return 0.44;
  return Math.min(0.6, 0.44 + (walls - 4) * 0.04);
}

function formatGrams(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`;
}

function formatFlow(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} mm³/s`;
}

function formatTime(hours: number) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  return `${wholeHours} h ${minutes} min`;
}

function formatCurrency(value: number | null) {
  return value === null
    ? "Not provided"
    : value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function ThreeDPrintTimeFilamentEstimatorTool({ locale = "en" }: { locale?: string }) {
  const [solidWeight, setSolidWeight] = useState("");
  const [nozzleSize, setNozzleSize] = useState<NozzleSize>("0.4");
  const [wallLoops, setWallLoops] = useState("2");
  const [infill, setInfill] = useState("15");
  const [layerHeight, setLayerHeight] = useState(nozzlePresets["0.4"].layerHeight);
  const [lineWidth, setLineWidth] = useState(nozzlePresets["0.4"].lineWidth);
  const [printSpeed, setPrintSpeed] = useState("80");
  const [density, setDensity] = useState("1.24");
  const [pricePerKg, setPricePerKg] = useState("");
  const [complexity, setComplexity] = useState<Complexity>("normal");
  const [result, setResult] = useState<EstimatorResult | null>(null);
  const [error, setError] = useState("");

  const applyNozzlePreset = (size: NozzleSize) => {
    setNozzleSize(size);
    setLayerHeight(nozzlePresets[size].layerHeight);
    setLineWidth(nozzlePresets[size].lineWidth);
  };

  const calculate = () => {
    try {
      const solid = parsePositive(solidWeight, "solid model weight");
      const walls = Math.max(1, Math.round(parsePositive(wallLoops, "wall loops")));
      const infillPercent = parsePercent(infill, "infill percentage");
      const layer = parsePositive(layerHeight, "layer height");
      const width = parsePositive(lineWidth, "line width");
      const speed = parsePositive(printSpeed, "print speed");
      const materialDensity = parsePositive(density, "material density");
      const price = parseOptionalNonNegative(pricePerKg, "filament price per kg");
      const shellFactor = shellFactorFromWalls(walls);
      const internalFactor = Math.max(0, 1 - shellFactor);
      const filamentGrams = solid * shellFactor + solid * internalFactor * (infillPercent / 100);
      const flowRate = layer * width * speed;
      const filamentVolumeMm3 = (filamentGrams / materialDensity) * 1000;
      const effectiveFlow = flowRate * complexityEfficiency[complexity];

      setResult({
        filamentGrams,
        materialCost: price === null ? null : (filamentGrams / 1000) * price,
        flowRate,
        printHours: filamentVolumeMm3 / effectiveFlow / 3600,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not estimate print time and filament.");
    }
  };

  const clear = () => {
    setSolidWeight("");
    applyNozzlePreset("0.4");
    setWallLoops("2");
    setInfill("15");
    setPrintSpeed("80");
    setDensity("1.24");
    setPricePerKg("");
    setComplexity("normal");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Solid model weight (grams)</ToolLabel>
          <ToolInput value={solidWeight} onChange={setSolidWeight} type="number" placeholder="100" />
        </div>
        <div>
          <ToolLabel>Wall loops</ToolLabel>
          <ToolInput value={wallLoops} onChange={setWallLoops} type="number" placeholder="2" />
        </div>
        <div>
          <ToolLabel>Infill percentage</ToolLabel>
          <ToolInput value={infill} onChange={setInfill} type="number" placeholder="15" />
        </div>
        <div>
          <ToolLabel>Layer height (mm)</ToolLabel>
          <ToolInput value={layerHeight} onChange={setLayerHeight} type="number" placeholder="0.20" />
        </div>
        <div>
          <ToolLabel>Line width (mm)</ToolLabel>
          <ToolInput value={lineWidth} onChange={setLineWidth} type="number" placeholder="0.42" />
        </div>
        <div>
          <ToolLabel>Print speed (mm/s)</ToolLabel>
          <ToolInput value={printSpeed} onChange={setPrintSpeed} type="number" placeholder="80" />
        </div>
        <div>
          <ToolLabel>Material density (g/cm³)</ToolLabel>
          <ToolInput value={density} onChange={setDensity} type="number" placeholder="1.24" />
        </div>
        <div>
          <ToolLabel>Filament price per kg optional</ToolLabel>
          <ToolInput value={pricePerKg} onChange={setPricePerKg} type="number" placeholder="24.99" />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Nozzle presets</ToolLabel>
        <ToolButtonRow>
          {(Object.keys(nozzlePresets) as NozzleSize[]).map((size) => (
            <ToolButton key={size} onClick={() => applyNozzlePreset(size)} variant={nozzleSize === size ? "primary" : "secondary"}>
              {size} nozzle
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <div className="mt-5">
        <ToolLabel>Model complexity</ToolLabel>
        <ToolButtonRow>
          {(["simple", "normal", "complex"] as Complexity[]).map((option) => (
            <ToolButton key={option} onClick={() => setComplexity(option)} variant={complexity === option ? "primary" : "secondary"}>
              {option[0].toUpperCase() + option.slice(1)}
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
            <ToolStatCard label="Estimated filament" value={formatGrams(result.filamentGrams)} />
            <ToolStatCard label="Material cost" value={formatCurrency(result.materialCost)} />
            <ToolStatCard label="Volumetric flow" value={formatFlow(result.flowRate)} />
            <ToolStatCard label="Estimated print time" value={formatTime(result.printHours)} />
          </div>
          <ToolResultBox muted>
            This is a quick estimator. Real slicer results may vary due to acceleration, supports, travel moves, cooling, retractions, wall order, printer firmware, and geometry.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Print time and filament estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
