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

type RoiResult = {
  gainLoss: number;
  roiPercent: number;
};

function parsePositiveNumber(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Enter a valid ${label}.`);
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

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export default function RoiCalculatorTool() {
  const [initialInvestment, setInitialInvestment] = useState("");
  const [finalValue, setFinalValue] = useState("");
  const [result, setResult] = useState<RoiResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const initial = parsePositiveNumber(initialInvestment, "initial investment");
      const final = parseNumber(finalValue, "final value");
      const gainLoss = final - initial;

      setResult({
        gainLoss,
        roiPercent: (gainLoss / initial) * 100,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate ROI.");
    }
  };

  const clear = () => {
    setInitialInvestment("");
    setFinalValue("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Initial investment</ToolLabel>
          <ToolInput value={initialInvestment} onChange={setInitialInvestment} type="number" placeholder="5000" />
        </div>
        <div>
          <ToolLabel>Final value</ToolLabel>
          <ToolInput value={finalValue} onChange={setFinalValue} type="number" placeholder="6200" />
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
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToolStatCard label="Gain / loss" value={formatCurrency(result.gainLoss)} />
            <ToolStatCard label="ROI" value={formatPercent(result.roiPercent)} />
          </div>
          <ToolResultBox muted>
            Estimate only. ROI does not include taxes, fees, timing, or risk and is not financial advice.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>ROI results will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
