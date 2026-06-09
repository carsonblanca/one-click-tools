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

type ProfitResult = {
  grossProfit: number;
  marginPercent: number;
  markupPercent: number;
};

function parsePositiveNumber(value: string, label: string) {
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

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export default function ProfitMarginCalculatorTool() {
  const [cost, setCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [result, setResult] = useState<ProfitResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const costValue = parsePositiveNumber(cost, "cost");
      const sellingValue = parsePositiveNumber(sellingPrice, "selling price");
      const grossProfit = sellingValue - costValue;

      setResult({
        grossProfit,
        marginPercent: (grossProfit / sellingValue) * 100,
        markupPercent: (grossProfit / costValue) * 100,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate profit margin.");
    }
  };

  const clear = () => {
    setCost("");
    setSellingPrice("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Cost</ToolLabel>
          <ToolInput value={cost} onChange={setCost} type="number" placeholder="35" />
        </div>
        <div>
          <ToolLabel>Selling price</ToolLabel>
          <ToolInput value={sellingPrice} onChange={setSellingPrice} type="number" placeholder="59" />
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
            <ToolStatCard label="Gross profit" value={formatCurrency(result.grossProfit)} />
            <ToolStatCard label="Margin" value={formatPercent(result.marginPercent)} />
            <ToolStatCard label="Markup" value={formatPercent(result.markupPercent)} />
          </div>
          <ToolResultBox muted>
            Estimate only. Taxes, fees, shipping, refunds, and overhead can change real profitability.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Profit margin results will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
