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

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function formatFlow(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} mm³/s`;
}

export default function NozzleFlowRateCalculatorTool({ locale = "en" }: { locale?: string }) {
  const [layerHeight, setLayerHeight] = useState("");
  const [lineWidth, setLineWidth] = useState("");
  const [printSpeed, setPrintSpeed] = useState("");
  const [flowRate, setFlowRate] = useState<number | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setFlowRate(
        parsePositive(layerHeight, "layer height") *
          parsePositive(lineWidth, "line width") *
          parsePositive(printSpeed, "print speed"),
      );
      setError("");
    } catch (caught) {
      setFlowRate(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate flow rate.");
    }
  };

  const clear = () => {
    setLayerHeight("");
    setLineWidth("");
    setPrintSpeed("");
    setFlowRate(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Layer height (mm)</ToolLabel>
          <ToolInput value={layerHeight} onChange={setLayerHeight} type="number" placeholder="0.2" />
        </div>
        <div>
          <ToolLabel>Line width (mm)</ToolLabel>
          <ToolInput value={lineWidth} onChange={setLineWidth} type="number" placeholder="0.45" />
        </div>
        <div>
          <ToolLabel>Print speed (mm/s)</ToolLabel>
          <ToolInput value={printSpeed} onChange={setPrintSpeed} type="number" placeholder="80" />
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={calculate}>Calculate</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : flowRate !== null ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToolStatCard label="Volumetric flow rate" value={formatFlow(flowRate)} />
            <ToolStatCard label="Formula" value="height × width × speed" />
          </div>
          <ToolResultBox muted>
            Actual safe max flow depends on hotend, material, temperature, nozzle, printer, cooling, and geometry. Test with your own slicer and filament.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Volumetric flow rate will appear here.</ToolResultBox>
      )}

      <ToolResultBox muted>
        <div className="grid gap-2">
          <p>0.2 mm nozzle is usually for fine detail.</p>
          <p>0.4 mm nozzle is general purpose.</p>
          <p>0.6 mm nozzle is a speed/detail balance.</p>
          <p>0.8 mm nozzle is for large fast prints.</p>
        </div>
      </ToolResultBox>
    </ToolPanel>
  );
}
