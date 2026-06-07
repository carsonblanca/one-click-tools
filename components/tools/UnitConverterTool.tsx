"use client";

import { useState } from "react";
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

type UnitCategory = "length" | "weight" | "temperature" | "data";

type UnitOption = {
  label: string;
  value: string;
  factor?: number;
};

const unitGroups: Record<UnitCategory, UnitOption[]> = {
  length: [
    { label: "meter", value: "meter", factor: 1 },
    { label: "kilometer", value: "kilometer", factor: 1000 },
    { label: "centimeter", value: "centimeter", factor: 0.01 },
    { label: "millimeter", value: "millimeter", factor: 0.001 },
    { label: "inch", value: "inch", factor: 0.0254 },
    { label: "foot", value: "foot", factor: 0.3048 },
    { label: "yard", value: "yard", factor: 0.9144 },
    { label: "mile", value: "mile", factor: 1609.344 },
  ],
  weight: [
    { label: "gram", value: "gram", factor: 1 },
    { label: "kilogram", value: "kilogram", factor: 1000 },
    { label: "pound", value: "pound", factor: 453.59237 },
    { label: "ounce", value: "ounce", factor: 28.349523125 },
  ],
  temperature: [
    { label: "Celsius", value: "celsius" },
    { label: "Fahrenheit", value: "fahrenheit" },
    { label: "Kelvin", value: "kelvin" },
  ],
  data: [
    { label: "B", value: "b", factor: 1 },
    { label: "KB", value: "kb", factor: 1000 },
    { label: "MB", value: "mb", factor: 1000 ** 2 },
    { label: "GB", value: "gb", factor: 1000 ** 3 },
    { label: "TB", value: "tb", factor: 1000 ** 4 },
  ],
};

const categoryLabels: Array<{ value: UnitCategory; label: string }> = [
  { value: "length", label: "Length" },
  { value: "weight", label: "Weight" },
  { value: "temperature", label: "Temperature" },
  { value: "data", label: "Data size" },
];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: UnitOption[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();

  return (
    <div>
      <ToolLabel>{label}</ToolLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${
          isDark
            ? "border-white/10 bg-[#141419] text-white focus:border-lime-300/40"
            : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] focus:border-[#2563EB]/40"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function toCelsius(value: number, unit: string) {
  if (unit === "fahrenheit") return (value - 32) * (5 / 9);
  if (unit === "kelvin") return value - 273.15;
  return value;
}

function fromCelsius(value: number, unit: string) {
  if (unit === "fahrenheit") return value * (9 / 5) + 32;
  if (unit === "kelvin") return value + 273.15;
  return value;
}

function convertUnit(
  value: number,
  category: UnitCategory,
  fromUnit: string,
  toUnit: string,
) {
  if (category === "temperature") {
    return fromCelsius(toCelsius(value, fromUnit), toUnit);
  }

  const units = unitGroups[category];
  const from = units.find((unit) => unit.value === fromUnit);
  const to = units.find((unit) => unit.value === toUnit);

  if (!from?.factor || !to?.factor) {
    throw new Error("Choose valid units.");
  }

  return (value * from.factor) / to.factor;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

export default function UnitConverterTool() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [input, setInput] = useState("");
  const [fromUnit, setFromUnit] = useState("meter");
  const [toUnit, setToUnit] = useState("kilometer");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const options = unitGroups[category];

  const setNextCategory = (nextCategory: UnitCategory) => {
    const nextOptions = unitGroups[nextCategory];
    setCategory(nextCategory);
    setFromUnit(nextOptions[0].value);
    setToUnit(nextOptions[1]?.value || nextOptions[0].value);
    setResult("");
    setError("");
  };

  const convert = () => {
    const value = Number(input);

    if (!Number.isFinite(value)) {
      setResult("");
      setError("Enter a valid number.");
      return;
    }

    try {
      setResult(formatNumber(convertUnit(value, category, fromUnit, toUnit)));
      setError("");
    } catch (caught) {
      setResult("");
      setError(caught instanceof Error ? caught.message : "Could not convert.");
    }
  };

  const clear = () => {
    setInput("");
    setResult("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolLabel>Unit type</ToolLabel>
      <ToolButtonRow>
        {categoryLabels.map((item) => (
          <ToolButton
            key={item.value}
            onClick={() => setNextCategory(item.value)}
            variant={category === item.value ? "primary" : "secondary"}
          >
            {item.label}
          </ToolButton>
        ))}
      </ToolButtonRow>

      <div className="mt-5">
        <ToolLabel>Value</ToolLabel>
        <ToolInput value={input} onChange={setInput} type="number" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <SelectField
          label="From"
          value={fromUnit}
          options={options}
          onChange={setFromUnit}
        />
        <SelectField
          label="To"
          value={toUnit}
          options={options}
          onChange={setToUnit}
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <div className="mt-5">
          <ToolStatCard label="Result" value={result} />
        </div>
      ) : (
        <ToolResultBox muted>Converted value will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
