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

type WeightUnit = "g" | "kg";

type FilamentCostResult = {
  costPerGram: number;
  materialUsed: number;
  modelCost: number;
};

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseOptionalPercent(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Enter a valid waste percentage of zero or more.");
  }

  return parsed;
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatGrams(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
}

export default function FilamentCostCalculatorTool() {
  const [spoolPrice, setSpoolPrice] = useState("");
  const [spoolWeight, setSpoolWeight] = useState("");
  const [spoolUnit, setSpoolUnit] = useState<WeightUnit>("kg");
  const [modelWeight, setModelWeight] = useState("");
  const [wastePercent, setWastePercent] = useState("");
  const [result, setResult] = useState<FilamentCostResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const price = parsePositive(spoolPrice, "spool price");
      const spoolWeightValue = parsePositive(spoolWeight, "spool weight");
      const spoolWeightGrams = spoolUnit === "kg" ? spoolWeightValue * 1000 : spoolWeightValue;
      const modelWeightGrams = parsePositive(modelWeight, "model weight");
      const waste = parseOptionalPercent(wastePercent);
      const materialUsed = modelWeightGrams * (1 + waste / 100);
      const costPerGram = price / spoolWeightGrams;

      setResult({
        costPerGram,
        materialUsed,
        modelCost: costPerGram * materialUsed,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate filament cost.");
    }
  };

  const clear = () => {
    setSpoolPrice("");
    setSpoolWeight("");
    setSpoolUnit("kg");
    setModelWeight("");
    setWastePercent("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Spool price</ToolLabel>
          <ToolInput value={spoolPrice} onChange={setSpoolPrice} type="number" placeholder="24.99" />
        </div>
        <div>
          <ToolLabel>Spool weight</ToolLabel>
          <ToolInput value={spoolWeight} onChange={setSpoolWeight} type="number" placeholder="1" />
        </div>
        <div>
          <ToolLabel>Spool weight unit</ToolLabel>
          <ToolButtonRow>
            <ToolButton onClick={() => setSpoolUnit("g")} variant={spoolUnit === "g" ? "primary" : "secondary"}>
              Grams
            </ToolButton>
            <ToolButton onClick={() => setSpoolUnit("kg")} variant={spoolUnit === "kg" ? "primary" : "secondary"}>
              Kg
            </ToolButton>
          </ToolButtonRow>
        </div>
        <div>
          <ToolLabel>Model weight (grams)</ToolLabel>
          <ToolInput value={modelWeight} onChange={setModelWeight} type="number" placeholder="85" />
        </div>
        <div>
          <ToolLabel>Waste percentage optional</ToolLabel>
          <ToolInput value={wastePercent} onChange={setWastePercent} type="number" placeholder="10" />
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
      ) : result ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ToolStatCard label="Cost per gram" value={formatCurrency(result.costPerGram)} />
            <ToolStatCard label="Material used with waste" value={formatGrams(result.materialUsed)} />
            <ToolStatCard label="Estimated material cost" value={formatCurrency(result.modelCost)} />
          </div>
          <ToolResultBox muted>
            Estimate only. Actual cost depends on slicer waste, purge material, supports, failed prints, filament brand, and material handling.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Filament cost estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
