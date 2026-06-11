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

type SupportCostResult = {
  mainCost: number;
  supportCost: number;
  wasteCost: number;
  totalCost: number;
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

export default function SupportMaterialCostCalculatorTool() {
  const [mainWeight, setMainWeight] = useState("");
  const [supportWeight, setSupportWeight] = useState("");
  const [mainPrice, setMainPrice] = useState("");
  const [supportPrice, setSupportPrice] = useState("");
  const [wastePercent, setWastePercent] = useState("");
  const [result, setResult] = useState<SupportCostResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const mainMaterialCost = (parsePositive(mainWeight, "main material weight") / 1000) * parsePositive(mainPrice, "main material price");
      const supportMaterialCost = (parsePositive(supportWeight, "support material weight") / 1000) * parsePositive(supportPrice, "support material price");
      const wasteCost = (mainMaterialCost + supportMaterialCost) * (parseOptionalPercent(wastePercent) / 100);

      setResult({
        mainCost: mainMaterialCost,
        supportCost: supportMaterialCost,
        wasteCost,
        totalCost: mainMaterialCost + supportMaterialCost + wasteCost,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate support material cost.");
    }
  };

  const clear = () => {
    setMainWeight("");
    setSupportWeight("");
    setMainPrice("");
    setSupportPrice("");
    setWastePercent("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Main material weight (grams)</ToolLabel>
          <ToolInput value={mainWeight} onChange={setMainWeight} type="number" placeholder="120" />
        </div>
        <div>
          <ToolLabel>Support material weight (grams)</ToolLabel>
          <ToolInput value={supportWeight} onChange={setSupportWeight} type="number" placeholder="35" />
        </div>
        <div>
          <ToolLabel>Waste percentage optional</ToolLabel>
          <ToolInput value={wastePercent} onChange={setWastePercent} type="number" placeholder="8" />
        </div>
        <div>
          <ToolLabel>Main material price per kg</ToolLabel>
          <ToolInput value={mainPrice} onChange={setMainPrice} type="number" placeholder="24.99" />
        </div>
        <div>
          <ToolLabel>Support material price per kg</ToolLabel>
          <ToolInput value={supportPrice} onChange={setSupportPrice} type="number" placeholder="39.99" />
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
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ToolStatCard label="Main material cost" value={formatCurrency(result.mainCost)} />
            <ToolStatCard label="Support material cost" value={formatCurrency(result.supportCost)} />
            <ToolStatCard label="Waste cost" value={formatCurrency(result.wasteCost)} />
            <ToolStatCard label="Total material cost" value={formatCurrency(result.totalCost)} />
          </div>
          <ToolResultBox muted>
            Useful for PLA/PETG support, PVA, support filament, or multi-material printing estimates. Actual cost depends on slicer supports, purge, interface layers, failed prints, and material settings.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Support material cost estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
