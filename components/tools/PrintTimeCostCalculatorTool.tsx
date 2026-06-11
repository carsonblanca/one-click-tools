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

type PrintTimeCostResult = {
  totalHours: number;
  machineCost: number;
  baseTotal: number;
  suggestedPrice: number | null;
};

function parseNonNegative(value: string, label: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Enter a valid ${label} of zero or more.`);
  }

  return parsed;
}

function parseRequiredPositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
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

function formatHours(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}

export default function PrintTimeCostCalculatorTool() {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [result, setResult] = useState<PrintTimeCostResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const printHours = parseNonNegative(hours, "print hours");
      const printMinutes = parseNonNegative(minutes, "print minutes");
      const rate = parseRequiredPositive(hourlyRate, "hourly machine rate");
      const material = parseNonNegative(materialCost, "material cost");
      const labor = parseNonNegative(laborCost, "labor or setup cost");
      const margin = parseNonNegative(profitMargin, "profit margin percentage");
      const totalHours = printHours + printMinutes / 60;

      if (totalHours <= 0) {
        throw new Error("Enter a print time greater than zero.");
      }

      if (margin >= 100) {
        throw new Error("Profit margin must be less than 100%.");
      }

      const machineCost = totalHours * rate;
      const baseTotal = machineCost + material + labor;

      setResult({
        totalHours,
        machineCost,
        baseTotal,
        suggestedPrice: profitMargin.trim() ? baseTotal / (1 - margin / 100) : null,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate print time cost.");
    }
  };

  const clear = () => {
    setHours("");
    setMinutes("");
    setHourlyRate("");
    setMaterialCost("");
    setLaborCost("");
    setProfitMargin("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Print hours</ToolLabel>
          <ToolInput value={hours} onChange={setHours} type="number" placeholder="6" />
        </div>
        <div>
          <ToolLabel>Print minutes</ToolLabel>
          <ToolInput value={minutes} onChange={setMinutes} type="number" placeholder="30" />
        </div>
        <div>
          <ToolLabel>Hourly machine rate</ToolLabel>
          <ToolInput value={hourlyRate} onChange={setHourlyRate} type="number" placeholder="2.5" />
        </div>
        <div>
          <ToolLabel>Material cost</ToolLabel>
          <ToolInput value={materialCost} onChange={setMaterialCost} type="number" placeholder="4.75" />
        </div>
        <div>
          <ToolLabel>Labor/setup cost optional</ToolLabel>
          <ToolInput value={laborCost} onChange={setLaborCost} type="number" placeholder="5" />
        </div>
        <div>
          <ToolLabel>Profit margin percentage optional</ToolLabel>
          <ToolInput value={profitMargin} onChange={setProfitMargin} type="number" placeholder="30" />
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
            <ToolStatCard label="Print time" value={formatHours(result.totalHours)} />
            <ToolStatCard label="Machine cost" value={formatCurrency(result.machineCost)} />
            <ToolStatCard label="Base total cost" value={formatCurrency(result.baseTotal)} />
            <ToolStatCard
              label="Suggested price"
              value={result.suggestedPrice === null ? "No margin" : formatCurrency(result.suggestedPrice)}
            />
          </div>
          <ToolResultBox muted>
            Estimate only. Real pricing can change with printer depreciation, electricity, maintenance, failed prints, material waste, setup time, and local market rates.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Print time cost estimates will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
