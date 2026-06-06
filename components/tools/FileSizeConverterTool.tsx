"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

const INPUT_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const BINARY_UNITS = ["B", "KiB", "MiB", "GiB", "TiB"] as const;

type InputUnit = (typeof INPUT_UNITS)[number];

function unitPower(unit: InputUnit) {
  return INPUT_UNITS.indexOf(unit);
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(value) >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

function convertBytes(bytes: number, base: number, units: readonly string[]) {
  return units.map((unit, index) => ({
    unit,
    value: formatNumber(bytes / base ** index),
  }));
}

export default function FileSizeConverterTool() {
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<InputUnit>("MB");
  const [decimalRows, setDecimalRows] = useState<
    Array<{ unit: string; value: string }>
  >([]);
  const [binaryRows, setBinaryRows] = useState<
    Array<{ unit: string; value: string }>
  >([]);
  const [error, setError] = useState("");

  const convert = () => {
    const value = Number(input);

    if (!Number.isFinite(value) || value < 0) {
      setDecimalRows([]);
      setBinaryRows([]);
      setError("Enter a non-negative number.");
      return;
    }

    const bytes = value * 1000 ** unitPower(unit);
    setDecimalRows(convertBytes(bytes, 1000, DECIMAL_UNITS));
    setBinaryRows(convertBytes(bytes, 1024, BINARY_UNITS));
    setError("");
  };

  const clear = () => {
    setInput("");
    setUnit("MB");
    setDecimalRows([]);
    setBinaryRows([]);
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>File size</ToolLabel>
        <ToolInput value={input} onChange={setInput} type="number" placeholder="10" />
      </div>

      <div className="mt-5">
        <ToolLabel>Input unit</ToolLabel>
        <ToolButtonRow>
          {INPUT_UNITS.map((option) => (
            <ToolButton
              key={option}
              onClick={() => setUnit(option)}
              variant={unit === option ? "primary" : "secondary"}
            >
              {option}
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!error && decimalRows.length === 0}>
        {error || decimalRows.length > 0 ? (
          error || (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 font-medium">Decimal units</div>
                <div className="space-y-2">
                  {decimalRows.map((row) => (
                    <div key={row.unit} className="flex justify-between gap-4">
                      <span>{row.unit}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 font-medium">Binary units</div>
                <div className="space-y-2">
                  {binaryRows.map((row) => (
                    <div key={row.unit} className="flex justify-between gap-4">
                      <span>{row.unit}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          "Converted file sizes will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
