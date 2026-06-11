"use client";

import { useMemo, useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type PriceRow = {
  id: number;
  region: string;
  material: string;
  price: string;
  currency: string;
  spoolWeightKg: string;
  exchangeRate: string;
};

type CalculatedRow = {
  id: number;
  region: string;
  material: string;
  currency: string;
  originalPerKg: number;
  convertedPerKg: number;
};

type ComparisonResult = {
  rows: CalculatedRow[];
  cheapest: CalculatedRow;
  mostExpensive: CalculatedRow;
  difference: number;
  percentageDifference: number;
};

const sampleRows: PriceRow[] = [
  { id: 1, region: "China", material: "PLA", price: "68", currency: "CNY", spoolWeightKg: "1", exchangeRate: "0.14" },
  { id: 2, region: "United States", material: "PLA", price: "24.99", currency: "USD", spoolWeightKg: "1", exchangeRate: "1" },
  { id: 3, region: "Europe", material: "PLA", price: "22", currency: "EUR", spoolWeightKg: "1", exchangeRate: "1.08" },
  { id: 4, region: "Japan", material: "PLA", price: "3200", currency: "JPY", spoolWeightKg: "1", exchangeRate: "0.0064" },
  { id: 5, region: "Australia", material: "PLA", price: "35", currency: "AUD", spoolWeightKg: "1", exchangeRate: "0.66" },
];

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

export default function FilamentPriceComparisonCalculatorTool() {
  const { isDark } = useTheme();
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [rows, setRows] = useState<PriceRow[]>(sampleRows);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");

  const nextId = useMemo(() => Math.max(...rows.map((row) => row.id), 0) + 1, [rows]);

  const updateRow = (id: number, field: keyof PriceRow, value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: nextId,
        region: "",
        material: "",
        price: "",
        currency: targetCurrency,
        spoolWeightKg: "1",
        exchangeRate: "1",
      },
    ]);
  };

  const removeRow = (id: number) => {
    setRows((current) => current.filter((row) => row.id !== id));
    setResult(null);
    setError("");
  };

  const calculate = () => {
    try {
      if (rows.length < 2) {
        throw new Error("Add at least two price rows to compare.");
      }

      const calculatedRows = rows.map((row, index) => {
        const price = parsePositive(row.price, `price for row ${index + 1}`);
        const spoolWeight = parsePositive(row.spoolWeightKg, `spool weight for row ${index + 1}`);
        const exchangeRate = parsePositive(row.exchangeRate, `exchange rate for row ${index + 1}`);
        const originalPerKg = price / spoolWeight;

        return {
          id: row.id,
          region: row.region.trim() || `Region ${index + 1}`,
          material: row.material.trim(),
          currency: row.currency.trim() || targetCurrency,
          originalPerKg,
          convertedPerKg: originalPerKg * exchangeRate,
        };
      });
      const sortedRows = [...calculatedRows].sort((first, second) => first.convertedPerKg - second.convertedPerKg);
      const cheapest = sortedRows[0];
      const mostExpensive = sortedRows[sortedRows.length - 1];
      const difference = mostExpensive.convertedPerKg - cheapest.convertedPerKg;

      setResult({
        rows: calculatedRows,
        cheapest,
        mostExpensive,
        difference,
        percentageDifference: cheapest.convertedPerKg > 0 ? (difference / cheapest.convertedPerKg) * 100 : 0,
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not compare filament prices.");
    }
  };

  const clear = () => {
    setRows(sampleRows);
    setTargetCurrency("USD");
    setResult(null);
    setError("");
  };

  const rowCardClass = `rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#E5DED0] bg-[#F5F2EA]"}`;

  return (
    <ToolPanel>
      <div className="grid gap-5">
        <div>
          <ToolLabel>Target currency label</ToolLabel>
          <ToolInput value={targetCurrency} onChange={setTargetCurrency} placeholder="USD" />
        </div>

        <div className="grid gap-4">
          {rows.map((row) => (
            <div key={row.id} className={rowCardClass}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <ToolLabel>Region name</ToolLabel>
                  <ToolInput value={row.region} onChange={(value) => updateRow(row.id, "region", value)} placeholder="China" />
                </div>
                <div>
                  <ToolLabel>Material optional</ToolLabel>
                  <ToolInput value={row.material} onChange={(value) => updateRow(row.id, "material", value)} placeholder="PLA" />
                </div>
                <div>
                  <ToolLabel>Currency</ToolLabel>
                  <ToolInput value={row.currency} onChange={(value) => updateRow(row.id, "currency", value)} placeholder="CNY" />
                </div>
                <div>
                  <ToolLabel>Price</ToolLabel>
                  <ToolInput value={row.price} onChange={(value) => updateRow(row.id, "price", value)} type="number" placeholder="68" />
                </div>
                <div>
                  <ToolLabel>Spool weight (kg)</ToolLabel>
                  <ToolInput value={row.spoolWeightKg} onChange={(value) => updateRow(row.id, "spoolWeightKg", value)} type="number" placeholder="1" />
                </div>
                <div>
                  <ToolLabel>Exchange rate to target</ToolLabel>
                  <ToolInput value={row.exchangeRate} onChange={(value) => updateRow(row.id, "exchangeRate", value)} type="number" placeholder="0.14" />
                </div>
              </div>
              <div className="mt-3">
                <ToolButton onClick={() => removeRow(row.id)} variant="secondary">
                  Remove row
                </ToolButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={addRow} variant="secondary">
          Add row
        </ToolButton>
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
            <ToolStatCard label="Cheapest region" value={result.cheapest.region} />
            <ToolStatCard label="Most expensive region" value={result.mostExpensive.region} />
            <ToolStatCard label="Difference" value={formatMoney(result.difference, targetCurrency)} />
            <ToolStatCard label="Difference %" value={`${result.percentageDifference.toFixed(1)}%`} />
          </div>
          <ToolResultBox>
            <div className="grid gap-3">
              {[...result.rows]
                .sort((first, second) => first.convertedPerKg - second.convertedPerKg)
                .map((row) => (
                  <div key={row.id} className="flex flex-col gap-1 border-b border-current/10 pb-3 last:border-0 last:pb-0">
                    <strong>{row.region}{row.material ? ` · ${row.material}` : ""}</strong>
                    <span>
                      {formatMoney(row.originalPerKg, row.currency)} per kg · {formatMoney(row.convertedPerKg, targetCurrency)} per kg
                    </span>
                  </div>
                ))}
            </div>
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Filament price comparison results will appear here.</ToolResultBox>
      )}

      <ToolResultBox muted>
        This tool uses user-entered prices and exchange rates. It does not fetch live prices, taxes, shipping, or regional availability.
      </ToolResultBox>
    </ToolPanel>
  );
}
